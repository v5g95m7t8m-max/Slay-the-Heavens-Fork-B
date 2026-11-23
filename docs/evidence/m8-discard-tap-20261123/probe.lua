local G=require('abyss_game_ui')
local create=G.new
local H
G.new=function(root,data,presentation,event,platform)
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local meta=getmetatable(page);local active=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active end;return meta.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return meta.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active=value;H.F.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=true
 return create(root,data,presentation,event,platform)
end
H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local C,T=H.F.Combat,H.F.Theme
local function find(list,name)
 for _,v in ipairs(list or {})do if v.name==name then return v end end
 error('missing generated control '..name)
end
local stage=find(H.F.Layout,'stage')
local b=find(stage.children,'battlePanel')
local discard=find(b.children,'discardIcon')
local dHit=find(discard.children,'hit')
local turn=find(b.children,'endTurn')
assert(turn.kind=='presetButton' and dHit.kind=='cursorArea')
local function rect(x,y,w,h)
 return {left=x-w/2,right=x+w/2,bottom=y-h/2,top=y+h/2}
end
local D=rect(discard.position[1]+dHit.position[1],discard.position[2]+dHit.position[2],table.unpack(dHit.size))
local E=rect(turn.position[1],turn.position[2],table.unpack(turn.size))
local function separation(d,e)
 local dx=math.max(d.left-e.right,e.left-d.right,0)
 local dy=math.max(d.bottom-e.top,e.bottom-d.top,0)
 return math.sqrt(dx*dx+dy*dy),dx,dy
end
local function clearance(d,e)
 local distance,dx,dy=separation(d,e)
 assert(distance>=T.layout.endTurn.touchGap-.0001,'discard overlaps minimum end-turn safety gap')
 return distance,dx,dy
end
local gap,dx,dy=clearance(D,E)
local ok,why=pcall(clearance,E,E)
assert(not ok and tostring(why):find('discard overlaps minimum end%-turn safety gap'))
local function contains(a,x,y)
 return x>=a.left and x<=a.right and y>=a.bottom and y<=a.top
end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
for _,viewport in ipairs({{1280,720},{960,720},{844,390}})do
 local w,h=table.unpack(viewport)
 local host,ui,p,emit,_,drain,_,root=H.setup({'defend','strike'},{'cultist'},{touchScreen=function()return true end})
 host:resize(w,h);host:refresh();host:update(.8)
 local liveDiscard=p:GetChild('discardIcon'):GetChild('hit')
 local liveEnd=p:GetChild('endTurn')
 assert(liveDiscard.visible and liveDiscard.raycastTarget~=false and liveEnd.visible and liveEnd.interactable)
 assert(liveDiscard.sizeDeltaX==dHit.size[1] and liveDiscard.sizeDeltaY==dHit.size[2])
 assert(liveEnd.sizeDeltaX==turn.size[1] and liveEnd.sizeDeltaY==turn.size[2])
 local scale=math.min(w/T.canvas.base[1],h/T.canvas.base[2])
 local function between(a0,a1,b0,b1)
  if a1<b0 then return a1,b0 end
  if b1<a0 then return a0,b1 end
  local overlap=(math.max(a0,b0)+math.min(a1,b1))/2
  return overlap,overlap
 end
 local ax,bx=between(D.left,D.right,E.left,E.right)
 local ay,by=between(D.bottom,D.top,E.bottom,E.top)
 local function inward(x,y,r)
  local function keep(v,lo,hi)return math.min(hi-1,math.max(lo+1,v))end
  return keep(x,r.left,r.right),keep(y,r.bottom,r.top)
 end
 local function native(x,y)return w/2+x*scale,h/2+y*scale end
 local function deliver(px,py,id)
  local x,y=(px-w/2)/scale,(py-h/2)/scale
  local d,e=contains(D,x,y),contains(E,x,y)
  assert(not(d and e),'one coordinate matched both battle actions')
  if d then return liveDiscard.click({touchId=id,GetUIPos=function()return px,py end}) end
  if e then
   emit('endTurn','down',id,x,y)
   if liveEnd.listeners.up then emit('endTurn','up',id,x,y) end
   emit('endTurn','click',id,x,y)
   return 'endTurn'
  end
  return false
 end
 local before=C.copy(host.run);local turnNo=host.run.combat.turn
 local px,py=native((ax+bx)/2,(ay+by)/2)
 assert(not deliver(px,py,30))
 assert(same(before,host.run) and not host.deckUI.visible)
 px,py=native(inward(ax,ay,D))
 assert(deliver(px,py,31),'tapping just inside discard must open its viewer')
 assert(host.deckUI.visible and host.deckUI.pileKind=='discard' and same(before,host.run),'viewing discard must not advance or mutate Run')
 local close=root:GetChild('deckPanel'):GetChild('close'):GetChild('hit')
 assert(close.click({touchId=32}) and not host.deckUI.visible and same(before,host.run))
 px,py=native(inward(bx,by,E))
 assert(deliver(px,py,33)=='endTurn');drain()
 assert(host.run.combat.turn==turnNo+1 and not host.deckUI.visible)
 print(string.format('PILING_TOUCH_GREEN %dx%d gap=%.3f design (dx=%.3f dy=%.3f), %.3f projected pixels; gap=no-op, discard=read-only, end-turn=+1, negative=RED',w,h,gap,dx,dy,gap*scale))
end
