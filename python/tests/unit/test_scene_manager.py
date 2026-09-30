"""Unit tests for scene management (``renderscope.core.scene``)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from renderscope.core.scene import (
    FormatNotAvailableError,
    FormatNotDownloadedError,
    SceneInfo,
    SceneManager,
    SceneManifest,
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
            "complexity": "trivial",
            "formats": {
                "pbrt": {"path": "test-scene.pbrt"},
                "obj": {"path": "test-scene.obj"},
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
            "complexity": "medium",
            "formats": {
                "blend": {"path": "test-scene-2.blend"},
                "gltf": {"path": "test-scene-2.gltf"},
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


def install_format(
    manager: SceneManager, scene_id: str, fmt: str, body: str = "scene data"
) -> Path:
    """Put a format on disk the way a successful download leaves it.

    Formats install independently into their own directory, so a test that needs
    one has to create that directory's file *and* its marker — the same pair
    ``SceneDownloader`` writes.
    """
    target = manager.format_dir(scene_id, fmt) / manager.get_scene(scene_id).formats[fmt].path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")
    manager.mark_format_downloaded(scene_id, fmt)
    return target


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
        assert scene.complexity == "trivial"
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
    """Tests for install detection, which is now per format.

    A scene is no longer simply downloaded or not: the Cornell Box's OBJ, PBRT
    and Mitsuba descriptions come from three unrelated hosts, so having one says
    nothing about having the others.
    """

    def test_is_format_downloaded_true(self, scene_manager: SceneManager) -> None:
        """A format counts as installed when its file and marker are both there."""
        install_format(scene_manager, "test-scene", "pbrt")
        assert scene_manager.is_format_downloaded("test-scene", "pbrt") is True
        assert scene_manager.is_downloaded("test-scene") is True

    def test_other_formats_stay_missing(self, scene_manager: SceneManager) -> None:
        """Installing one format does not imply the rest."""
        install_format(scene_manager, "test-scene", "pbrt")
        assert scene_manager.is_format_downloaded("test-scene", "obj") is False
        assert scene_manager.installed_formats("test-scene") == ["pbrt"]

    def test_is_downloaded_false(self, scene_manager: SceneManager) -> None:
        """is_downloaded() returns False when no scene directory exists."""
        assert scene_manager.is_downloaded("test-scene") is False
        assert scene_manager.installed_formats("test-scene") == []

    def test_marker_without_the_file_is_not_downloaded(self, scene_manager: SceneManager) -> None:
        """A marker alone is not an install.

        The marker records that extraction finished; it cannot vouch for a file
        that has since been deleted. Reporting the format as present would hand
        a renderer a path that does not exist.
        """
        scene_manager.mark_format_downloaded("test-scene", "pbrt")
        assert scene_manager.is_format_downloaded("test-scene", "pbrt") is False
        assert scene_manager.is_downloaded("test-scene") is False

    def test_file_without_the_marker_is_not_downloaded(self, scene_manager: SceneManager) -> None:
        """A half-extracted directory must not pass for a finished download."""
        target = scene_manager.format_dir("test-scene", "pbrt") / "test-scene.pbrt"
        target.parent.mkdir(parents=True)
        target.write_text("scene data", encoding="utf-8")
        assert scene_manager.is_format_downloaded("test-scene", "pbrt") is False

    def test_undeclared_format_is_never_downloaded(self, scene_manager: SceneManager) -> None:
        """Files under a directory the manifest never mentions do not count."""
        stray = scene_manager.format_dir("test-scene", "usd")
        stray.mkdir(parents=True)
        (stray / ".renderscope-complete").write_text("done", encoding="utf-8")
        assert scene_manager.is_format_downloaded("test-scene", "usd") is False

    def test_remove_format_leaves_the_others(self, scene_manager: SceneManager) -> None:
        """remove_format() discards one format without touching its siblings."""
        install_format(scene_manager, "test-scene", "pbrt")
        install_format(scene_manager, "test-scene", "obj")

        scene_manager.remove_format("test-scene", "pbrt")

        assert scene_manager.is_format_downloaded("test-scene", "pbrt") is False
        assert scene_manager.is_format_downloaded("test-scene", "obj") is True
        assert scene_manager.is_downloaded("test-scene") is True

    def test_get_downloaded_scene_ids(self, scene_manager: SceneManager) -> None:
        """get_downloaded_scene_ids() returns only downloaded scenes."""
        install_format(scene_manager, "test-scene", "pbrt")
        downloaded = scene_manager.get_downloaded_scene_ids()
        assert "test-scene" in downloaded
        assert "test-scene-2" not in downloaded

    def test_list_scenes_reports_installed_formats(self, scene_manager: SceneManager) -> None:
        """The CLI's scene table reads its per-format ticks from here."""
        install_format(scene_manager, "test-scene", "obj")
        by_id = {s.id: s for s in scene_manager.list_scenes()}
        assert by_id["test-scene"].installed_formats == ["obj"]
        assert by_id["test-scene"].is_downloaded is True
        assert by_id["test-scene-2"].installed_formats == []
        assert by_id["test-scene-2"].is_downloaded is False


