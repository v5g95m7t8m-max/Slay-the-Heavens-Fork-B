import {releaseSettingsEnemyParentSource} from './release-settings-enemy-source.mjs';
// Fixed CI-only join of the reviewed settings input and the actual Release.
// This trust leaf is excluded from its own packet; old packets stay unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const packetPath='tests/helpers/settings-release-source.json.gz';
const bytes=readFileSync(new URL('./settings-release-source.json.gz',import.meta.url));
const sha='7af2c4c8ed9738ecf1e548679b83224f68870eef31c2faa0efd6e5a145e4c0c7';
assert.equal(hash(bytes),sha,'complete settings Release join');
export const settingsReleasePacket=JSON.parse(gunzipSync(bytes));
assert.equal(settingsReleasePacket.schemaVersion,1);
assert.deepEqual(settingsReleasePacket.parents,{settings:'809130efa555fbd228a099efff7e4652f2295df7',release:'af77fb2461c548f0faf104761d107397f75dca08'});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
for(const [path,row]of Object.entries(settingsReleasePacket.files))for(const binding of [row.current,...Object.values(row.views)]){
 assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path+' complete settings Release source');
}
freeze(settingsReleasePacket);
export function assertSettingsReleaseArchive(read=readFileSync){assert.equal(hash(read(packetPath)),sha,'fresh immutable settings Release join');}
function assertSettingsSourceCurrent(path,row,read,message){
 const source=releaseSettingsEnemyParentSource(path,read(path,'utf8'),'settings');
 assert.equal(typeof source,'string',message);
 assert(!source.includes('\r\r\n'),message);
 assert.equal(hash(norm(source)),row.current.sha256,message);
}
export function assertSettingsReleaseCurrent(read=readFileSync){
 assertSettingsReleaseArchive(read);
 for(const [path,row]of Object.entries(settingsReleasePacket.files))
  assertSettingsSourceCurrent(path,row,read,'fresh complete integration source: settings Release '+path);
}
export function assertSettingsReleaseStsOwners(paths,read=readFileSync){
 for(const path of paths){
  if(!Object.hasOwn(settingsReleasePacket.files,path))continue;
  assertSettingsSourceCurrent(path,settingsReleasePacket.files[path],read,'fresh complete StS CI source: '+path);
 }
}
export function settingsReleaseSource(path,source,side='release'){
 assert(['settings','release'].includes(side),'known settings Release parent');
 if(path.startsWith('src/')||path==='config/architecture.json'||path==='scripts/official-battle-hud.mjs')return source;
 source=releaseSettingsEnemyParentSource(path,source,'settings');
 const row=Object.hasOwn(settingsReleasePacket.files,path)?settingsReleasePacket.files[path]:null;
 if(!row?.views[side]||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
 return row.views[side].sha256===row.current.sha256?source:row.views[side].source;
}
// Exact CI parent views always keep production owners current.
export function settingsReleaseRead(side='release',read=readFileSync){return(path,encoding)=>{
 const source=read(path,encoding);return typeof source==='string'?settingsReleaseSource(path,source,side):source;
};}
// Only an explicitly named immutable fixture may request the old HUD. Every
// such projection rechecks the complete live caller; normal readers never do it.
export function settingsReleaseHistoricalRead(side='release',read=readFileSync){
 assert(['settings','release'].includes(side));const ciRead=settingsReleaseRead(side,read);
 return(path,encoding)=>{
  const source=ciRead(path,encoding),row=settingsReleasePacket.files[path];
  if(path!=='scripts/official-battle-hud.mjs'||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
  if(row.views[side].sha256===row.current.sha256)return source;
  assertSettingsReleaseCurrent(read);
  return source.includes('\r\n')?row.views[side].source.replaceAll('\n','\r\n'):row.views[side].source;
 };
}
export function settingsReleasePriorInventory(paths,side='release',kind='js'){
 assert(['settings','release'].includes(side));assert(['js','lua'].includes(kind));
 return JSON.stringify([...paths].sort())===JSON.stringify(settingsReleasePacket.inventory[kind])?[...settingsReleasePacket.inventories[side][kind]]:[...paths];
}
export function assertSettingsReleaseRawInventory(paths,kind='js'){
 assert(['js','lua'].includes(kind));assert.deepEqual([...paths].sort(),settingsReleasePacket.inventory[kind],'complete settings Release raw '+kind+' inventory');
}
