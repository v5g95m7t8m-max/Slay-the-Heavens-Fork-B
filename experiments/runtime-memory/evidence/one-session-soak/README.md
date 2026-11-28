# One-session full campaign runtime memory feasibility
Baseline for these opt-in experiments only: develop `32a15219aecd145c59cb1b2fcf477e5556766e5d`. Do not mix with the earlier 84be or Fork B hard-cap receipts. No release/build configuration, repo source, or remote was changed. Use a writable scratch directory with at least 100 MiB (repo workspace reached ENOSPC; this run used /tmp).

## Reproduce using existing scripts
Set `REPO` to the pinned clean checkout, `LANE` to this script directory, and `OUT` to an empty writable path. Prewarm neither VM nor native runtime manually; each command opens exactly one VM for the entire continuous run.
```sh
mkdir "$OUT"
node "$LANE/soak.mjs" "$REPO" "$OUT/host-2" host 2 >>"$OUT/host-2.log" 2>"$OUT/host-2.err"
node "$LANE/soak.mjs" "$REPO" "$OUT/pure-2" pure 2 >>"$OUT/pure-2.raw.log" 2>"$OUT/pure-2.err"
node "$LANE/soak.mjs" "$REPO" "$OUT/host-count-2" host-count-chest 2 >>"$OUT/host-count-2.log" 2>"$OUT/host-count-2.err"
cd "$REPO"
texlua "$LANE/native-session.lua" "$OUT/pure-2/generated" "$OUT/pure-2/driver.lua" 2 >"$OUT/native-pure-strict-2.raw.log" 2>"$OUT/native-pure-strict-2.err"
MODULES=$(find "$OUT/host-count-2/generated" -maxdepth 1 -name '*.lua' -printf '%f\n' | sed 's/\.lua$//' | sort)
texlua "$LANE/native-session.lua" "$OUT/host-count-2/generated" "$OUT/host-count-2/driver.lua" 2 $MODULES >"$OUT/native-host-2.log" 2>"$OUT/native-host-2.err"
python "$LANE/summarize.py" "$OUT"
```

- Host: repository `official-assets-campaign.lua` through real Host/Run UI commands using generated official structure and fixture controls. Original driver measures 1 complete Act + enters Act II, then fails stale floor bookkeeping because the boss end-combat Continue auto-enters a chest. Corrected diagnostic mode only counts that *observed* extra room, verifies from the task that it is a strict one-floor boss chest, and doesn't lead, shorten, heal, skip or otherwise change route. Existing full route ownership/victory/restart checks remain enabled. No SDK export is used here; claims are scoped to **Host UI mock** (no imported GIL/SDK UI runtime, native frame loop, GPU/device memory).
- Pure: existing `m3-normal-campaign.lua` exclusively drives public gameplay commands. The diagnostic variant still writes its *full* before/after action ledger but streams each record rather than retaining every record in VM. Compares exact parsed ledgers across interpreters. Neither interpreter run restarts mid-campaign. Pure prior/new construction check isn't Host reentry.
- Read-only probes at legal room/act/restart markers: Node V8 heap/RSS and standalone Lua allocated KB/current process RSS. No forced GC, no collection controls, no snapshots, no clamped half-core/heap flags. No JS RSS vs native Lua heap subtraction. A sawtooth heap with rising RSS can be growth in heap capacity/allocator retention; an increasing RSS trajectory alone does not establish a leak. To diagnose retained growth, compare same-page quiescent checkpoints after N real cycles within one session plus independent host-run/device-run controls; do not insert forced GC into timing/safety acceptance runs.

## Validated campaign adapter and negative repro

Use `host-settled` to target the same policy and route without sending premature UI actions. It retains the boss-chest count check, waits at most 60 regular 1/60 shop-room updates for the actual goods-admission guard, and executes the current two-stage close-and-leave UI sequence as **one** existing domain leave. The first Back only retires the overlay; no second transaction or shop reopen. Keeps existing maximum action floor, exact two-boss victory and stable Host ownership assertions. The final restart check clears the old Run/Map verifier references before measuring new Neow.
```sh
node "$LANE/soak.mjs" "$REPO" "$OUT/host-final-2" host-settled 2 >"$OUT/host-final-2.log" 2>"$OUT/host-final-2.err"
cd "$REPO"
MODULES=$(find "$OUT/host-final-2/generated" -maxdepth 1 -name '*.lua' -printf '%f\n' | sed 's/\.lua$//' | sort)
texlua "$LANE/native-session.lua" "$OUT/host-final-2/generated" "$OUT/host-final-2/driver.lua" 2 $MODULES >"$OUT/native-host-final-2.log" 2>"$OUT/native-host-final-2.err"
```
The untouched/policy-early input negative evidence is retained, rather than marked green retroactively. See `logs/shop-readonly-probe.log`. The UI entry was already registered and enabled, 24 purge candidates, gold 545, quote 75, fresh quote. The first attempt was blocked solely by the visual guard: elapsed 0, goods unprepared/hidden; after normal ticks it was visible/admitted. A detached identical transaction verified domain admission without changing the authoritative run. In the final replay the same removal action executed after 6 ticks. The transient stored reason string reporting insufficient gold while the entry is enabled is not the reason the command was rejected; no evidence it was exposed to the player.

## Archived receipt

The `*.log.gz.b64` files preserve the original compressed logs byte-for-byte
through a text-only upload. Decode with `base64 -d < FILE.log.gz.b64 >
logs/FILE.log.gz`. `SHA256SUMS` gives the original archive hashes, including
the full uncompressed summary (not checked in here). The four short JSON
reports preserve every measured memory checkpoint; `verified-parity.json`
records the independently recomputed action and checkpoint parity.

Final Host lane: both interpreters pass 34 rooms, 2 bosses, 1,090 same public
UI actions and same-Host restart. This is one uncapped single-VM route per
interpreter, not proof that the full route fits within 1 GiB, not an
optimization A/B, and not official client memory.
