"""Scene manifest management for standard benchmark scenes.

Manages discovery, download status, path resolution, and format compatibility
for the bundled benchmark scenes (Cornell Box, Sponza, Stanford Bunny, etc.).

The manifest is a JSON file shipped with the package at
``data/scenes/manifest.json``.  Actual scene files are large binary assets
stored in ``~/.renderscope/scenes/`` and downloaded on demand via the
``renderscope download-scenes`` CLI command.
"""

from __future__ import annotations

import importlib.resources
import json
import logging
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

# Default directory where scenes are stored on disk.
_DEFAULT_SCENES_DIR = Path.home() / ".renderscope" / "scenes"

# Marker file written after a successful scene download.
_COMPLETE_MARKER = ".renderscope-complete"


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class SceneNotFoundError(Exception):
    """Raised when a scene ID doesn't exist in the manifest."""

    def __init__(self, scene_id: str, available: list[str] | None = None) -> None:
        self.scene_id = scene_id
        msg = f"Scene '{scene_id}' not found in the manifest."
        if available:
            msg += f"\nAvailable scenes: {', '.join(available)}"
        super().__init__(msg)


class SceneNotDownloadedError(Exception):
    """Raised when trying to access a scene that hasn't been downloaded."""

    def __init__(self, scene_id: str) -> None:
        self.scene_id = scene_id
        super().__init__(
            f"Scene '{scene_id}' has not been downloaded.\n"
            f"Run 'renderscope download-scenes --scene {scene_id}' to download it."
        )


class FormatNotAvailableError(Exception):
    """Raised when a scene doesn't have the requested format."""

    def __init__(self, scene_id: str, fmt: str, available: list[str]) -> None:
        self.scene_id = scene_id
        self.format = fmt
        self.available_formats = available
        fmt_list = ", ".join(available) if available else "(none)"
        super().__init__(
            f"Scene '{scene_id}' is not available in '{fmt}' format.\nAvailable formats: {fmt_list}"
        )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CameraInfo(BaseModel):
    """Camera configuration for a benchmark scene."""

    model_config = ConfigDict(extra="ignore")

    position: list[float]
    target: list[float]
    up: list[float]
    fov: float


class SceneReference(BaseModel):
    """Reference render metadata for quality comparison."""

    model_config = ConfigDict(extra="ignore")

    renderer: str
    samples: int
    image: str  # Relative path to reference image within the scene directory.


