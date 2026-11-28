#!/usr/bin/env bash
set -eu
sourceDir=$(cd "$(dirname "$0")"; pwd)
test "$(git rev-parse HEAD)" = 32a15219aecd145c59cb1b2fcf477e5556766e5d
mkdir -p build/perf-tx/production
cp "$sourceDir"/{build-harness.py,microbench.lua,micro-flat.lua,run-lua.mjs,rollback-check.lua,pairs.sh,summarize.py,variants.py} build/perf-tx/
d=build/perf-tx
cp src/lua/abyss_snapshot.lua "$d/base.lua"
python3 "$d/variants.py"
python3 "$d/build-harness.py"
npm run build:data
# npm ci and repository's validated LFS hydration are assumed complete.
txCpu=${TX_CPU:-6}
microCpu=${TX_MICRO_CPU:-7}
taskset -c "$txCpu" node --max-old-space-size=768 scripts/runtime-baseline/production-inputs.mjs "$d/production"
TX_CPU="$txCpu" bash "$d/pairs.sh"
taskset -c "$microCpu" node --max-old-space-size=768 "$d/run-lua.mjs" "$d/microbench.lua" > "$d/microbench.log" 2>&1
taskset -c "$microCpu" node --max-old-space-size=768 "$d/run-lua.mjs" "$d/micro-flat.lua" > "$d/micro-flat.log" 2>&1
for arm in base direct; do
 taskset -c "$microCpu" node --max-old-space-size=768 "$d/run-lua.mjs" "$d/rollback-check.lua" "$arm" > "$d/rollback-$arm.log" 2>&1
done
if taskset -c "$microCpu" node --max-old-space-size=768 "$d/run-lua.mjs" "$d/rollback-check.lua" negative > "$d/rollback-negative.log" 2>&1; then
 echo 'Unexpected rollback negative pass' >&2; exit 1
fi
grep -qs 'snapshot target is not captured' "$d/rollback-negative.log"
python3 "$d/summarize.py"
