"""Published JSON Schemas bundled with the RenderScope package.

The schema files themselves are not committed here — they live once, at the
monorepo root in ``schemas/``, and the wheel build hook copies them into this
package so an installed ``renderscope`` carries the contract it writes against.
See :mod:`renderscope.report.schema` for the loader.
"""

from __future__ import annotations
