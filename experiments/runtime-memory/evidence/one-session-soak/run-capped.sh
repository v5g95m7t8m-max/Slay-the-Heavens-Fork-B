#!/usr/bin/env bash
# Fork B only; exact one-VM mock campaign, not the release pressure suite.
set -euo pipefail
base=32a15219aecd145c59cb1b2fcf477e5556766e5d
tree=1256fecdf9ae57019d65a77bb4733cbaa00cf3c6
lane="$PWD/experiments/runtime-memory/evidence/one-session-soak"
out="$PWD/build/runtime-memory-capped-soak"
mkdir -p "$out"
exec > >(tee "$out/runner.log") 2>&1
root=$(mktemp -d "${RUNNER_TEMP:?}/runtime-memory-base.XXXXXX")
cid=''
cleanup() {
  if [[ -n "$cid" ]]; then docker rm -f "$cid" >/dev/null 2>&1 || true; fi
  git worktree remove --force "$root" >/dev/null 2>&1 || true
}
trap cleanup EXIT
test "${GITHUB_REPOSITORY_ID:-}" = 1460133275
test "${GITHUB_REF:-}" = refs/heads/experiment/sth-runtime-memory-attribution
if ! git cat-file -e "$base^{commit}"; then
  git fetch --no-tags --depth=1 origin "$base"
fi
test "$(git rev-parse "$base^{tree}")" = "$tree"
git worktree add --detach "$root" "$base"
(
  cd "$root"
  git lfs install --local --skip-smudge
  git lfs pull --include='art/characters/traveler-geo/portraits/*/preview-native-1x.png' --exclude=''
  npm ci --ignore-scripts --prefer-offline --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
  test "$(git rev-parse HEAD)" = "$base"
  test "$(git rev-parse 'HEAD^{tree}')" = "$tree"
  git diff --exit-code HEAD --
)
# As in the existing resource suite, fixture construction is separate:
# the pinned runtime image has no Python. The exact build runs on the hosted
# runner and the manifest binds the read-only Lua files to the measured VM.
setup="$root/.memory-soak-inputs"
SOAK_PREPARE_ONLY=1 ABYSS_PYTHON=python3 node "$lane/soak.mjs" "$root" "$setup" host-settled 2
(cd "$setup/generated" && sha256sum ./*.lua > "$out/generated-sha256.txt")
mapfile -t spec < <(node --input-type=module - <<'JS'
import { resourceImage, profiles, productionHeapMiB } from './scripts/runtime-baseline/resource-receipt.mjs';
const {cpus, memoryBytes} = profiles.stress;
if (cpus !== 0.5 || memoryBytes !== 2**30 || productionHeapMiB !== 768) throw new Error('unexpected reference profile');
console.log([resourceImage, cpus, memoryBytes, productionHeapMiB].join('\n'));
JS
)
test "${#spec[@]}" = 4
test "$(docker info --format '{{.CgroupVersion}}')" = 2
image=${spec[0]}
docker pull "$image"
docker image inspect --format '{{.Id}} {{json .RepoDigests}}' "$image" > "$out/docker-image.txt"
{
  printf 'workflow_head=%s\nbase=%s\ntree=%s\nmode=host-settled\nseed=2\nscope=runtime-only; fixtures prepared outside cgroup\n' "${GITHUB_SHA:-}" "$base" "$tree"
  printf 'heap_cap_mib=%s\n' "${spec[3]}"
  sha256sum "$lane/soak.mjs" "$root/package-lock.json"
} > "$out/identity.txt"
cid=$(docker create --network none --cgroupns private --read-only \
  --user "$(id -u):$(id -g)" --workdir /repo \
  --memory "${spec[2]}" --memory-swap "${spec[2]}" --cpus "${spec[1]}" \
  --mount "type=bind,src=$root,dst=/repo,readonly" \
  --mount "type=bind,src=$lane,dst=/probe,readonly" \
  --mount "type=bind,src=$setup/generated,dst=/generated,readonly" \
  --mount "type=bind,src=$out,dst=/receipts" \
  --env SOAK_PREPARED_DIR=/generated --env "SOAK_RUNNER_VERIFIED_HEAD=$base" --env "NODE_OPTIONS=--max-old-space-size=${spec[3]}" \
  "$image" sh -c '
    set -eu
    cg=/sys/fs/cgroup
    snapshot() {
      for key in cpu.max memory.max memory.swap.max memory.peak memory.current cpu.stat memory.events; do
        printf "%s\n" "$key"
        cat "$cg/$key"
      done
    }
    snapshot > /receipts/cgroup-before.txt
    test "$(cat "$cg/cpu.max")" = "50000 100000"
    test "$(cat "$cg/memory.max")" = 1073741824
    test "$(cat "$cg/memory.swap.max")" = 0
    (cd /generated && sha256sum -c /receipts/generated-sha256.txt)
    rc=0
    # Redirect to a regular file (synchronous Node stdout on POSIX);
    # all emitted checkpoints survive a kernel kill of the container.
    ulimit -c 0
    node /probe/soak.mjs /repo /receipts/soak host-settled 2 \
      >/receipts/campaign.log 2>/receipts/campaign.stderr.log || rc=$?
    printf "%s\n" "$rc" > /receipts/node-exit.txt
    snapshot > /receipts/cgroup-after.txt
    exit "$rc"
  ')
printf '%s\n' "$cid" > "$out/container-id.txt"
events_start=$(date -u +%FT%T.%NZ)
docker start "$cid" >/dev/null
wait_rc=0
timeout 20m docker wait "$cid" > "$out/container-exit.txt" || wait_rc=$?
if [[ "$wait_rc" != 0 ]]; then docker kill "$cid" || true; fi
printf '%s\n' "$wait_rc" > "$out/wait-exit.txt"
docker inspect --format '{{json .State}}' "$cid" > "$out/docker-state.json"
docker logs "$cid" > "$out/docker.log" 2>&1 || true
# If the whole container dies before it can snapshot memory.events,
# retain the daemon's container-scoped OOM and exit events as a fallback.
timeout 5s docker events --since "$events_start" --until "$(date -u +%FT%T.%NZ)" \
  --filter "container=$cid" --format '{{json .}}' > "$out/docker-events.log" || true
if [[ -f "$out/campaign.log" ]]; then
  grep '^SOAK_MEMORY ' "$out/campaign.log" | tail -n 1 || true
fi
# A failed/OOM run uploads its raw evidence but stays red. Missing restart
# marker, pressure metadata, or proof of no OOM is never a passing receipt.
test "$wait_rc" = 0
test "$(cat "$out/container-exit.txt")" = 0
test "$(cat "$out/node-exit.txt")" = 0
node -e 'if (require(process.argv[1]).OOMKilled !== false) process.exit(1)' "$out/docker-state.json"
grep -q '^oom_kill 0$' "$out/cgroup-after.txt"
grep -q '^oom 0$' "$out/cgroup-after.txt"
grep -q '^SOAK_MEMORY .*"label":"restart-neow"' "$out/campaign.log"
grep -qx OFFICIAL_CAMPAIGN_PASS "$out/campaign.log"
node --input-type=module - "$out/soak/identity.json" "$out/generated-sha256.txt" <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const identity=JSON.parse(readFileSync(process.argv[2],'utf8'));
const expected=Object.fromEntries(readFileSync(process.argv[3],'utf8').trim().split('\n').map(s=>{
  const [hash, name]=s.split('  ./');
  return [name, hash];
}));
assert.deepEqual(identity.generatedHashes, expected, 'runtime Lua manifest diverged from hashed build');
JS
