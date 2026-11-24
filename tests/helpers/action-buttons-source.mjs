// Historical UI replay uses the exact source before the shared action button change.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = source => source.replaceAll('\r\n', '\n');
const archive = readFileSync(new URL('../fixtures/action-buttons-source.json.gz', import.meta.url));
assert.equal(hash(archive), '86634a756c4085906261d4d318118bb1f7692a642479651526c1ace0fefe4487');
const { base, files } = JSON.parse(gunzipSync(archive));
assert.equal(base, '438f48d60a2e5aa81cf82d6f30b909327999226e');
for (const row of Object.values(files)) assert.equal(hash(row.before), row.beforeSha);

export const actionButtonsOwns = path => Object.hasOwn(files, path);
const lastVerifiedBytes = new Map();

function matches(path, source) {
  if (!actionButtonsOwns(path) || typeof source !== 'string') return false;
  if (lastVerifiedBytes.get(path) === source) return true;
  if (source.includes('\r\r\n') || hash(normalize(source)) !== files[path].afterSha) return false;
  lastVerifiedBytes.set(path, source);
  return true;
}

export function beforeActionButtons(path, source) {
  if (!matches(path, source)) return source;
  const prior = files[path].before;
  return source.includes('\r\n') ? prior.replaceAll('\n', '\r\n') : prior;
}

export function authenticateActionButtons(path, source, read) {
  const prior = beforeActionButtons(path, source);
  if (prior !== source) {
    assert(matches(path, read(path)), 'combined linked owner identity: ' + path + ' changed during action button validation');
  }
  return prior;
}
