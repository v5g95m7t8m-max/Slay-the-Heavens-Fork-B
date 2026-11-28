# Runtime memory attribution · checkpoint 01

Status: **diagnostic only**. No production changes; no change to v2.2.0.
Source: develop `32a15219aecd145c59cb1b2fcf477e5556766e5d` (tree
`1256fecdf9ae57019d65a77bb4733cbaa00cf3c6`), Node 24.22.3, Fengari
0.1.5, Linux. The two materialized selection preview files were verified
against the Git LFS OIDs before building. No new assets or game controls.

## Results

| Sample | n | Peak process RSS (MiB) |
| --- | ---: | --- |
| Original generated, core path, no hard limits | 3 | 931.8 / 957.6 / 941.7 |
| Original generated, Act II, no hard limits | 3 | 771.3 / 768.6 / 770.6 |

All six existing workload runs succeeded. At core checkpoints, median RSS
was 638 MiB after cold start, 765 MiB after exit and 942 MiB after reentry.
V8 heapUsed was 608 → 744 MiB across exit/reentry; heapTotal 687 → 863 MiB.
These are separate measures, not additive. The 858 / 739 MiB earlier results
used a different source, a 768 MiB V8 setting and software half-CPU limiting,
and are not an A/B with this checkpoint. All data here is **offline**;
neither kernel cgroup peak nor official client/device/GPU memory was measured.

The first natural-GC trace uses the same generated workload, with optional
instrumentation and a fresh process per scenario. Do not use its measured
timing/RSS for A/B claims. The heap composition and retaining path instead
come from a separate **short mock** worker snapshot: 215.5 MiB reachable
shallow bytes at cold Host and 46.3 MiB dominated by the traced Lua table.
The direct strong path goes through the Fengari Lua VM stack, not an
asserted post-exit leak. The snapshot analysis code and raw aggregates are
provided separately; full snapshots can contain source strings and are not
checked in. Forced GC is an attribution probe here, never a test optimization.

An isolated `oldHost` change on the earlier `84be10a1` fixture passed 6/6
with RSS pair changes -3.79, +4.63 and -5.70 MiB. This is not stable.
The independent invalid-control probe retained all failure semantics and
found no stable improvement from the `engineAlive` change alone. Fengari
does not implement Lua weak tables, so the fixture's control dictionaries
and closures can hold objects that native Lua would drop. The distinct
`engineActive` root remains under controlled test. Do not merge these probes
as product fixes or lower V8 limits, visual quality or workload.

## Reproduce

```bash
# From the audited checkout with dependencies and approved LFS inputs.
out=$(mktemp -d)
mkdir "$out/inputs"
node scripts/runtime-baseline/production-inputs.mjs "$out/inputs"
node scripts/runtime-baseline/worker.mjs "$out/inputs"
node scripts/runtime-baseline/worker.mjs "$out/inputs" --act2
STH_MEMORY_TIMELINE="$out/core.json" node \
  --import ./experiments/runtime-memory/gc-timeline-preload.mjs \
  scripts/runtime-baseline/worker.mjs "$out/inputs" > "$out/core.log"
node experiments/runtime-memory/read-timeline.mjs "$out/core.log" "$out/core.json" > "$out/core-phases.json"
# Repeat with --act2 and a second output path; pass both phase JSONs to plot-timeline.py.
```

Hard-cap next: reuse the Linux Docker/cgroup v2 resource suite's `stress`
profile, against a separate exact baseline worktree, with 0.5 CPU / 1 GiB
and zero swap. Confirm `cpu.max`, `memory.max`, `memory.swap.max`,
`memory.peak` and `memory.events`; preserve the same heap cap and samples.
Production-generated nonformal diagnostics only run the core workload via
the current suite, so capture Act II separately using the same approved
profile and unchanged worker. Repeated lifecycle/whole-run soak and device
verification are still missing. This checkpoint makes no release claim.
