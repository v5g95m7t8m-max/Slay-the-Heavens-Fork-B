# Seed 2 single-VM hosted hard-cap diagnostic

- [Runner and raw artifact](https://github.com/v5g95m7t8m-max/Slay-the-Heavens-Fork-B/actions/runs/46125785421), job `140919953863`, artifact `15255981776` (ZIP SHA-256 in [receipt](receipt.json)).
- cgroup v2 confirmed 0.5 CPU / 1 GiB / zero swap before and after. Kernel memory peak 811.75 MiB, 212.25 MiB headroom. Node peak RSS 833.30 MiB (a distinct metric), restart sample RSS 769.64 MiB. No cgroup OOM or OOM kill, Docker and Node exit 0.
- Seed 2, both Acts in one VM: 34 rooms and 1,090 actions, reached victory and started a fresh run. The action log and all 37 gameplay checkpoints are byte-identical to the earlier uncapped Fengari mock. Raw CPU accounting increased by 215.81 CPU-s; Docker elapsed 432.85 s.
- Fixture construction takes place outside the cgroup. V8 old-space setting 768 MiB matches the prior diagnostic setting. Single pass and a preparation/accounting change are not an optimization A/B. This is a mock SDK test, not a GIL or official-client run, not a release gate, and not evidence that 500–600 MiB has been achieved. It does not determine repeated-campaign retention or device performance.