class SceneInfo(BaseModel):
    """Metadata for a standard benchmark scene."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: str
    source: str
    source_url: str
    polygon_count: int
    tests: list[str]
    complexity: str  # "simple", "moderate", "complex"
    formats: dict[str, str]  # format_id -> relative path
    reference: SceneReference | None = None
    camera: CameraInfo
    download_size_mb: float
    is_downloaded: bool = False  # Set dynamically by SceneManager


class SceneManifest(BaseModel):
    """Root model for the scene manifest JSON file."""

    model_config = ConfigDict(extra="ignore")

    version: str
    description: str = ""
    scenes: list[SceneInfo] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# SceneManager
# ---------------------------------------------------------------------------


class SceneManager:
    """Manages standard benchmark scenes — discovery, download status, and resolution.

    Loads the bundled manifest on initialization and provides methods to
    query scene metadata, check download status, and resolve file paths.
    """

    def __init__(self, scenes_dir: Path | None = None) -> None:
        self._scenes_dir = scenes_dir or _DEFAULT_SCENES_DIR
        self._manifest = self._load_manifest()

    @property
    def scenes_dir(self) -> Path:
        """Root directory where scene files are stored."""
        return self._scenes_dir

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def list_scenes(self) -> list[SceneInfo]:
        """Return all scenes from the manifest with download status populated."""
        scenes: list[SceneInfo] = []
        for scene in self._manifest.scenes:
            updated = scene.model_copy(update={"is_downloaded": self.is_downloaded(scene.id)})
            scenes.append(updated)
        return scenes

    def get_scene(self, scene_id: str) -> SceneInfo:
        """Look up a single scene by ID.

        Raises:
            SceneNotFoundError: If the scene ID doesn't exist in the manifest.
        """
        for scene in self._manifest.scenes:
            if scene.id == scene_id:
                return scene.model_copy(update={"is_downloaded": self.is_downloaded(scene.id)})
        available = [s.id for s in self._manifest.scenes]
        raise SceneNotFoundError(scene_id, available=available)

    def is_downloaded(self, scene_id: str) -> bool:
        """Check if a scene's files exist locally.

        A scene is considered downloaded if its directory exists and contains
        the ``.renderscope-complete`` marker file (written after a successful
        download to detect partial downloads).
        """
        scene_dir = self._scenes_dir / scene_id
        marker = scene_dir / _COMPLETE_MARKER
        return marker.is_file()

    def get_scene_path(self, scene_id: str, fmt: str) -> Path:
        """Resolve the local file path for a scene in a specific format.

        Args:
            scene_id: Scene identifier (e.g., ``"cornell-box"``).
            fmt: Format identifier (e.g., ``"pbrt"``, ``"obj"``).

        Returns:
            Absolute path to the scene file on disk.

        Raises:
            SceneNotFoundError: If the scene doesn't exist in the manifest.
            SceneNotDownloadedError: If the scene hasn't been downloaded.
            FormatNotAvailableError: If the scene doesn't offer that format.
        """
        scene = self.get_scene(scene_id)

        if not self.is_downloaded(scene_id):
            raise SceneNotDownloadedError(scene_id)

        if fmt not in scene.formats:
            raise FormatNotAvailableError(scene_id, fmt, list(scene.formats.keys()))

        return self._scenes_dir / scene.formats[fmt]

    def get_reference_path(self, scene_id: str) -> Path | None:
        """Resolve the local path to a scene's reference image.

        Returns:
            The absolute path if available and downloaded, ``None`` otherwise.
        """
        scene = self.get_scene(scene_id)
        if scene.reference is None:
            return None
        if not self.is_downloaded(scene_id):
            return None

        ref_path = self._scenes_dir / scene.reference.image
        if ref_path.is_file():
            return ref_path
        return None

    def get_compatible_format(
        self,
        scene_id: str,
        supported_formats: list[str],
    ) -> str | None:
        """Find the best compatible format between a scene and a renderer.

        Given a scene and a list of formats a renderer supports, return
        the best matching format.  Native scene formats (pbrt, mitsuba_xml)
        are preferred over generic interchange formats (obj, gltf, ply).

        Args:
            scene_id: Scene identifier.
            supported_formats: Format IDs the renderer accepts.

        Returns:
            The best matching format ID, or ``None`` if no compatible format exists.
        """
        scene = self.get_scene(scene_id)
        scene_formats = set(scene.formats.keys())
        renderer_formats = set(supported_formats)

        # Find the intersection of available and supported formats.
        compatible = scene_formats & renderer_formats
        if not compatible:
            return None

        # Prefer native scene formats over generic ones.
        native_priority = ["pbrt", "mitsuba_xml", "xml", "blend"]
        for native in native_priority:
            if native in compatible:
                return native

        # Fall back to any compatible format.
        return next(iter(sorted(compatible)))

    def get_scene_ids(self) -> list[str]:
        """Return a sorted list of all scene IDs in the manifest."""
        return sorted(s.id for s in self._manifest.scenes)

    def get_downloaded_scene_ids(self) -> list[str]:
        """Return IDs of scenes that have been downloaded locally."""
        return [s.id for s in self._manifest.scenes if self.is_downloaded(s.id)]

    def get_total_download_size(self) -> float:
        """Return the total download size (in MB) of all scenes."""
        return sum(s.download_size_mb for s in self._manifest.scenes)

    # ------------------------------------------------------------------
    # Download support
    # ------------------------------------------------------------------

    def prepare_scene_dir(self, scene_id: str) -> Path:
        """Create the local directory for a scene and return its path."""
        scene = self.get_scene(scene_id)
        scene_dir = self._scenes_dir / scene.id
        scene_dir.mkdir(parents=True, exist_ok=True)
        return scene_dir

    def mark_downloaded(self, scene_id: str) -> None:
        """Write the completion marker for a scene."""
        scene_dir = self._scenes_dir / scene_id
        scene_dir.mkdir(parents=True, exist_ok=True)
        marker = scene_dir / _COMPLETE_MARKER
        marker.write_text(f"Downloaded by RenderScope\nScene: {scene_id}\n", encoding="utf-8")

    def remove_marker(self, scene_id: str) -> None:
        """Remove the completion marker (e.g., for re-download)."""
        marker = self._scenes_dir / scene_id / _COMPLETE_MARKER
        if marker.is_file():
            marker.unlink()

    # ------------------------------------------------------------------
    # Manifest loading
    # ------------------------------------------------------------------

    @staticmethod
    def _load_manifest() -> SceneManifest:
        """Load the bundled scene manifest JSON.

        Resolution order:
        1. Monorepo layout: ``<project_root>/python/src/renderscope/data/scenes/manifest.json``
        2. Installed package data via ``importlib.resources``.
        """
        # Try monorepo layout first.
        mono_path = Path(__file__).resolve().parent.parent / "data" / "scenes" / "manifest.json"
        if mono_path.is_file():
            logger.debug("Loading scene manifest from monorepo: %s", mono_path)
            return SceneManager._parse_manifest(mono_path.read_text(encoding="utf-8"))

        # Fall back to installed package data.
        try:
            files = importlib.resources.files("renderscope.data.scenes")
            manifest_resource = files.joinpath("manifest.json")
            data = str(manifest_resource.read_text(encoding="utf-8"))
            logger.debug("Loading scene manifest from installed package data.")
            return SceneManager._parse_manifest(data)
        except (ModuleNotFoundError, FileNotFoundError, TypeError) as exc:
            logger.warning("Could not load scene manifest: %s", exc)
            return SceneManifest(version="0.0.0", scenes=[])

    @staticmethod
    def _parse_manifest(raw_json: str) -> SceneManifest:
        """Parse a manifest JSON string into a validated model."""
        data: dict[str, Any] = json.loads(raw_json)
        return SceneManifest.model_validate(data)
