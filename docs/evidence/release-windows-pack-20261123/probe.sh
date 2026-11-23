#!/usr/bin/env bash
# Run from a repository whose local object database already contains the six blobs.
set -eu -o pipefail
repo=${1:-.}
t=$(mktemp -d)
trap 'rm -rf -- "$t"' EXIT
cat > "$t/oids" <<'OIDS'
16ce40fae511b39072f695159a60f8bc6a818bb7
d790bd83f77ef44eb682aca5c08617b0b06f9c2c
7507dd9dadee24535388a3cf3493313564612a1c
03b23f9c08167f93b9fe02e1f7855d2fe5056c67
593584fcb830fe26d63dac58a68533ba8ed4a80f
e75bbd58d0a386837be52d84d8f42424f34e71bb
OIDS
for level in 1 6 9; do
  p="$t/level-$level.pack"
  GIT_NO_LAZY_FETCH=1 git -C "$repo" -c pack.compression="$level"     pack-objects --stdout --no-reuse-object --no-reuse-delta --threads=1 < "$t/oids" > "$p"
  git index-pack "$p" >/dev/null
  git verify-pack -v "${p%.pack}.idx" | awk '$2=="blob"{print $1}' | sort > "$t/actual"
  diff -u <(sort "$t/oids") "$t/actual"
  printf 'compression=%s bytes=%s\n' "$level" "$(wc -c < "$p" | tr -d ' ')"
done
