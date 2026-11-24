local treeReads=0
local function control(spec)
 local c={name=spec.name,children={},listeners={},visible=spec.visible~=false}
 function c:GetChild(name)return self.children[name]end
 function c:GetChildren()treeReads=treeReads+1;local list={};for _,v in pairs(self.children)do list[#list+1]=v end;return list end
 function c:SetVisible(v)self.visible=v end
 function c:SetAnchoredPosition(x,y)self.x,self.y=x,y end
 function c:SetSizeDelta(w,h)assert(w>=0 and h>=0);self.w,self.h=w,h end
 function c:SetLocalScale(x,y,z)self.localScaleX,self.localScaleY=x,y end
 function c:SetImage(_,id)self.image=id end
 function c:AddCursorEventListener(e,f)local previous=self.listeners[e];if previous then self.listeners[e]=function(...)local a,b=previous(...);f(...);return a,b end else self.listeners[e]=f end end
 for _,s in ipairs(spec.children or{})do c.children[s.name]=control(s)end
 return c
end
Color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end
Enum={ImageSource={StaticReference='static'},CursorEventType={CursorClick='click',CursorEnter='enter',CursorDown='down',CursorUp='up',CursorDrag='drag',CursorExit='exit',CursorEndDrag='end'}}
local root=control({children=dofile('controls.lua').controls})
script={object=root,EnableUpdate=function()end}
local width,height=1600,900;game={GetUICanvasSize=function()return width,height end}
coroutine=nil -- actual Simulator LuaHost has no coroutine global
dofile('scene.generated.lua');local session=OnStart();local function noListeners(n)assert(next(n.listeners)==nil,'preparation must not bind navigation');for _,c in pairs(n.children)do noListeners(c)end end;noListeners(root:GetChild('mapRoot'));assert(root:GetChild('mapRoot').visible==false,'map root must stay hidden during fixture preparation');assert(session.map.floor==0,'real-wins fixture must yield before blocking startup');for i=1,1000 do if session.ready then break end;OnUpdate(.1)end;assert(session.ready,'fixture must reach actual ready');assert(root:GetChild('mapRoot').visible==true,'ready must reveal actual native root');OnUpdate(.016)
-- Preserve shared references and cycles while comparing the full Run and Map without string serialization.
local function copyState(value,copies)
 if type(value)~='table'then return value end
 if copies[value]then return copies[value]end
 local copy={}
 copies[value]=copy
 for key,child in pairs(value)do copy[key]=copyState(child,copies)end
 return copy
end
local function sameState(before,after,forward,reverse)
 if type(before)~='table'then return before==after end
 if type(after)~='table'then return false end
 if forward[before]or reverse[after]then return forward[before]==after and reverse[after]==before end
 forward[before],reverse[after]=after,before
 for key,child in pairs(before)do
  if not sameState(child,rawget(after,key),forward,reverse)then return false end
 end
 for key in pairs(after)do if before[key]==nil then return false end end
 return true
end
local function captureState()
 local copies={}
 local run,map=copyState(session.run,copies),copyState(session.map,copies)
 return function()
  local forward,reverse={},{}
  return sameState(run,session.run,forward,reverse)and sameState(map,session.map,forward,reverse)
 end
end
local before=captureState()
for f=0,17 do session.ui:setScroll(f*100);OnUpdate(.016)end
assert(before(),'scroll must not mutate same-run state or RNG')
session.ui:focusCurrent()
local geometry=dofile('geometry.lua');assert(geometry.firstY+100-session.ui.scroll==geometry.focusY,'second-floor reference focus must be at 60% viewport');assert(geometry.firstY+16*100-geometry.maxScroll==geometry.focusY,'boss must remain scrollable into focus')
assert(session.ui.canvasWidth==1600 and session.ui.scale==1,'use actual canvas on startup')
width,height=1560,720;OnUpdate(.016);assert(session.ui.scale==1,'landscape text must not shrink to .8');assert(root:GetChild('mapRoot'):GetChild('stage').localScaleX==1);width,height=2340,1080;OnUpdate(.016);assert(session.ui.canvasWidth==2340 and session.ui.scale==1,'mobile aspect uses real canvas')
assert(root:GetChild('mapRoot'):GetChild('mapBackdrop').w==2340,'backdrop fills actual width')
local chosen,chosenId
for _,node in ipairs(session.ui.breathing)do
 local hit=node:GetChild('hit')
 if node.visible and hit.visible then
  chosen,chosenId=hit,session.ui.slots[tonumber(node.name:match('%d+'))]
  print('AVAILABLE_NATIVE_TARGET '..node.name..'/hit')
  break
 end
end
assert(chosen,'real available node target')
local controlsByName={}
local function indexControls(parent)
 if parent.name and not controlsByName[parent.name] then controlsByName[parent.name]=parent end
 for _,child in pairs(parent.children)do indexControls(child)end
end
indexControls(root)
local function find(name)return controlsByName[name]end
-- Every ambient particle moves on each ordinary frame, rather than 4/26 hopping.
local particles={};for i=0,25 do particles[i]={x=find('ember'..i).x,y=find('ember'..i).y}end
OnUpdate(.016)
for i=0,25 do local n=find('ember'..i);assert(n.y~=particles[i].y,'each ambient track must update every normal frame')end
assert(session.ui.spikeAnimatedWrites<=256,'ambient and sparks share unchanged budget')
assert(before(),'visual sampling cannot consume game RNG')
assert(find('figmaHP').text=='<b>'..string.format('%.0f',session.run.hp)..'</b>','current HP uses supported bold rich text')
assert(find('figmaHPMax').text=='<b>/'..string.format('%.0f',session.run.maxHp)..'</b>','maximum HP is separate muted run')
local coin=find('hudCoin');local money=find('figmaGold');assert(math.abs((money.x-money.w/2+2)-(coin.x+8.5)-6)<.001,'gold glyph and number have source6px gap')
session.ui.reducedMotion=true;OnUpdate(.016);for i=0,25 do assert(not find('ember'..i).visible,'reduced motion must hide ambient dots, not stack at origin')end
session.ui.reducedMotion=false;OnUpdate(.016);for i=0,25 do assert(find('ember'..i).visible,'resume only after sampling restored position')end
local readsBefore=treeReads;session.ui:render();assert(treeReads-readsBefore<64,'render must reuse control index rather than traverse the entire native tree')
local officialIcons={combat=102044,elite=102034,event=100114,shop=102025,camp=102002,treasure=102028,boss=102033};for _,node in ipairs(session.map.nodes)do local fx=session.ui.roomFx[node.id];if fx and fx.visible then assert(fx.box:GetChild('icon').image==officialIcons[node.type],'visible node body must remain official icon')end end
find('menuHit').listeners.click();assert(find('mapMenu').visible);assert(not session.ui:choose(chosenId),'menu modal must block queued/controller choice');find('menuLegend').listeners.click();assert(not find('legendPlate').visible);find('menuHit').listeners.click();find('menuLegend').listeners.click();assert(find('legendPlate').visible);find('menuHit').listeners.click();find('menuHelpHit').listeners.click();assert(find('menuHelp').visible);find('menuDismiss').listeners.click();assert(before(),'menu only controls presentation')
local locked;for _,fx in pairs(session.ui.roomFx)do if fx.visible and fx.state=='locked'then locked=fx.box:GetChild('hit');break end end;assert(locked and locked.visible,'nonavailable nodes need informational hit target');locked.listeners.enter({touchId=-1});assert(find('mapTooltip').visible);assert(not locked.listeners.click({touchId=7}),'informational mobile tap must not bypass Nodes');assert(before(),'inspection must preserve game RNG/state');locked.listeners.exit({})
chosen.listeners.enter({touchId=-1});OnUpdate(.016);chosen.listeners.exit({});assert(before(),'hover must not alter real run/map/RNG')
local cameraBefore=session.ui.scroll
assert(chosen.listeners.click(),'actual Nodes.enter must succeed')
assert(session.ui.scroll==cameraBefore,'business commit must not immediately jump camera');assert(session.ui.spikeTransition.segments>0 and session.ui.spikeTransition.progress<.01,'new route must begin undrawn');session.ui:render();assert(session.ui.spikeTransition.segments>0 and session.ui.spikeTransition.progress<.01,'render/update(0) must retain transition transaction')
OnUpdate(.016)
assert(not chosen.listeners.click(),'second click must not enter again')
for _,node in ipairs(session.map.nodes)do if node.id==chosenId then assert(find('pickedIcon').image==officialIcons[node.type],'picked animation must reuse the same official icon body')end end
assert(session and session.run,'standalone entry exposes real session handle')
local owner,combat=session.run,session.run.combat
for i=1,9 do OnUpdate(.1)end
assert(not session.ui.visible,'entered room must leave interactive map')
root:GetChild('roomPanel'):GetChild('roomRoute'):GetChild('hit').listeners.click()
assert(session.ui.visible and not session.ui.navigationEnabled,'preview remains read-only')
session.ui:setScroll(0);for i=1,4 do OnUpdate(.1)end;assert(session.ui.scroll==0,'hidden selection camera callback must not refocus later readonly preview')
root:GetChild('mapRoot'):GetChild('stage'):GetChild('previewReturn'):GetChild('hit').listeners.click()
assert(not session.ui.visible and session.run==owner and owner.combat==combat,'return must preserve actual room owner')
local settled=captureState();for i=1,10 do OnUpdate(.1)end;assert(settled(),'completed fixture must not rerun commands')
print('SCENE_PASS actual Run Map Nodes start and single entry; no synthetic completion')
