import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildLuaData,luaString} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
const require=createRequire(import.meta.url);
function lua(body){
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/PAGE_REVEAL_PASS/);
}
test('one reveal gate rejects pending, stale epochs, reentry and failures; ready publishes only after another scheduler turn',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local Gate=require('abyss_page_reveal');local ready=false;local failure;local callback;local shown
local cover={SetVisible=function(_,v)shown=v end,SetAsLastSibling=function()end,GetChild=function()return nil end}
local g=Gate.new(cover,function(i)if callback then local f=callback;callback=nil;f()end;return ready,failure end)
local a={page='menuPanel',run={}};local b={page='battlePanel',run={}}
assert(g:request(a)and shown and g:covered())
for i=1,10 do assert(not g:step(a)and g:covered())end
ready=true;assert(not g:step(a)and shown and g.state=='ready')
assert(g:step(a)and not shown and not g:covered())
g:request(b);ready=false;assert(not g:step(b)and shown)
ready=true;assert(not g:step(b));g:request(a);assert(not g:step(a)and shown,'old epoch cannot reveal another page')
callback=function()g:request(b)end;assert(not g:step(a)and shown,'reentrant intent invalidates ready')
failure='asset rejected';assert(not g:step(b)and g:covered()and g.error=='asset rejected')
failure=nil;assert(not g:step(b));assert(g:step(b))
local owner={mode='node',run={phase='node',nodeFlow={event={stage='neow_blessing'}}},nodeUI={mode='normal'}}
local intro=Gate.intent(owner);g:request(intro);assert(not g:step(intro));assert(g:step(intro))
owner.run.nodeFlow.event.stage='neow_card_reward';ready=false
local reward=Gate.intent(owner);assert(g:request(reward)and g:covered(),'same-flow event stage left old page exposed')
assert(not g:step(reward));owner.nodeUI.mode='picker';owner.nodeUI.picker='neow_card'
local picker=Gate.intent(owner);assert(g:request(picker)and g:covered(),'same-flow picker did not acquire cover')
ready=true;assert(not g:step(picker));assert(g:step(picker))
local ticket=g.epoch;owner.run.combat={hand={1},turn=1};owner.mode='battle';owner.run.phase='combat'
local fight=Gate.intent(owner);g:request(fight);g:step(fight);g:step(fight);ticket=g.epoch
owner.run.combat.hand={2,3};owner.run.combat.turn=2
assert(not g:request(Gate.intent(owner))and g.epoch==ticket,'ordinary combat changes unnecessarily re-covered the page')

for _,operation in ipairs({'lookup','visibility'})do
 local nested,events,trigger=nil,{},true
 local replacement={page='mapPanel',run={}}
 local function reenter()
  if not trigger then return end
  trigger=false
  assert(nested:request(replacement))
 end
 local recovery={SetVisible=function()if operation=='visibility'then reenter()end end}
 local native={SetVisible=function()end,SetAsLastSibling=function()end,GetChild=function(_,name)
  if name~='cancel'then return end
  if operation=='lookup'then reenter()end
  return recovery
 end}
 nested=Gate.new(native,function()return false end,function(epoch)events[#events+1]=epoch end)
 assert(not nested:request({page='menuPanel',run={}}),'superseded request advanced after recovery '..operation)
 assert(nested.intent==replacement and #events==1 and events[1]==nested.epoch,'stale recovery request notified the newer epoch')
end
-- A failed in-place deck paint can be superseded while it hides recovery.
local oldRun={};local oldDeck={page='deckPanel',mode='map',run=oldRun,overlayContent=1}
local nextDeck={page='deckPanel',mode='map',run=oldRun,overlayContent=2}
local newMap={page='mapPanel',mode='map',run={}}
local handoff,triggerRecoveryWrite,failDeck
local armedRecovery={SetVisible=function()
 if not triggerRecoveryWrite then return end
 triggerRecoveryWrite=false
 assert(handoff:request(newMap))
end}
local reentrantCover={SetVisible=function()end,SetAsLastSibling=function()end,
 GetChild=function(_,name)if name=='cancel'then return armedRecovery end end}
handoff=Gate.new(reentrantCover,function()
 if failDeck then return false,'old deck failed' end
 return true
end)
assert(not handoff:step(oldDeck) and handoff:step(oldDeck))
assert(handoff:begin(nextDeck))
failDeck=true;triggerRecoveryWrite=true
assert(not handoff:finish(nextDeck))
assert(handoff.intent==newMap and handoff.state=='preparing' and handoff.error==nil,'obsolete deck paint marked the new map as failed')

print('PAGE_REVEAL_PASS')`);
});
test('ready combat choice cannot publish through a synchronous paint or on its first ready turn',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local Gate=require('abyss_page_reveal');local shown=false
local veil={SetAnchoredPosition=function()end,SetSizeDelta=function()end}
local blocker={SetAnchoredPosition=function()end,SetSizeDelta=function()end}
local cover={SetVisible=function(_,v)shown=v end,SetAsLastSibling=function()end,
 GetChild=function(_,name)if name=='veil'then return veil elseif name=='blocker'then return blocker end end}
local gate=Gate.new(cover,function()return true end,nil,{full={0,0,1280,720},choicePanel={5,10,1100,600},battlePanel={0,0,1100,600}})
local run,battle={},{}
local fight={page='battlePanel',mode='battle',phase='combat',run=run,battle=battle}
assert(not gate:step(fight) and gate:step(fight) and not shown)
local choice={page='choicePanel',mode='battle',phase='combat',run=run,battle=battle,overlayRevision={}}
assert(gate:begin(choice));assert(not gate:finish(choice) and shown and gate:covered(),'synchronous paint published unconfirmed combat choice')
assert(not gate:step(choice) and shown and gate:covered(),'first ready combat choice step skipped confirmation')
assert(gate:step(choice) and not shown and not gate:covered(),'second ready combat choice step did not publish')
local rewards={page='battlePanel',mode='battle',phase='reward',run=run,battle=battle,rewards='list'}
assert(gate:begin(rewards));assert(gate:finish(rewards) and not shown,'same-battle reward lost synchronous publication')
print('PAGE_REVEAL_PASS')`);
});
test('real generated Host keeps preparation running behind cover, blocks old pointer actions, and exposes exit recovery',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'page-reveal-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const modules=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const preloads=modules.map(n=>`package.preload[${luaString(n)}]=assert(loadfile(${luaString(join(out,n+'.lua').replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local G=require('abyss_game_ui');local make=G.new;local prepared=false;local calls=0
local extraReady,sourcePage,textureRuntime
G.new=function(root,data,presentation,event,p)
 p.presentationReady=function(intent)calls=calls+1;if extraReady then return extraReady(intent)end;return prepared end
 p.presentationPage=function(page)sourcePage=page;require('abyss_card_art_runtime').setPresentationPage(page);if textureRuntime then textureRuntime:setPresentationPage(page)end end
 return make(root,data,presentation,event,p)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local host,root=F.fixture(nil,function()return true end)
local reveal=host.pageReveal;local cover=root:GetChild('pageReveal');local start=root:GetChild('menuPanel'):GetChild('start'):GetChild('hit')
local recovery=cover:GetChild('cancel');local cancel=recovery:GetChild('hit')
assert(reveal and reveal:covered()and cover.visible)
assert(host.pointerBlocked(),'keyboard/mouse manager must honor preparation')
assert(not start.click()and not host.characterOpen,'old page click reached rules during preparation')
assert(not recovery.visible,'normal loading exposed the recovery menu button')
assert(not cancel.click()and not host.exitOpen,'normal loading accepted a stale recovery click')
local intent=require('abyss_page_reveal').intent(host)
extraReady=function()return false,'asset rejected'end
assert(not reveal:step(intent)and reveal.state=='failed');host:refresh()
assert(recovery.visible,'failed preparation lost its recovery entry')
assert(cover:GetChild('cancel'):GetChild('hit').click()and host.exitOpen,'recovery menu inaccessible')
assert(root:GetChild('runMenu').visible and not host.pointerBlocked())
assert(root:GetChild('runMenu'):GetChild('resume'):GetChild('hit').click()and not host.exitOpen,'recovery menu cannot return')
extraReady=nil
host:update(1/60);assert(not reveal:step(intent)and calls>0 and cover.visible)
host:refresh();assert(not recovery.visible and not cancel.click()and not host.exitOpen,'recovered pending page retained its error menu')
assert(cover:GetChild('message').text=='正在准备画面…','pending page retained the failure message')
prepared=true;assert(not reveal:step(intent)and cover.visible);host:refresh()
assert(not recovery.visible and not cancel.click(),'ready confirmation turn exposed recovery')
assert(reveal:step(intent));host:refresh()
assert(not cover.visible and not host.pointerBlocked())
local epoch=reveal.epoch
for i=1,20 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh();assert(not reveal:covered()and reveal.epoch==epoch,'idle frame restarted cover')end
local updateBattle=host.battleUI.update;local ruleUpdates=0
host.battleUI.update=function()ruleUpdates=ruleUpdates+1 end
host.run={phase='combat',elapsedSeconds=0};host.mode='battle';prepared=false
reveal:request(require('abyss_page_reveal').intent(host));host:update(1/60)
assert(ruleUpdates==0 and host.run.elapsedSeconds==0,'preparation advanced combat or charged load time')
host.battleUI.update=updateBattle;host.run=nil;host.mode='menu';prepared=true
reveal:request(require('abyss_page_reveal').intent(host));reveal:step(require('abyss_page_reveal').intent(host));reveal:step(require('abyss_page_reveal').intent(host));host:refresh()
assert(start.click()and host.characterOpen and reveal:covered(),'new page did not acquire a fresh cover')
assert(not host:openDeck(),'public deck action bypassed preparation')
for i=1,3 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
assert(F.confirmStart(host))
for i=1,4 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
assert(host:openDeck())
for i=1,4 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
local deckEpoch=reveal.epoch;local deckGeneration=host.deckUI.generation
for i=1,20 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()
 assert(not reveal:covered()and reveal.epoch==deckEpoch and host.deckUI.generation==deckGeneration,'idle deck generation repeatedly covered page')end
assert(host:closeDeck());assert(require('abyss_run').startCombat(host.run,'cultist_solo'));host:refresh()
for i=1,3 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
local battleEpoch=reveal.epoch;local played=false
for _,card in ipairs(host.run.combat.hand)do if F.Combat.canPlay(host.run.combat,card.uid,1)then
 assert(require('abyss_run').play(host.run,card.uid,1));played=true;break end end
assert(played);host:refresh()
assert(not reveal:covered()and reveal.epoch==battleEpoch,'an ordinary real combat play restarted page reveal')
-- Opening a choice paints first, before the Host observes choice.visible. Its
-- actual asynchronous leases must already have the explicit choice owner.
local function native()return setmetatable({alive=true},{__index=function()return function()return true end end})end
local Art=require('abyss_card_art_runtime');Art.configure({instantiate=function()return native()end,destroy=function(c)c.alive=false end,imageTemplateIndex=1,containerTemplateIndex=2})
textureRuntime=require('abyss_v25_texture_runtime').new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()return native()end,destroy=function(c)c.alive=false end,
 createController=function()local phase='building';return{begin=function()return true end,step=function()phase='ready'end,status=function()return{phase=phase}end}end})
