local H=dofile('tests/lua/support/battle_action_fixture.lua')
local C,Theme=H.F.Combat,H.F.Theme
local host,ui,panel=H.setup({'defend'},{'cultist'})
local defs={}
for _,definition in ipairs(H.F.Data.enemies.enemies)do defs[#defs+1]=definition end
for _,module in ipairs({'abyss_act1_bosses','abyss_act2_enemies'})do for _,d in ipairs(require(module).enemies)do defs[#defs+1]=d end end
assert(#defs==42,'42 real two-act enemy definitions')
local checked=0
local function check(id,slot)
 local box=H.F.actorControl(panel,'enemy'..slot)
 local art=box:GetChild('portraitArt')
 assert(art and art.visible,id..' no visible lowcost enemy art on actual formal-profile actor')
 assert(not box:GetChild('portrait').visible,id..' misleading gallery remains visible')
 local asset=assert(Theme.lowCostArt.enemy.assets[id],id..' source missing')
 for i=0,Theme.lowCostArt.enemy.capacity-1 do local s=art:GetChild('shape'..i);assert(s and s.visible==(i<#asset.shapes),id..' shape tail')
  if i<#asset.shapes then
   local expected=asset.shapes[i+1]
   assert(s.imageId==expected.image,id..' shape image')
   assert(s.x==expected.x and s.y==expected.y,id..' shape position')
   assert(s.sizeDeltaX==expected.w and s.sizeDeltaY==expected.h,id..' shape size')
   local tone=Theme.color.text
   assert(s.imageColor.r==math.floor(expected.colour.r*tone.r/255) and s.imageColor.g==math.floor(expected.colour.g*tone.g/255) and s.imageColor.b==math.floor(expected.colour.b*tone.b/255),id..' tinted palette colour')
   assert(s.rotation[1]==(expected.rx or 0) and s.rotation[2]==(expected.ry or 0) and s.rotation[3]==(expected.rotation or 0),id..' shape rotation')
  end
 end
 checked=checked+1
end
for first=1,#defs,5 do
 local ids={}
 for i=first,math.min(first+4,#defs)do ids[#ids+1]=defs[i].id end
 host.run.combat=C.new(H.F.Data,{deck={'defend'},enemies=ids});host:refresh()
 for slot,id in ipairs(ids)do check(id,slot)end
end
for _,pair in ipairs({{'collector','torch_head'},{'automaton','bronze_orb'},{'gremlin_leader','wizard_gremlin'}})do
 local ids=pair[1]=='gremlin_leader' and {'mad_gremlin','sneaky_gremlin',pair[1]} or {pair[1]}
 host.run.combat=C.new(H.F.Data,{deck={'defend'},enemies=ids})
 assert(C.summonEnemies(host.run.combat,{{id=pair[2],x=200,y=0}}));host:refresh()
 for slot,actor in ipairs(host.run.combat.enemies)do check(actor.definitionId,slot)end
end
for _,id in ipairs({'acid_slime_l','spike_slime_l','slime_boss'})do
 host.run.combat=C.new(H.F.Data,{deck={'defend'},enemies={id}})
 local s=host.run.combat;local parent=s.enemies[1]
 C.damage(s,s.player,parent,parent.hp-math.floor(parent.maxHp/2),true)
 assert(C.intent(s,1).kind=='split',id..' real damage triggers split')
 assert(C.endTurn(s));host:refresh()
 local EnemyView=require('abyss_battle_enemy_view')
 for index,actor in ipairs(s.enemies)do if actor.hp>0 then local _,slot=EnemyView.find(s,index);assert(slot);check(actor.definitionId,slot)end end
end
print('FORMAL_ENEMY_VISIBLE_PASS '..checked..' rendered actors; 42 definitions + real summons/splits; source/mock only')
