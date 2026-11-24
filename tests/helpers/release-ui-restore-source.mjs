import {authorizeRebasedRelease,beforeRebasedRelease} from './rebased-release-source.mjs';
import {beforeLateReleaseUiSource,beforeReleaseDetailSource} from './release-integration-source.mjs';
import {beforeCombatVisualSource,combatVisualPriorRead} from './combat-visual-source.mjs';
import {authorizeRefinedReleaseProduction,beforeRefinedReleaseProduction} from './refined-release-source.mjs';
import {inputRetirementStsFixtureSource} from './input-retirement-sts-binding.mjs';
import {beforeStsFadeCi} from './sts-fade-ci-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const hash=(source,algorithm='sha256')=>createHash(algorithm).update(source).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');

function matches(source,binding){
 if(!binding||typeof source!=='string'||source.includes('\r\r\n'))return false;
 const text=source.replaceAll('\r\n','\n');
 return hash(text)===binding.sha256&&blob(text)===binding.gitBlob;
}

export function releaseUiRestoreArchive(bytes,expectedSha,expectedBase='ff6af63d9bf93056dd772347d10dc749e7fa8d34'){
 assert.equal(hash(bytes),expectedSha,'exact Release UI source archive');
 const {base,files}=JSON.parse(gunzipSync(bytes));
 assert.equal(base,expectedBase);
 for(const [path,{before,after}] of Object.entries(files)){
  assert.equal(hash(before.source),before.sha256,path+' base SHA256');
  assert.equal(blob(before.source),before.gitBlob,path+' base Git blob');
  assert.match(after.sha256,/^[a-f0-9]{64}$/);
  assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
 }
 function project(path,source){
  if(!Object.hasOwn(files,path)||!matches(source,files[path].after))return source;
  const prior=files[path].before.source;
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 return {files,project};
}

const {files,project}=releaseUiRestoreArchive(readFileSync(new URL('./release-ui-restore-source.json.gz',import.meta.url)),
 'e38609afe1efa63715e2f54619fde19501b20b59ebb9a9aaf5944e82b22e339b');
const rightClick=releaseUiRestoreArchive(readFileSync(new URL('./release-card-right-click-source.json.gz',import.meta.url)),
 'a157bfd25b91346bc4b9c7beae6de19baec13e824ee808d59e827b5052d78a1a','ae15cf5f597728f0fe876f7136230955c3ec6179');
const fieldCancel=releaseUiRestoreArchive(readFileSync(new URL('./release-card-field-cancel-source.json.gz',import.meta.url)),
 'f38a352f98ef946e1e836781dd9ebd131010c03e04cfa62f928d94f6358c3bca','aa8fde88c2a077f3e7266984cdf3a4e6be8fc45a');
const controlsGuideRemoval=releaseUiRestoreArchive(readFileSync(new URL('./release-controls-guide-removal-source.json.gz',import.meta.url)),
 '321abc9fb6759dd27644f414c88f3a2df0be32f236a258a52d5b89cc6d22d687','db8bca6ad226bc816de7e6919a320d9d41fe9a78');
const sharedRelics=releaseUiRestoreArchive(readFileSync(new URL('./release-shared-relic-source.json.gz',import.meta.url)),
 '4e72ca430cf8740dd6cb828547d8b8f29ba169c0c90cf49c2c662aa5964df5cc','da94ed7bbcb3002255442f8d120c6c2146878ae7');
const forgeGrid=releaseUiRestoreArchive(readFileSync(new URL('./release-forge-source.json.gz',import.meta.url)),
 '8557c9daa0943c815ca11e0c135d081c08081f040bbef85b3cd799f7a586c564','7381cf7152ba7a726506f9a5b525e13cfbd2c87a');
const recording=releaseUiRestoreArchive(readFileSync(new URL('./recording-0401-source.json.gz',import.meta.url)),
 '9af199338e44fb660599900c5474624853f02be24aa5590029f37cee2a551e24','d26c4dc59e639741471580a242718a284a67f758');
const shopEntry=releaseUiRestoreArchive(readFileSync(new URL('./release-shop-entry-source.json.gz',import.meta.url)),
 'd3c114b39aa8affa1ae5c2b3ee54117640dcacce750efc24d78312792d8d2ff7','b0505f57def990f9d80d7cf917402d7616164f4f');
export const shopEntrySourcePaths=Object.freeze(Object.keys(shopEntry.files).filter(path=>path.startsWith('src/lua/')));
export const beforeReleaseShopEntry=shopEntry.project;
export function shopEntryPriorRead(read){
 return (path,...args)=>beforeReleaseShopEntry(path,read(path,...args));
}
export const beforeRecordingUi=(path,source)=>beforeReleaseDetailSource(path,recording.project(path,beforeCombatVisualSource(path,source)));
const officialRuntimePath='tests/official-assets-runtime.test.mjs';
const currentOfficialRuntime={
 sha256:'a3341b88551a035189ccc811fa7aa2b7f2eb9c1b6377baa22df6ff3b1fc8c828',
 gitBlob:'82bdb7dda43d8772e1d1d5ffac3a9690509d9dd4',
};
const deckLayoutPath='scripts/deck-ui-layout.mjs';
const pileReturnLayout={
 sha256:'0f57f26a4fb520c8feb1df92d48417a6b445900a9ae453c160f500e5a9ee2272',
 gitBlob:'6c9ce59b446f0dd9b8d5f9ffb3c2303e0320195d',
};
function recordingRuntimeInput(path,source){
 // Production owners must remain raw for the entrance cohort's fresh identity check.
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 source=beforeCurrentReplayFixes(path,beforeUiEntranceWitness(path,source));
 if(path!==officialRuntimePath||!matches(source,currentOfficialRuntime))return source;
 return beforeStsFadeCi(path,inputRetirementStsFixtureSource(path,source));
}
function recordingLayoutInput(path,source){
 if(path!==deckLayoutPath||!matches(source,pileReturnLayout))return source;
 const successor="battlePileReturn(button('pileReturn',[-550,-237,180,54],'返回'),theme.officialAssets.buttonInk)";
 const predecessor="battlePileReturn(button('pileReturn',[-550,-237,180,54],'返回'),true,undefined,theme.officialAssets.buttonInk)";
 assert.equal(source.split(successor).length,2,'exact pile return layout change');
 const prior=source.replace(successor,predecessor);
 assert(matches(prior,recording.files[path].after),'exact recording layout predecessor');
 return prior;
}
export function beforeAuthenticatedRecordingStage(path,source,read){
 const input=recordingRuntimeInput(path,source);
 if(input!==source){
  const live=read(path,'utf8');
  assert(typeof live==='string'&&live.replaceAll('\r\n','\n')===source.replaceAll('\r\n','\n'),
   'recording UI linked owner changed: '+path);
 }
 const readInput=owner=>recordingRuntimeInput(owner,read(owner,'utf8'));
 const released=beforeRebasedRelease(path,input);
 if(released!==input)authorizeRebasedRelease([[path,input]],readInput);
 const readReleased=owner=>beforeRebasedRelease(owner,readInput(owner));
 const current=recordingLayoutInput(path,beforeCombatVisualSource(path,released,readReleased));
 const prior=recording.project(path,current);
 if(prior!==current){
  const live=recordingLayoutInput(path,combatVisualPriorRead(readReleased)(path,'utf8'));
  assert(matches(live,recording.files[path].after),'recording UI linked owner changed: '+path);
 }
 return prior===current?source:prior;
}
export const releaseForgeSourcePaths=Object.freeze(Object.keys(forgeGrid.files).filter(path=>path.startsWith('src/lua/')));
export const beforeReleaseForgeGridUi=forgeGrid.project;
export const releaseControlsGuideRemovalSourcePaths=Object.freeze(Object.keys(controlsGuideRemoval.files).filter(path=>path.startsWith('src/lua/')));
export const releaseSharedRelicSourcePaths=Object.freeze(Object.keys(sharedRelics.files).filter(path=>path.startsWith('src/lua/')));
export const beforeReleaseSharedRelicUi=sharedRelics.project;
export const beforeReleaseControlsGuideRemoval=(path,source)=>controlsGuideRemoval.project(path,beforeRecordingUi(path,source));
export const releaseRightClickSourcePaths=Object.freeze(Object.keys(rightClick.files));
export const releaseUiRestoreSourcePaths=Object.freeze([...new Set([...Object.keys(files),...Object.keys(fieldCancel.files)])]);
export const beforeReleaseRightClick=(path,source)=>rightClick.project(path,fieldCancel.project(path,source));
export const beforeReleaseUiRestore=(path,source)=>project(path,beforeReleaseRightClick(path,beforeReleaseControlsGuideRemoval(path,beforeReleaseSharedRelicUi(path,beforeReleaseForgeGridUi(path,beforeRefinedReleaseProduction(path,beforeRecordingUi(path,beforeReleaseShopEntry(path,beforeLateReleaseUiSource(path,source)))))))));
const authorizationPaths=[...new Set([...releaseUiRestoreSourcePaths,...releaseRightClickSourcePaths,...releaseControlsGuideRemovalSourcePaths,...releaseSharedRelicSourcePaths,...releaseForgeSourcePaths])];

export function authorizeReleaseUiRestore(samples,read){
 samples=samples.map(([path,source])=>[path,beforeLateReleaseUiSource(path,source)]);
 const readLive=read;
 read=path=>beforeLateReleaseUiSource(path,readLive(path));
 for(const [path,input] of samples){
  const expected=shopEntry.files[path]?.after;
  if(matches(input,expected))assert(matches(read(path),expected),'shop entry linked owner changed: '+path);
 }
 samples=samples.map(([path,input])=>[path,beforeReleaseShopEntry(path,input)]);
 read=shopEntryPriorRead(read);
 for(const [path,input]of samples){
  beforeCombatVisualSource(path,input,read);
 }
 samples=samples.map(([path,input])=>[path,beforeCombatVisualSource(path,input,read)]);
 read=combatVisualPriorRead(read);
 for(const [path,input] of samples){
  const expected=recording.files[path]?.after;
  if(!matches(input,expected))continue;
  assert(matches(read(path),expected),'recording UI linked owner changed: '+path);
 }
 const rawRead=read;
 samples=samples.map(([path,input])=>[path,beforeRecordingUi(path,input)]);
 read=path=>beforeRecordingUi(path,rawRead(path));
 authorizeRefinedReleaseProduction(samples,read);
 // A combined replay that contains current menu code must use the same release
 // version for every sampled menu owner. Older all-historical views still replay.
 const currentMenu=samples.some(([path,input])=>releaseControlsGuideRemovalSourcePaths.includes(path)
  &&matches(input,controlsGuideRemoval.files[path].after));
 const currentRelics=samples.some(([path,input])=>releaseSharedRelicSourcePaths.includes(path)
  &&matches(input,sharedRelics.files[path].after));
 const currentForge=samples.some(([path,input])=>releaseForgeSourcePaths.includes(path)
  &&matches(input,forgeGrid.files[path].after));
 for(const path of authorizationPaths){
  const inputs=samples.filter(sample=>sample[0]===path).map(sample=>sample[1]);
  if(!inputs.length)continue;
  const menuBinding=controlsGuideRemoval.files[path]?.after;
  const relicBinding=sharedRelics.files[path]?.after;
  const forgeBinding=forgeGrid.files[path]?.after;
  const expected=currentForge&&forgeBinding?forgeBinding:currentRelics&&relicBinding?relicBinding:currentMenu&&menuBinding?menuBinding
   :[forgeBinding,relicBinding,menuBinding,fieldCancel.files[path]?.after,rightClick.files[path]?.after,files[path]?.after]
    .find(binding=>inputs.some(input=>matches(input,binding)));
  if(!expected)continue;
  const message='combined linked owner identity: '+path+' changed during owner validation';
  assert(inputs.every(input=>matches(input,expected)),message);
  let live;
  try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
  assert(matches(live,expected),message);
 }
}

export function beforeAuthenticatedReleaseUiRestore(path,source,read){
 const prior=beforeReleaseUiRestore(path,source);
 if(prior!==source)authorizeReleaseUiRestore([[path,source]],read);
 return prior;
}