local choiceFaces,battleFaces,pools,metadata={},{},{},{}
local choiceLayout=require('abyss_theme').layout.combatChoice
for i=1,choiceLayout.columns*choiceLayout.rows do
 choiceFaces[root:GetChild('choicePanel'):GetChild('card'..i):GetChild('face')]=true
end
for i=1,10 do
 local card=root:GetChild('battlePanel'):GetChild('card'..i);if card then battleFaces[card]=true end
end
local Display=require('abyss_card_display');local write=Display.writeNativeArt
Display.writeNativeArt=function(face,definition,raw,p,fallback,identity)
 if not choiceFaces[face]and not battleFaces[face]then return write(face,definition,raw,p,fallback,identity)end
 local wanted=choiceFaces[face]and 'choicePanel'or'battlePanel';assert(sourcePage==wanted,'first native art lease received the wrong page owner')
 pools[face]=pools[face]or native();metadata[definition.id]=metadata[definition.id]or{cardId=definition.id,slots={{}}}
 textureRuntime:surfaceApi().instantiate(101,face)
 return Art.request(face,pools[face],metadata[definition.id],p,fallback,identity,function()return true end)
end
extraReady=function(intent)local ok,why=Art.presentationReady(intent.page);if not ok then return false,why end;return textureRuntime:presentationReady(intent.page)end
local uids={};for _,card in ipairs(host.run.combat.hand)do uids[#uids+1]=card.uid end
host:refresh();assert(not Art.presentationReady('battlePanel'),'battle native-art owner missing')
host.run.combat.pendingDiscard={token='page-reveal-choice',turn=host.run.combat.turn,count=1,handUids=uids}
host:refresh();assert(host.choiceUI.visible and reveal:covered())
assert(not Art.presentationReady('choicePanel'),'first choice native-art owner missing')
assert(not textureRuntime:presentationReady('choicePanel')and not textureRuntime:presentationReady('battlePanel'))
assert(not reveal:step(require('abyss_page_reveal').intent(host)),'empty choice readiness skipped first leases')
Art.update();textureRuntime:update();assert(not reveal:step(require('abyss_page_reveal').intent(host)));assert(reveal:step(require('abyss_page_reveal').intent(host)))
host:refresh();local choiceEpoch=reveal.epoch;local generation=host.choiceUI.generation
for i=1,10 do host:refresh();host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));assert(not reveal:covered()and reveal.epoch==choiceEpoch,'choice idle refresh restarted cover')end
assert(host.choiceUI.generation==generation,'idle refresh unexpectedly changed choice input generation')
assert(host.choiceUI:select(1));host:refresh()
assert(host.choiceUI.generation>generation and reveal.epoch==choiceEpoch and not reveal:covered(),'choice selection input generation unnecessarily restarted cover')
Display.writeNativeArt=write
print('PAGE_REVEAL_PASS')`);
});
test('art and texture readiness uses explicit lease page owners, rejects missing ownership and ignores unrelated pages',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local function native()return setmetatable({alive=true},{__index=function(_,key)return function()return true end end})end
local Art=require('abyss_card_art_runtime')
local api={instantiate=function()return native()end,destroy=function(c)c.alive=false end,imageTemplateIndex=1,containerTemplateIndex=2}
Art.configure(api);Art.setPresentationPage('battlePanel')
local box,pool,fallback=native(),native(),native()
local metadata={cardId='probe',slots={{}}}
assert(not Art.request(box,pool,metadata,{},fallback,1,function()return true end))
assert(not Art.presentationReady('battlePanel'));assert(Art.presentationReady('nodePanel'))
Art.update();assert(Art.presentationReady('battlePanel'))
Art.configure(api);assert(not Art.request(native(),native(),metadata,{},native(),2,function()return true end))
local ok,reason=Art.presentationReady('nodePanel');assert(not ok and reason:find('UNAVAILABLE',1,true))
local Texture=require('abyss_v25_texture_runtime')
local runtime=Texture.new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()return native()end,destroy=function(c)c.alive=false end,
 createController=function()local phase='building';return{begin=function()return true end,step=function()phase='ready'end,status=function()return{phase=phase}end}end})
runtime:setPresentationPage('battlePanel');assert(runtime:surfaceApi().instantiate(101,native()))
assert(not runtime:presentationReady('battlePanel'));assert(runtime:presentationReady('nodePanel'))
runtime:update();assert(runtime:presentationReady('battlePanel'))
runtime:setPresentationPage(nil);assert(runtime:surfaceApi().instantiate(101,native()))
local ready,why=runtime:presentationReady('nodePanel');assert(not ready and why:find('UNAVAILABLE',1,true))
local broken=Texture.new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()error('allocation rejected')end,destroy=function(c)c.alive=false end})
assert(not broken:surfaceApi().instantiate(101,native()));assert(broken:status().roots==0)
local valid,reason=broken:presentationReady('choicePanel');assert(not valid and reason:find('UNAVAILABLE',1,true),'retired unknown-owner allocation failure was forgotten')
print('PAGE_REVEAL_PASS')`);
});