# ---------------------------------------------------------------------------
# Tests: Path resolution
# ---------------------------------------------------------------------------


class TestPathResolution:
    """Tests for get_scene_path() and get_reference_path()."""

    def test_get_scene_path(self, scene_manager: SceneManager) -> None:
        """Each format resolves inside its own directory."""
        install_format(scene_manager, "test-scene", "pbrt")
        path = scene_manager.get_scene_path("test-scene", "pbrt")
        expected = scene_manager.scenes_dir / "test-scene" / "pbrt" / "test-scene.pbrt"
        assert path == expected
        assert path.is_file()

    def test_formats_do_not_share_a_directory(self, scene_manager: SceneManager) -> None:
        """Two sources installing side by side must not be able to collide."""
        install_format(scene_manager, "test-scene", "pbrt")
        install_format(scene_manager, "test-scene", "obj")
        pbrt = scene_manager.get_scene_path("test-scene", "pbrt")
        obj = scene_manager.get_scene_path("test-scene", "obj")
        assert pbrt.parent != obj.parent
        assert pbrt.parent.parent == obj.parent.parent

    def test_get_scene_path_not_downloaded(self, scene_manager: SceneManager) -> None:
        """Nothing downloaded at all is reported as a scene-level problem."""
        with pytest.raises(SceneNotDownloadedError, match="test-scene"):
            scene_manager.get_scene_path("test-scene", "pbrt")

    def test_get_scene_path_format_not_downloaded(self, scene_manager: SceneManager) -> None:
        """A missing format is a different problem from a missing scene.

        It has a different fix — fetch that one format — so it gets its own
        error rather than being reported as an absent scene.
        """
        install_format(scene_manager, "test-scene", "obj")
        with pytest.raises(FormatNotDownloadedError, match="pbrt"):
            scene_manager.get_scene_path("test-scene", "pbrt")

    def test_get_scene_path_format_not_available(self, scene_manager: SceneManager) -> None:
        """get_scene_path() raises FormatNotAvailableError for unsupported formats."""
        install_format(scene_manager, "test-scene", "pbrt")
        with pytest.raises(FormatNotAvailableError, match="usd"):
            scene_manager.get_scene_path("test-scene", "usd")

    def test_get_reference_path_downloaded(self, scene_manager: SceneManager) -> None:
        """The reference sits beside the format directories, not inside one."""
        install_format(scene_manager, "test-scene", "pbrt")
        ref_path = scene_manager.scenes_dir / "test-scene" / "reference.exr"
        ref_path.write_text("fake exr data", encoding="utf-8")

        assert scene_manager.get_reference_path("test-scene") == ref_path

    def test_get_reference_path_not_downloaded(self, scene_manager: SceneManager) -> None:
        """get_reference_path() returns None when scene is not downloaded."""
        result = scene_manager.get_reference_path("test-scene")
        assert result is None

    def test_get_reference_path_no_reference(self, scene_manager: SceneManager) -> None:
        """get_reference_path() returns None when scene has no reference."""
        install_format(scene_manager, "test-scene-2", "blend")
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


