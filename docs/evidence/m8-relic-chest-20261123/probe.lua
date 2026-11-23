local G=require('abyss_game_ui')
local create=G.new
local F
G.new=function(root,data,presentation,event,platform)
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local meta=getmetatable(page);local active=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active end;return meta.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return meta.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active=value;F.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=true
 return create(root,data,presentation,event,platform)
end
F=dofile('tests/lua/support/game_ui_fixture.lua')
local routes=dofile('tests/lua/support/map_routes.lua')
local Map,C,T=require('abyss_map'),F.Combat,F.Theme
local cursor={CursorEnter='enter',CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='endDrag'}
local function get(root,path)
 for n in string.gmatch(path,'[^/]+') do root=assert(root:GetChild(n),path)end
 return root
end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local function emit(control,kind,touch)
 return assert(control.listeners[kind],kind)({touchId=touch})
end
local function advance(h)
 for _=1,120 do h:update(1/60) end
end
for _,case in ipairs({{'camp',true},{'treasure',true},{'treasure',false}})do
 local kind,stale=case[1],case[2]
 local h,r=F.fixture(nil,nil,nil,cursor,nil,nil,{touchScreen=function()return true end});assert(F.start(h))
 h:resize(844,390);h.run.hp=35
 local path=routes.to(h.map,function(n)return n.type==kind end)
 for i=1,#path-1 do assert(Map.choose(h.map,path[i])) end
 h.run.floor=h.map.floor
 assert(h.mapUI:choose(routes.at(h.map,path[#path]).id));advance(h)
 assert(h.mode=='node' and h.run.phase=='node' and (h.run.nodeFlow.roomKind==kind or h.run.nodeFlow.type==kind),kind..':'..h.mode..':'..h.run.phase..':'..tostring(h.run.nodeFlow.roomKind)..':'..tostring(h.run.nodeFlow.type))
 h.run.relics={'neows_lament','maw_bank','anchor','ancient_tea_set','burning_blood','vajra'}
 h.run.relicCounters={neows_lament=2,maw_bank=-2,ancient_tea_set=-2}
 h:refresh()
 local hp=h.run.hp
 local before,mapBefore=C.copy(h.run),C.copy(h.map)
 local run,flow=h.run,h.run.nodeFlow
 local roomAction=get(r,kind=='camp' and 'nodePanel/campView/rest/hit' or 'nodePanel/treasureView/chest/hit')
 local node=get(r,'nodePanel')
 local relicEntry=get(r,'relicBar/slot1/hit')
 local panel=get(r,'relicPanel')
 assert(node.active and relicEntry.raycastTarget~=false)
 if stale then emit(roomAction,'down',41);emit(roomAction,'up',41)end
 assert(relicEntry.click({touchId=42}))
 assert(panel.visible and h.relicUI.visible and h.deckUI.detailOnly=='relics')
 local function text(path)return get(panel,path).text end
 assert(get(panel,'single').visible and h.relicUI:pages()==2 and h.relicUI.selectedIndex==1)
 local states={'剩余 2 场','已失效','','已蓄能','',''}
 for i,id in ipairs(h.run.relics)do
  assert(h.relicUI.selected.id==id and h.relicUI.selectedIndex==i)
  assert(text('single/status')==states[i],id..':'..text('single/status'))
  local name,description=text('single/name'),text('single/description')
  assert(#name>0 and #description>0 and name~='未识别遗物' and description~='效果说明待补充。')
  if id=='anchor' then assert(name=='石锚' and description:find('获得 10 点格挡',1,true))end
  if i<#h.run.relics then assert(get(panel,'next/hit').click({touchId=42+i})) end
 end
 local defaultOpened=h.nodeUI.opened
 if stale then emit(roomAction,'click',41) end
 assert(same(before,h.run) and same(mapBefore,h.map) and h.nodeUI.opened==defaultOpened, 'covered overlay click mutated run, route or room')
 assert(get(panel,'close/hit').click({touchId=44}))
 assert(not panel.visible and h.run==run and h.run.nodeFlow==flow and node.active)
 if stale then emit(roomAction,'click',41) end
 if kind=='treasure' and stale then
  assert(not defaultOpened and h.nodeUI.opened and not before.nodeFlow.chest.opened and h.run.nodeFlow.chest.opened)
  assert(same(mapBefore,h.map) and same(before.relics,h.run.relics) and h.run.hp==before.hp and h.run.gold==before.gold)
  assert(h.run.treasureRng.counter==before.treasureRng.counter+1)
  local oldQ,newQ=before.relicPool.queues.common,h.run.relicPool.queues.common
  assert(oldQ[1]=='Tiny Chest' and #oldQ==#newQ+1)
  for i,v in ipairs(newQ)do assert(v==oldQ[i+1])end
  assert(h.run.nodeFlow.reward.gold==53 and h.run.nodeFlow.reward.relicId=='tiny_chest')
  local unopen=C.copy(h.run)
  unopen.treasureRng,unopen.relicPool=before.treasureRng,before.relicPool
  unopen.nodeFlow.chest,unopen.nodeFlow.reward=before.nodeFlow.chest,before.nodeFlow.reward
  assert(same(before,unopen),'opening had another untracked Run effect')
  print('SHARED_RELIC_NODE_RED treasure 6 detail entries; covered Click ignored; delayed Click after close commits chest reveal, RNG '..before.treasureRng.counter..'->'..h.run.treasureRng.counter..'; one common queue item consumed; 53 gold and tiny_chest generated but not granted; owned inventory, HP, gold, map unchanged')
  goto continue
 end
 assert(same(before,h.run) and same(mapBefore,h.map),'stale press must never mutate Run or route')
 assert(h.nodeUI.opened==defaultOpened,'non-treasure stale action unexpectedly changed room UI')
 do
 emit(roomAction,'down',45);emit(roomAction,'up',45);emit(roomAction,'click',45);advance(h)
 if kind=='camp'then assert(h.run.hp>hp,'fresh Rest did not heal')
 else assert(h.nodeUI.opened and h.run.hp==hp and same(h.run.relics,before.relics) and h.run.treasureRng.counter==before.treasureRng.counter+1 and h.run.nodeFlow.reward.relicId=='tiny_chest','fresh open did not reveal exactly once without claiming')end
 local nextState=C.copy(h.run)
 if roomAction.visible then emit(roomAction,'click',45) end
 assert(same(nextState,h.run),'duplicate click changed run')
 print('SHARED_RELIC_NODE_GREEN '..kind..' 6 detail entries; modal preserved run and route; fresh action works'..(stale and '; stale click ignored' or ''))
 end
 ::continue::
end
