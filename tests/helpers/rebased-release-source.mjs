// Exact historical views of the joint develop/Release composition.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';
import {battlePeripheryPredecessor,beforeBattlePeriphery} from './battle-periphery-source.mjs';
import {beforeChapterBattleScene,beforeResponsiveHand,chapterBattleSceneReader} from './chapter-battle-scene-source.mjs';
import {authenticateInputRetirement,beforeInputRetirement} from './input-retirement-source.mjs';
import {beforeOfficialCharacterBackflow} from './current-replay-fix-sources.mjs';
const hash=(s,algorithm='sha256')=>createHash(algorithm).update(s).digest('hex');
const archive=readFileSync(new URL('./rebased-release-source.json.gz',import.meta.url));
assert.equal(hash(archive),'9ae910d679bdc8386063c58043a43e496ee34b7c6f22fc1a27cbaeca7b27222d','exact reconciled source archive');
const {develop,release,ci,production,releaseCopier,reviewedBuild,stsUi}=JSON.parse(gunzipSync(archive));
assert.equal(develop,'aae948788d93012d11fe5b6da3281150bb9957c6');
assert.equal(release,'930097995be43e5612e949a3b5fa0c1d5d305f49');
for(const rows of [ci,production,reviewedBuild.files,stsUi.files])for(const {before} of Object.values(rows))assert(matches(before.source,before));
assert.equal(stsUi.source,'d667ad4dd4b7dc4ad5419aee8eba8a1548ea5769');
assert.equal(reviewedBuild.source,'900527d931df941eed642a9667ccde92f76b73db');
assert(matches(releaseCopier.source,releaseCopier),'immutable Release copy closure');
export const historicalReleaseCopier=source=>source.includes('\r\n')?releaseCopier.source.replaceAll('\n','\r\n'):releaseCopier.source;
// Only the exact native button repair can be projected onto the previous receipt.
const nativeButtonRepair=Object.freeze({
 "scripts/official-assets-layout.mjs":{
  after:'564bb350c05b86866005d76eb44457b78a6c4f29bbe9d1954366d62433b8753e',
  before:'8204a7befe1e19244a740dc4da965aea1689b5f006a013507adbf43a4c3a2fea',
  edits:[
   ["  const deckPanel=child(child(tree,'stage')??tree,'deckPanel');\n  const pileReturn=child(deckPanel,'pileReturn');\n  if(pileReturn){\n   // The installed Simulator cannot bind the normal child of a native preset.\n   const preset=child(pileReturn,'hit'),art=child(preset,'normal');\n   art.name='art';\n   pileReturn.children=[art,{name:'hit',kind:'cursorArea',size:[...preset.size],focusable:preset.focusable}];\n  }\n  const tools=child(deckPanel,'pileTools');",
    "  const pileReturn=child(child(tree,'stage')??tree,'deckPanel');\n  const tools=child(pileReturn,'pileTools');"],
  ],
 },
 "scripts/character-selection-composition.mjs":{
  after:'c9b0efc1dd5c2fdc14b64656958d660746f90f52ccd4087d0ced50073dca6793',
  before:'bdb5e22233716ba43e55869dc59adf499cf42bcfc498bb7c61c02229f02525b5',
  edits:[
   [" for(const state of children(hit)){\n  for(const name of ['officialButtonBacking','border','plate']){\n   const part=child(state,name);if(part)part.visible=false;\n  }\n  const label=child(state,'label'),previous=child(state,'v25Flag');",
    " for(const state of children(hit)){\n  const label=child(state,'label'),previous=child(state,'v25Flag');"],
  ],
 },
 "tests/official-assets.test.mjs":{
  after:'715bdc9709f019bc7904709cee6cfaa20f91d8f0265896ba597928df602d5161',
  before:'ddfee77694dcf0bc4f12b419e143f723c6d5b865bf82661fbfde4474df10c162',
  edits:[
   ["    // The rounded face is visible independently of the native input receiver.\n    if(path.endsWith('/hit')){\n     const hit=current.get(path);assert.equal(hit.kind,'cursorArea');\n     assert.deepEqual(hit.size,before.size);assert.equal(hit.focusable,true);\n     const art=current.get(path.replace(/\\/hit$/,'/art'));\n     assert.notEqual(art.visible,false);\n     assert.equal(child(art,'roundedButton').kind,'container');\n     assert.equal(child(art,'label').text.content,'返回');\n    }",
    "    // The pile return keeps its native receiver while replacing the artwork.\n    if(path.endsWith('/hit')){\n     const hit=current.get(path);assert.equal(hit.kind,'presetButton');\n     assert.deepEqual(hit.size,before.size);assert.equal(hit.focusable,true);\n    }"],
   [" const back=child(child(panel,'cancel'),'hit');\n const confirm=child(child(panel,'confirm'),'hit');\n for(const button of [hit,back,confirm])for(const state of children(button)){\n  const legacy=children(state).filter(part=>['officialButtonBacking','border','plate'].includes(part.name));\n  assert(legacy.length>0,'official composition must exercise the existing backing');\n  assert(legacy.every(part=>part.visible===false),'legacy backing is visible through the rounded corners');\n }\n for(const state of children(hit)){\n  assert.deepEqual(child(state,'v25Flag'),child(child(back,state.name),'v25Flag'));",
    " const back=child(child(panel,'cancel'),'hit');\n for(const state of children(hit)){\n  assert.deepEqual(child(state,'v25Flag'),child(child(back,state.name),'v25Flag'));"],
  ],
 },
});
const officialCompositionPath='scripts/character-selection-composition.mjs';
export const beforeOfficialComposition=(path,source)=>path===officialCompositionPath?beforeOfficialCharacterBackflow(path,source):source;
export function assertCurrentOfficialComposition(path,source){
 if(path===officialCompositionPath)assert(beforeOfficialComposition(path,source)!==source,'fresh current production owner: '+path);
}
function nativeButtonPredecessor(path,source){
 source=beforeInputRetirement(path,beforeOfficialComposition(path,source));
 const row=Object.hasOwn(nativeButtonRepair,path)?nativeButtonRepair[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=source.replaceAll('\r\n','\n');
 if(hash(current)!==row.after)return source;
 let prior=current;
 for(const [after,before] of row.edits){
  assert.equal(prior.split(after).length,2,'exact native button repair edit: '+path);
  prior=prior.replace(after,()=>before);
 }
 assert.equal(hash(prior),row.before,'exact native button repair predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeNativeButtonRepair(path,source){
 return nativeButtonPredecessor(path,beforeBattlePeriphery(path,beforeChapterBattleScene(path,source)));
}
function historical(rows,path,source){
 const row=Object.hasOwn(rows,path)?rows[path]:null;
 if(!row||!matches(beforeNativeButtonRepair(path,source),row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
export function exactReviewedBuildInput(path,read,{beforeReviewedInput}={}){
 if(!Object.hasOwn(reviewedBuild.files,path))return undefined;
 const rawRead=(owner,encoding='utf8')=>read(owner,encoding);
 const chapter=chapterBattleSceneReader(path,rawRead(path),rawRead);
 const {source,read:historicalRead}=battlePeripheryPredecessor(path,chapter.source,chapter.read);
 const {after,before}=reviewedBuild.files[path];
 let current=beforeNativeButtonRepair(path,source);
 if(!matches(current,after)&&beforeReviewedInput)current=beforeNativeButtonRepair(path,beforeReviewedInput(path,source,historicalRead));
 assert(matches(current,after),'fresh reviewed build input: '+path);
 return before.source;
}
export const beforeRebasedCi=(path,source)=>historical(ci,path,source);
export const beforeRebasedRelease=(path,source)=>historical(production,path,source);
export const rebasedReleaseOwns=path=>Object.hasOwn(production,path);
export const rebasedDevelopOwns=path=>path.startsWith('src/lua/')&&Object.hasOwn(ci,path);
export function authorizeRebasedRelease(samples,read,sources=production){
 const seen=new Set();
 for(const [path,source] of samples){
  if(!Object.hasOwn(sources,path)||seen.has(path))continue;
  const chapter=beforeChapterBattleScene(path,source);
  const periphery=beforeBattlePeriphery(path,chapter);
  const {after}=sources[path],current=nativeButtonPredecessor(path,periphery);
  if(!matches(current,after))continue;
  seen.add(path);
  authenticateInputRetirement(path,periphery,owner=>beforeBattlePeriphery(owner,beforeChapterBattleScene(owner,read(owner))));
  const handProjected=beforeResponsiveHand(path,source)!==source;
  const chapterProjected=chapter!==source,peripheryProjected=periphery!==chapter;
  const retiredInput=beforeInputRetirement(path,periphery)!==periphery,repaired=current!==periphery;
  const officialComposition=beforeOfficialComposition(path,periphery)!==periphery;
  const sameRevision=bytes=>{
   const chapterBefore=beforeChapterBattleScene(path,bytes);
   const peripheryBefore=beforeBattlePeriphery(path,chapterBefore);
   const before=nativeButtonPredecessor(path,peripheryBefore);
   return (beforeResponsiveHand(path,bytes)!==bytes)===handProjected
    &&(chapterBefore!==bytes)===chapterProjected
    &&(peripheryBefore!==chapterBefore)===peripheryProjected
    &&(beforeOfficialComposition(path,peripheryBefore)!==peripheryBefore)===officialComposition
    &&(beforeInputRetirement(path,peripheryBefore)!==peripheryBefore)===retiredInput
    &&(before!==peripheryBefore)===repaired&&matches(before,after);
  };
  assert(samples.every(([owner,bytes])=>owner!==path||sameRevision(bytes)),'combined linked owner identity: '+path+' mixed live and predecessor sources');
  let live;
  try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
  assert(sameRevision(live),'combined linked owner identity: '+path+' changed during owner validation');
 }
}

export function authorizeRebasedDevelop(samples,read){return authorizeRebasedRelease(samples,read,ci);}

export const beforeRebasedStsUi=(path,source)=>historical(stsUi.files,path,source);
export function authorizeRebasedStsUi(samples,read){return authorizeRebasedRelease(samples,read,stsUi.files);}
