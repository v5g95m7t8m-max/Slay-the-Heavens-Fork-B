package.path='/tmp/sth-reentry-inputs/?.lua;src/lua/?.lua;'..package.path
local F=dofile(assert(arg[1]))
local root=F.control({children={{name='grid',kind='grid'}}})
local grid=root:GetChild('grid')
F.setEngineActive(root,false)
assert(root.activeInHierarchy==false and grid.activeInHierarchy==false)
for _,control in ipairs({root,grid}) do
 assert(rawget(control,'activeInHierarchy')==nil and not pcall(function()control.activeInHierarchy=true end))
 for k in pairs(control) do assert(k~='activeInHierarchy' and k~='alive') end
end
F.setEngineActive(root,true)
assert(grid.activeInHierarchy==true)
F.monsterActors().destroy(root)
local ok,why=pcall(function()grid:RefreshItems(0,function() error('unexpected refresh') end)end)
assert(not ok and tostring(why):find('RefreshItems on invalid object',1,true),tostring(why))
assert(not grid.alive and rawget(grid,'alive')==nil and not pcall(function()grid.alive=true end))
print('DESTROYED_GRID_AND_PUBLIC_FLAGS_PASS')
