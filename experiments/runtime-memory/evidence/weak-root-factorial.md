# Weak-root factorial · NO-GO

Source `84be10a1`; identical generated inputs, explicit `oldHost` release in every arm, same cloud Linux and Node 24.22.3. Diagnostic only, no cgroup or device measurement. Compared private control flags against the existing Fengari fixture dictionaries while preserving public control fields, activation and invalid-handle behavior. No production code or workload change.

| Contrast | Paired peak RSS difference, MiB | Paired reentry heap difference, MiB | Paired reentry duration, ms |
| --- | --- | --- | --- |
| EngineActive only vs neither | -1.76 / -4.24 | +26.30 / +5.89 | +376 / -302 |
| Both roots vs neither | -4.49 / -8.26 | +21.17 / +2.64 | -156 / +32 |

8/8 original pressure-path runs and 8/8 invalid-handle and active-state controls passed. Extended grid `RefreshItems`, public raw fields and read-only checks passed in four variants. Reentry matched 32,799 mock native calls and 27,393 property writes in all arms. Comparing reentry heap after subtracting pre-exit heap gives -3.68/-2.38 MiB for both roots.

Peak RSS decreased by less than 1%; reentry heap rose and duration varied in both directions. This does not justify making the simulator change, and is not a product/device optimization. Stop this line of optimization; prioritize measured UI lifecycle and exact low-resource validation.
