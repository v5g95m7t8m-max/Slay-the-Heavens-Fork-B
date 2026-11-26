local nativeMethods={}
for _,name in ipairs({'SetVisible','SetSizeDelta','SetLocalScale','SetAnchoredPosition','SetImage','SetAnchorMin','SetAnchorMax','SetPivot','SetLocalRotation','SetAsLastSibling','AddCursorEventListener','AddKeyEventListener','AddNavigationEventListener','SetControllerNavigation','RefreshItems'})do nativeMethods[name]=true end

local observerState={}
local contexts=setmetatable({},{__mode='k'})
local function context(counts,lookups)
 local modes=contexts[counts]
 if not modes then modes={};contexts[counts]=modes end
 if modes[lookups] then return modes[lookups] end
 local standard={}
 local function wrap(key,value,mapLookupFields)
  local sceneImage=lookups and key=='SetImage'
  return function(...)
   counts.nativeCalls=counts.nativeCalls+1;counts.methods[key]=(counts.methods[key] or 0)+1
   if sceneImage then
    local control=...
    local state=type(control)=='table' and rawget(control,observerState)
    if state and state.chapterSlot then counts.chapterImages=(counts.chapterImages or 0)+1 end
   end
   if mapLookupFields and mapLookupFields.name=='mapPanel' then
    local name=select(2,...)
    if type(name)=='string' and name:match('^mapGroup%d+$') then counts.mapGroupLookups=(counts.mapGroupLookups or 0)+1 end
   end
   return value(...)
  end
 end
 local meta={
  __pairs=function(control)return next,rawget(control,observerState).fields,nil end,
  __index=function(control,key)
   local state=rawget(control,observerState)
   local fields=state.fields
   assert(key~='interactable' or fields.kind~='cursorArea','Native CursorArea has no interactable field')
   local value=fields[key]
   if value==nil then value=state.original.__index(control,key)end
   local firstLookup=lookups and key=='GetChild'
   if type(value)~='function' or not (nativeMethods[key] or firstLookup or lookups and (key=='GetChildren' or key=='SetActive')) then return value end
   -- Standard methods are the same function on thousands of template controls.
   -- Overrides and GetChild retain per-control wrappers for their binding state.
   local entry=standard[key]
   if not firstLookup and not entry then
    entry={value=value,wrapper=wrap(key,value)}
    standard[key]=entry
   end
   if entry and entry.value==value then return entry.wrapper end
   local wrappers=state.wrappers
   if not wrappers then wrappers={};state.wrappers=wrappers end
   if not wrappers[key]then wrappers[key]=wrap(key,value,firstLookup and fields)end
   return wrappers[key]
  end,
  __newindex=function(control,key,value)
   local state=rawget(control,observerState)
   local fields=state.fields
   assert(key~='interactable' or fields.kind~='cursorArea','Native CursorArea has no interactable field')
   assert(key~='alive' and key~='activeInHierarchy','read-only native property')
   counts.propertyWrites=counts.propertyWrites+1;counts.properties[key]=(counts.properties[key] or 0)+1;fields[key]=value
   if state.wrappers then state.wrappers[key]=nil end
  end
 }
 modes[lookups]=meta
 return meta
end

-- Keep each control's values private while sharing the observation machinery.
local function clearFill(control) control.fill=nil end
local function setFill(control,side,amount)
 assert(side=='right' and amount==.5,'invalid chapter scene fill')
 control.fill={side,amount}
end

return function(control,counts,lookups,spec)
 counts.methods=counts.methods or {};counts.properties=counts.properties or {}
 local original=getmetatable(control);local fields={}
 for k,v in pairs(control)do fields[k]=v end
 -- Imported chapter slots expose their static image getter and mask methods
 -- from construction. Provide them before counting runtime calls and writes.
 local chapterSlot=lookups and spec and spec.kind=='image' and spec.name:match('^paintSlot%d+$')~=nil
 if chapterSlot then
  fields.imageId=assert(spec.image)
  fields.SetFillUnused,fields.SetFillHorizontal=clearFill,setFill
 end
 for k in pairs(fields)do rawset(control,k,nil)end
 rawset(control,observerState,{fields=fields,original=original,chapterSlot=chapterSlot or nil})
 setmetatable(control,context(counts,lookups==true))
end
