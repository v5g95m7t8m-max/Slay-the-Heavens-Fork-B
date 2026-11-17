// Exact CI-only continuation of af77; never rewrites partial runner migrations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const path='tests/helpers/hosted-runner-fallback-source.json.gz',sha='3afd6b037220ecce27b4ab9139484bdcbc9e805c501521fa3e9a227485af1aee';
const bytes=readFileSync(new URL('./hosted-runner-fallback-source.json.gz',import.meta.url));
assert.equal(hash(bytes),sha,'complete hosted runner fallback source archive');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.baseCommit,'af77fb2461c548f0faf104761d107397f75dca08');
assert.equal(packet.normalization,'LF');
assert.deepEqual(Object.keys(packet.files),['.github/workflows/quality.yml','tests/ci-summary-runners.test.mjs','tests/helpers/release-capacity-preflight-source.mjs','tests/helpers/release-preflight-union-source.mjs','tests/quick-feedback.test.mjs','tests/release-selection-map-source.test.mjs']);
for(const row of Object.values(packet.files)){
 assert.match(row.currentSha256,/^[a-f0-9]{64}$/);
 assert.equal(row.before.source,norm(row.before.source));
 assert.equal(hash(row.before.source),row.before.sha256,'complete af77 predecessor source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.before.source)}\0`).update(row.before.source).digest('hex'),row.before.gitBlob,'actual af77 predecessor blob');
}
export function beforeHostedRunnerFallback(path,source,before){
 const row=typeof path==='string'&&Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row||before&&before.sha256!==row.before.sha256||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.currentSha256)return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
export function assertHostedRunnerFallbackCurrent(read=readFileSync){
 assert.equal(hash(read(path)),sha,'fresh complete hosted runner fallback archive');
 for(const [p,row]of Object.entries(packet.files)){
  const source=read(p,'utf8');
  assert.equal(typeof source,'string','fresh complete integration source: hosted runner fallback '+p);
  assert(!source.includes('\r\r\n'),'fresh complete integration source: hosted runner fallback '+p);
  assert.equal(hash(norm(source)),row.currentSha256,'fresh complete integration source: hosted runner fallback '+p);
 }
}
