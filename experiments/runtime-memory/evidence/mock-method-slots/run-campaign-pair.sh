#!/usr/bin/env bash
# A separate disposable checkout is required; only the mock fixture is swapped.
set -euo pipefail
ROOT=$(realpath "${1:?disposable exact develop checkout}")
OUT=$(realpath "${2:?new output directory}")
HERE=$(cd "$(dirname "$0")" && pwd)
F=tests/lua/support/game_ui_fixture.lua
BASE=32a15219aecd145c59cb1b2fcf477e5556766e5d
test "$(git -C "$ROOT" rev-parse HEAD)" = "$BASE"
test "$(git -C "$ROOT" rev-parse HEAD^{tree})" = 1256fecdf9ae57019d65a77bb4733cbaa00cf3c6
cmp "$ROOT/$F" <(git -C "$ROOT" show HEAD:"$F")
for portrait in avatar96 battle133; do
 file=art/characters/traveler-geo/portraits/$portrait/preview-native-1x.png
 sha=$(git -C "$ROOT" show HEAD:"$file" | sed -n 's/^oid sha256://p')
 test "${#sha}" = 64
 (cd "$ROOT"; echo "$sha  $file" | sha256sum -c -)
done
mkdir "$OUT"
cp "$ROOT/$F" "$OUT/original.lua"
trap 'cp "$OUT/original.lua" "$ROOT/$F"' EXIT
SOAK_PREPARE_ONLY=1 ABYSS_PYTHON=python3 node "$HERE/soak.mjs" "$ROOT" "$OUT/prepared" host-settled 2
(cd "$OUT/prepared/generated"; sha256sum -c "$HERE/generated-lua.sha256")
for arm in original inherited; do
 if [[ $arm == inherited ]]; then (cd "$ROOT"; git apply "$HERE/inherited-methods.patch"); fi
 sha256sum "$ROOT/$F" "$HERE/soak.mjs" > "$OUT/$arm.sha256"
 { time env SOAK_PREPARED_DIR="$OUT/prepared/generated" NODE_OPTIONS=--max-old-space-size=768    node "$HERE/soak.mjs" "$ROOT" "$OUT/$arm" host-settled 2 > "$OUT/$arm.log"; } 2> "$OUT/$arm.time"
done
python3 "$HERE/summarize-campaign.py" "$OUT" > "$OUT/campaign-pair.json"
