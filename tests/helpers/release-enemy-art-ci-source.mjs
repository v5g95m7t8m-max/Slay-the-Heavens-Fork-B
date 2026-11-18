// CI-only outer continuation. Exact complete predecessors remain immutable;
// production code and source projectors never import this helper.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./release-enemy-art-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'dd85f8122fb5a057b6128dcdca8d1b702ad2ac3e9042544d9c9f6eb5eb12f493','complete release enemy artwork CI continuation');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
assert.equal(packet.baseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
assert.equal(packet.currentCommit,packet.baseCommit);
assert.equal(packet.currentTreeCommitted,false,'current bindings are a worktree capture, not claimed in the Release predecessor');
assert.deepEqual(Object.keys(packet.files).sort(),[
 'scripts/build-native-candidate.mjs','scripts/build-ui-theme.mjs','scripts/build-ui.mjs','scripts/lowcost-art.mjs',
 'tests/helpers/closeout-source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs',
 'tests/native-candidate-art.test.mjs','tests/release-selection-map-source.test.mjs',
],'exact eight integrated enemy artwork owners');
assert.deepEqual(Object.keys(packet.currentOwners).sort(),[
 'data/presentation/release-enemy-art.json','src/lua/abyss_lowcost_art.lua',
 'tests/helpers/release-enemy-art-source.mjs','tests/lua/support/formal_enemy_art.lua','tests/native-enemy-portraits.test.mjs',
],'complete additional enemy artwork source and regression closure');
assert.deepEqual(Object.keys(packet.binaryOwners),['tests/helpers/release-enemy-art-source.json.gz']);
for(const digest of Object.values(packet.binaryOwners))assert.match(digest,/^[a-f0-9]{64}$/);
for(const [path,row]of Object.entries(packet.files))assert.notEqual(row.before.sha256,row.current.sha256,'changed continuation owner: '+path);
for(const [path,binding]of [...Object.entries(packet.files).flatMap(([path,row])=>[[path,row.before],[path,row.current]]),...Object.entries(packet.currentOwners)]){
 assert.equal(binding.source,norm(binding.source),path+' LF source');
 assert.equal(hash(binding.source),binding.sha256,path+' complete source');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path+' Git blob');
}
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const releaseEnemyArtCiPacket=freeze(packet);
export function releaseEnemyArtCiSource(path,source){
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
export function releaseEnemyArtCiRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8'),prior=releaseEnemyArtCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function assertReleaseEnemyArtCiCurrent(read=readFileSync){
 for(const [path,digest]of Object.entries(packet.binaryOwners))
  assert.equal(hash(read(path)),digest,'fresh complete integration source: release enemy art '+path);
 for(const [path,binding]of [...Object.entries(packet.files).map(([path,row])=>[path,row.current]),...Object.entries(packet.currentOwners)])
  assert.equal(hash(norm(read(path,'utf8'))),binding.sha256,'fresh complete integration source: release enemy art '+path);
}