class TestFormatPresence:
    """A manifest entry promises a path, not a file.

    Formats arrive independently, so the declared set overstates what a renderer
    can actually read: choosing a format that has not been fetched hands the
    adapter a path that does not exist and surfaces as an obscure render failure.
    """

    @staticmethod
    def _manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> SceneManager:
        manifest = {
            "version": "1.0",
            "scenes": [
                {
                    "id": "demo",
                    "name": "Demo",
                    "description": "d",
                    "source": "s",
                    "source_url": "https://example.com",
                    "polygon_count": 1,
                    "tests": [],
                    "complexity": "trivial",
                    "formats": {
                        "obj": {"path": "demo.obj"},
                        "glb": {"path": "demo.glb"},
                    },
                    "camera": {
                        "position": [0, 0, 1],
                        "target": [0, 0, 0],
                        "up": [0, 1, 0],
                        "fov": 45,
                    },
                    "download_size_mb": 0.1,
                }
            ],
        }

        @staticmethod  # type: ignore[misc]
        def _load() -> SceneManifest:
            return SceneManifest.model_validate(manifest)

        monkeypatch.setattr(SceneManager, "_load_manifest", _load)
        scenes_dir = tmp_path / "scenes"
        scenes_dir.mkdir()
        return SceneManager(scenes_dir=scenes_dir)

    def test_prefers_a_format_that_exists_on_disk(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        manager = self._manager(tmp_path, monkeypatch)
        install_format(manager, "demo", "obj", body="v 0 0 0\n")

        # glb sorts before obj alphabetically, so a naive picker would take it.
        assert manager.get_compatible_format("demo", ["glb", "obj"]) == "obj"

    def test_reports_incompatible_when_no_declared_format_is_present(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        manager = self._manager(tmp_path, monkeypatch)
        install_format(manager, "demo", "obj", body="v 0 0 0\n")

        assert manager.get_compatible_format("demo", ["glb"]) is None

    def test_uses_declared_formats_before_download(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """`benchmark --dry-run` reasons about the matrix before any files exist."""
        manager = self._manager(tmp_path, monkeypatch)
        assert manager.get_compatible_format("demo", ["glb"]) == "glb"

    def test_describe_formats_switches_from_declared_to_installed(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Error messages must name what the caller has, not what exists upstream."""
        manager = self._manager(tmp_path, monkeypatch)
        assert manager.describe_formats("demo") == "none downloaded (declared: glb, obj)"

        install_format(manager, "demo", "obj", body="v 0 0 0\n")
        assert manager.describe_formats("demo") == "obj"


class TestBundledCatalogSources:
    """The shipped manifest is what makes `download-scenes` work at all.

    It is generated from ``data/scenes/*.json``, so these assertions are really
    about the catalog: every format it advertises must be obtainable, verifiable,
    and land where the manifest says it will.
    """

    @staticmethod
    def _scenes() -> list[SceneInfo]:
        return SceneManager().list_scenes()

    def test_every_format_is_either_downloadable_or_documented(self) -> None:
        for scene in self._scenes():
            for fmt, source in scene.formats.items():
                if source.url:
                    continue
                assert scene.source_url.startswith("http"), (
                    f"{scene.id}/{fmt} has no url, so source_url must tell a "
                    f"contributor where to obtain it"
                )

    def test_wired_sources_declare_a_checksum(self) -> None:
        """A source we fetch automatically must be verifiable."""
        for scene in self._scenes():
            for fmt, source in scene.formats.items():
                if not source.url:
                    continue
                assert source.sha256, f"{scene.id}/{fmt} declares a url but no sha256"
                assert len(source.sha256) == 64, f"{scene.id}/{fmt} sha256 is not a hex digest"

    def test_non_archive_sources_declare_a_target_filename(self) -> None:
        """A bare file has no internal structure to infer a name from."""
        for scene in self._scenes():
            for fmt, source in scene.formats.items():
                url = source.url or ""
                if not url or url.endswith((".zip", ".tar.gz", ".tgz", ".tar")):
                    continue
                assert source.filename, (
                    f"{scene.id}/{fmt} points at a non-archive source ({url}); it "
                    f"needs 'filename' so the download lands where 'path' expects"
                )

    def test_declared_filename_is_where_the_path_points(self) -> None:
        for scene in self._scenes():
            for fmt, source in scene.formats.items():
                if not source.filename:
                    continue
                assert source.path == source.filename, (
                    f"{scene.id}/{fmt} saves as '{source.filename}' but 'path' "
                    f"points at '{source.path}'"
                )

    def test_wired_sources_declare_a_download_size(self) -> None:
        """The CLI prints a download plan before spending anyone's bandwidth."""
        for scene in self._scenes():
            for fmt, source in scene.formats.items():
                if not source.url:
                    continue
                assert source.size_mb > 0, f"{scene.id}/{fmt} declares no size_mb"

    def test_download_size_is_the_sum_of_its_formats(self) -> None:
        for scene in self._scenes():
            expected = round(sum(s.size_mb for s in scene.formats.values()), 2)
            assert scene.download_size_mb == pytest.approx(expected), (
                f"{scene.id} advertises {scene.download_size_mb} MB but its "
                f"formats add up to {expected} MB"
            )

    def test_every_reference_renderer_can_read_a_declared_format(self) -> None:
        """A nominated ground truth that cannot open the scene is unreachable.

        The Cornell Box nominated PBRT while offering no PBRT description, so
        `renderscope reference --scene cornell-box` could never run.
        """
        from renderscope.core.registry import registry

        for scene in self._scenes():
            if scene.reference is None:
                continue
            adapter = registry.get(scene.reference.renderer)
            assert adapter is not None, (
                f"{scene.id} nominates unknown renderer '{scene.reference.renderer}'"
            )
            readable = set(adapter.supported_formats()) & set(scene.formats)
            assert readable, (
                f"{scene.id} nominates {scene.reference.renderer} as its reference "
                f"renderer, but that renderer reads "
                f"{sorted(adapter.supported_formats())} and the scene offers "
                f"{sorted(scene.formats)}"
            )
