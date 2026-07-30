# Raw benchmark run records

These are the unprocessed `renderscope benchmark --output` files for runs
measured in this repository — the full run record, including nested render
results, adapter metadata, and the Python environment.

**They are inputs, not catalog data.** The published catalog lives one level up
as flat `data/benchmarks/<scene>-<renderer>-<hardware>.json` files conforming to
[`schemas/benchmark.schema.json`](../../../schemas/benchmark.schema.json). The
web dashboard reads only those, and `scripts/validate_data.py` skips everything
under an underscore-prefixed directory — which is why this one is named `_raw`.

To turn a run record here into a published record:

```bash
renderscope publish data/benchmarks/_raw/<scene>/<renderer>.json \
  --output-dir data/benchmarks
```

Runs whose quality metrics were computed after the fact from checkpoint EXRs go
through `scripts/compute_benchmarks_from_renders.py` instead, which reads this
directory and writes the published record.

Not every run here is published. A run is only publishable once it has a genuine
convergence series measured against a reference; see the `Removed` note in
[`CHANGELOG.md`](../../../CHANGELOG.md) for runs that were found degenerate and
intentionally withheld.
