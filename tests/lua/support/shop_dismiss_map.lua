local advanceShop = dofile('tests/lua/support/shop_timeline.lua')
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Map=require('abyss_map')
local cursor={CursorDown='down',CursorDrag='drag',CursorUp='up',CursorEnter='enter',CursorExit='exit',CursorEndDrag='endDrag'}
local h,r=F.fixture(nil,nil,nil,cursor,false,nil,{touchScreen=function()return true end})
h.seed=42;assert(F.start(h))
-- Existing reachable-map fixture policy: use original graph edges, then enter
-- the actual shop through GameUI's public coordinator, without a fabricated flow.
local routes=dofile('tests/lua/support/map_routes.lua')
local path=routes.to(h.map,function(n)return n.type=='shop'end)
for i=1,#path-1 do assert(Map.choose(h.map,path[i])) end
h:refresh();assert(h.mapUI:choose(routes.at(h.map,path[#path]).id))
assert(h.mode=='node' and h.run.nodeFlow.type=='shop')
local panel=r:GetChild('nodePanel')
local function get(root,path)
        path = path:gsub('^shopView/(%a+)', function(name)
            return (name:match('^relic') or name:match('^potion') or name:match('^removal'))
                and 'shopView/goods/'..name or 'shopView/'..name
        end)
 for name in path:gmatch('[^/]+')do root=assert(root:GetChild(name),path)end
 return root
end
local function receiver(root,path)
 local c=get(root,path);return c.kind=='cursorArea' and c or assert(c:GetChild('hit'),path)
end
local function emit(hit,kind,id)
 local fn=kind=='click' and (hit.click or hit.listeners.click) or hit.listeners[kind]
 return assert(fn,'missing actual '..kind)({touchId=id})
end
local function tap(hit,id)emit(hit,'down',id);emit(hit,'up',id);return emit(hit,'click',id)end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
assert(tap(receiver(panel,'merchant/talk'),10));advanceShop(h.nodeUI)
local relic,outside=receiver(panel,'shopView/relic3'),receiver(panel,'shopDismiss')
assert(tap(relic,11));assert(get(panel,'shopView/detail').visible)
local before=F.Combat.copy(h.run);local run,map,flow=h.run,h.map,h.run.nodeFlow
emit(outside,'down',12)
assert(tap(receiver(panel,'runRoute'),13));assert(h.routeOpen)
assert(not h.mapUI.navigationEnabled and not h.mapUI:choose('f1_l1'))
assert(tap(receiver(r,'mapPanel/previewBack'),14))
assert(h.mode=='node' and not h.routeOpen and h.run==run and h.map==map and h.run.nodeFlow==flow)
assert(same(before,h.run),'read-only Map and return must preserve complete Run/RNG')
-- A pending background press from the covered page cannot dismiss a new item.
assert(tap(relic,15));assert(get(panel,'shopView/detail').visible)
emit(outside,'up',12);emit(outside,'click',12)
assert(get(panel,'shopView/detail').visible,'covered-page tail dismissed fresh selection')
assert(tap(outside,16));assert(not get(panel,'shopView/detail').visible)
assert(same(before,h.run),'outside dismissal must not buy, leave or advance RNG')
assert(tap(relic,17));assert(get(panel,'shopView/detail').visible)
assert(same(before,h.run),'fresh item input must retain ordinary inspection')
h:disable();print('POST697_GAMEUI_MAP_SHOP_PASS 1')
