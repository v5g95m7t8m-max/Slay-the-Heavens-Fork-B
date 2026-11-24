local testStart=dofile('tests/lua/support/game_ui_fixture.lua').start
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local advanceShop=dofile('tests/lua/support/shop_timeline.lua')
local Run,Shop=require('abyss_run'),require('abyss_shop')
local h,root=F.fixture();assert(testStart(h))
local specs={{'attack_potion','攻击'},{'skill_potion','技能'},{'power_potion','能力'},
 {'colorless_potion','无色'},{'entropic_brew','果汁'},{'fairy_in_a_bottle','无法主动'}}
for _,spec in ipairs(specs)do
 assert(Run.obtainPotion(h.run,spec[1]));h:refresh();assert(h.potionUI:open(h.run))
 root:GetChild('potionPanel'):GetChild('slot1'):GetChild('hit').click()
 local text=root:GetChild('potionPanel'):GetChild('detail').text
 assert(text:find(spec[2],1,true),spec[1]..': '..text)
 h.potionUI:close();assert(Run.discardPotion(h.run,1))
end
h.run.gold=10000
for offset=0,3,3 do
 local flow=Shop.prepare(h.run);flow.type='shop';flow.id='description-fixture-'..offset;flow.floor=h.run.floor
 for slot=1,3 do flow.potions[slot]={slot=slot,id=specs[offset+slot][1],price=50,rarity='common',sold=false,unavailable=false}end
 h.run.nodeFlow=flow;h.run.phase='node';h:refresh()
 assert(F.click(root,'nodePanel','merchant/talk'));advanceShop(h)
 for slot=1,3 do
  local text=root:GetChild('nodePanel'):GetChild('shopView'):GetChild('goods'):GetChild('potion'..slot):GetChild('description').text
  assert(text:find(specs[offset+slot][2],1,true),specs[offset+slot][1]..': '..text)
 end
end
print('LUA_POTION_REMAINING_INVENTORY_UI_PASS 12')
