import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exactSourceMatches,sourceConfigLayoutMatches} from './source-fingerprint.mjs';
import {readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {releaseUiRestoreArchive} from './release-ui-restore-source.mjs';
import {beforeChapterBattleScene} from './chapter-battle-scene-source.mjs';
import {beforeBattlePeriphery} from './battle-periphery-source.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

// These three reward owners kept their source bytes after #934. The linked
// closure below still needs exact current owners before it can use that view.
const config='config/architecture.json';
const rewardHosts=Object.freeze({
 'src/lua/abyss_relic_card_rewards.lua':{sha256:'c8e0905f87f77fc9d8296313cd241619278ac73c24a1c2909b806e566838b3fb',gitBlob:'49f4fd395b5abc046a237898cf61b0a3d6a27127'},
 'src/lua/abyss_relic_choices.lua':{sha256:'0a56dd716ccd996d14e70b9e0239db7f749e753349248d41e92cbd166e324e4e',gitBlob:'ce47be3293cd3ee262971e51518bb827f2c9b3e3'},
 'src/lua/abyss_relic_pending.lua':{sha256:'471aafeb33a1868158723ce9e5ec231b12e186ae2f94e8de045cd1dc9c4a08d6',gitBlob:'5dfa1dd5f4aa68663770f565c3df1b50a87f08be'},
});
const configTokens='3924ed90aa88922ca9fc97df398cb67b7cf61892933901213ef911fc3b6f3e52';
// The joined battle scenes change only these raw owners in the existing reward cohort.
const joinedRewardOwners=Object.freeze({
 "config/architecture.json": {
  "sha256": "a0c3fa73aa7095b8d4747ab03e894ad8b5988c6d2a1cad25c1f67ae37166d6ab",
  "gitBlob": "c83552908531da8f7f9c224d2b1d2f7cc8f4dcb9"
 },
 "src/lua/abyss_battle_card_gestures.lua": {
  "sha256": "aae1eba631e297d6cc753f1e8cd30d6623843cfe044f13c1b7d27cc1d25fa158",
  "gitBlob": "2bec30e5609a77bb81e16d241805e337d77e4f4f"
 },
 "src/lua/abyss_battle_card_layout.lua": {
  "sha256": "e4cb0e92c35a637f8fe978837650848acb177e7b03ca55944bfa56bfd8535fc0",
  "gitBlob": "90506c2db973983eb2ad0e583b37faa2a3554afb"
 },
 "src/lua/abyss_battle_card_view.lua": {
  "sha256": "e35d0e09a2df39a4fa4298499c053f3eae7eefa6df4c5da0e084bf0664ca0a5c",
  "gitBlob": "023ea90a7e1e6917e7369d60b556692431926c43"
 },
 "src/lua/abyss_battle_details.lua": {
  "sha256": "5fc946a6f7b754a69034b489c21823d7dcba7ff9ba957f9613adec433b662daa",
  "gitBlob": "e5b298bdfaafcdb91b1f0e4e19ebc4cb40f648a8"
 },
 "src/lua/abyss_battle_render_actors.lua": {
  "sha256": "d2dba9b99c4b8335773bd3316e92bfc23d614ae0a0f338b0327c2350f206e8ad",
  "gitBlob": "1f538061f76a5f0ec6621463ae26c1dce3ba5f31"
 },
 "src/lua/abyss_battle_ui.lua": {
  "sha256": "ae18353f3758e220f424127d821a65c7b3f94e3129c4d61a88d07a8415d260e6",
  "gitBlob": "0e4f2a8ce53846cc66484ef55b95a377c305463d"
 },
 "src/lua/abyss_game_ui.lua": {
  "sha256": "c6fadf3a75da490c70ae8bf8f8ecd98829926a05c437f36a6d3dda84972c4a8e",
  "gitBlob": "bba5abe42ea4e0806961ff4d7cfdfafcc7837d6f"
 },
 "src/lua/abyss_game_ui_view.lua": {
  "sha256": "88ac8ce75d53b444f521313ab25dbdf02e46d382424f45f007f179c26fa3dc3c",
  "gitBlob": "ee4356a52b2c84586ee79111bb05c606f5a60a53"
 }
});
const joinedConfigTokens='07cca0d75cfd1d5efa88b8d2a36eb36b2a6a40299f5a70caf5fda0d2426a4d9f';
const cardFlightPredecessor={
 "path": "src/lua/abyss_battle_card_view.lua",
 "beforeSha256": "6b1e30f9e27dd604288088cb2d7f3a2db0b78466b0776a17ad13b8c6e2f1a8d8",
 "afterSha256": "654b59e0198773ca869d152011c41df2d563a386a4145d61852a0596baf64d74",
 "beforeBlob": "a9073f146c4bf62382449dbb0c027cbc0c7add74",
 "afterBlob": "62f66dfc247eb140d14eab0ff0fb7f4316f9fa05",
 "hunks": [
  {
   "at": 6,
   "before": "local Theme = require(\"abyss_theme\")\nlocal CardSkin = require('abyss_card_skin')",
   "after": "local Theme = require(\"abyss_theme\")\nlocal Viewport = require(\"abyss_viewport\")\nlocal CardSkin = require('abyss_card_skin')"
  },
  {
   "at": 285,
   "before": "    local placeCard, placeReward = controls.placeCard, controls.placeReward\n    local dragTarget, dragPose, enemyPosition = controls.dragTarget, controls.dragPose, controls.enemyPosition",
   "after": "    local placeCard, placeReward = controls.placeCard, controls.placeReward\n    local pileLayout = controls.pileLayout or Viewport.pileLayout(view.root)\n    local dragTarget, dragPose, enemyPosition = controls.dragTarget, controls.dragPose, controls.enemyPosition"
  },
  {
   "at": 317,
   "before": "                if pile=='discard'and recentDrawOrigins[instance.uid]then pile='draw'end\n                local start=pile=='discard'and L.discardPile.position\n                    or pile=='exhaust'and{L.topBar.exhaustIcon[1],L.topBar.y}or L.drawPile.position\n                entry.current={x=start[1],y=start[2],scale=0.12/0.75,angle=0}\n            end",
   "after": "                if pile=='discard'and recentDrawOrigins[instance.uid]then pile='draw'end\n                local x,y=pileLayout.point(pile or 'draw',pileLayout.extraWidth())\n                entry.current={x=x,y=y,scale=0.12/0.75,angle=0}\n            end"
  }
 ]
};
const nodeNoticePredecessor = {
 "path": "src/lua/abyss_node_ui.lua",
 "beforeSha256": "a402c6e2b10697ff285be9d6de2d0b68a2982b160c89131c91451e5fd6fa1cb2",
 "afterSha256": "72755f5190b5d98d40e668bcf033cc0ee3f2056e2494a94a7a147e60cd1d1cf1",
 "beforeBlob": "50a84af13948a2625d3c4913eaf2c3e6bf67bc5b",
 "afterBlob": "f8b2b473121054b5c2207a608d926a9528476d16",
 "hunks": [
  {
   "at": 45,
   "before": "function M.new(root, run, map, presentation, clickEvent, onChange, options)",
   "after": "local function refreshMerchant(ctx, node, active)\n    if node and node.type == \"shop\" and (ctx.self.merchantNode ~= node.id or ctx.self.merchantRun ~= ctx.self.run) then\n        ctx.self.merchantNode, ctx.self.merchantRun = node.id, ctx.self.run\n        ctx.merchant:enter(ctx.self.run)\n    end\n    ctx.merchant:setVisible(merchantVisible(ctx, node, active))\nend\n\nfunction M.new(root, run, map, presentation, clickEvent, onChange, options)"
  },
  {
   "at": 199,
   "before": "        if node and node.type == \"shop\" and (ctx.self.merchantNode ~= node.id or ctx.self.merchantRun ~= ctx.self.run) then\n            ctx.self.merchantNode, ctx.self.merchantRun = node.id, ctx.self.run\n            ctx.merchant:enter(ctx.self.run)\n        end\n        ctx.merchant:setVisible(merchantVisible(ctx, node, active))",
   "after": "        refreshMerchant(ctx, node, active)"
  }
 ]
};
const eventsPath='src/lua/abyss_node_ui_events.lua';
const eventsOwner=Object.freeze({sha256:'a9b646cb40b5cdd288ddbcf75b4ac4e7dc12537a2002b0ba0774681521d50b61',gitBlob:'8fc53f516f083aeb4c7a5e05ed626b595114fef7'});
let receipts;
function rewardSourceFiles(){
 receipts??=releaseUiRestoreArchive(
  readFileSync(new URL('./reward-current-source.json.gz',import.meta.url)),
  'a68d10abe6e6f3bd33a69f85326d34dce1250b34b6892543cb5c1314c01f3b9f','02dcb2466b2c90308f9a9e42896c2c5af3ed288c');
 return receipts.files;
}
function freshOwner(read,path){
 try{return read(path);}
 catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
}

function requireRetiredController(read){
 try{
  const controller=readRetiredController(read);
  assert(controller.restored,'current Controller source has been retired');
 }catch(error){
  assert.fail('combined linked owner identity: '+retiredControllerPath+': '+String(error?.message??error));
 }
}

function exactJoinedRewardOwner(raw,binding){
 if(!exactSourceMatches(raw,binding))return false;
 const lf=raw.replaceAll('\r\n','\n');
 return raw===lf||raw===lf.replaceAll('\n','\r\n');
}
// Also used by the #924 entrance replay, which authenticates this exact prior view.
export function beforeNodeNoticeSource(owner,raw){
 const proof=nodeNoticePredecessor;
 if(owner!==proof.path)return raw;
 assert(exactJoinedRewardOwner(raw,{sha256:proof.afterSha256,gitBlob:proof.afterBlob}),'combined linked owner identity: '+owner);
 const prior=restoreExactFixtureHunks(proof,owner,raw);
 assert(exactJoinedRewardOwner(prior,{sha256:proof.beforeSha256,gitBlob:proof.beforeBlob}),'exact node notice replay predecessor: '+owner);
 return raw.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function joinedRewardPredecessor(owner,raw){
 assert(exactJoinedRewardOwner(raw,joinedRewardOwners[owner]),'combined linked owner identity: '+owner);
 let source=beforeChapterBattleScene(owner,raw);
 if(owner===cardFlightPredecessor.path){
  assert(exactJoinedRewardOwner(source,{sha256:cardFlightPredecessor.afterSha256,gitBlob:cardFlightPredecessor.afterBlob}),
   'exact card flight replay owner: '+owner);
  const before=restoreExactFixtureHunks(cardFlightPredecessor,owner,source);
  source=source.includes('\r\n')?before.replaceAll('\n','\r\n'):before;
 }
 return beforeBattlePeriphery(owner,source);
}

// Only the current reward entry inputs select this narrower historical reader.
// Historical-only callers continue through the verifier they already use.
export function currentRewardReplay(path,source,read){
 if(path!==config&&!Object.hasOwn(rewardHosts,path))return {source,read};
 const files=rewardSourceFiles(),anchor=files[config];
 const joinedInput=path===config&&(exactJoinedRewardOwner(source,joinedRewardOwners[config])
  ||sourceConfigLayoutMatches(source,joinedConfigTokens));
 const recognized=path===config
  ?joinedInput||exactSourceMatches(source,anchor.after)||sourceConfigLayoutMatches(source,configTokens)
  :exactSourceMatches(source,rewardHosts[path]);
 if(!recognized)return {source,read};
 assert.equal(typeof read,'function','combined linked owner reader');
 const rawConfig=freshOwner(read,config);
 const joined=exactJoinedRewardOwner(rawConfig,joinedRewardOwners[config]);
 if(path===config)assert.equal(joined,joinedInput,'combined linked owner identity: '+config);
 if(path!==config&&!joined&&!exactSourceMatches(rawConfig,anchor.after))return {source,read};
 requireRetiredController(read);
 return {
  source:path===config?anchor.before.source:source,
  read(owner){
   if(owner===retiredControllerPath){
    requireRetiredController(read);
    return undefined;
   }
   const raw=freshOwner(read,owner);
   let live=joined&&Object.hasOwn(joinedRewardOwners,owner)?joinedRewardPredecessor(owner,raw):raw;
   if(joined)live=beforeNodeNoticeSource(owner,live);
   if(owner===eventsPath)assert(exactSourceMatches(live,eventsOwner),'combined linked owner identity: '+owner);
   if(!Object.hasOwn(files,owner))return live;
   const row=files[owner];
   assert(exactSourceMatches(live,row.after),'combined linked owner identity: '+owner);
   return live.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
  }
 };
}
