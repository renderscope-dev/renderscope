#!/usr/bin/env python3
"""
Fetch fresh GitHub statistics for all RenderScope renderers.

Reads renderer JSON files from data/renderers/, queries the GitHub API
for each renderer with a GitHub repository URL, and updates the dynamic
fields in-place. Editorial content is never touched.

Author: Ashutosh Mishra

Usage:
    python scripts/fetch_github_stats.py [--dry-run] [--renderer SLUG]

Environment:
    GITHUB_TOKEN — GitHub personal access token or Actions token (required)

Exit codes:
    0 — Success (data updated or no changes needed)
    1 — Fatal error (e.g., missing token, can't read data directory)
    2 — Partial failure (some renderers failed, others succeeded)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Optional

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

USER_AGENT = "RenderScope-Data-Updater/1.0"
API_BASE = "https://api.github.com"
MAX_STAR_TREND_ENTRIES = 12
MAX_RETRIES_RATE_LIMIT = 4
MAX_RETRIES_STATS_API = 3
STATS_API_RETRY_DELAY = 2.0
REQUEST_TIMEOUT = 30
RATE_LIMIT_WARNING_THRESHOLD = 100
MAX_CONTRIBUTOR_PAGES = 10000

# Dynamic fields that the script is allowed to update
UPDATABLE_FIELDS = {
    "github_stars",
    "github_stars_trend",
    "fork_count",
    "open_issues",
    "commit_activity_52w",
    "contributor_count",
    "latest_release",
    "latest_release_version",
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("fetch_github_stats")


def setup_logging(verbose: bool = False) -> None:
    """Configure structured logging with timestamps."""
    level = logging.DEBUG if verbose else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)-5s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.setLevel(level)
    logger.addHandler(handler)


# ---------------------------------------------------------------------------
# GitHub URL Parsing
# ---------------------------------------------------------------------------

_GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$",
    re.IGNORECASE,
)


def parse_github_url(url: str) -> Optional[tuple[str, str]]:
    """Extract (owner, repo) from a GitHub URL, or None if not a GitHub URL."""
    match = _GITHUB_URL_RE.match(url.strip())
    if match:
        return match.group("owner"), match.group("repo")
    return None


# ---------------------------------------------------------------------------
# API Client
# ---------------------------------------------------------------------------


class GitHubAPIClient:
    """Thin wrapper around the GitHub REST API v3 with rate-limit handling."""

    def __init__(self, token: str) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": USER_AGENT,
            }
        )
        self._rate_remaining: Optional[int] = None
        self._rate_reset: Optional[float] = None

    def get(
        self,
        url: str,
        *,
        params: Optional[dict[str, str]] = None,
        allow_404: bool = False,
    ) -> Optional[requests.Response]:
        """Make a GET request with retry + backoff for rate limits.

        Returns the Response on success, or None if the request failed
        after retries (or got a 404 when allow_404 is True).
        """
        for attempt in range(MAX_RETRIES_RATE_LIMIT + 1):
            # Check if we're rate-limited
            if self._rate_remaining is not None and self._rate_remaining <= 0:
                self._wait_for_rate_reset()

            try:
                resp = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
            except requests.ConnectionError as exc:
                logger.error("  Connection error for %s: %s", url, exc)
                return None
            except requests.Timeout:
                logger.error("  Timeout for %s", url)
                return None
            except requests.RequestException as exc:
                logger.error("  Request error for %s: %s", url, exc)
                return None

            # Update rate-limit tracking
            self._update_rate_limits(resp)

            if resp.status_code == 200:
                return resp

            if resp.status_code == 202:
                # Stats API: data is being computed asynchronously
                return resp

            if resp.status_code == 404:
                if allow_404:
                    return None
                logger.warning("  404 Not Found: %s", url)
                return None

            if resp.status_code in (403, 429):
                if attempt < MAX_RETRIES_RATE_LIMIT:
                    wait = 2 ** attempt
                    logger.warning(
                        "  Rate limited (%d) on %s — retrying in %ds (attempt %d/%d)",
                        resp.status_code,
                        url,
                        wait,
                        attempt + 1,
                        MAX_RETRIES_RATE_LIMIT,
                    )
                    time.sleep(wait)
                    continue
                else:
                    logger.error("  Rate limited after %d retries: %s", MAX_RETRIES_RATE_LIMIT, url)
                    return None

            # Other errors
            logger.error("  HTTP %d for %s: %s", resp.status_code, url, resp.text[:200])
            return None

        return None

    def get_json(
        self,
        url: str,
        *,
        params: Optional[dict[str, str]] = None,
        allow_404: bool = False,
    ) -> Optional[Any]:
        """Make a GET request and parse the JSON response."""
        resp = self.get(url, params=params, allow_404=allow_404)
        if resp is None:
            return None
        if resp.status_code != 200:
            return None
        try:
            return resp.json()
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("  JSON parse error for %s: %s", url, exc)
            return None

    def _update_rate_limits(self, resp: requests.Response) -> None:
        """Read rate-limit headers from a response."""
        remaining = resp.headers.get("X-RateLimit-Remaining")
        reset = resp.headers.get("X-RateLimit-Reset")
        if remaining is not None:
            self._rate_remaining = int(remaining)
            if self._rate_remaining < RATE_LIMIT_WARNING_THRESHOLD:
                logger.warning("  Rate limit remaining: %d", self._rate_remaining)
        if reset is not None:
            self._rate_reset = float(reset)

    def _wait_for_rate_reset(self) -> None:
        """Sleep until the rate limit resets."""
        if self._rate_reset is None:
            time.sleep(60)
            return
        wait = max(0, self._rate_reset - time.time()) + 1
        logger.warning("  Rate limit exhausted — sleeping %.0fs until reset", wait)
        time.sleep(wait)
        self._rate_remaining = None


# ---------------------------------------------------------------------------
# Data Fetching Functions
# ---------------------------------------------------------------------------


def fetch_repo_metadata(client: GitHubAPIClient, owner: str, repo: str) -> Optional[dict[str, Any]]:
    """Fetch core repository metadata (stars, forks, issues, license, archived)."""
    url = f"{API_BASE}/repos/{owner}/{repo}"
    return client.get_json(url)


def fetch_latest_release(
    client: GitHubAPIClient, owner: str, repo: str
) -> Optional[tuple[str, str]]:
    """Fetch the latest release version and date.

    Returns (version, date_str) or None if no release found.
    Falls back to the latest tag if no formal release exists.
    """
    # Try releases/latest first
    url = f"{API_BASE}/repos/{owner}/{repo}/releases/latest"
    data = client.get_json(url, allow_404=True)
    if data is not None:
        tag = data.get("tag_name", "")
        published = data.get("published_at", "")
        version = tag.lstrip("vV") if tag else tag
        date_str = published[:10] if published else ""
        if version and date_str:
            return version, date_str

    # Fallback: latest tag
    url = f"{API_BASE}/repos/{owner}/{repo}/tags"
    data = client.get_json(url, params={"per_page": "1"}, allow_404=True)
    if data and isinstance(data, list) and len(data) > 0:
        tag_name = data[0].get("name", "")
        version = tag_name.lstrip("vV") if tag_name else tag_name
        if version:
            # Tags don't have dates directly; return version only
            return version, ""

    return None


def fetch_commit_activity(
    client: GitHubAPIClient, owner: str, repo: str
) -> Optional[list[int]]:
    """Fetch weekly commit counts for the last 52 weeks.

    The GitHub Stats API may return 202 (computing) on first request.
    Retries up to MAX_RETRIES_STATS_API times with a delay.
    """
    url = f"{API_BASE}/repos/{owner}/{repo}/stats/commit_activity"
    for attempt in range(MAX_RETRIES_STATS_API + 1):
        resp = client.get(url)
        if resp is None:
            return None
        if resp.status_code == 200:
            try:
                data = resp.json()
            except (json.JSONDecodeError, ValueError):
                return None
            if isinstance(data, list):
                return [week.get("total", 0) for week in data]
            return None
        if resp.status_code == 202:
            if attempt < MAX_RETRIES_STATS_API:
                logger.debug(
                    "  Commit activity stats being computed — retry %d/%d in %.0fs",
                    attempt + 1,
                    MAX_RETRIES_STATS_API,
                    STATS_API_RETRY_DELAY,
                )
                time.sleep(STATS_API_RETRY_DELAY)
                continue
            else:
                logger.warning("  Commit activity still computing after %d retries — skipping", MAX_RETRIES_STATS_API)
                return None
        # Other status
        return None

    return None


def fetch_contributor_count(
    client: GitHubAPIClient, owner: str, repo: str
) -> Optional[int]:
    """Fetch contributor count by inspecting the Link header pagination.

    Uses per_page=1 so we only need one request to determine the total
    from the 'last' page link.
    """
    url = f"{API_BASE}/repos/{owner}/{repo}/contributors"
    resp = client.get(url, params={"per_page": "1", "anon": "false"})
    if resp is None:
        return None
    if resp.status_code != 200:
        return None

    # Parse Link header for total page count
    link_header = resp.headers.get("Link", "")
    if link_header:
        match = re.search(r'[&?]page=(\d+)>;\s*rel="last"', link_header)
        if match:
            count = int(match.group(1))
            if count > MAX_CONTRIBUTOR_PAGES:
                logger.info("  Contributor count exceeds %d, capping", MAX_CONTRIBUTOR_PAGES)
                return MAX_CONTRIBUTOR_PAGES
            return count

    # No Link header means the response fits in one page
    try:
        data = resp.json()
        if isinstance(data, list):
            return len(data)
    except (json.JSONDecodeError, ValueError):
        pass

    return None


# ---------------------------------------------------------------------------
# Renderer Processing
# ---------------------------------------------------------------------------


class RendererUpdateResult:
    """Tracks the outcome of processing a single renderer."""

    def __init__(self, renderer_id: str) -> None:
        self.renderer_id = renderer_id
        self.skipped = False
        self.skip_reason = ""
        self.failed = False
        self.updated = False
        self.fields_changed: list[str] = []
        self.license_warning = ""


def process_renderer(
    client: GitHubAPIClient,
    file_path: Path,
    renderer_data: dict[str, Any],
    dry_run: bool,
) -> RendererUpdateResult:
    """Fetch GitHub data for a single renderer and update its JSON file."""
    renderer_id = renderer_data.get("id", file_path.stem)
    result = RendererUpdateResult(renderer_id)

    # Check for a repository URL
    repo_url = renderer_data.get("repository", "")
    if not repo_url:
        result.skipped = True
        result.skip_reason = "no repository URL"
        return result

    # Parse GitHub owner/repo
    parsed = parse_github_url(repo_url)
    if parsed is None:
        result.skipped = True
        result.skip_reason = f"repository URL is not on GitHub ({repo_url})"
        return result

    owner, repo = parsed
    logger.info("Processing %s (github.com/%s/%s)", renderer_id, owner, repo)

    # Deep copy the data so we can compare later
    original_data = json.loads(json.dumps(renderer_data))

    # --- Call 1: Repository metadata ---
    repo_meta = fetch_repo_metadata(client, owner, repo)
    if repo_meta is None:
        result.failed = True
        logger.error("  Failed to fetch repository metadata for %s", renderer_id)
        return result

    # Check for archived repos
    if repo_meta.get("archived", False) and renderer_data.get("status") == "active":
        logger.warning(
            "  %s is archived on GitHub but status is 'active' — consider updating status to 'archived'",
            renderer_id,
        )

    # Check for URL redirect / rename
    api_html_url = repo_meta.get("html_url", "")
    if api_html_url and api_html_url.rstrip("/") != repo_url.rstrip("/"):
        logger.info(
            "  NOTICE: Repository URL for %s may have changed:\n    File:   %s\n    GitHub: %s",
            renderer_id,
            repo_url,
            api_html_url,
        )

    # Update stars
    old_stars = renderer_data.get("github_stars", 0)
    new_stars = repo_meta.get("stargazers_count", old_stars)
    if new_stars != old_stars:
        logger.info("  Stars: %d → %d", old_stars, new_stars)
    renderer_data["github_stars"] = new_stars

    # Update star trend (append current, keep max 12)
    trend = list(renderer_data.get("github_stars_trend", []))
    trend.append(new_stars)
    if len(trend) > MAX_STAR_TREND_ENTRIES:
        trend = trend[-MAX_STAR_TREND_ENTRIES:]
    renderer_data["github_stars_trend"] = trend

    # Update forks
    old_forks = renderer_data.get("fork_count", 0)
    new_forks = repo_meta.get("forks_count", old_forks)
    if new_forks != old_forks:
        logger.info("  Forks: %d → %d", old_forks, new_forks)
    renderer_data["fork_count"] = new_forks

    # Update open issues
    old_issues = renderer_data.get("open_issues", 0)
    new_issues = repo_meta.get("open_issues_count", old_issues)
    if new_issues != old_issues:
        logger.info("  Open issues: %d → %d", old_issues, new_issues)
    renderer_data["open_issues"] = new_issues

    # License verification
    api_license = repo_meta.get("license", {})
    api_spdx = api_license.get("spdx_id", "") if isinstance(api_license, dict) else ""
    file_license = renderer_data.get("license", "")
    if api_spdx and file_license and api_spdx != "NOASSERTION":
        if api_spdx.lower() != file_license.lower():
            warning = f"License mismatch for {renderer_id}: file says '{file_license}', GitHub says '{api_spdx}'"
            logger.warning("  WARNING: %s", warning)
            result.license_warning = warning
        else:
            logger.debug("  License: %s ✓ (matches)", file_license)

    # --- Call 2: Latest release ---
    release_info = fetch_latest_release(client, owner, repo)
    if release_info is not None:
        new_version, new_date = release_info
        old_version = renderer_data.get("latest_release_version", "")
        old_date = renderer_data.get("latest_release", "")
        if new_version and new_version != old_version:
            renderer_data["latest_release_version"] = new_version
            if new_date:
                renderer_data["latest_release"] = new_date
            logger.info(
                "  Latest release: %s (%s) → %s (%s)",
                old_version, old_date, new_version, new_date or old_date,
            )
        elif new_date and new_date != old_date:
            renderer_data["latest_release"] = new_date
            logger.info("  Latest release date: %s → %s", old_date, new_date)
    else:
        logger.debug("  No releases or tags found — keeping existing values")

    # --- Call 3: Commit activity ---
    activity = fetch_commit_activity(client, owner, repo)
    if activity is not None and len(activity) > 0:
        renderer_data["commit_activity_52w"] = activity
        logger.info("  Commit activity: updated (%d weeks)", len(activity))
    else:
        logger.debug("  Commit activity: unavailable — keeping existing values")

    # --- Call 4: Contributor count ---
    contributor_count = fetch_contributor_count(client, owner, repo)
    if contributor_count is not None:
        old_count = renderer_data.get("contributor_count", 0)
        if contributor_count != old_count:
            logger.info("  Contributors: %d → %d", old_count, contributor_count)
        renderer_data["contributor_count"] = contributor_count
    else:
        logger.debug("  Contributors: unavailable — keeping existing value")

    # --- Determine what changed ---
    changed_fields: list[str] = []
    for field in UPDATABLE_FIELDS:
        old_val = original_data.get(field)
        new_val = renderer_data.get(field)
        if old_val != new_val:
            changed_fields.append(field)

    if not changed_fields:
        logger.info("  No changes for %s", renderer_id)
        return result

    result.fields_changed = changed_fields

    if dry_run:
        logger.info("  [DRY RUN] Would update %s (%d fields changed: %s)",
                     renderer_id, len(changed_fields), ", ".join(changed_fields))
        result.updated = True
        return result

    # --- Write updated file atomically ---
    tmp_path = file_path.with_suffix(".json.tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(renderer_data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(str(tmp_path), str(file_path))
        logger.info("  ✓ Updated %s.json (%d fields changed)", renderer_id, len(changed_fields))
        result.updated = True
    except OSError as exc:
        logger.error("  Failed to write %s: %s", file_path, exc)
        result.failed = True
        # Clean up temp file
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass

    return result


# ---------------------------------------------------------------------------
# Main Orchestration
# ---------------------------------------------------------------------------


def discover_renderer_files(data_dir: Path, renderer_slug: Optional[str]) -> list[Path]:
    """Find all renderer JSON files in the data directory."""
    if not data_dir.is_dir():
        logger.error("Data directory does not exist: %s", data_dir)
        return []

    if renderer_slug:
        target = data_dir / f"{renderer_slug}.json"
        if target.is_file():
            return [target]
        logger.error("Renderer file not found: %s", target)
        return []

    files = sorted(data_dir.glob("*.json"))
    # Skip files starting with _ (e.g., _template.json)
    return [f for f in files if not f.name.startswith("_")]


def print_summary(results: list[RendererUpdateResult], total_files: int) -> None:
    """Print a formatted summary of the update run."""
    github_repos = [r for r in results if not r.skipped]
    non_github = [r for r in results if r.skipped]
    updated = [r for r in results if r.updated]
    no_changes = [r for r in github_repos if not r.updated and not r.failed]
    failed = [r for r in results if r.failed]
    license_warnings = [r for r in results if r.license_warning]

    print("\n=== RenderScope GitHub Data Update Summary ===")
    print(f"Total renderers scanned:  {total_files}")
    print(f"  GitHub repos found:     {len(github_repos)}")
    print(f"  Non-GitHub (skipped):   {len(non_github)}")
    print(f"Updated:                  {len(updated)}")
    print(f"  No changes:             {len(no_changes)}")
    print(f"  Failed:                 {len(failed)}")
    print(f"License warnings:         {len(license_warnings)}")
    for r in license_warnings:
        print(f"  - {r.license_warning}")

    if non_github:
        print("\nSkipped (non-GitHub):")
        for r in non_github:
            print(f"  - {r.renderer_id}: {r.skip_reason}")

    if failed:
        print("\nFailed:")
        for r in failed:
            print(f"  - {r.renderer_id}")


def main() -> int:
    """Entry point. Returns exit code."""
    parser = argparse.ArgumentParser(
        description="Fetch fresh GitHub statistics for RenderScope renderers."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log what would change but don't write any files.",
    )
    parser.add_argument(
        "--renderer",
        type=str,
        default=None,
        metavar="SLUG",
        help="Only update a single renderer by its id slug.",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="data/renderers",
        help="Directory containing renderer JSON files (default: data/renderers).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug-level logging.",
    )
    args = parser.parse_args()

    setup_logging(verbose=args.verbose)

    # Read GitHub token
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        logger.error(
            "GITHUB_TOKEN environment variable is not set. "
            "Authenticated requests are required for reasonable rate limits (5,000 req/hr). "
            "Set GITHUB_TOKEN to a GitHub personal access token or use the Actions-provided token."
        )
        return 1

    # Discover renderer files
    data_dir = Path(args.data_dir)
    files = discover_renderer_files(data_dir, args.renderer)
    if not files:
        if args.renderer:
            logger.error("No renderer file found for slug '%s' in %s", args.renderer, data_dir)
        else:
            logger.error("No renderer JSON files found in %s", data_dir)
        return 1

    logger.info("Found %d renderer file(s) in %s", len(files), data_dir)
    if args.dry_run:
        logger.info("[DRY RUN MODE — no files will be modified]")

    # Initialize API client
    client = GitHubAPIClient(token)

    # Process each renderer
    results: list[RendererUpdateResult] = []
    for file_path in files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                renderer_data = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to read %s: %s", file_path, exc)
            bad = RendererUpdateResult(file_path.stem)
            bad.failed = True
            results.append(bad)
            continue

        result = process_renderer(client, file_path, renderer_data, args.dry_run)
        results.append(result)

        if result.skipped:
            logger.info("Skipping %s: %s", result.renderer_id, result.skip_reason)

    # Print summary
    print_summary(results, len(files))

    # Determine exit code
    any_failed = any(r.failed for r in results)
    any_succeeded = any(r.updated for r in results) or any(
        not r.skipped and not r.failed for r in results
    )

    if any_failed and any_succeeded:
        return 2  # Partial failure
    if any_failed and not any_succeeded:
        return 1  # Total failure
    return 0  # Success


if __name__ == "__main__":
    sys.exit(main())
