// Reverse the current input retirement for exact legacy presentation replays.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeActionButtons} from './action-buttons-source.mjs';
import {beforeNativeFixtureInputRetirement} from './native-fixture-replay-source.mjs';
import {beforeNativeHostInputRetirement} from './native-host-replay-source.mjs';
import {beforeNativeFlowFixture} from './native-flow-fixture-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {exactSourceMatches as matches,sourceConfigLayoutMatches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const normalize=source=>source.replaceAll('\r\n','\n');
const archive=readFileSync(new URL('../fixtures/develop-input-retirement-source.json.gz',import.meta.url));
const evidenceSha256='ed86f17b8f643d4392828e582582859d7b86d0a143de94b1fac4cfab9a5bf912';
assert.equal(hash(archive),evidenceSha256,'exact input-retirement source archive');
const {base,files,removed,added,suite}=JSON.parse(gunzipSync(archive));
assert.equal(base,'74aa9a18311c972d2021bef9700153291620b45b');
export const retiredControllerPath='src/lua/abyss_controller.lua';
export const pointerInputPath='src/lua/abyss_pointer_input.lua';
assert.deepEqual(Object.keys(removed),[retiredControllerPath]);
assert.deepEqual(Object.keys(added),[pointerInputPath]);
assert.equal(suite.deck.base,'00229683d0d38660c98ced2f4a41e89d84fc5e4e');
assert.deepEqual(Object.keys(suite.added),['tests/input-device-scope.test.mjs','tests/pointer-cover-ownership.test.mjs','tests/relic-view-input.test.mjs']);
assert.deepEqual(Object.keys(suite.removed),['tests/relic-view-controller-click.test.mjs']);
assert.deepEqual(Object.keys(suite.deck.added),['tests/deck-pages.test.mjs']);

const continued=[...Object.values(files),...Object.values(suite.deck.files),...Object.values(suite.earlier)];
for(const row of [...continued.map(row=>row.before),...Object.values(removed),...Object.values(suite.removed),...Object.values(suite.trustPredecessors)]){
 assert(!row.source.includes('\r')&&matches(row.source,row),'exact input-retirement predecessor');
}
for(const row of [...continued.map(row=>row.after),...Object.values(added),...Object.values(suite.added),...Object.values(suite.deck.added)]){
 assert.match(row.sha256,/^[a-f0-9]{64}$/);assert.match(row.gitBlob,/^[a-f0-9]{40}$/);
}

function configLayoutMatches(source,expected,{allowConfigLayout=false}={}){
 return allowConfigLayout&&sourceConfigLayoutMatches(source,expected.tokensSha256);
}

