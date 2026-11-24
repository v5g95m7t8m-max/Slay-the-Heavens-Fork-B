import { beforeUiEntrance, entranceInventory, entrancePredecessor, entranceReader } from './ui-entrance-source.mjs';
// Exact Develop predecessors for historical replay. Live builds read current sources.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches as matches,sourceConfigLayoutMatches} from './source-fingerprint.mjs';
import {authenticateInputRetirement,beforeInputRetirement,beforeInputRetirementReader,inputRetirementOwns,isCurrentInputRetirementSource,beforeCombatEvents,combatEventsOwns,beforeDevelopUiBackflows,assertPointerInputSource,pointerInputPath,retiredControllerPath,readRetiredController} from './input-retirement-source.mjs';
import {assertRelicDetailCurrent,authenticateRelicDetail,beforeRelicDetail,relicDetailOwns} from './relic-detail-source.mjs';
import {beforeNativeFlowFixture} from './native-flow-fixture-source.mjs';
import {authenticateActionButtons,beforeActionButtons,actionButtonsOwns} from './action-buttons-source.mjs';

const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const archive=readFileSync(new URL('../fixtures/develop-release-backflow-source.json.gz',import.meta.url));
assert.equal(hash(archive),'c50d048f5daaa4ecc7ffa110ca9a4dc144cb4393e51fb8666c572b16347bede4','exact Develop Release-backflow source archive');
const {base,files:releaseFiles,shopBase,shop}=JSON.parse(gunzipSync(archive));
assert.equal(base,'742a540ffc999e91acdface3d8fc7f753731f0a8');
assert.equal(shopBase,'82ba375397ffd7f8f8175a7a1fd18a973450ecc6');
const travelerArchive=readFileSync(new URL('../fixtures/develop-traveler-touch-source.json.gz',import.meta.url));
assert.equal(hash(travelerArchive),'58bed3fd2bfe7a20e5e9d2b9760b5f7dd165bde92201dd49fa90e36bb17168c9','exact Develop Traveler touch source archive');
const traveler=JSON.parse(gunzipSync(travelerArchive));
assert.equal(traveler.base,shopBase);
assert.deepEqual(Object.keys(traveler.files),['src/lua/abyss_battle_detail_bindings.lua','tests/lua/traveler_power_tooltip.lua']);
for(const path of Object.keys(traveler.files))assert(!Object.hasOwn(releaseFiles,path)&&!Object.hasOwn(shop,path),'distinct Develop backflow source owner: '+path);
const eventArchive=readFileSync(new URL('../fixtures/event-projection-predecessors.json.gz',import.meta.url));
assert.equal(hash(eventArchive),'87e8e3e410ad515264f668ca53abd8fee8bf8c57b7603c10d7c60882cb9339ea','exact event projection source archive');
const eventProjection=JSON.parse(gunzipSync(eventArchive));
assert.equal(eventProjection.base,'8a59d03c26ec54360c4e6953958522dc8d2e8d07');
assert.deepEqual(Object.keys(eventProjection.files),[
 'src/lua/abyss_act2_events.lua','src/lua/abyss_act3_events.lua','src/lua/abyss_colorless_cards.lua',
]);
const backflowFiles={...releaseFiles,...traveler.files};
for(const path of Object.keys(eventProjection.files))assert(!Object.hasOwn(backflowFiles,path)&&!Object.hasOwn(shop,path),'distinct event projection source owner: '+path);
const files={...backflowFiles,...eventProjection.files};
const mapPath='src/lua/abyss_map_ui.lua';
const mapArchive=readFileSync(new URL('../fixtures/develop-map-render-source.json.gz',import.meta.url));
assert.equal(hash(mapArchive),'9d52d048c3db1818cb7f9e7fdc8cd881639e958b782593f5dae99923c26d80aa','exact Develop map render source archive');
const mapRender=JSON.parse(gunzipSync(mapArchive));
assert.equal(mapRender.base,'8a59d03c26ec54360c4e6953958522dc8d2e8d07');
assert.deepEqual(Object.keys(mapRender.files),[mapPath]);
const mapBefore=mapRender.files[mapPath].before;
assert(matches(mapBefore.source,files[mapPath].after),'map render preserves the exact Develop backflow predecessor');
const cardDisplayArchive=readFileSync(new URL('../fixtures/develop-card-display-responsibilities-source.json.gz',import.meta.url));
assert.equal(hash(cardDisplayArchive),'fafb7ec975e6ae3fa1f0629a7366a0f673bbad64668afede85267e7af0d0871c','exact Develop card-display-responsibilities predecessor archive');
const cardDisplay=JSON.parse(gunzipSync(cardDisplayArchive));
assert.equal(cardDisplay.base,'8a59d03c26ec54360c4e6953958522dc8d2e8d07');
assert.deepEqual(Object.keys(cardDisplay.files),["src/lua/abyss_watcher_flow_cards.lua"]);
for(const path of Object.keys(cardDisplay.files))assert(![mapRender.files,files,shop].some(layer=>Object.hasOwn(layer,path)),'distinct Develop cardDisplay source owner: '+path);
const displayLeafArchive=readFileSync(new URL('../fixtures/develop-card-display-leaf-source.json.gz',import.meta.url));
assert.equal(hash(displayLeafArchive),'424ee22e001dbcc5bf1256622b0dd527da3b1ca428330fbf7ce98c7fa21c943d','exact Develop card display leaf predecessor archive');
const displayLeaf=JSON.parse(gunzipSync(displayLeafArchive));
assert.equal(displayLeaf.base,'ae94d8079df3263c88281e04c9eb05847cf65066');
assert.equal(displayLeaf.head,'27b8b5509306fc106fa1528b488d3d2c5146afb8');
const warriorStatusPath='src/lua/abyss_warrior_status_cards.lua';
assert.deepEqual(Object.keys(displayLeaf.files),['src/lua/abyss_original_v4_display.lua',warriorStatusPath]);
for(const path of Object.keys(displayLeaf.files))assert(![cardDisplay.files,mapRender.files,files,shop].some(layer=>Object.hasOwn(layer,path)),'distinct Develop display leaf owner: '+path);
const portraitLifecycleArchive=readFileSync(new URL('../fixtures/develop-native-portrait-lifecycle-source.json.gz',import.meta.url));
assert.equal(hash(portraitLifecycleArchive),'1e0d7cf24e2bd08938383e862161fe5d70c9a5ae29a216a8890c1768b8c57422','exact Develop native-portrait-lifecycle predecessor archive');
const portraitLifecycle=JSON.parse(gunzipSync(portraitLifecycleArchive));
assert.equal(portraitLifecycle.base,'8a59d03c26ec54360c4e6953958522dc8d2e8d07');
assert.deepEqual(Object.keys(portraitLifecycle.files),["src/lua/abyss_traveler_portraits.lua"]);
for(const path of Object.keys(portraitLifecycle.files))assert(![cardDisplay.files,mapRender.files,files,shop].some(layer=>Object.hasOwn(layer,path)),'distinct Develop portraitLifecycle source owner: '+path);
const rewardUiArchive=readFileSync(new URL('../fixtures/develop-reward-ui-responsibilities-source.json.gz',import.meta.url));
assert.equal(hash(rewardUiArchive),'063a04ed8a26ea941887da6050376f12964baaf63ca62ac63f92a8bc62a4c207','exact Develop reward UI predecessor archive');
const rewardUi=JSON.parse(gunzipSync(rewardUiArchive));
assert.equal(rewardUi.base,'2f9444dcbd33ac71a6507db1775be5b70533e68a');
assert.equal(rewardUi.original,'c6cee6a793e32628e8f747ce6515475be4cad0b0');
const deckPath='src/lua/abyss_deck_ui.lua';
assert.deepEqual(Object.keys(rewardUi.files),[
 'src/lua/abyss_choice_ui.lua',deckPath,'src/lua/abyss_match_event_ui.lua','src/lua/abyss_treasure_ui.lua',
]);
assert(matches(rewardUi.files[deckPath].before.source,files[deckPath].after),'reward UI preserves the exact Forethought deck predecessor');
for(const path of Object.keys(rewardUi.files)){
 const inherited=[portraitLifecycle.files,cardDisplay.files,mapRender.files,shop,...(path===deckPath?[]:[files])];
 assert(!inherited.some(layer=>Object.hasOwn(layer,path)),'distinct Develop reward UI source owner: '+path);
}
const feedbackPath='src/lua/abyss_feedback.lua';
const feedbackArchive=readFileSync(new URL('../fixtures/develop-battle-feedback-responsibilities-source.json.gz',import.meta.url));
assert.equal(hash(feedbackArchive),'c8432495ff7b795025f12f0f931d55e6409505b6347fbbddc46701555f80e791','exact Develop battle-feedback-responsibilities predecessor archive');
const battleFeedback=JSON.parse(gunzipSync(feedbackArchive));
assert.equal(battleFeedback.base,'2f9444dcbd33ac71a6507db1775be5b70533e68a');
assert.equal(battleFeedback.source,'254960fb39b085d72a75fccaa72fc9e393961fd3');
assert.deepEqual(Object.keys(battleFeedback.files),[feedbackPath]);
assert(matches(battleFeedback.files[feedbackPath].before.source,files[feedbackPath].after),'battle feedback preserves the exact Develop backflow predecessor');
assert(matches(battleFeedback.frozenAfter.source,battleFeedback.frozenAfter),'frozen branch feedback identity');
export const developBattleFeedback=Object.freeze({before:battleFeedback.files[feedbackPath].before.source,frozenAfter:battleFeedback.frozenAfter.source});
const stasisArchive=readFileSync(new URL('../fixtures/develop-stasis-upgrade-boundary-source.json.gz',import.meta.url));
assert.equal(hash(stasisArchive),'04dd257d8cdd059a629082e1e3cf39c89f636dc8b2376c3c30286baae23065de','exact Develop Stasis upgrade predecessor archive');
const stasis=JSON.parse(gunzipSync(stasisArchive));
assert.equal(stasis.base,'3d4283eeded352ff1aebd9f897933c2e095e2b02');
assert.equal(stasis.original,'c6f85876205c90b0c6a4125f98a4188a8ebd287b');
assert.deepEqual(Object.keys(stasis.files),['config/architecture.json','src/lua/abyss_act2_stasis.lua','src/lua/abyss_combat.lua',warriorStatusPath]);
assert(matches(stasis.files[warriorStatusPath].before.source,displayLeaf.files[warriorStatusPath].after),'Stasis follows the exact Warrior status display predecessor');
export const stasisUpgradeAddedPaths=Object.freeze(['src/lua/abyss_blood_for_blood_cost.lua','src/lua/abyss_card_upgrade.lua']);
assert.deepEqual(Object.keys(stasis.added),stasisUpgradeAddedPaths);
const stasisCurrent={...Object.fromEntries(Object.entries(stasis.files).map(([path,row])=>[path,row.after])),...stasis.added};
const actorFocusArchive=readFileSync(new URL('../fixtures/develop-actor-focus-source.json.gz',import.meta.url));
assert.equal(hash(actorFocusArchive),'2dd9f47a776d59d6cfc4ce544f8e0783f133cfda4f78f489b25b983b53315688','exact Develop Actor/Focus source archive');
const actorFocus=JSON.parse(gunzipSync(actorFocusArchive));
assert.equal(actorFocus.base,'62943964d4ff1cd152bd28c0fbc8df98df9d054d');
assert.equal(actorFocus.source,'926f29bf29db13580b470b64a571db87eced50ad');
const architecturePath='config/architecture.json';
assert.deepEqual(Object.keys(actorFocus.files),[
 architecturePath,'src/lua/abyss_actor.lua','src/lua/abyss_focus.lua','src/lua/abyss_stances.lua',
]);
export const actorFocusAdded=Object.freeze(Object.keys(actorFocus.added));
assert.deepEqual(actorFocusAdded,['src/lua/abyss_actor_artifact.lua','src/lua/abyss_stance_damage.lua']);
assert.equal(actorFocus.luaBefore.length,354);
assert.equal(new Set(actorFocus.luaBefore).size,actorFocus.luaBefore.length);
assert(actorFocusAdded.every(path=>!actorFocus.luaBefore.includes(path)),'no invented Actor/Focus predecessor');
const actorFocusOwners=[...Object.keys(actorFocus.files),...actorFocusAdded];
const priorLayers=[stasis.files,battleFeedback.files,rewardUi.files,portraitLifecycle.files,displayLeaf.files,cardDisplay.files,mapRender.files,files,shop];
assert(matches(actorFocus.files[architecturePath].before.source,stasis.files[architecturePath].after),'Actor policy follows the exact Stasis predecessor');
assert(stasisUpgradeAddedPaths.every(path=>actorFocus.luaBefore.includes(path)),'Actor preserves the admitted Stasis modules');
for(const path of actorFocusOwners.filter(path=>path!==architecturePath)){
 assert(!priorLayers.some(layer=>Object.hasOwn(layer,path))&&!Object.hasOwn(stasis.added,path),'distinct Develop Actor/Focus source owner: '+path);
}
const pileOpenArchive=readFileSync(new URL('../fixtures/develop-combat-pile-opening-source.json.gz',import.meta.url));
assert.equal(hash(pileOpenArchive),'a9e96c6caa44e21e45493a63385bf315ba9eaaf9a30257533bc46ccf9e51f9e6','exact Develop combat pile opening predecessor archive');
const pileOpen=JSON.parse(gunzipSync(pileOpenArchive));
assert.equal(pileOpen.base,'19d4be4d9af4bf42635a224a118fc99898ea7898');
assert.deepEqual(Object.keys(pileOpen.files),['src/lua/abyss_card_skin.lua',deckPath]);
assert(matches(pileOpen.files[deckPath].before.source,rewardUi.files[deckPath].after),'combat pile opening follows the exact reward UI predecessor');
const layers=[pileOpen.files,actorFocus.files,...priorLayers];
const sessionRelicArchive=readFileSync(new URL('../fixtures/develop-session-relic-source.json.gz',import.meta.url));
assert.equal(hash(sessionRelicArchive),'3597ea919d88cd07f5e4e8f2c8918c0558f613f6a3fd3d6fda3a08469276db05','exact Develop session relic predecessor archive');
const sessionRelic=JSON.parse(gunzipSync(sessionRelicArchive));
assert.equal(sessionRelic.base,'434a361696cf08b7e5425cedf591eacc41147699');
assert.equal(sessionRelic.original,'39238fa52173bb45dea36a2329fa038f38921e26');
assert.deepEqual(Object.keys(sessionRelic.files),[
 'config/architecture.json',
 'src/lua/abyss_battle_ui.lua',
 'src/lua/abyss_boss_relics.lua',
 'src/lua/abyss_node_ui.lua',
 'src/lua/abyss_relic_card_rewards.lua',
 'src/lua/abyss_relic_choices.lua',
 'src/lua/abyss_relic_hooks.lua',
 'src/lua/abyss_relic_pending.lua',
 'src/lua/abyss_relic_pending_ui.lua',
 'src/lua/abyss_run.lua',
 'src/lua/abyss_run_settlement.lua',
 'src/lua/abyss_shop_relics.lua',
 'src/lua/abyss_uncommon_relics.lua',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs',
]);
for(const [path,row] of Object.entries(sessionRelic.files)){
 const prior=layers.find(layer=>Object.hasOwn(layer,path))?.[path];
 if(prior)assert(matches(row.before.source,prior.after),'exact session relic predecessor: '+path);
}
for(const {before,after} of [sessionRelic.files,...layers].flatMap(layer=>Object.values(layer))){
 assert.equal(hash(before.source),before.sha256);
 assert.equal(blob(before.source),before.gitBlob);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
for(const after of [...Object.values(stasis.added),...Object.values(actorFocus.added).map(row=>row.after)]){
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
const priorCurrent=path=>layers.find(layer=>Object.hasOwn(layer,path))?.[path]??
 (Object.hasOwn(actorFocus.added,path)?actorFocus.added[path]:undefined);
const current=path=>Object.hasOwn(sessionRelic.files,path)?sessionRelic.files[path]:priorCurrent(path);
const priorDevelopBackflowOwns=path=>relicDetailOwns(path)||current(path)!==undefined;
const roomEntryArchive=readFileSync(new URL('../fixtures/develop-map-room-entry-source.json.gz',import.meta.url));
assert.equal(hash(roomEntryArchive),'bff89df36b2fbbf1bec727dae075c632dba48d50c6c8c75b8e3f271d7600c160','exact Develop map-room predecessor archive');
const roomEntry=JSON.parse(gunzipSync(roomEntryArchive));
assert.equal(roomEntry.base,'d7ae494a3136b2f4f707428fefeeae478c6e0495');
const mapRoomBackflowOwns=path=>Object.hasOwn(roomEntry.files,path);
for(const [path,{before,after}] of Object.entries(roomEntry.files)){
 assert(priorDevelopBackflowOwns(path)||/^src\/lua\/abyss_[a-z0-9_]+\.lua$/.test(path),'map-room replay owner: '+path);
 assert(matches(before.source,before),'exact Develop map-room predecessor: '+path);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
const deckPagesArchive=readFileSync(new URL('../fixtures/develop-deck-pages-source.json.gz',import.meta.url));
assert.equal(hash(deckPagesArchive),'d3a6b845870da64358c3ca36307062c02cc39d2e070e21eb875f9e2e42d02036','exact Develop deck-pages predecessor archive');
const deckPages=JSON.parse(gunzipSync(deckPagesArchive));
assert.equal(deckPages.base,'00229683d0d38660c98ced2f4a41e89d84fc5e4e');
for(const [path,{before,after}] of Object.entries(deckPages.files)){
 assert(matches(before.source,before),'exact deck-pages predecessor: '+path);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
export const deckPagesAdded=Object.freeze(Object.keys(deckPages.added));
function deckPagesPrior(path,source){return predecessor(deckPages.files,path,source);}
export function beforeDeckPages(path,source,options){return deckPagesPrior(path,beforeInputRetirement(path,beforeCombatEvents(path,beforeActionButtons(path,beforeDevelopUiBackflows(path,source))),options));}
const deckPagesOwns=path=>Object.hasOwn(deckPages.files,path);
const productionOwner=path=>path===architecturePath||path.startsWith('src/lua/');
const recentBackflowOwns=path=>mapRoomBackflowOwns(path)||deckPagesOwns(path)||(productionOwner(path)&&inputRetirementOwns(path));
export const developBackflowOwns=path=>(productionOwner(path)&&combatEventsOwns(path))||actionButtonsOwns(path)||recentBackflowOwns(path)||priorDevelopBackflowOwns(path);
const matchEventRepairPath='src/lua/abyss_match_event_ui.lua';
const beforeMatchEventRepair=(path,source)=>path===matchEventRepairPath?beforeNativeFlowFixture(path,source):source;

function currentRecentBackflowOwner(path,source){
 if(inputRetirementOwns(path))return isCurrentInputRetirementSource(path,source);
 source=beforeActionButtons(path,beforeDevelopUiBackflows(path,source));
 if(deckPagesOwns(path))return matches(source,deckPages.files[path].after);
 return matches(source,roomEntry.files[path].after);
}
export function assertDevelopBackflowCurrent(path,source){
 source=beforeUiEntrance(path,source);
 source=beforeDevelopUiBackflows(path,source);
 const priorActions=beforeActionButtons(path,source);
 if(actionButtonsOwns(path)&&!recentBackflowOwns(path)&&!priorDevelopBackflowOwns(path)){
  assert.notEqual(priorActions,source,'fresh current production owner: '+path);
  return;
 }
 source=priorActions;
 if(combatEventsOwns(path)){
  const priorEvents=beforeCombatEvents(path,source);
  assert.notEqual(priorEvents,source,'fresh current production owner: '+path);
  if(!recentBackflowOwns(path)&&!priorDevelopBackflowOwns(path))return;
  source=priorEvents;
 }
 source=beforeMatchEventRepair(path,source);
 if(recentBackflowOwns(path)){
  assert(currentRecentBackflowOwner(path,source),'fresh current production owner: '+path);
  if(!priorDevelopBackflowOwns(path))return;
  source=predecessor(roomEntry.files,path,beforeDeckPages(path,source));
 }
 if(relicDetailOwns(path)){
  assertRelicDetailCurrent(path,source);
  return;
 }
 assert(matches(source,current(path).after),'fresh current production owner: '+path);
}
export function assertStasisUpgradeAdded(path,source){
 assert(Object.hasOwn(stasis.added,path)&&matches(source,stasis.added[path]),'fresh Stasis upgrade module: '+path);
}
export function assertActorFocusInventory(paths,read=path=>readFileSync(path,'utf8')){
 paths=entranceInventory(paths,read);
 const expected=[...actorFocus.luaBefore,...actorFocusAdded,...deckPagesAdded];
 assert(expected.includes(retiredControllerPath),'exact controller predecessor in Actor/Focus Lua inventory');
 assert.deepEqual([...paths].sort(),[...expected.filter(path=>path!==retiredControllerPath),pointerInputPath].sort(),'complete current Actor/Focus Lua module inventory');
 assertPointerInputSource(read(pointerInputPath));
 for(const path of deckPagesAdded){
  const source=read(path);
  assertDevelopBackflowCurrent(path,source);
  assert(matches(beforeInputRetirement(path,source),deckPages.added[path]),'fresh deck browser module: '+path);
 }
 for(const path of actorFocusOwners)assertDevelopBackflowCurrent(path,read(path));
 for(const path of stasisUpgradeAddedPaths)assertStasisUpgradeAdded(path,read(path));
}
function predecessor(layer,path,source){
 if(!Object.hasOwn(layer,path)||!matches(source,layer[path].after))return source;
 const before=layer[path].before.source;
 return source.includes('\r\n')?before.replaceAll('\n','\r\n'):before;
}
function mapRoomOwnerError(path){
 return 'combined linked owner identity: '+path+' changed during Develop backflow validation (map-room validation)';
}
function recentBackflowOwnerReader(read,historicalOwners){
 let epoch;
 const readEntrancePrior=entranceReader(read);
 return path=>{
  // A frozen cohort must expose its original Controller identity or absence.
  const controller=path===retiredControllerPath&&(!historicalOwners||epoch==='current')?readRetiredController(read):undefined;
  const source=controller?controller.source:readEntrancePrior(path);
  if(!recentBackflowOwns(path))return source;
  const current=(!controller||controller.restored)&&currentRecentBackflowOwner(path,source);
  const binding=historicalOwners&&Object.hasOwn(historicalOwners,path)?historicalOwners[path]:undefined;
  const exactHistorical=binding===null?source==null:
   binding&&typeof source==='string'&&source.replaceAll('\r\n','\n')===binding.source;
  const observed=current?'current':exactHistorical?'historical':undefined;
  const stage=mapRoomBackflowOwns(path)?'map-room':deckPagesOwns(path)?'deck-pages':'input retirement';
  assert(observed&&(!epoch||epoch===observed),
   'combined linked owner identity: '+path+' changed during Develop backflow validation ('+stage+' validation)');
  epoch=observed;
  return source;
 };
}
export function bindDevelopBackflow(read,historicalOwners){
 const readOwner=recentBackflowOwnerReader(read,historicalOwners);
 return {
  readOwner,
  authenticate:(path,source,options)=>authenticateDevelopBackflowWithReaders(path,source,readOwner,readOwner,options),
 };
}
function beforePriorDevelopBackflow(path,source){
 return layers.reduce((prior,layer)=>predecessor(layer,path,prior),beforeMatchEventRepair(path,source));
}
const forethoughtOwners=[deckPath,'scripts/deck-ui-layout.mjs'];
const pileOpenOwners=[...forethoughtOwners,'src/lua/abyss_card_skin.lua'];
function authenticatePriorDevelopBackflow(path,source,read){
 const repaired=beforeMatchEventRepair(path,source);
 const matchSuccessor=repaired!==source;
 source=repaired;
 const prior=beforePriorDevelopBackflow(path,source);
 if(prior===source)return source;
 const row=layers.find(layer=>Object.hasOwn(layer,path)&&matches(source,layer[path].after))[path];
 const actorOwner=Object.hasOwn(actorFocus.files,path)&&row===actorFocus.files[path];
 const stasisOwner=Object.hasOwn(stasis.files,path)&&(row===stasis.files[path]||(actorOwner&&path===architecturePath));
 const pileOwner=row===pileOpen.files[path];
 const owners=actorOwner?actorFocusOwners:pileOwner?pileOpenOwners:forethoughtOwners.includes(path)?forethoughtOwners:[path];
 const linkedOwners=stasisOwner?new Set([...owners,...Object.keys(stasisCurrent)]):owners;
 for(const owner of linkedOwners){
  let live;
  try{live=read(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
  if(owner===matchEventRepairPath){
   const repairedLive=beforeMatchEventRepair(owner,live);
   assert(matchSuccessor===(repairedLive!==live),'combined linked owner identity: '+owner+' changed during Match repair validation');
   live=repairedLive;
  }
  const expected=owner===path?row.after:stasisOwner?(priorCurrent(owner)?.after??stasisCurrent[owner]):priorCurrent(owner).after;
  assert(matches(live,expected),'combined linked owner identity: '+owner+' changed during Develop backflow validation');
 }
 return prior;
}

export {configSourceTokens} from './source-fingerprint.mjs';
export function isSessionRelicSuccessor(path,source,{allowConfigLayout=false}={}){
 if(!Object.hasOwn(sessionRelic.files,path))return false;
 source=predecessor(roomEntry.files,path,beforeDeckPages(path,source,{allowConfigLayout}));
 const expected=sessionRelic.files[path].after;
 if(matches(source,expected))return true;
 return allowConfigLayout&&sourceConfigLayoutMatches(source,expected.tokensSha256);
}
function beforeSessionRelic(path,source,options){
 if(!isSessionRelicSuccessor(path,source,options))return source;
 const before=sessionRelic.files[path].before.source;
 return source.includes('\r\n')?before.replaceAll('\n','\r\n'):before;
}
export function beforeDevelopBackflow(path,source,options){
 source=beforeUiEntrance(path,source);
 source=predecessor(roomEntry.files,path,beforeDeckPages(path,source,options));
 source=beforeRelicDetail(path,source);
 return beforePriorDevelopBackflow(path,beforeSessionRelic(path,source,options));
}
export function assertCurrentSessionRelicOwner(path,source){
 if(Object.hasOwn(sessionRelic.files,path)){
  assert(matches(predecessor(roomEntry.files,path,beforeDeckPages(path,source)),current(path).after),'combined linked owner identity: '+path);
 }
}
export function authenticateDevelopBackflow(path,source,read,options){
 ({source,read}=entrancePredecessor(path,source,read));
 return authenticateDevelopBackflowWithReaders(path,source,read,recentBackflowOwnerReader(read),options);
}
function readBackflowOwner(read,path){
 try{return read(path);}
 catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
}
function authenticateDevelopBackflowWithReaders(path,source,readLive,readLinked,options){
 const priorUi=beforeDevelopUiBackflows(path,source);
 if(priorUi!==source){
  const live=readBackflowOwner(readLive,path);
  assert(typeof live==='string'&&live.replaceAll('\r\n','\n')===source.replaceAll('\r\n','\n'),
   'combined linked owner identity: '+path+' during deck/potion backflow validation');
 }
 const readUi=owner=>beforeDevelopUiBackflows(owner,readLive(owner));
 source=authenticateActionButtons(path,priorUi,readUi);
 const readActions=owner=>beforeActionButtons(owner,readUi(owner));
 const beforeCloseout=beforeCombatEvents(path,source);
 if(beforeCloseout!==source){
  const live=readBackflowOwner(readActions,path);
  assert(typeof live==='string'&&live.replaceAll('\r\n','\n')===source.replaceAll('\r\n','\n'),
   'combined linked owner identity: '+path+' during combat/event backflow validation');
 }
 source=beforeCloseout;
 const readCloseout=owner=>beforeCombatEvents(owner,readActions(owner));
 const retiredInput=authenticateInputRetirement(path,source,readCloseout,options);
 const readInputLive=beforeInputRetirementReader(readCloseout);
 const readInputLinked=beforeInputRetirementReader(owner=>beforeCombatEvents(owner,readLinked(owner)));
 const readDeckLive=owner=>deckPagesPrior(owner,readInputLive(owner));
 const deckPrior=deckPagesPrior(path,retiredInput);
 if(deckPrior!==retiredInput){
  let live;
  try{live=readInputLive(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
  assert(matches(live,deckPages.files[path].after),'combined linked owner identity: '+path+' during deck-pages validation');
 }
 source=deckPrior;
 const roomPrior=predecessor(roomEntry.files,path,source);
 if(roomPrior!==source){
  let live;
  try{live=readDeckLive(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
  assert(matches(live,roomEntry.files[path].after),mapRoomOwnerError(path));
 }
 const read=owner=>predecessor(roomEntry.files,owner,owner===path?readDeckLive(owner):deckPagesPrior(owner,readInputLinked(owner)));
 source=roomPrior;
 source=authenticateRelicDetail(path,source,read);
 const sessionPrior=beforeSessionRelic(path,source,options);
 const sessionSuccessor=sessionPrior!==source;
 if(sessionSuccessor){
  let live;
  try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
  assertCurrentSessionRelicOwner(path,live);
 }
 return authenticatePriorDevelopBackflow(path,sessionPrior,owner=>{
  const live=read(owner);
  if(!sessionSuccessor&&owner===path)return live;
  if(sessionSuccessor||owner==='config/architecture.json')assertCurrentSessionRelicOwner(owner,live);
  return beforeSessionRelic(owner,live);
 });
}
