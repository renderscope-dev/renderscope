"""Hatchling build hook that bundles monorepo data files into the wheel.

Two sets of files live at the monorepo root, one level above this Python
project, and must be copied into the package so an installed `renderscope`
is self-contained:

* `data/renderers/` — the renderer catalog read by `renderscope list`/`info`.
* `schemas/` — the published JSON Schemas `renderscope publish` writes against.

A wheel rebuilt from the published sdist sees these at a different relative
path, so each source is resolved at build time against both layouts. That way
`python -m build` (sdist → wheel) and `python -m build --wheel` both succeed.
"""

from __future__ import annotations

from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

# (relative source path, destination inside the wheel)
_BUNDLES: tuple[tuple[str, str], ...] = (
    ("data/renderers", "renderscope/data/renderers"),
    ("schemas/benchmark.schema.json", "renderscope/data/schemas/benchmark.schema.json"),
)


class RendererDataHook(BuildHookInterface):
    PLUGIN_NAME = "renderer-data"

    def initialize(self, version: str, build_data: dict) -> None:
        if self.target_name != "wheel":
            return
        root = Path(self.root)
        for relative, destination in _BUNDLES:
            candidates = [
                root.parent / relative,  # monorepo checkout
                root / relative,         # extracted sdist
            ]
            source = next((p for p in candidates if p.exists()), None)
            if source is None:
                raise FileNotFoundError(
                    f"Bundled data source '{relative}' not found. Looked in: "
                    + ", ".join(str(p) for p in candidates)
                )
            build_data["force_include"][str(source)] = destination
