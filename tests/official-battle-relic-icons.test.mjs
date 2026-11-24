import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';

test('official relic material is shared across run phases while the legacy profile and owned detail identity remain exact',t=>{
 const theme=JSON.parse(readFileSync('data/presentation/ui_theme.json','utf8'));
 const relics=JSON.parse(readFileSync('data/relics.json','utf8')).relics;
 const icons=theme.officialAssets.battleRelicIcons;
 assert.deepEqual(['burning_blood','kunai','ink_bottle'].map(id=>icons[id].id),[105071,105217,105243]);
 for(const relic of relics.filter(r=>r.rarity==='common'))assert.ok(icons[relic.id],relic.id+' common mapping');
 const admitted=new Set([102001,102034,105023,105043,105045,105046,105048,105055,105058,105065,105067,105068,105070,105071,105073,105076,105077,105078,105090,105099,105114,105127,105131,105182,105186,105191,105194,105196,105197,105204,105207,105214,105215,105216,105217,105242,105243,105246,105301]);
 for(const [id,icon]of Object.entries(icons)){
  assert.ok(relics.some(r=>r.id===id),id+' actual relic');
  assert.ok(admitted.has(icon.id),id+' inspected official asset');
  assert.equal(icon.placeholder,true,id+' honest substitute label');
  assert.match(icon.note,/代用/,id+' substitute reason');
 }
 assert.ok(new Set(Object.values(icons).map(v=>v.id)).size>=30,'common relics must remain visually varied');
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 for(const official of [false,true]){
  const dir=mkdtempSync(join(base,'relic-icons-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  buildLuaData('data',join(dir,'abyss_data.lua'));buildUI(dir,undefined,{officialAssets:official});
  const child=(node,name)=>(node.controls??node.children).find(part=>part.name===name);
  const layout=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
  const stage=child(layout,'stage')??layout;
  const selectionInfo=official?child(child(child(child(stage,'characterPanel'),'details'),'infoMotion'),'info1'):null;
  const selectionArt=official?child(selectionInfo,'v25RelicIcon').children:[];
  const detail=theme.layout.relicView.detail;
  const single=child(child(stage,'relicPanel'),'single');
  assert.deepEqual(child(single,'icon').position,detail.icon.slice(0,2));
  if(official)assert.deepEqual(child(single,'iconArt').position,child(single,'icon').position,
   'native art and fallback share the same detail anchor');
  const modules=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
  const script=join(dir,'verify.lua');
  writeFileSync(script,`local generated=${luaString(dir.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local Theme=require('abyss_theme');local V=require('abyss_relic_view_ui')
local official=${official}
local function baseIcon(id)local v=Theme.icon.relic[id];return type(v)=='table' and v.id or v end
for _,id in ipairs({'burning_blood','kunai','ink_bottle'})do
 assert(V.icon(id)==baseIcon(id) and V.icon(id,false)==baseIcon(id),'nonbattle override leaked')
 assert(V.icon(id,true)==(official and Theme.officialAssets.battleRelicIcons[id].id or baseIcon(id)),'profile guard')
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local h,r=F.fixture();assert(F.start(h))
assert(h.run.relics[1]=='burning_blood');h.run.relics[2],h.run.relics[3]='kunai','ink_bottle';h:refresh()
local bar=r:GetChild('relicBar');local panel=r:GetChild('relicPanel')
local function runIcon(id)return official and Theme.officialAssets.battleRelicIcons[id].id or baseIcon(id)end
local selectionArt=${toLua(selectionArt)}
local function sameScale(actual,expected) return math.abs(actual-expected)<0.0001 end
local function checkCrystal(host,size)
 local art=host:GetChild('iconArt')
 assert(art.visible and not host:GetChild('icon').visible,'the painted crystal must replace the atlas icon')
 assert(#selectionArt==6 and sameScale(art.localScaleX,size/100) and sameScale(art.localScaleY,size/100))
 for i,facet in ipairs(selectionArt)do
  local shape=art:GetChild('shape'..(i-1))
  assert(shape.visible and shape.imageId==facet.image and shape.rotation[3]==facet.rotation)
  assert(sameScale(shape.x*0.4,facet.position[1]) and sameScale(shape.y*0.4,facet.position[2]))
  assert(sameScale(shape.sizeDeltaX*0.4,facet.size[1]) and sameScale(shape.sizeDeltaY*0.4,facet.size[2]))
  local colour=shape.imageColor
  assert(string.format('#%02X%02X%02X',colour.r,colour.g,colour.b)==facet.colour)
 end
 assert(not art:GetChild('shape6').visible)
end
if official then checkCrystal(bar:GetChild('slot1'),Theme.officialAssets.battleRelicBar.icon)end
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==runIcon(id),'shared run map icon')end
assert(require('abyss_run').startCombat(h.run,'cultist_solo'));h:refresh()
if official then checkCrystal(bar:GetChild('slot1'),Theme.officialAssets.battleRelicBar.icon)end
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==V.icon(id,true),'battle HUD icon')end
local hp,energy,turn=h.run.hp,h.run.combat.energy,h.run.combat.turn
assert(h:openRelics(2));assert(h.relicUI.selected.id=='kunai')
assert(panel:GetChild('single'):GetChild('icon').imageId==V.icon('kunai',true))
assert(h.relicUI:turn(1));assert(h.relicUI.selected.id=='ink_bottle')
assert(panel:GetChild('single'):GetChild('icon').imageId==V.icon('ink_bottle',true))
assert(h.relicUI:turn(-1));assert(h.relicUI.selected.id=='kunai');assert(h:closeDeck())
assert(h.run.hp==hp and h.run.combat.energy==energy and h.run.combat.turn==turn,'read-only detail')
h.run.phase='map';h:refresh()
for i,id in ipairs(h.run.relics)do assert(bar:GetChild('slot'..i):GetChild('icon').imageId==runIcon(id),'same atlas on return to map')end
if official then
 assert(bar:GetChild('slot1'):GetChild('hit').click())
 assert(h.relicUI.selectedIndex==1 and h.relicUI.selected.id=='burning_blood','shared single entry from map')
 local detail=Theme.layout.relicView.detail
 local single=panel:GetChild('single')
 assert(single:GetChild('icon').x==nil and single:GetChild('iconArt').x==nil,'painting preserves the imported anchors')
 for _,name in ipairs({'frame','contentBlocker'})do
  local control=panel:GetChild(name)
  assert(control.sizeDeltaX==detail.size[1] and control.sizeDeltaY==detail.size[2],'inside clicks match the detail panel')
 end
 checkCrystal(single,detail.icon[3])
 assert(panel:GetChild('single'):GetChild('icon').imageId==runIcon('burning_blood'),'same single atlas outside combat')
 assert(h.relicUI:turn(1))
 assert(not panel:GetChild('single'):GetChild('iconArt').visible,'other relics must not inherit the crystal')
 assert(panel:GetChild('single'):GetChild('icon').visible)
 assert(h.relicUI:turn(-1))
 checkCrystal(single,detail.icon[3])
 assert(h:closeDeck())
 assert(h:openRelics())
 assert(panel:GetChild('frame').sizeDeltaX==Theme.layout.relicView.panel[3],'collection restores its wide frame')
 assert(panel:GetChild('close').x==Theme.layout.relicView.close[1])
 assert(h:closeDeck())
 local battleHost,root=F.fixture();assert(F.start(battleHost))
 local run=battleHost.run
 assert(require('abyss_run').startCombat(run,'cultist_solo'))
 run.phase='reward'
 run.rewards={manualContinue=true,gold=0,goldClaimed=true,cards={},cardResolved=true,
  relics={{id='blue_candle',sourceId='Blue Candle',claimed=false},
          {id='strike_dummy',sourceId='StrikeDummy',claimed=false}}}
 battleHost:refresh()
 local reward=root:GetChild('battlePanel'):GetChild('potionHelp')
 local row=reward:GetChild('relicReward1')
 local candle=Theme.lowCostArt.relic.assets.blue_candle.shapes
 local function checkCandle(part,iconName)
  local art=assert(part:GetChild(iconName..'Art'),'reward and held slots must share an authored relic art pool')
  assert(art.visible and not part:GetChild(iconName).visible,'the candle must replace the fallback image')
  for i,shape in ipairs(candle)do
   local facet=art:GetChild('shape'..(i-1))
   assert(facet.visible and facet.imageId==shape.image and facet.x==shape.x and facet.y==shape.y)
   assert(facet.imageColor.r==shape.colour.r and facet.imageColor.g==shape.colour.g and facet.imageColor.b==shape.colour.b)
  end
  assert(not art:GetChild('shape'..#candle).visible)
 end
 for _,state in ipairs({'normal','hover','pressed','disabled'})do checkCandle(row:GetChild(state),'rewardIcon')end
 local second=reward:GetChild('relicReward2'):GetChild('normal')
 assert(second:GetChild('rewardIconArt'):GetChild('shape0').imageId==Theme.lowCostArt.relic.assets.strike_dummy.shapes[1].image)
 local normal=row:GetChild('normal')
 local original=run.rewards.relics[1]
 run.rewards.relics[1]={id='missing_relic',sourceId='Unregistered Relic',unavailable=true,claimed=false}
 battleHost:refresh()
 assert(not normal:GetChild('rewardIconArt').visible and normal:GetChild('rewardIcon').visible)
 assert(normal:GetChild('rewardIcon').imageId==V.icon('missing_relic',true))
 run.rewards.relics[1]={sourceId='Burning Blood',claimed=false}
 local facet=normal:GetChild('rewardIconArt'):GetChild('shape0')
 local setImage=facet.SetImage;facet.SetImage=function()return false end
 battleHost:refresh()
 assert(not normal:GetChild('rewardIconArt').visible and normal:GetChild('rewardIcon').visible)
 assert(normal:GetChild('rewardIcon').imageId==V.icon('burning_blood',true),'old source ID shares the correct fallback')
 facet.SetImage=setImage
 run.rewards.relics[1]=original
 battleHost:refresh()
 checkCandle(normal,'rewardIcon')
 assert(row.listeners.click())
 assert(run.relics[2]=='blue_candle' and run.rewards.relics[1].claimed and not run.rewards.relics[2].claimed)
 assert(not row.visible and reward:GetChild('relicReward2').visible)
 checkCandle(root:GetChild('relicBar'):GetChild('slot2'),'icon')
 assert(battleHost:openRelics(2))
 checkCandle(root:GetChild('relicPanel'):GetChild('single'),'icon')
else
 assert(h:openRelics(1))
 assert(not h.relicUI.selectedIndex)
 assert(panel:GetChild('row1'):GetChild('slot'):GetChild('icon').imageId==baseIcon('burning_blood'),'legacy list restore')
end
print('BATTLE_RELIC_ICONS_SCOPE_PASS')`);
  const result=runLua(script);assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/BATTLE_RELIC_ICONS_SCOPE_PASS/);
 }
});