const combatEventsArchive=readFileSync(new URL('../fixtures/develop-combat-events-source.json.gz',import.meta.url));
assert.equal(hash(combatEventsArchive),'6a25140a8a86554e7c072e94cad465082d5930d20ffb7c4b0837bf0f6aa1b87d','exact Develop combat and event sources');
const combatEvents=JSON.parse(gunzipSync(combatEventsArchive));
assert.equal(combatEvents.base,'0397645a8ffa5eb8af2e02d7c033ef5c486fbf1e');
for(const [path,row] of Object.entries(combatEvents.files)){
 assert(/^(?:scripts|src\/lua|tests)\//.test(path)&&matches(row.before.source,row.before),'exact combat/event predecessor: '+path);
 assert.match(row.after.sha256,/^[a-f0-9]{64}$/);assert.match(row.after.gitBlob,/^[a-f0-9]{40}$/);
}
export const combatEventsOwns=path=>Object.hasOwn(combatEvents.files,path);
export function beforeCombatEvents(path,source){
 const row=Object.hasOwn(combatEvents.files,path)&&combatEvents.files[path];
 if(!row||!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}

const browserArchive=readFileSync(new URL('../fixtures/develop-deck-browser-backflow-source.json.gz',import.meta.url));
assert.equal(hash(browserArchive),'84b5198436d5858f1630db9d577a188d2033b4e7cb8ce2897e7ecd4378ebf49c','exact Develop deck browser archive');
const browserBackflow=JSON.parse(gunzipSync(browserArchive));
const deckChromePath='src/lua/abyss_deck_ui.lua';
assert.equal(browserBackflow.base,'beba19bad25db7de71f96af521656c13b882909b');
for(const [path,row] of Object.entries(browserBackflow.files)){
 assert(matches(row.before.source,row.before),'exact deck browser predecessor: '+path);
 assert.match(row.after.sha256,/^[a-f0-9]{64}$/);assert.match(row.after.gitBlob,/^[a-f0-9]{40}$/);
}
export function beforeDeckBrowserBackflow(path,source){
 const row=Object.hasOwn(browserBackflow.files,path)&&browserBackflow.files[path];
 if(path===deckChromePath)source=beforeCurrentReplayFixes(path,source);
 if(!row||!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}

const potionArchive=readFileSync(new URL('../fixtures/develop-potion-popup-source.json.gz',import.meta.url));
assert.equal(hash(potionArchive),'d7e6b6a7b6d603cec23424eedb0ed25fbef3c7fdeae2a4d1ee6fe208ca693690','exact Develop potion popup archive');
const potionBackflow=JSON.parse(gunzipSync(potionArchive));
assert.equal(potionBackflow.base,'103aa4072bd3801deb6bf090455bd974181a9647');
for(const [path,row] of Object.entries(potionBackflow.files)){
 assert(matches(row.before.source,row.before),'exact potion popup predecessor: '+path);
 assert.match(row.after.sha256,/^[a-f0-9]{64}$/);assert.match(row.after.gitBlob,/^[a-f0-9]{40}$/);
}
const rewardsBackView='src/lua/abyss_game_ui_view.lua';
const rewardsBackViewBeforeCover=Object.freeze({
 sha256:'9b4968a3fd23e0956ef565ef4da1d4dbc2a0c5b666308c59c963d02c8f15f0fb',
 gitBlob:'96f9fadefeabc3d3540e2797943c3b415605140d',
});
const rewardsBackViewSuccessor=Object.freeze({
 sha256:'1256a76bfc2c6fa408c2bc09f46f8c3619e4140039f726ab3ceddea35ef39e4e',
 gitBlob:'00c1c49b6de96d7186f3bc635642c45cdbb786c8',
});
const coveredBattleReplay=Object.freeze({
 path:rewardsBackView,beforeSha256:rewardsBackViewBeforeCover.sha256,afterSha256:rewardsBackViewSuccessor.sha256,
 hunks:[
  {"at":263,"before":"    local syncNative=nativePageLifecycle==true and NativePages.new(child,self) or nil\n    local coveredMapRun\n    local function refreshMapVisibility(run,deckOpen,blocked)","after":"    local syncNative=nativePageLifecycle==true and NativePages.new(child,self) or nil\n    local coveredMapRun,coveredDeckBattle\n    local visibilityPass=0\n    local function refreshMapVisibility(run,deckOpen,blocked)"},
  {"at":274,"before":"    end\n    return function(run,inMenu,deckOpen,potionOpen,blocked)\n            if syncNative then syncNative(run) end\n            menu:SetVisible(inMenu and not self.characterOpen and not self.easterEggOpen)\n            -- A deck open still commits one battle render below (input retirement,\n            -- art ownership and suspension), after the host's visibility writes.\n            self.battleUI:setActive(self.mode == \"battle\" and not deckOpen and not potionOpen and not blocked,\n                suspendBattle(run,deckOpen,potionOpen),self.mode=='battle' and deckOpen)\n            child(\"battlePanel\"):SetVisible(self.mode == \"battle\")","after":"    end\n    local function coveredPaintCheck(run,battle,pass)\n        if not self.pageReveal or not battle or run.phase~='combat' or self.battleUI.busy then return end\n        local events,epoch=battle.events,self.pageReveal.epoch\n        local eventCount=#events\n        -- Inventory and the health cap can change without a combat event.\n        local potionInventory,maxHp=battle.potionInventory,run.maxHp\n        return function()\n            return visibilityPass==pass and self.run==run and run.phase=='combat' and run.combat==battle\n                and self.deckUI.visible and not self.battleUI.active and not self.battleUI.busy\n                and self.pageReveal.epoch==epoch and battle.events==events and #events==eventCount\n                and battle.potionInventory==potionInventory and run.maxHp==maxHp\n        end\n    end\n    local function refreshBattleVisibility(run,deckOpen,potionOpen,blocked,pass)\n        -- Reuse a cover only after its eager render has committed suspension.\n        -- The active flag changes before the native setter and can survive failure.\n        local deckBattle=self.mode=='battle' and deckOpen and run and run.combat or nil\n        local deferDeckRender=deckBattle~=nil and coveredDeckBattle==deckBattle\n        local coveredPaint\n        if not deferDeckRender then\n            coveredDeckBattle=nil\n            coveredPaint=coveredPaintCheck(run,deckBattle,pass)\n        end\n        self.battleUI:setActive(self.mode == \"battle\" and not deckOpen and not potionOpen and not blocked,\n            suspendBattle(run,deckOpen,potionOpen),deferDeckRender)\n        if visibilityPass==pass then coveredDeckBattle=deckBattle end\n        return coveredPaint\n    end\n    return function(run,inMenu,deckOpen,potionOpen,blocked)\n            visibilityPass=visibilityPass+1\n            local pass=visibilityPass\n            if syncNative then syncNative(run) end\n            menu:SetVisible(inMenu and not self.characterOpen and not self.easterEggOpen)\n            local coveredPaint=refreshBattleVisibility(run,deckOpen,potionOpen,blocked,pass)\n            child(\"battlePanel\"):SetVisible(self.mode == \"battle\")"},
  {"at":312,"before":"            child(\"nodePanel\"):SetVisible(self.mode == \"node\")\n        end","after":"            child(\"nodePanel\"):SetVisible(self.mode == \"node\")\n            return coveredPaint\n        end"},
  {"at":317,"before":"function M.renderBattlePage(self,child)\n    return function(run)\n            self.battleUI:render()\n            if run.phase == \"combat\" and self.presentedBattle ~= run.combat then","after":"function M.renderBattlePage(self,child)\n    return function(run,coveredPaint)\n            -- Page readiness can reuse the eager deck cover, unless a native\n            -- callback advanced the page or the combat after that paint.\n            if not (coveredPaint and coveredPaint()) then\n                self.battleUI:render()\n            end\n            if run.phase == \"combat\" and self.presentedBattle ~= run.combat then"},
  {"at":370,"before":"function M.renderCurrentPage(self,renderBattlePage,renderMapPage,platform)\n    return function(run,deckOpen,potionOpen,blocked,covering)\n            local entry=self.nodeEntry","after":"function M.renderCurrentPage(self,renderBattlePage,renderMapPage,platform)\n    return function(run,deckOpen,potionOpen,blocked,covering,coveredPaint)\n            local entry=self.nodeEntry"},
  {"at":375,"before":"            if self.mode == \"battle\" then\n                renderBattlePage(run)\n            elseif self.mode == \"map\" then","after":"            if self.mode == \"battle\" then\n                renderBattlePage(run,coveredPaint)\n            elseif self.mode == \"map\" then"},
  {"at":659,"before":"            refreshUtilities(run,inMenu,deckOpen,potionOpen,blocked,returnAvailable)\n            refreshPageVisibility(run,inMenu,deckOpen,potionOpen,blocked)\n            renderCurrentPage(run,deckOpen,potionOpen,blocked,covering)\n            bgm:update(self.settlementRequested and \"stop\" or Bgm.scene(self.mode, run, self.battleUI.busy, bgm.cue))","after":"            refreshUtilities(run,inMenu,deckOpen,potionOpen,blocked,returnAvailable)\n            local coveredPaint=refreshPageVisibility(run,inMenu,deckOpen,potionOpen,blocked)\n            renderCurrentPage(run,deckOpen,potionOpen,blocked,covering,coveredPaint)\n            bgm:update(self.settlementRequested and \"stop\" or Bgm.scene(self.mode, run, self.battleUI.busy, bgm.cue))"},
 ],
});
function beforeRewardsBackExtraction(path,source){
 if(path!==rewardsBackView)return source;
 const current=matches(source,rewardsBackViewSuccessor);
 if(!current&&!matches(source,rewardsBackViewBeforeCover))return source;
 let text=normalize(source);
 if(current){
  text=restoreExactFixtureHunks(coveredBattleReplay,path,text);
  assert(matches(text,rewardsBackViewBeforeCover),'exact first-cover render predecessor');
 }
 const helper=`local function refreshRewardsBack(button,available)
    button:SetVisible(available)
    if button:GetChild('v25Face') then
        require('abyss_v25_menu_view').button(button,available)
    end
    -- Route preview raises the map. Raise this sibling when navigation returns.
    if available then button:SetAsLastSibling() end
end

`;
 const inline=`local rewardsBack=child("combatRewards")
            rewardsBack:SetVisible(returnAvailable)
            if rewardsBack:GetChild('v25Face') then
                require('abyss_v25_menu_view').button(rewardsBack,returnAvailable)
            end
            -- Route preview raises the full-page map. Restore this sibling above it
            -- when returning to navigation; visibility alone leaves it occluded.
            if returnAvailable then rewardsBack:SetAsLastSibling() end`;
 const call='refreshRewardsBack(child("combatRewards"),returnAvailable)';
 assert.equal(text.split(helper).length,2,'exact rewards back helper extraction');
 assert.equal(text.split(call).length,2,'exact rewards back helper call');
 const prior=text.replace(helper,'').replace(call,inline);
 assert(matches(prior,potionBackflow.files[path].after),'exact rewards back predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforePotionBackflow(path,source){
 const row=Object.hasOwn(potionBackflow.files,path)&&potionBackflow.files[path];
 source=beforeRewardsBackExtraction(path,source);
 if(!row||!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}

export function assertCurrentDevelopUiSource(path,source,read){
 const row=potionBackflow.files[path]??browserBackflow.files[path];
 if(!row)return;
 const expected=path===rewardsBackView?rewardsBackViewSuccessor:row.after;
 const isCurrent=value=>{
  if(path!==deckChromePath)return matches(value,expected);
  const prior=beforeCurrentReplayFixes(path,value);
  return prior!==value&&matches(prior,expected);
 };
 assert(isCurrent(source),'fresh current production owner: '+path);
 let live;
 try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
 assert(isCurrent(live),'combined linked owner identity: '+path+' during deck/potion backflow validation');
}

export function beforeDevelopUiBackflows(path,source){
 return beforeDeckBrowserBackflow(path,beforePotionBackflow(path,source));
}

export function beforeMergedInputRetirement(path,source,options){
 source=beforeCombatEvents(path,beforeActionButtons(path,beforeDevelopUiBackflows(path,source)));
 if(path==='scripts/potion-discard-layout.mjs')source=beforeNativeFlowFixture(path,source);
 return beforeNativeHostInputRetirement(path,beforeNativeFixtureInputRetirement(path,source,options),options);
}
export const inputRetirementOwns=path=>Object.hasOwn(files,path);
export const isCurrentInputRetirementSource=(path,source)=>inputRetirementOwns(path)&&matches(beforeMergedInputRetirement(path,source),files[path].after);

export function beforeInputRetirement(path,source,options){
 const witness=beforeMergedInputRetirement(path,source);
 if(!Object.hasOwn(files,path))return witness;
 const row=files[path];
 if(!matches(witness,row.after)&&!configLayoutMatches(witness,row.after,options))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}

export function readRetiredController(read){
 let source,missing;
 try{source=read(retiredControllerPath);}catch(error){
  if(error.code!=='ENOENT')throw error;
  missing=error;
 }
 if(source!==null&&source!==undefined)return {source,restored:false};
 let pointer;
 try{pointer=read(pointerInputPath);}catch(error){
  if(error.code!=='ENOENT')throw error;
 }
 if(matches(pointer,added[pointerInputPath]))return {source:removed[retiredControllerPath].source,restored:true};
 if(missing)throw missing;
 return {source,restored:false};
}
export function beforeInputRetirementReader(read){
 if(typeof read!=='function')return read;
 return path=>path===retiredControllerPath?readRetiredController(read).source:beforeInputRetirement(path,read(path));
}

export function authenticateInputRetirement(path,source,read,options){
 const prior=beforeInputRetirement(path,source,options);
 if(prior===source)return source;
 let live;
 try{live=read(path);}catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
 const witness=beforeMergedInputRetirement(path,live);
 const merged=beforeMergedInputRetirement(path,source)!==source;
 assert((witness!==live)===merged&&(!inputRetirementOwns(path)||matches(witness,files[path].after))
  &&(!merged||normalize(live)===normalize(source)),
  'combined linked owner identity: '+path+' during input retirement validation');
 return prior;
}

export function assertPointerInputSource(source){
 assert(matches(source,added[pointerInputPath]),'fresh pointer input module: '+pointerInputPath);
}

function suitePredecessor(path,source,layer){
 if(!Object.hasOwn(layer,path))return source;
 const row=layer[path];
 assert(matches(source,row.after),'fresh StS input successor: '+path);
 return normalize(source)===source?row.before.source:row.before.source.replaceAll('\n','\r\n');
}

// Release and StS receipts share the same signed deck-pages predecessors.
export function beforeDeckPagesSuiteSource(path,source,{requireCurrent=false}={}){
 if(!Object.hasOwn(suite.deck.files,path))return source;
 const {before,after}=suite.deck.files[path];
 const current=matches(beforeInputRetirement(path,source),after);
 if(requireCurrent)assert(current&&(!inputRetirementOwns(path)||isCurrentInputRetirementSource(path,source)),
  'fresh complete integration source: '+path);
 if(!current)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}

export function beforeInputRetirementStsSuite(paths,read,trustSuccessors){
 assert.deepEqual(Object.keys(trustSuccessors).sort(),Object.keys(suite.trustPredecessors).sort(),'exact StS helper trust leaf paths');
 for(const sha of Object.values(trustSuccessors))assert.match(sha,/^[a-f0-9]{64}$/,'input retirement StS helper trust leaf');
 const names=new Set(paths);
 assert.equal(names.size,paths.length,'unique live StS suite inventory');
 for(const [path,identity] of Object.entries(suite.added)){
  assert(names.delete(path)&&matches(read(path,'utf8'),identity),'fresh new StS inventory source: '+path);
 }
 for(const path of Object.keys(suite.removed)){
  assert(!names.has(path),'retired StS fixture is absent: '+path);
  assert.throws(()=>read(path,'utf8'),{code:'ENOENT'});
  names.add(path);
 }
 for(const [path,identity] of Object.entries(suite.deck.added)){
  assert(names.delete(path)&&matches(suitePredecessor(path,read(path,'utf8'),files),identity),'fresh deck inventory source: '+path);
 }
 return {paths:[...names].sort(),read:(path,encoding)=>{
  if(Object.hasOwn(suite.removed,path)){
   const source=suite.removed[path].source;
   return encoding?source:Buffer.from(source);
  }
  const raw=read(path,encoding);
  if(Object.hasOwn(suite.trustPredecessors,path)){
   const text=typeof raw==='string'?raw:raw.toString('utf8');
   assert(!text.includes('\r\r\n')&&hash(normalize(text))===trustSuccessors[path],'fresh input retirement StS helper: '+path);
   const prior=suite.trustPredecessors[path].source;
   const source=text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
   return typeof raw==='string'?source:Buffer.from(source);
  }
  if(![files,suite.deck.files,suite.earlier].some(layer=>Object.hasOwn(layer,path)))return raw;
  const bytes=typeof raw==='string'?raw:raw.toString('utf8');
  const source=suitePredecessor(path,suitePredecessor(path,suitePredecessor(path,bytes,files),suite.deck.files),suite.earlier);
  return typeof raw==='string'?source:Buffer.from(source);
 }};
}