test('covered preparation pauses real Match resolution and all node rule clocks, then resumes one committed reward',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'page-reveal-match-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(file=>`package.preload[${luaString(file.slice(0,-4))}]=assert(loadfile(${luaString(join(out,file).replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local H=dofile('tests/helpers/act2_event_ui.lua');local create=H.control
H.control=function(spec,parent)local c=create(spec,parent)
 function c:GetChildren()local list={};for _,v in pairs(self.children)do list[#list+1]=v end;return list end
 function c:SetLocalRotation(x,y,z)self.localRotationX=x;self.localRotationY=y;self.localRotationZ=z end
 return c end
local run,map=H.fixture('match_game');local node,get,shown,click=H.setup(run,map)
assert(click('eventView/option1'));assert(click('eventView/option1'))
local pair
for i,a in ipairs(run.nodeFlow.event.board)do
 for j,b in ipairs(run.nodeFlow.event.board)do if i<j and a.cardId==b.cardId then pair={i,j};break end end
 if pair then break end
end
assert(pair);assert(click('pickerView/forgeGrid/card'..pair[1]));assert(click('pickerView/forgeGrid/card'..pair[2]))
local deck,attempts=#run.deck,run.nodeFlow.event.attemptsLeft
local covered=true;local ruleCalls=0;local preparations=0;local battleCalls=0;local deckUpdates=0
local host={run=run,mode='node',nodeUI=node,deckUI={update=function()deckUpdates=deckUpdates+1 end},mapUI={update=function()end},
 battleUI={update=function()battleCalls=battleCalls+1 end},
 pageReveal={covered=function()return covered end,intent={page='nodePanel'}},paintArtLoading=function()end,animate=function()end}
local original=node.update;node.update=function(self,dt)ruleCalls=ruleCalls+1;return original(self,dt)end
local prepare=node.prepare;node.prepare=function(self,dt)preparations=preparations+1;return prepare(self,dt)end
local update=require('abyss_game_ui_lifecycle').update(host,{},function()return false end,function()end,{})
local before=H.snapshot(run)
for i=1,3 do assert(update(host,2))end
H.same(run,before);assert(ruleCalls==0 and battleCalls==0 and preparations==3 and deckUpdates==0,'covered update did not isolate preparation to the target owner')
covered=false;update(host,0)
assert(#run.deck==deck and run.nodeFlow.event.attemptsLeft==attempts,'covered wall time leaked into Match resolve')
update(host,0.05);assert(#run.deck==deck and run.nodeFlow.event.attemptsLeft==attempts,'normal Match wait was skipped')
update(host,2)
assert(#run.deck==deck+1 and run.nodeFlow.event.attemptsLeft==attempts-1,'revealed Match did not resume one transaction')
update(host,2)
assert(#run.deck==deck+1 and run.nodeFlow.event.attemptsLeft==attempts-1,'Match reward committed twice')
assert(run.elapsedSeconds>0 and ruleCalls==4 and battleCalls==4)
print('PAGE_REVEAL_PASS')`);
});

test('new battle still gates input while settlement and reward cards stay on the ready scene',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'pc13-cover-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out);
 const source=`package.path=${luaString(out.replaceAll('\\','/')+'/?.lua;src/lua/?.lua;')}..package.path`;
 lua(`${source}
dofile('tests/lua/support/pc13_reward_cover.lua')
dofile('tests/lua/support/modal_cover_setters.lua')
print('PAGE_REVEAL_PASS')`);
 lua(`${source}
dofile('tests/lua/support/pc13_reward_feedback_tail.lua')
print('PAGE_REVEAL_PASS')`);
});

test('official Host paints a destination room once, gates pending assets and retains page fade',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const output=mkdtempSync(join(base,'develop-map-room-'));
 t.after(()=>rmSync(output,{recursive:true,force:true}));
 buildLuaData('data',join(output,'abyss_data.lua'));
 buildUI(output,undefined,{officialAssets:true,nativePageLifecycle:true});
 const paths=luaString(output.replaceAll('\\','/')+'/?.lua;src/lua/?.lua;');
 lua(`package.path=${paths}..package.path
dofile('tests/lua/support/map_room_reveal.lua')
print('PAGE_REVEAL_PASS')`);
 for(const section of ['rooms','readiness','cancellation']){
   lua(`package.path=${paths}..package.path
ABYSS_MAP_ROOM_SECTION=${luaString(section)}
dofile('tests/lua/support/map_room_transition.lua')
print('PAGE_REVEAL_PASS native map departure')`);
 }
});

for (const officialAssets of [false, true]) {
  test(`${officialAssets ? 'official' : 'default'} Forethought stays open on selection and confirms once`, t => {
    const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
    const out = mkdtempSync(join(base, 'forethought-host-'));
    t.after(() => rmSync(out, { recursive: true, force: true }));
    buildLuaData('data', join(out, 'abyss_data.lua'));
    buildUI(out, undefined, { officialAssets });
    const layout = JSON.parse(readFileSync(join(out, 'game-ui.json'), 'utf8'));
    const child = (node, name) => (node.children ?? node.controls).find(value => value.name === name);
    const close = child(child(child(child(layout, 'stage'), 'deckPanel'), 'close'), 'hit');
    for (const state of close.children) {
      const label = child(state, 'label');
      assert.ok(label.size[0] >= 4 * label.text.minFontSize, `${state.name} must fit 确认选择`);
    }
    const preloads = readdirSync(out).filter(name => name.endsWith('.lua')).map(name =>
      `package.preload[${luaString(name.slice(0, -4))}]=assert(loadfile(${luaString(join(out,name).replaceAll('\\','/'))}))`);
    const script = ["package.path='src/lua/?.lua;'..package.path", ...preloads,
      "dofile('tests/lua/support/forethought_selection.lua')"].join('\n');
    const result = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', script], {
      encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, LUA_INIT: '', LUA_INIT_5_3: '' },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr + String(result.error ?? ''));
    assert.match(result.stdout, /FORETHOUGHT_SELECTION_HOST_PASS/);
  });
}

test('Forethought authenticates its complete Lua and layout owners',async()=>{
 const {beforeDevelopBackflow,authenticateDevelopBackflow}=await import('./helpers/develop-release-backflow-source.mjs');
 const {gunzipSync}=await import('node:zlib');
 const lua='src/lua/abyss_deck_ui.lua',layout='scripts/deck-ui-layout.mjs';
 const read=path=>readFileSync(path,'utf8');
 const crlf=source=>source.replace(/\r?\n/g,'\r\n');
 const priorLua=beforeDevelopBackflow(lua,read(lua));
 const priorLayout=beforeDevelopBackflow(layout,read(layout));
 assert.notEqual(priorLua,read(lua));
 assert.notEqual(priorLayout,read(layout));
 assert.equal(authenticateDevelopBackflow(lua,crlf(read(lua)),path=>crlf(read(path))),crlf(priorLua));
 assert.throws(()=>authenticateDevelopBackflow(lua,read(lua),path=>path===layout?priorLayout:read(path)),/linked owner identity/);
 assert.throws(()=>authenticateDevelopBackflow(lua,read(lua),path=>read(path)+(path==='src/lua/abyss_card_skin.lua'?'\n':'')),/linked owner identity/);
 const archive=readFileSync(new URL('./fixtures/develop-map-room-entry-source.json.gz',import.meta.url));
 const predecessor=JSON.parse(gunzipSync(archive)).files[lua].before.source;
 assert.notEqual(authenticateDevelopBackflow(layout,read(layout),read),read(layout));
 assert.throws(()=>authenticateDevelopBackflow(layout,read(layout),path=>path===lua?predecessor:read(path)),/linked owner identity/);
 const foreign=read(lua)+'\n';
 assert.equal(authenticateDevelopBackflow(lua,foreign,()=>assert.fail('foreign source read')),foreign);
});

test('current StS source replay requires the live map-room artwork owner',async()=>{
 const {sourceEpoch,ciRepairSourceEpoch}=await import('./helpers/closeout-source-epoch.mjs');
 const {gunzipSync}=await import('node:zlib');
 const config='config/architecture.json',art='src/lua/abyss_card_art_runtime.lua';
 const archive=readFileSync(new URL('./fixtures/develop-map-room-entry-source.json.gz',import.meta.url));
 const predecessor=JSON.parse(gunzipSync(archive)).files[art].before.source;
 const readSource=path=>readFileSync(path,'utf8');
 const project=read=>sourceEpoch.preCombinedSource(config,readSource(config),{target:'stsStylePrior',readSource:read});
 assert.equal(project(readSource),ciRepairSourceEpoch.proof.current[config].source);
 assert.throws(()=>project(path=>path===art?predecessor:readSource(path)),/combined linked owner identity: src\/lua\/abyss_card_art_runtime\.lua/);
});
