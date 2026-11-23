local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local control=dofile('tests/lua/support/monster_control_fixture.lua')
local Combat=H.F.Combat
local function same(a,b)
 if type(a)~=type(b) then return false end
 if type(a)~='table' then return a==b end
 for k,v in pairs(a) do if not same(v,b[k]) then return false end end
 for k in pairs(b) do if a[k]==nil then return false end end
 return true
end
for _,mobile in ipairs({false,true}) do
 local seen={}
 for _,name in ipairs({'hit','intentHit','hpHit'}) do
  local h,ui,panel=H.setup({'defend'},{'jaw_worm'},{touchScreen=function()return mobile end})
  h.run.combat=Combat.new(H.F.Data,{deck={'defend'},enemies={'jaw_worm'},seed=2})
  if mobile then h:resize(844,390) end
  h:refresh()
  local b=h.run.combat
  local before,target=Combat.copy(b),ui.target
  local box=control(panel,'enemy1')
  local hit=box:GetChild(name)
  local count=0
  if hit and hit.listeners then
   local event={touchId=90,GetUIPos=function()return ui.canvasWidth/2+(box.x or 0),ui.canvasHeight/2+(box.y or 0)end}
   local kinds=mobile and {'down','up','click'} or {'enter'}
   for _,kind in ipairs(kinds) do
    if hit.listeners[kind] then hit.listeners[kind](event);count=count+1 end
   end
  end
  for i=1,24 do h:update(.05) end
  assert(same(b,before),'inspection mutated battle state')
  local info=ui.info
  local node=panel:GetChild('statusInfo')
  local power=node:GetChild('powerTips')
  local plate=node:GetChild('plate')
  local texts={}
  if power and power.visible then
   for i=1,H.F.Theme.layout.powerTips.rows do
    local tip=power:GetChild('tip'..i)
    if tip and tip.visible then texts[#texts+1]=tip:GetChild('copy').text end
   end
  end
  local first=texts[1] or ''
  local function shownText(name)
   local c=node:GetChild(name)
   return node.visible and c and c.visible and c.text or ''
  end
  print(('COPY path=%s title=%s section1=%s name1=%s text1=%s targetBefore=%s targetAfter=%s'):format(name,shownText('title'),shownText('section1'),shownText('name1'),shownText('text1'),tostring(target),tostring(ui.target)))
  seen[#seen+1]={power=power and power.visible,first=first}
  print(('PROBE mode=%s path=%s control=%s listeners=%d intent=%s infoKind=%s actorMatch=%s visible=%s oldPlate=%s powerTips=%s statesUnchanged=true first=%s'):format(mobile and 'touch' or 'PC',name,tostring(hit~=nil),count,tostring(Combat.intent(b,1).id),tostring(info and info.kind),tostring(info and info.actor==b.enemies[1]),tostring(node.visible),tostring(plate and plate.visible),tostring(power and power.visible),first:gsub('\n',' / ')))
 end
 local first=seen[1].first
 local sameCompact=first~='' and seen[1].power and seen[2].power and seen[3].power and first==seen[2].first and first==seen[3].first
 print(('PARITY mode=%s expected=true observed=%s'):format(mobile and 'touch' or 'PC',tostring(not not sameCompact)))
end
