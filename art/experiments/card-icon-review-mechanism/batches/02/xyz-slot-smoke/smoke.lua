local exact,fixture,generated,mode,archive=arg[1],arg[2],arg[3],arg[4],arg[5]
assert(mode=='exact-fork' or mode=='packed-archive','unknown probe mode')
package.path=exact..'/?.lua;'..package.path
-- CardSkin captures the config table during require; the isolated slot path
-- consumes no theme values. Any unexpected field read fails loudly.
package.preload.abyss_theme=function()
 local function guard(path,keys)
  return setmetatable(keys or {}, {__index=function(_,key) error('unexpected theme access: '..path..key)end})
 end
 return guard('',{cardSkin=guard('cardSkin.')})
end
local F=dofile(fixture)
local packed=mode=='packed-archive'
if packed then package.loaded.abyss_card_art_runtime=dofile(archive)end
local runtime=require('abyss_card_art_runtime')
local display=require('abyss_card_display')
local assets=dofile(generated)
local expect={}
for id,a in pairs(assets)do
 expect[id]=a.slots
 if packed then a.slots=nil else a.precisionPacked=nil;a.precisionEncoding=nil end
end
local p={strike={},bash={},fallback={}}
display.bindNativeAssets(p,assets)
assert(p.strike.nativeArt==assets.strike and p.bash.nativeArt==assets.bash and p.fallback.nativeArt==nil)
local box=F.face()
local pool,icon=box:GetChild('artSamples'),box:GetChild('art')
local platform=F.platform
local failRotation=false
local function track(c)
 local original=c.SetLocalRotation
 function c:SetLocalRotation(...)
  if failRotation then return false end
  return original(self,...)
 end
 return c
end
local function instantiate(index,parent)
 if not packed then
  local c=F.instantiate(index,parent)
  return index==41 and track(c) or c
 end
 assert(parent==pool and (index==1 or index==10))
 local c=F.control('container',parent)
 parent.children[#parent.children+1]=c
 F.created[#F.created+1]=c
 for i=1,index do
  local slot=track(F.control('image',c))
  slot.image=100001
  slot.anchorMin={.5,.5};slot.anchorMax={.5,.5};slot.pivot={.5,.5};slot.scale={1,1,1};slot.rotation={0,0,0}
  c.children['row'..i]=slot
 end
 return c
end
runtime.configure({instantiate=instantiate,destroy=F.destroy,imageTemplateIndex=41,containerTemplateIndex=73,
 packedTemplates={['1']=1,['10']=10,['60']=60}})
local function bind(id,uid)
 return display.writeNativeArt(box,{id=id},p[id].nativeArt,platform,icon,uid)
end
local function aliveRows()
 local list,groups={},0
 for _,group in ipairs(pool.children) do
  if group.alive then
   groups=groups+1
   if packed then
    for i=1,60 do
     local im=group.children['row'..i]
     if im then assert(im.alive);list[#list+1]=im end
    end
   else
    for _,im in ipairs(group.children)do assert(im.alive);list[#list+1]=im end
   end
  end
 end
 return list,groups
end
local function eq(a,e,eps)
 assert(#a>=#e);for i,v in ipairs(e)do assert(math.abs(a[i]-v)<eps)end
end
local function quant(v,scale)
 local t={};for i,a in ipairs(v)do t[i]=math.floor(a*scale+.5)/scale end;return t
end
local function drain()
 local updates=0
 repeat
  runtime.update();updates=updates+1
  assert(updates<=16,'art never visible')
  assert(runtime.status().failedPools==0)
  if not pool.visible then assert(icon.visible,'fallback lost before art publish')end
 until pool.visible
 assert(not icon.visible)
 return updates
end
local function validate(id,updates)
 local a,g=aliveRows()
 assert(#a==#expect[id] and runtime.status().liveControls==#a+g)
 for i,e in ipairs(expect[id])do
  local row=a[i]
  assert(row.visible and row.image==e.image and not row.enableMask and not row.enableFill)
  eq(row.anchorMin,e.anchorMin,1e-10);eq(row.anchorMax,e.anchorMax,1e-10);eq(row.pivot,e.pivot,1e-10)
  eq(row.scale,{1,1,1},1e-10);eq(row.imageColor,e.colour,1e-10)
  eq(row.position,packed and quant(e.position,20) or e.position,1e-10)
  eq(row.size,packed and quant(e.size,20) or e.size,1e-10)
  eq(row.rotation,packed and quant(e.rotation,10) or e.rotation,1e-10)
  print(string.format('ROW %s %d %d %.17g %.17g %.17g %.17g %.17g %.17g %.17g',id,i,row.image,
   row.position[1],row.position[2],row.size[1],row.size[2],row.rotation[1],row.rotation[2],row.rotation[3]))
 end
 print('BOUND',id,#a,g,#a+g,updates)
 return a
end
local function noArt()
 local a,g=aliveRows()
 assert(#a==0 and g==0 and runtime.status().liveControls==0 and not pool.visible and icon.visible)
end
local function nextCard(id,uid,prior)
 local ok,why=bind(id,uid)
 assert(not ok and why=='native art pending' and not pool.visible and icon.visible)
 if prior then for _,old in ipairs(prior)do assert(not old.alive,'stale card row survived replacement') end end
 local rows=validate(id,drain())
 local n=#F.created
 assert(bind(id,uid+100),'ready unchanged metadata not reused')
 runtime.update();assert(#F.created==n,'ready unchanged metadata caused native realloc')
 return rows
end
local old=nextCard('strike',1)
local newer=nextCard('bash',2,old)
assert(not bind('fallback',3));noArt();for _,row in ipairs(newer)do assert(not row.alive)end
runtime.update();noArt();print('FALLBACK restoration and cleanup pass')
nextCard('strike',4,newer)
display.clearNativeArt(box,icon);noArt()
if not packed then
 failRotation=true
 assert(not bind('strike',5));runtime.update();noArt()
 local n=#F.created
 runtime.update();assert(#F.created==n and #aliveRows()==0,'failed writer retried')
 failRotation=false
 display.clearNativeArt(box,icon);noArt()
 nextCard('strike',6)
 display.clearNativeArt(box,icon);noArt()
 print('REJECTION real failed SetLocalRotation leaves fallback, no leak, explicit recover pass')
end
print('SMOKE_PASS',mode,#F.created,#F.destroyed)
