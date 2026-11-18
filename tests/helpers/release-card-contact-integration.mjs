import {settingsReleaseSource} from './settings-release-source.mjs';
import {beforePreflightSource} from './fork-preflight-source.mjs';
// CI-only join of #697 and #698. Original packets and assertions stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertEnemyJoinCurrent,enemyJoinRead} from './release-enemy-art-join.mjs';
import {assertReleaseEnemyArtCiCurrent} from './release-enemy-art-ci-source.mjs';
import {beforeReleaseFastB9Ci} from './release-fast-b9-ci-source.mjs';
import {beforeCapacityB9Ci,capacityB9CiBindings,assertCapacityB9ReaderRepairCurrent} from './release-capacity-b9-ci-source.mjs';
import {sourceEpoch} from './closeout-source-epoch.mjs';
import {releasePc22BasicFeedbackCiPacket as pc22,assertReleasePc22BasicFeedbackCiCurrent} from './release-pc22-basic-feedback-ci-source.mjs';
import {releaseSelectionMapCiPacket as selection,assertReleaseSelectionMapCiCurrent} from './release-selection-map-ci-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=norm(readFileSync(new URL('./release-card-contact-integration.json',import.meta.url),'utf8'));
assert.equal(hash(bytes),'374e9f3ab0117d08ec202c406d9be466f7f94644b86daf8a3095a3e3a298c171','complete Release card-contact integration bindings');
export const integrationPacket=JSON.parse(bytes);
assert.equal(integrationPacket.head,'17580f25c742a7facb5626db8fc17efb4abe269b');
assert.equal(integrationPacket.base,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
const packets={pc22,selection};
assert.deepEqual(integrationPacket.addedJs,['tests/release-card-contact-integration.test.mjs']);
integrationPacket.inventory=Object.fromEntries(['js','lua'].map(kind=>[kind,[...new Set([
 ...pc22.currentInventory[kind],...selection.currentInventory[kind],...(kind==='js'?integrationPacket.addedJs:[]),
])].sort()]));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
freeze(integrationPacket);
for(const side of Object.keys(packets))for(const kind of ['js','lua'])
 assert(packets[side].currentInventory[kind].every(path=>integrationPacket.inventory[kind].includes(path)),'retain complete '+side+' '+kind+' inventory');
// CI projections never intercept production authorization. Complete standalone
// production views below explicitly go through the fresh joint owner validator.
export function integrationCiSource(path,source,side='pc22',read=readFileSync){
 read=typeof read==='function'?read:read?.read??readFileSync;
 assert(Object.hasOwn(packets,side),'known Release integration side');
 source=beforePreflightSource(path,source);
 source=releaseIntegrationSource(path,source,read);
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 source=beforeCapacityB9Ci(path,source,'b9',undefined,{read});
 if(typeof source!=='string'||source.includes('\r\r\n')||!Object.hasOwn(integrationPacket.files,path)||hash(norm(source))!==integrationPacket.files[path])return source;
 const own=packets[side].files[path],other=packets[side==='pc22'?'selection':'pc22'].files[path];
 return own?.current.source??other?.before?.source??source;
}
function releaseIntegrationSource(path,source,read){
 const beforeCapacity=beforeCapacityB9Ci(path,source,'b9',undefined,{read});
 return beforeReleaseFastB9Ci(path,settingsReleaseSource(path,beforeCapacity,'release'),undefined,read);
}
export function integrationRead(side='pc22',read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);
 if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=integrationCiSource(path,text,side,read);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
// Capacity owns the exact changed CI leaves; the remaining B9 joint inputs
// retain their immutable selection view. Unknown or changed leaves stay raw.
export function integrationCapacityCiRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);
 if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const source=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=Object.hasOwn(capacityB9CiBindings,path)?beforeCapacityB9Ci(path,source,'capacity',undefined,{read}):integrationCiSource(path,settingsReleaseSource(path,source,'release'),'selection',read);
 return typeof raw==='string'?prior:prior===source?raw:Buffer.from(prior);
};}
export function integrationProductionRead(side='pc22',read=readFileSync){
 assert(Object.hasOwn(packets,side),'known Release integration side');
 const ciRead=integrationRead(side,read);
 return(path,encoding)=>{
  if(!path.startsWith('src/')&&path!=='config/architecture.json')return ciRead(path,encoding);
  const raw=read(path,encoding);if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
  const text=typeof raw==='string'?raw:raw.toString('utf8');
  const prior=sourceEpoch.preCombinedSource(path,text,{
   target:side==='pc22'?'releasePc22BasicFeedbackReviewed':'releaseSelectionMapReviewed',readSource:p=>read(p,'utf8')});
  return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
 };
}
export function integrationInventory(kind='js'){
 assert(['js','lua'].includes(kind));return [...integrationPacket.inventory[kind]];
}
export function assertIntegrationRawInventory(paths,kind='js'){
 assert(['js','lua'].includes(kind));assert.deepEqual([...paths].sort(),integrationPacket.inventory[kind],'complete Release integration raw discovery inventory');
}
export function integrationPriorInventory(paths,side='pc22',kind='js',read=readFileSync){
 assert(Object.hasOwn(packets,side));assert(['js','lua'].includes(kind));
 const current=integrationPacket.inventory[kind],prior=packets[side].currentInventory[kind],added=current.filter(p=>!prior.includes(p));
 if(!added.some(p=>paths.includes(p)))return [...paths];
 assertIntegrationRawInventory(paths,kind);
 for(const path of added)assert.equal(hash(norm(releaseIntegrationSource(path,read(path,'utf8'),read))),integrationPacket.files[path],'fresh Release integration added inventory source: '+path);
 return [...prior];
}
export function assertReleaseIntegrationCurrent(read=readFileSync,capacityRead=read){
 assertEnemyJoinCurrent(capacityRead);
 assertReleaseEnemyArtCiCurrent(enemyJoinRead('enemy',capacityRead));
 assertCapacityB9ReaderRepairCurrent(capacityRead);
 for(const [path,sha]of Object.entries(integrationPacket.files))assert.equal(hash(norm(releaseIntegrationSource(path,read(path,'utf8'),read))),sha,'fresh complete integration source: Release join '+path);
 for(const [path,sha]of Object.entries(integrationPacket.archives))assert.equal(hash(read(path)),sha,'retained complete immutable Release join predecessor: '+path);
 assertReleasePc22BasicFeedbackCiCurrent(integrationRead('pc22',read));
 // The capacity validator first checks its complete live CI owners before
 // exposing the unchanged standalone selection packet to older consumers.
 assertReleaseSelectionMapCiCurrent(integrationCapacityCiRead(capacityRead));
}
