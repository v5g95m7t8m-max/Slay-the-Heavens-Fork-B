#!/usr/bin/env bash
set -euo pipefail
test "$#" -ge 4 || { echo "Usage: bash run.sh <exact Fork src/lua> <exact geometry dir> <pinned upstream checkout> <new output dir> [archived XYZ Lua]" >&2; exit 2; }
root=$(dirname -- "$0")
forklua=$1; geometry=$2; upstream=$3; out=$4; archive=${5:-}
blob() {
  test "$(git hash-object -- "$1")" = "$2" || { echo "Unexpected Git blob: $1" >&2; exit 2; }
}
blob "$forklua/abyss_card_display.lua" fe84e89f76f49c952a158474c1ad3d36e65450c6
blob "$forklua/abyss_card_art_runtime.lua" 02d3c6c9f6d5967ec31ad662481533391ef257dd
blob "$forklua/abyss_numbers.lua" 80763d45a36c1ea978e2f823fc40abb55041f578
blob "$forklua/abyss_card_skin.lua" a9ee6c4126e6fddabfaf088540f935ef38e7ecc4
fixture=$upstream/tests/lua/support/bounded_native_art_fixture.lua
blob "$fixture" 683a78049f79caa2c397c58f0b18bee5e702d2d6
blob "$geometry/strike-geometry.json" 223c157ba137f49cd47387f9654036451bff8509
blob "$geometry/bash-geometry.json" 9d7a9043159d3db6a33eed25dbb4809e42077234
fengari=$upstream/node_modules/fengari-node-cli/src/lua-cli.js
test -f "$fengari" || { echo "Install the upstream repo's lockfile dependencies (npm ci --ignore-scripts) first." >&2; exit 2; }
mkdir "$out"
node "$root/prepare.mjs" "$geometry" "$out/assets.generated.lua"
node "$fengari" "$root/smoke.lua" "$forklua" "$fixture" "$out/assets.generated.lua" exact-fork >"$out/exact-fork.stdout"
grep -E '^(BOUND|SMOKE_PASS|FALLBACK|REJECTION)' "$out/exact-fork.stdout"
modes=()
if [[ -n "$archive" ]]; then
  blob "$archive" 9852acaa9f538dd33ff2ded0366ea8762e1369ea
  node "$fengari" "$root/smoke.lua" "$forklua" "$fixture" "$out/assets.generated.lua" packed-archive "$archive" >"$out/packed-archive.stdout"
  grep -E '^(BOUND|SMOKE_PASS|FALLBACK)' "$out/packed-archive.stdout"
  modes=(packed-archive)
fi
python -B "$root/landmarks.py" "$out" "${modes[@]}"
