"""Tests for the renderer data loading module."""

from __future__ import annotations

from renderscope.core.data_loader import (
    get_renderer_ids,
    load_all_renderers,
    load_renderer,
)
from renderscope.models.renderer import RendererMetadata


class TestLoadAllRenderers:
    """Tests for load_all_renderers()."""

    def test_returns_non_empty_list(self) -> None:
        """Should load at least a few renderers from the data directory."""
        renderers = load_all_renderers()
        assert len(renderers) > 0

    def test_returns_renderer_metadata_instances(self) -> None:
        """Every item should be a RendererMetadata instance."""
        renderers = load_all_renderers()
        for r in renderers:
            assert isinstance(r, RendererMetadata)

    def test_sorted_by_name(self) -> None:
        """Renderers should be sorted alphabetically by name."""
        renderers = load_all_renderers()
        names = [r.name.lower() for r in renderers]
        assert names == sorted(names)

    def test_caching(self) -> None:
        """Calling twice should return the same list object (cached)."""
        first = load_all_renderers()
        second = load_all_renderers()
        assert first is second

    def test_known_renderers_present(self) -> None:
        """Well-known renderers like PBRT and Mitsuba 3 should be loaded."""
        ids = {r.id for r in load_all_renderers()}
        assert "pbrt" in ids
        assert "mitsuba3" in ids


class TestLoadRenderer:
    """Tests for load_renderer()."""

    def test_load_pbrt(self) -> None:
        """Loading 'pbrt' should return a valid RendererMetadata."""
        renderer = load_renderer("pbrt")
        assert renderer is not None
        assert renderer.id == "pbrt"
        assert renderer.name == "PBRT v4"
        assert "path_tracing" in renderer.technique

    def test_load_mitsuba3(self) -> None:
        """Loading 'mitsuba3' should return a valid RendererMetadata."""
        renderer = load_renderer("mitsuba3")
        assert renderer is not None
        assert renderer.id == "mitsuba3"

    def test_nonexistent_renderer(self) -> None:
        """Loading a nonexistent renderer should return None."""
        assert load_renderer("does-not-exist") is None

    def test_renderer_fields_populated(self) -> None:
        """Loaded renderer data should have all required fields populated."""
        renderer = load_renderer("pbrt")
        assert renderer is not None
        assert renderer.description
        assert renderer.language
        assert renderer.license
        assert len(renderer.platforms) > 0
        assert len(renderer.strengths) > 0
        assert len(renderer.limitations) > 0
        assert renderer.best_for


class TestGetRendererIds:
    """Tests for get_renderer_ids()."""

    def test_returns_sorted_list(self) -> None:
        """IDs should be sorted alphabetically."""
        ids = get_renderer_ids()
        assert ids == sorted(ids)

    def test_contains_known_ids(self) -> None:
        """Well-known renderer IDs should be present."""
        ids = get_renderer_ids()
        assert "pbrt" in ids
        assert "mitsuba3" in ids

    def test_no_template_files(self) -> None:
        """Template files (starting with _) should not appear as IDs."""
        ids = get_renderer_ids()
        for renderer_id in ids:
            assert not renderer_id.startswith("_")
