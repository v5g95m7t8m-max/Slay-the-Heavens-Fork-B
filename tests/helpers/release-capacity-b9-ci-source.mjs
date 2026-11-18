import {enemyFastRead,enemyFastSource} from './release-enemy-fast-source.mjs';
import {assertEnemyCapacityCurrent,enemyCapacitySource} from './release-enemy-capacity-join.mjs';
import {capacityPreflightSource,assertCapacityPreflightArchive} from './release-capacity-preflight-source.mjs';
// CI-only exact join of the reviewed capacity and B9 card-contact sources.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./release-capacity-b9-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'4b5149e4e932a51ef4e84784efb1fea3960249e27c21ceccaa35e3058929d49b','complete capacity B9 CI continuation');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.baseCommit,'b9bca884ed9b9831965b409885d78f719b9a567a');
assert.equal(packet.capacityCommit,'27dcd30120642b4d77f04bbacf1ec460e78ac5bf');
assert.equal(packet.mergeCommit,'761ccb5177df77e44485aa9cb5899d49074b7c5f');
assert.equal(packet.normalization,'LF');
assert.deepEqual(Object.keys(packet.files),['tests/helpers/release-bootstrap-ci-source.mjs','tests/helpers/release-selection-map-ci-source.mjs','tests/release-selection-map-source.test.mjs','tests/release-card-contact-integration.test.mjs']);
for(const [path,row]of Object.entries(packet.files))for(const [view,binding]of Object.entries(row.before)){
 assert(['b9','capacity'].includes(view));assert.equal(binding.source,norm(binding.source));
 assert.equal(hash(binding.source),binding.sha256,path+' complete '+view+' predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
}
// Exact repair of the capacity-updated fixtures and the two reader callers.
// The preceding B9 packet stays immutable; these full sources restore only its
// named CI views, never actual Lua execution or production source ownership.
const repairBytes=readFileSync(new URL('./release-capacity-b9-reader-repair.json.gz',import.meta.url));
assert.equal(hash(repairBytes),'2b72f20cb3644959a3d1317052f9f03dbd9675b9a1de30f7e1df544ac4545a99','complete capacity B9 reader repair');
const repair=JSON.parse(gunzipSync(repairBytes));
assert.equal(repair.baseCommit,'80114c7f466ae8a6bf03e30409a3ba5259be7d4c');
assert.equal(repair.normalization,'LF');
assert.deepEqual(Object.keys(repair.files),['tests/art-feature-source-inverse.test.mjs','tests/lua/support/selection_budget_loading.lua','tests/lua/support/selection_portrait_preload.lua','tests/ci-complete-calibration.test.mjs','tests/helpers/release-card-contact-integration.mjs']);
for(const [path,row]of Object.entries(repair.files))for(const binding of [row.before,row.current]){
 assert.equal(binding.source,norm(binding.source));assert.equal(hash(binding.source),binding.sha256,path+' complete reader source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
}
export function assertCapacityB9ReaderRepairCurrent(read=readFileSync){
 assertEnemyCapacityCurrent(read);
 read=enemyFastRead('release',read);
 assertCapacityPreflightArchive(read);
 assert.equal(hash(read('tests/helpers/release-capacity-b9-reader-repair.json.gz')),hash(repairBytes),'fresh complete capacity B9 reader repair packet');
 for(const [path,row]of Object.entries(repair.files)){
  const source=capacityPreflightSource(path,read(path,'utf8'),'capacity');
  assert.equal(typeof source,'string','fresh complete integration source: capacity B9 reader repair '+path);
  assert(!source.includes('\r\r\n'),'fresh complete integration source: capacity B9 reader repair '+path);
  assert.equal(hash(norm(source)),row.current.sha256,'fresh complete integration source: capacity B9 reader repair '+path);
 }
}
export function beforeCapacityB9Ci(path,source,view='b9',before,{read=readFileSync}={}){
 if(!['b9','capacity'].includes(view))return source;
 const binding=view==='b9'&&Object.hasOwn(repair.files,path)?repair.files[path].before:packet.files[path]?.before?.[view];
 if(before&&(!binding||before.sha256!==binding.sha256))return source;
 const joinedSource=enemyFastSource(path,source,'release');
 if(joinedSource!==source)assertEnemyCapacityCurrent(read);
 source=joinedSource;
 source=enemyCapacitySource(path,source,'release',{read});
 source=capacityPreflightSource(path,source,'capacity');
 if(view==='b9'&&typeof path==='string'&&Object.hasOwn(repair.files,path)){
  const row=repair.files[path];
  if(typeof source!=='string'||source.includes('\r\r\n')||before&&before.sha256!==row.before.sha256||hash(norm(source))!==row.current.sha256)return source;
  source=source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
 }
 const row=typeof path==='string'&&Object.hasOwn(packet.files,path)?packet.files[path]:null;
 const prior=row&&Object.hasOwn(row.before,view)?row.before[view]:null;
 if(!prior||typeof source!=='string'||source.includes('\r\r\n')||before&&before.sha256!==prior.sha256)return source;
 if(hash(norm(source))!==row.currentSha256)return source;
 return source.includes('\r\n')?prior.source.replaceAll('\n','\r\n'):prior.source;
}
export const capacityB9CiBindings=Object.freeze(Object.fromEntries(Object.entries(packet.files).map(([path,row])=>[path,Object.freeze({currentSha256:row.currentSha256,b9:row.before.b9.sha256,capacity:row.before.capacity.sha256})])));
export function capacityB9CiRead(read=readFileSync,view='b9'){return(path,encoding)=>{
 const raw=read(path,encoding);
 if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const source=typeof raw==='string'?raw:raw.toString('utf8'),prior=beforeCapacityB9Ci(path,source,view,undefined,{read});
 return typeof raw==='string'?prior:prior===source?raw:Buffer.from(prior);
};}
