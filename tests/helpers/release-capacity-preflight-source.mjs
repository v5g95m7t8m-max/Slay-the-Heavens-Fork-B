import {beforeHostedRunnerFallback,assertHostedRunnerFallbackCurrent} from './hosted-runner-fallback-source.mjs';
// Exact CI-only parent views for the prepared 359 + 703 source join.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const path='tests/helpers/release-capacity-preflight-source.json.gz',sha='a65901a61cbefd3e75ad9afa37f733db6ece7943fbdb839dd73115aaca5ed4ba';
const bytes=readFileSync(new URL('./release-capacity-preflight-source.json.gz',import.meta.url));
assert.equal(hash(bytes),sha,'complete prepared capacity/preflight source join');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.parents,{preflight:'359b426f456f7445345f1a014ac4eb18b9385e0e',capacity:'6980b909db9e3d1a2f425ebaf31524aebc156416'});
for(const row of Object.values(packet.files))for(const binding of Object.values(row.views)){
 assert.equal(binding.source,norm(binding.source));assert.equal(hash(binding.source),binding.sha256,'complete named parent source');
}
export function assertCapacityPreflightArchive(read=readFileSync){assert.equal(hash(read(path)),sha,'fresh complete capacity/preflight archive');}
export function assertCapacityPreflightCurrent(read=readFileSync){
 assertCapacityPreflightArchive(read);
 assertHostedRunnerFallbackCurrent(read);
 for(const [p,row]of Object.entries(packet.files)){
  const source=beforeHostedRunnerFallback(p,read(p,'utf8'));assert.equal(typeof source,'string');assert(!source.includes('\r\r\n'));
  assert.equal(hash(norm(source)),row.currentSha256,'fresh complete integration source: capacity/preflight '+p);
 }
}
export function capacityPreflightSource(path,source,view,before){
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null,binding=row&&Object.hasOwn(row.views,view)?row.views[view]:null;
 if(!binding||before&&before.sha256!==binding.sha256)return source;
 source=beforeHostedRunnerFallback(path,source);
 if(typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.currentSha256)return source;
 return source.includes('\r\n')?binding.source.replaceAll('\n','\r\n'):binding.source;
}
