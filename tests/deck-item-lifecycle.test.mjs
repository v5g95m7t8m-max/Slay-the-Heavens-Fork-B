import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildLuaData,luaString} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {beforeMapDeckSource,mapDeckPriorRead} from './helpers/release-map-deck-source.mjs';
import {runLua} from '../scripts/test-lua.mjs';

test('deck and relic views tolerate native item retirement and reject stale item callbacks',()=>{
 const result=runLua('tests/lua/deck_item_lifecycle.lua');
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/DECK_ITEM_LIFECYCLE_PASS 4/);
});

const require=createRequire(import.meta.url);
function lua(body){
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/DECK_REUSE_PASS/);
 return result.stdout;
}

test('historical map deck replay authenticates every current Lua owner before restoring its predecessor',()=>{
 const paths=['abyss_card_skin','abyss_deck_ui','abyss_game_ui_view','abyss_map_ui'].map(name=>'src/lua/'+name+'.lua');
 const [path,other]=paths;
 const read=(name,encoding)=>readFileSync(name,encoding);
 const current=read(path,'utf8');
 const prior=beforeMapDeckSource(path,current,read);
 assert.notEqual(prior,current);
 const crlf=source=>source.replace(/\r?\n/g,'\r\n');
 assert.equal(beforeMapDeckSource(path,crlf(current),read),crlf(prior));
 assert.deepEqual(mapDeckPriorRead(read)(path),Buffer.from(prior));
 for(const owner of paths){
  assert.throws(()=>beforeMapDeckSource(path,current,p=>p===owner?read(p,'utf8')+'\n':read(p,'utf8')),/(?:map deck|combined) linked owner identity/);
 }
 assert.throws(()=>beforeMapDeckSource(path,current,p=>{
  if(p===other)throw Error('missing fixture');
  return read(p,'utf8');
 }),/(?:map deck|combined) linked owner missing: src\/lua\/abyss_deck_ui\.lua/);
 const doubleCr=current.replace(/\r?\n/g,'\r\r\n');
 assert.notEqual(doubleCr,current,'double CR negative must change bytes');
 assert.equal(beforeMapDeckSource(path,doubleCr,()=>assert.fail('double CR source must not read owners')),doubleCr);
 const drift=current+'\n';
 assert.equal(beforeMapDeckSource(path,drift,()=>assert.fail('unknown source read another owner')),drift);
});
test('map top-bar deck skips covered map and probe painting while retaining scroll, cards and input',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'map-deck-open-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>`package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(join(out,n).replaceAll('\\','/'))}))`).join('\n');
 const output=lua(`package.path='src/lua/?.lua;'..package.path
${preloads}
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local host,root=F.fixture(nil,nil,nil,{CursorDown='down',CursorUp='up'})
assert(F.start(host) and host.mode=='map')
local panel=root:GetChild('deckPanel');local grid=panel:GetChild('pileGrid');local map=host.mapUI
local hit=root:GetChild('deckEntry'):GetChild('open'):GetChild('hit')
local oldRender=map.render;local renders=0
map.render=function(...)renders=renders+1;return oldRender(...)end
local layoutWrites,unusedWrites,probePaints=0,0,0
local createCell=grid.recycle
function grid:recycle(slot,index)
 if not self.items[slot] then
  local item=F.control(F.Templates.AbyssBattlePileCard,self);self.items[slot]=item
  local face=item:GetChild('face')
  local art=face:GetChild('art');local oldImage=art.SetImage
  art.SetImage=function(...)if self.itemCount==1 then probePaints=probePaints+1 end;return oldImage(...)end
  local frame=face:GetChild('stsReferenceChrome'):GetChild('frame')
  for _,batch in ipairs(frame:GetChildren())do for _,part in ipairs(batch:GetChildren())do
   local oldPosition=part.SetAnchoredPosition
   part.SetAnchoredPosition=function(...)
    layoutWrites=layoutWrites+1
    if tonumber(part.name:sub(5))>68 then unusedWrites=unusedWrites+1 end
    return oldPosition(...)
   end
  end end
 end
 return createCell(self,slot,index)
end
local deck=host.deckUI;local last=host.run.deck[1]
local cards={};for i=1,80 do local card=F.Combat.copy(last);card.uid=1000+i;card.cardId=i%2==1 and 'strike' or 'defend';cards[i]=card end
host.run.deck=cards;host:refresh()
local definitionCalls=0;local cardDefinition=F.Combat.cardDefinition
F.Combat.cardDefinition=function(...)definitionCalls=definitionCalls+1;return cardDefinition(...)end
local first=F.Nodes.available(host.run,host.map)[1]
local slot;for i,id in pairs(map.slots)do if id==first.id then slot=i;break end end
local node=F.mapControl(root:GetChild('mapPanel'),'node'..assert(slot)):GetChild('hit')
local event={touchId=7,GetUIPos=function()return 0,0 end}
node.listeners.down(event)
renders=0;assert(hit.click());local coldRenders=renders
host:update(0);node.listeners.up(event)
assert(not node.click(event) and not map:choose(first.id));assert(not map:scrollBy(20))
assert(grid.itemCount==80 and deck.bindings[grid.items[0]].uid==1001 and deck.bindings[grid.items[1]].uid==1002)
local function framePart(slot,index)
 return grid.items[slot]:GetChild('face'):GetChild('stsReferenceChrome'):GetChild('frame'):GetChild('batch'..math.floor((index-1)/50)):GetChild('part'..index)
end
assert(framePart(0,48).visible and not framePart(0,49).visible,'attack lost its authored silhouette')
assert(framePart(1,68).visible and not framePart(1,69).visible,'skill lost its authored silhouette')
local coldWrites,coldUnused,coldDefinitions=layoutWrites,unusedWrites,definitionCalls
assert(host:closeDeck());assert(not node.click(event),'closing revived the old map press')
assert(map:scrollBy(130));local scroll=map.scroll
renders=0;assert(hit.click());host:update(0)
assert(deck:setSort('original'));assert(deck:setSort('original'));assert(deck.bindings[grid.items[0]].uid==1080)
assert(framePart(0,68).visible and not framePart(1,49).visible,'recycled cells retained the previous silhouette')
assert(host:closeDeck())
print('map-deck renders='..coldRenders..' warm_round_trip='..renders..' probe_art='..probePaints..' frame_positions='..coldWrites..' unused_positions='..coldUnused..' definitions='..coldDefinitions)
assert(map.visible and map.navigationEnabled and map.scroll==scroll,'return lost the existing map position')
assert(host.run.deck==cards and cards[1].uid==1001)
assert(coldRenders==0 and renders==1,'deck repainted the covered map or redrew it twice on return')
assert(probePaints==0 and coldWrites<=6*68 and coldUnused==0,'cold grid repainted its probe, default attacks or unused frame shapes')
assert(coldDefinitions==12,'default sorting resolved definitions outside the requested native cells')
print('DECK_REUSE_PASS')`);
 t.diagnostic(output.split('\n').find(line=>line.startsWith('map-deck ')));
});
