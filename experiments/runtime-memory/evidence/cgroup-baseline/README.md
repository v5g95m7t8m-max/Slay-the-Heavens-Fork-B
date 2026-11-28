# Hard-cap offline baseline (unpaired)

Verified GitHub-hosted [run 46117833202](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/actions/runs/46117833202), with [original ZIP](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/actions/runs/46117833202/artifacts/15252408618) independently downloaded and checked against its published SHA-256. The six files here are decoded sample records, with all stage and cgroup fields retained, not standalone formal receipts.

All six unique containers verified CPU quota 50000/100000, memory.max 1073741824, memory.swap.max 0, memory.events oom 0 and oom_kill 0. Same harness and 768 MiB production-profile V8 old generation cap. Act II three enemies, ten cards, three overlapping effects and 249 scene slots. The generated Lua inputs are not a GIL readback or device measurement.

| Path | Kernel cgroup peak (MiB), three runs | Worst headroom (MiB) | Wall times, s |
|---|---|---:|---|
| Common | 758.4 / 752.6 / 763.2 | 260.8 | 41.3 / 36.0 / 37.7 |
| Act II | 633.2 / 609.4 / 607.3 | 390.8 | 33.5 / 35.6 / 36.7 |

Process maxRSS is distinct from container-charged memory. This report establishes real quota behavior and a baseline, not any improvement versus earlier software-limited measurements, repeat-enter/whole-run stability, formal release status, or device performance.
