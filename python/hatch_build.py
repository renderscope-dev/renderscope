"""Hatchling build hook that locates the canonical renderer data directory.

The renderer JSON files live at the monorepo root (`renderscope/data/renderers/`),
one level above this Python project. The wheel must bundle them, but a wheel
rebuilt from the published sdist sees the data at a different relative path.
This hook picks the right source location at build time, so both
`python -m build` (sdist → wheel) and direct `python -m build --wheel` succeed.
"""

from __future__ import annotations

from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class RendererDataHook(BuildHookInterface):
    PLUGIN_NAME = "renderer-data"

    def initialize(self, version: str, build_data: dict) -> None:
        if self.target_name != "wheel":
            return
        root = Path(self.root)
        candidates = [
            root.parent / "data" / "renderers",  # monorepo checkout
            root / "data" / "renderers",          # extracted sdist
        ]
        source = next((p for p in candidates if p.is_dir()), None)
        if source is None:
            raise FileNotFoundError(
                "Renderer data directory not found. Looked in: "
                + ", ".join(str(p) for p in candidates)
            )
        build_data["force_include"][str(source)] = "renderscope/data/renderers"
