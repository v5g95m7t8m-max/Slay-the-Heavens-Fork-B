# Offline Host reentry: two weak-root factors
Base Linux checkout: see `head` (84be10a). Node 24.22.3, same Fengari dependencies and generated Lua digests for all arms. Formal production-shaped worker seed 42. No source change outside test fixtures; no official client or released artifact measurement. One CPU affinity, no hard cgroup RAM cap, no forced GC. Other background workload on the host is not attributed to the treatment.

## Apply/run locally, from an isolated checkout
1. Rebuild generated input with the version-matched project's LFS assets: `mkdir /tmp/sth-reentry-inputs; node scripts/runtime-baseline/production-inputs.mjs /tmp/sth-reentry-inputs`. Compare generated Lua hashes to `generated-sha256.txt`.
2. All arms use the same early oldHost release from the preceding A/B experiment; apply `oldHost.patch`. This keeps an exit marker to detect the old Host and removes just one test-only reference.
3. Reset only `tests/lua/support/game_ui_fixture.lua` between arms. Use `neither.lua` (byte-identical fixture to Git) or apply `alive.patch`, `active.patch`, `both.patch`. The latter patches replace simulated weak-key maps with nonowning private per-control flags. They do not nil out dead flags.
4. For each arm:
   * `taskset -c 5 node node_modules/fengari-node-cli/src/lua-cli.js <report-dir>/negative.lua`
   * `timeout 90s taskset -c 5 node scripts/runtime-baseline/worker.mjs /tmp/sth-reentry-inputs`
   * Save complete stdout/stderr, then process all logs via `python3 summarize.py`.
5. Paired crossover: (active, neither), (alive, both), (both, alive), (neither, active). Same CPU throughout, separate process for each measurement, all original gameplay assertions preserved. The timing/counter outputs may vary in the existing time-budgeted cold deck open and first-fight phases. Confirm native counters in reenter before interpreting memory/time. The test-only diagnostics verify dead child queries and alive/active state.
