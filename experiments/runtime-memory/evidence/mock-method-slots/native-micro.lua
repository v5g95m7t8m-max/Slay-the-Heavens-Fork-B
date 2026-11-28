local generated,fixture=arg[1],arg[2]
package.path=generated..'/?.lua;src/lua/?.lua;'..package.path
local F=assert(loadfile(fixture))()
local test=F.control({name='small',kind='container',children={{name='child',kind='image'}}})
assert(test:GetChild('child')); local SetVisible=test.SetVisible
assert(SetVisible==test:GetChild('child').SetVisible)
local override=function(c,v) c.visible=v==false end
test.SetVisible=override; assert(test.SetVisible==override)
test:SetVisible(false); assert(test.visible)
test.SetVisible=SetVisible
test:SetVisible(false); assert(not test.visible)
test:SetVisible(true); assert(test.visible)
for i=1,3 do collectgarbage('collect') end
local before=collectgarbage('count')
local root=F.control({name='canvas',children=F.Layout})
for i=1,3 do collectgarbage('collect') end
local after=collectgarbage('count')
local methods={'GetChild','AddKeyEventListener','SetVisible','SetSizeDelta','SetLocalScale','SetAnchoredPosition','SetImage','SetAsLastSibling','AddCursorEventListener'}
local nodes,own,lookup=0,0,0
local function count(n)
 nodes=nodes+1
 for i=1,#methods do
   if rawget(n,methods[i]) then own=own+1 end
   assert(type(n[methods[i]])=='function'); lookup=lookup+1
 end
 for _,c in pairs(n.children) do count(c) end
end
count(root)
print(string.format('{"runtime":"%s","nodes":%d,"own":%d,"lookup":%d,"beforeKiB":%.3f,"afterKiB":%.3f,"deltaKiB":%.3f}',_VERSION,nodes,own,lookup,before,after,after-before))
