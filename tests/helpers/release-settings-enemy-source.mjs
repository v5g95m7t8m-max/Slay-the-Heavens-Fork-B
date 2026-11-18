// Exact CI source join of the reviewed settings preparation and merged PR 710.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const archive = 'tests/helpers/release-settings-enemy-source.json.gz';
const digest = 'b2bad6190854e4e1d9616a8b92d12eb231629422c906e9d6a30bdf41ff4df372';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = text => typeof text === 'string' && !text.includes('\r\r\n')
  ? text.replaceAll('\r\n', '\n')
  : null;
const bytes = readFileSync(new URL('./release-settings-enemy-source.json.gz', import.meta.url));

assert.equal(sha256(bytes), digest, 'complete settings/enemy CI continuation');
const packet = JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion, 1);
assert.deepEqual(packet.parents, {
  settings: '6df29ace41ae4de881ad7b9a0cf04b0387eee4db',
  enemy: 'ead341112170308b5c80582ef016253af5944e81',
});

for (const [path, row] of Object.entries(packet.files)) {
  assert.match(path, /^(?:\.github\/workflows|tests)\//);
  assert.match(row.currentSha256, /^[a-f0-9]{64}$/);
  for (const [side, parent] of Object.entries(row.parents)) {
    assert(Object.hasOwn(packet.parents, side));
    assert.equal(normalize(parent.source), parent.source);
    assert.equal(sha256(parent.source), parent.sha256);
    assert.equal(createHash('sha1')
      .update(`blob ${Buffer.byteLength(parent.source)}\0`)
      .update(parent.source)
      .digest('hex'), parent.gitBlob);
  }
}

export function assertReleaseSettingsEnemyCurrent(read = readFileSync) {
  assert.equal(sha256(read(archive)), digest, 'fresh complete settings/enemy CI archive');
  for (const [path, row] of Object.entries(packet.files)) {
    const current = normalize(read(path, 'utf8'));
    assert(current !== null && sha256(current) === row.currentSha256,
      'fresh complete integration source: settings/enemy ' + path);
  }
}

export function releaseSettingsEnemyParentSource(path, source, side) {
  const row = Object.hasOwn(packet.files, path) ? packet.files[path] : null;
  if (!row || !Object.hasOwn(row.parents, side)) return source;
  const current = normalize(source);
  if (current === null || sha256(current) !== row.currentSha256) return source;

  const parent = row.parents[side].source;
  return source.includes('\r\n') ? parent.replaceAll('\n', '\r\n') : parent;
}
