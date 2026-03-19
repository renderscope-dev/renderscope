"""Unit tests for scene management (``renderscope.core.scene``)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from renderscope.core.scene import (
    FormatNotAvailableError,
    SceneInfo,
    SceneManager,
    SceneNotDownloadedError,
    SceneNotFoundError,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_MINIMAL_MANIFEST = {
    "version": "1.0",
    "scenes": [
        {
            "id": "test-scene",
            "name": "Test Scene",
            "description": "A simple test scene.",
            "source": "Test Suite",
            "source_url": "https://example.com/test",
            "polygon_count": 100,
            "tests": ["global_illumination"],
            "complexity": "simple",
            "formats": {
                "pbrt": "test-scene/test-scene.pbrt",
                "obj": "test-scene/test-scene.obj",
            },
            "reference": {
                "renderer": "pbrt",
                "samples": 65536,
                "image": "test-scene/reference.exr",
            },
            "camera": {
                "position": [0, 0, 5],
                "target": [0, 0, 0],
                "up": [0, 1, 0],
                "fov": 45,
            },
            "download_size_mb": 1.5,
        },
        {
            "id": "test-scene-2",
            "name": "Test Scene 2",
            "description": "A second test scene.",
            "source": "Test Suite",
            "source_url": "https://example.com/test2",
            "polygon_count": 5000,
            "tests": ["reflections", "caustics"],
            "complexity": "moderate",
            "formats": {
                "blend": "test-scene-2/test-scene-2.blend",
                "gltf": "test-scene-2/test-scene-2.gltf",
            },
            "reference": None,
            "camera": {
                "position": [1, 2, 3],
                "target": [0, 0, 0],
                "up": [0, 1, 0],
                "fov": 60,
            },
            "download_size_mb": 12.0,
        },
    ],
}


@pytest.fixture()
def mock_manifest(tmp_path: Path) -> Path:
    """Write a mock manifest JSON and return the data dir path."""
    scenes_data_dir = tmp_path / "data" / "scenes"
    scenes_data_dir.mkdir(parents=True)
    manifest_path = scenes_data_dir / "manifest.json"
    manifest_path.write_text(json.dumps(_MINIMAL_MANIFEST), encoding="utf-8")
    return manifest_path


@pytest.fixture()
def scene_manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> SceneManager:
    """Create a SceneManager backed by a mock manifest and temp scenes dir."""
    # Write manifest to a temp location that _load_manifest can find.
    scenes_data_dir = tmp_path / "pkg" / "data" / "scenes"
    scenes_data_dir.mkdir(parents=True)
    manifest_path = scenes_data_dir / "manifest.json"
    manifest_path.write_text(json.dumps(_MINIMAL_MANIFEST), encoding="utf-8")

    # Monkeypatch the manifest loader to use our temp file.
    from renderscope.core.scene import SceneManifest

    @staticmethod  # type: ignore[misc]
    def _mock_load() -> SceneManifest:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        return SceneManifest.model_validate(data)

    monkeypatch.setattr(SceneManager, "_load_manifest", _mock_load)

    scenes_dir = tmp_path / "scenes"
    scenes_dir.mkdir()
    return SceneManager(scenes_dir=scenes_dir)


# ---------------------------------------------------------------------------
# Tests: Manifest loading
# ---------------------------------------------------------------------------


class TestManifestLoading:
    """Tests for manifest parsing and scene discovery."""

    def test_load_manifest(self, scene_manager: SceneManager) -> None:
        """SceneManager correctly parses the manifest and produces SceneInfo objects."""
        scenes = scene_manager.list_scenes()
        assert len(scenes) == 2
        assert all(isinstance(s, SceneInfo) for s in scenes)

    def test_list_scenes_returns_all(self, scene_manager: SceneManager) -> None:
        """list_scenes() returns all scenes from the manifest."""
        scenes = scene_manager.list_scenes()
        ids = [s.id for s in scenes]
        assert "test-scene" in ids
        assert "test-scene-2" in ids

    def test_list_scenes_populates_download_status(self, scene_manager: SceneManager) -> None:
        """list_scenes() correctly sets is_downloaded for each scene."""
        scenes = scene_manager.list_scenes()
        for s in scenes:
            assert s.is_downloaded is False

    def test_get_scene_ids(self, scene_manager: SceneManager) -> None:
        """get_scene_ids() returns sorted scene IDs."""
        ids = scene_manager.get_scene_ids()
        assert ids == ["test-scene", "test-scene-2"]


# ---------------------------------------------------------------------------
# Tests: Scene lookup
# ---------------------------------------------------------------------------


class TestSceneLookup:
    """Tests for get_scene() and scene field validation."""

    def test_get_scene_exists(self, scene_manager: SceneManager) -> None:
        """get_scene() returns the correct scene for a valid ID."""
        scene = scene_manager.get_scene("test-scene")
        assert scene.id == "test-scene"
        assert scene.name == "Test Scene"
        assert scene.polygon_count == 100
        assert scene.complexity == "simple"
        assert "pbrt" in scene.formats
        assert "obj" in scene.formats
        assert scene.reference is not None
        assert scene.reference.renderer == "pbrt"
        assert scene.reference.samples == 65536

    def test_get_scene_not_found(self, scene_manager: SceneManager) -> None:
        """get_scene() raises SceneNotFoundError for an unknown ID."""
        with pytest.raises(SceneNotFoundError, match="nonexistent"):
            scene_manager.get_scene("nonexistent")

    def test_get_scene_no_reference(self, scene_manager: SceneManager) -> None:
        """get_scene() handles scenes without a reference image."""
        scene = scene_manager.get_scene("test-scene-2")
        assert scene.reference is None

    def test_scene_camera_info(self, scene_manager: SceneManager) -> None:
        """Scene camera info is correctly parsed."""
        scene = scene_manager.get_scene("test-scene")
        assert scene.camera.fov == 45
        assert scene.camera.position == [0, 0, 5]


# ---------------------------------------------------------------------------
# Tests: Download status
# ---------------------------------------------------------------------------


class TestDownloadStatus:
    """Tests for is_downloaded() and marker file detection."""

    def test_is_downloaded_true(self, scene_manager: SceneManager) -> None:
        """is_downloaded() returns True when the marker file exists."""
        scene_dir = scene_manager.scenes_dir / "test-scene"
        scene_dir.mkdir(parents=True)
        (scene_dir / ".renderscope-complete").write_text("done", encoding="utf-8")
        assert scene_manager.is_downloaded("test-scene") is True

    def test_is_downloaded_false(self, scene_manager: SceneManager) -> None:
        """is_downloaded() returns False when no scene directory exists."""
        assert scene_manager.is_downloaded("test-scene") is False

    def test_is_downloaded_partial(self, scene_manager: SceneManager) -> None:
        """is_downloaded() returns False when directory exists but marker is missing."""
        scene_dir = scene_manager.scenes_dir / "test-scene"
        scene_dir.mkdir(parents=True)
        # Create a scene file but no marker.
        (scene_dir / "test-scene.pbrt").write_text("scene data", encoding="utf-8")
        assert scene_manager.is_downloaded("test-scene") is False

    def test_mark_downloaded(self, scene_manager: SceneManager) -> None:
        """mark_downloaded() creates the completion marker."""
        scene_manager.mark_downloaded("test-scene")
        assert scene_manager.is_downloaded("test-scene") is True

    def test_remove_marker(self, scene_manager: SceneManager) -> None:
        """remove_marker() removes the completion marker."""
        scene_manager.mark_downloaded("test-scene")
        assert scene_manager.is_downloaded("test-scene") is True
        scene_manager.remove_marker("test-scene")
        assert scene_manager.is_downloaded("test-scene") is False

    def test_get_downloaded_scene_ids(self, scene_manager: SceneManager) -> None:
        """get_downloaded_scene_ids() returns only downloaded scenes."""
        scene_manager.mark_downloaded("test-scene")
        downloaded = scene_manager.get_downloaded_scene_ids()
        assert "test-scene" in downloaded
        assert "test-scene-2" not in downloaded


# ---------------------------------------------------------------------------
# Tests: Path resolution
# ---------------------------------------------------------------------------


class TestPathResolution:
    """Tests for get_scene_path() and get_reference_path()."""

    def test_get_scene_path(self, scene_manager: SceneManager) -> None:
        """get_scene_path() returns the correct path for a downloaded scene."""
        scene_manager.mark_downloaded("test-scene")
        path = scene_manager.get_scene_path("test-scene", "pbrt")
        expected = scene_manager.scenes_dir / "test-scene" / "test-scene.pbrt"
        assert path == expected

    def test_get_scene_path_not_downloaded(self, scene_manager: SceneManager) -> None:
        """get_scene_path() raises SceneNotDownloadedError for undownloaded scenes."""
        with pytest.raises(SceneNotDownloadedError, match="test-scene"):
            scene_manager.get_scene_path("test-scene", "pbrt")

    def test_get_scene_path_format_not_available(self, scene_manager: SceneManager) -> None:
        """get_scene_path() raises FormatNotAvailableError for unsupported formats."""
        scene_manager.mark_downloaded("test-scene")
        with pytest.raises(FormatNotAvailableError, match="usd"):
            scene_manager.get_scene_path("test-scene", "usd")

    def test_get_reference_path_downloaded(self, scene_manager: SceneManager) -> None:
        """get_reference_path() returns the path when reference exists and is downloaded."""
        scene_manager.mark_downloaded("test-scene")
        # Create the actual reference file.
        ref_path = scene_manager.scenes_dir / "test-scene" / "reference.exr"
        ref_path.parent.mkdir(parents=True, exist_ok=True)
        ref_path.write_text("fake exr data", encoding="utf-8")

        result = scene_manager.get_reference_path("test-scene")
        assert result == ref_path

    def test_get_reference_path_not_downloaded(self, scene_manager: SceneManager) -> None:
        """get_reference_path() returns None when scene is not downloaded."""
        result = scene_manager.get_reference_path("test-scene")
        assert result is None

    def test_get_reference_path_no_reference(self, scene_manager: SceneManager) -> None:
        """get_reference_path() returns None when scene has no reference."""
        scene_manager.mark_downloaded("test-scene-2")
        result = scene_manager.get_reference_path("test-scene-2")
        assert result is None


# ---------------------------------------------------------------------------
# Tests: Format compatibility
# ---------------------------------------------------------------------------


class TestFormatCompatibility:
    """Tests for get_compatible_format()."""

    def test_compatible_format_native_preferred(self, scene_manager: SceneManager) -> None:
        """Native formats (pbrt) are preferred over generic ones (obj)."""
        fmt = scene_manager.get_compatible_format("test-scene", ["pbrt", "obj"])
        assert fmt == "pbrt"

    def test_compatible_format_fallback(self, scene_manager: SceneManager) -> None:
        """Falls back to generic format when native is not available."""
        fmt = scene_manager.get_compatible_format("test-scene", ["obj", "gltf"])
        assert fmt == "obj"

    def test_compatible_format_no_match(self, scene_manager: SceneManager) -> None:
        """Returns None when no compatible format exists."""
        fmt = scene_manager.get_compatible_format("test-scene", ["usd", "abc"])
        assert fmt is None

    def test_compatible_format_blend_preferred(self, scene_manager: SceneManager) -> None:
        """Blend format is preferred for scenes that have it."""
        fmt = scene_manager.get_compatible_format("test-scene-2", ["blend", "gltf"])
        assert fmt == "blend"

    def test_compatible_format_single(self, scene_manager: SceneManager) -> None:
        """Works correctly with a single matching format."""
        fmt = scene_manager.get_compatible_format("test-scene", ["pbrt"])
        assert fmt == "pbrt"


# ---------------------------------------------------------------------------
# Tests: Utility methods
# ---------------------------------------------------------------------------


class TestUtilities:
    """Tests for utility methods."""

    def test_total_download_size(self, scene_manager: SceneManager) -> None:
        """get_total_download_size() sums all scene sizes."""
        total = scene_manager.get_total_download_size()
        assert total == pytest.approx(13.5)

    def test_prepare_scene_dir(self, scene_manager: SceneManager) -> None:
        """prepare_scene_dir() creates the directory if it doesn't exist."""
        scene_dir = scene_manager.prepare_scene_dir("test-scene")
        assert scene_dir.is_dir()
        assert scene_dir == scene_manager.scenes_dir / "test-scene"

    def test_scenes_dir_property(self, scene_manager: SceneManager) -> None:
        """scenes_dir property returns the configured directory."""
        assert scene_manager.scenes_dir.is_dir()


# ---------------------------------------------------------------------------
# Tests: Bundled manifest loading
# ---------------------------------------------------------------------------


class TestBundledManifest:
    """Tests for loading the real bundled manifest."""

    def test_load_bundled_manifest(self) -> None:
        """The real bundled manifest loads without errors."""
        # Use the real loader without monkeypatch.
        sm = SceneManager(scenes_dir=Path("/tmp/renderscope-test-scenes"))
        scenes = sm.list_scenes()
        # The bundled manifest should have at least the standard scenes.
        assert len(scenes) >= 5
        ids = [s.id for s in scenes]
        assert "cornell-box" in ids
        assert "sponza" in ids

    def test_bundled_manifest_scene_fields(self) -> None:
        """Each scene in the bundled manifest has required fields."""
        sm = SceneManager(scenes_dir=Path("/tmp/renderscope-test-scenes"))
        for scene in sm.list_scenes():
            assert scene.id
            assert scene.name
            assert scene.description
            assert scene.source
            assert scene.polygon_count > 0
            assert len(scene.formats) > 0
            assert scene.camera.fov > 0
