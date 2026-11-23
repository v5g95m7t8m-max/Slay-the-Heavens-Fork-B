local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local F=H.F
local Combat,Intent=F.Combat,require('abyss_battle_intent_view')
local lookup=dofile('tests/lua/support/monster_control_fixture.lua')
local function same(a,b)
 if type(a)~=type(b) then return false end
 if type(a)~='table' then return a==b end
 for k,v in pairs(a) do if not same(v,b[k]) then return false end end
 for k in pairs(b) do if a[k]==nil then return false end end
 return true
end
for _, row in ipairs({{'automaton','spawn_orbs','UNKNOWN'}, {'hexaghost','inferno','ATTACK_DEBUFF'}}) do
 local id,move,enum=table.unpack(row)
 local host,ui,panel=H.setup({'defend'},{id},{touchScreen=function() return true end})
 local battle=Combat.new(F.Data,{deck={'defend'},enemies={id},seed=42})
 local actor=battle.enemies[1]
 for i,v in ipairs(actor.intents) do if v.id==move then actor.intentIndex=i;break end end
 assert(Combat.intent(battle,1).id==move,'fixture did not select real '..move)
 assert(Intent.selectedDescriptor(battle,1).intent==enum)
 host.run.combat=battle;host:resize(844,390);host:refresh()
 local box=lookup(panel,'enemy1')
 local hit=box:GetChild('intentHit')
 local icon,visibleText=box:GetChild('intentIcon'),box:GetChild('intent')
 assert(hit.visible and hit.raycastTarget~=false)
 local descriptor=Intent.selectedDescriptor(battle,1)
 if move=='inferno' then
  assert(descriptor.isMultiDamage and descriptor.multiplier>1 and visibleText.text:find('x',1,true),visibleText.text)
 else
  assert(not icon.visible and not box:GetChild('intentBadge').visible,'UNKNOWN displayed known glyph')
  assert(Intent.intentView(battle,1).text:find('召唤 2 名青铜浮核',1,true),'named summon model drift')
 end
 local saved=Combat.copy(battle)
 local eventRng=Combat.copy(assert(host.run.eventRng))
 local priorTarget=ui.target
 local touch={touchId=78,GetUIPos=function()return ui.canvasWidth/2+box.x,ui.canvasHeight/2+box.y end}
 for _,name in ipairs({'down','up','click'})do assert(hit.listeners[name])(touch)end
 for _=1,24 do host:update(.05)end
 local details=panel:GetChild('statusInfo')
 assert(details.visible,'actual head help must open at '..move)
 local rows=details:GetChild('powerTips')
 local result={}
 if rows and rows.visible then
  for i=1,F.Theme.layout.powerTips.rows do
   local tip=rows:GetChild('tip'..i)
   if tip and tip.visible then result[#result+1]=tip:GetChild('copy').text end
  end
 else
  for i=1,F.Theme.layout.statusInfo.rows do
   local item=details:GetChild('text'..i)
   if item and item.visible then result[#result+1]=item.text end
  end
 end
 local copy=table.concat(result,' | ')
 assert(copy~='','head detail opened without copy'); assert(same(battle,saved),'combat mutated'); assert(same(host.run.eventRng,eventRng),'run RNG mutated'); assert(ui.target==priorTarget,'target changed')
 print('SPECIAL_HEAD move='..move..' enum='..enum..' icon='..tostring(icon.visible)..' shown='..visibleText.text..' text='..(copy:gsub('\n',' / '))..' read_only=true')
 if EXPECT_COMPACT then
  if move=='spawn_orbs' then
   assert(copy:find('意图不明（但不是攻击）',1,true) and not copy:find('青铜浮核',1,true),'UNKNOWN disclosure mismatch: '..copy)
  else
   local hits=assert(visibleText.text:match('^(%d+)x%d+$'))
   local expected='这名敌人将要对你施加负面效果并攻击造成 '..hits..' 点伤害。'
   assert(copy:find(expected,1,true) and not copy:find(' 次',1,true),'ATTACK_DEBUFF disclosure mismatch: '..copy)
  end
 end
end
