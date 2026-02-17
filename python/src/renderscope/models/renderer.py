"""Pydantic model for renderer metadata.

Mirrors the JSON schema at /schemas/renderer.schema.json. Accepts additional
fields gracefully so that new fields added to the web-side schema do not
break the CLI.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    """A publication reference associated with a renderer."""

    model_config = ConfigDict(extra="ignore")

    title: str
    url: str
    year: int | None = None


class Tutorial(BaseModel):
    """A learning resource associated with a renderer."""

    model_config = ConfigDict(extra="ignore")

    title: str
    url: str
    type: str  # "video" | "article" | "course"


class CommunityLinks(BaseModel):
    """Links to community resources for a renderer."""

    model_config = ConfigDict(extra="ignore")

    discord: str | None = None
    forum: str | None = None
    mailing_list: str | None = None
    stackoverflow_tag: str | None = None


class RendererMetadata(BaseModel):
    """Complete metadata for a single rendering engine.

    This model represents the canonical Python-side representation of
    the renderer JSON data files in /data/renderers/. It accepts unknown
    fields without error to maintain forward compatibility as the schema
    evolves on the web side.
    """

    model_config = ConfigDict(extra="ignore")

    # Identity
    id: str
    name: str
    version: str
    description: str
    long_description: str = ""
    technique: list[str]
    language: str
    license: str

    # Platform & Capability
    platforms: list[str]
    gpu_support: bool
    cpu_support: bool
    real_time: bool = False
    gpu_apis: list[str] = Field(default_factory=list)
    scene_formats: list[str]
    output_formats: list[str]

    # URLs
    homepage: str | None = None
    repository: str
    documentation: str | None = None
    paper: str | None = None
    paper_bibtex: str | None = None

    # Release info
    first_release: str
    latest_release: str | None = None
    latest_release_version: str | None = None
    status: str

    # GitHub metrics (updated weekly by CI)
    github_stars: int | None = None
    github_stars_trend: list[int] = Field(default_factory=list)
    commit_activity_52w: list[int] = Field(default_factory=list)
    contributor_count: int | None = None
    open_issues: int | None = None
    fork_count: int | None = None

    # Tags & editorial
    tags: list[str]
    strengths: list[str]
    limitations: list[str]
    best_for: str
    not_ideal_for: str | None = None
    related: list[str] = Field(default_factory=list)

    # Feature matrix: true/false/None for each capability
    features: dict[str, bool | None]

    # Ecosystem
    integrations: list[str] = Field(default_factory=list)
    install_command: str | None = None
    community_links: CommunityLinks | None = None
    citations: list[Citation] = Field(default_factory=list)
    tutorials: list[Tutorial] = Field(default_factory=list)

    # Assets
    logo: str | None = None
    thumbnail: str | None = None

    @property
    def primary_technique(self) -> str:
        """Return the first (primary) rendering technique."""
        return self.technique[0] if self.technique else "unknown"

    @property
    def stars_display(self) -> str:
        """Return GitHub stars formatted with comma separators, or 'N/A'."""
        if self.github_stars is None:
            return "N/A"
        return f"{self.github_stars:,}"

    def matches_technique(self, technique: str) -> bool:
        """Check whether this renderer uses the given technique."""
        return technique.lower() in [t.lower() for t in self.technique]

    def matches_language(self, language: str) -> bool:
        """Check whether this renderer's language contains the query (case-insensitive)."""
        return language.lower() in self.language.lower()

    def matches_status(self, status: str) -> bool:
        """Check whether this renderer's status matches (case-insensitive)."""
        return self.status.lower() == status.lower()

    def to_summary_dict(self) -> dict[str, Any]:
        """Return a condensed dictionary suitable for JSON list output."""
        return {
            "id": self.id,
            "name": self.name,
            "technique": self.technique,
            "language": self.language,
            "license": self.license,
            "status": self.status,
            "github_stars": self.github_stars,
            "platforms": self.platforms,
            "gpu_support": self.gpu_support,
            "description": self.description,
        }
