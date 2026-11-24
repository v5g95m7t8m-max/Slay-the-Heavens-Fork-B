local H=dofile('tests/lua/support/map_room_transition_fixture.lua')
local F,tap=H.ui,H.tap
local function same(a,b,seen)
    if type(a)~=type(b) then return false end
    if type(a)~='table' then return a==b end
    seen=seen or {}
    if seen[a] then return seen[a]==b end
    seen[a]=b
    for k,v in pairs(a)do if not same(v,b[k],seen)then return false end end
    for k in pairs(b)do if a[k]==nil then return false end end
    return true
end
local function reachable(control)
    if control.raycastTarget==false then return false end
    while control do
        if control.visible==false or control.active==false then return false end
        control=control.parent
    end
    return true
end

for _,kind in ipairs({'camp','treasure'}) do
    local host,root,_,settle,_,id,entry,depth=H.onMap(kind)
    local run=host.run
    assert(require('abyss_run').obtainRelic(run,'omamori'))
    host:refresh();settle()
    assert(tap(entry,1));settle()
    assert(host.mode=='node' and run.nodeFlow.type==kind and host.map.currentNodeId==id)
    local room=root:GetChild('nodePanel')
    local action=kind=='camp' and 'campView/rest' or 'treasureView/chest'
    local box=kind=='camp' and room:GetChild('campView'):GetChild('rest')
        or room:GetChild('treasureView'):GetChild('chest')
    local hit=box.click and box or box:GetChild('hit')
    assert(reachable(hit),kind..' room action not reachable')
    local flow=run.nodeFlow
    local before,world=F.Combat.copy(run),require('abyss_map').snapshot(host.map)
    local relicBar=root:GetChild('relicBar')
    local slot=relicBar:GetChild('slot2')
    local relicHit=slot:GetChild('hit')
    assert(reachable(relicHit),kind..' relic hit not reachable')
    assert(slot:GetChild('counter').visible and slot:GetChild('counter').text=='2','wrong Omamori HUD charge')
    local stale={touchId=17}
    print('M8_TASK_4_7_HOOK '..kind..' down='..tostring(hit.listeners.down~=nil)..' up='..tostring(hit.listeners.up~=nil))
    if hit.listeners.down then hit.listeners.down(stale) end
    assert(relicHit.click({touchId=2}));settle()
    assert(host.relicUI.visible and host.relicUI.selected.id=='omamori' and host.relicUI.selectedIndex==2)
    local panel=root:GetChild('relicPanel')
    assert(reachable(panel:GetChild('blocker')) and panel.disableCursorEventPassthrough and not host.nodeUI.visible,kind..' underlying action is not occluded')
    assert(not relicHit.click({touchId=3}),'modal accepted a second relic click')
    local previous=panel:GetChild('previous'):GetChild('hit')
    assert(reachable(previous) and previous.click({touchId=4}) and host.relicUI.selectedIndex==1)
    assert(same(run,before) and same(require('abyss_map').snapshot(host.map),world),'read-only relic modal changed business state')
    local close=panel:GetChild('blocker')
    assert(close.click({touchId=5}));settle()
    assert(not host.relicUI.visible and host.mode=='node' and run.nodeFlow==flow and reachable(hit))
    assert(not close.click({touchId=5}),'stale close escapes the relic modal')
    if hit.listeners.down then
        if hit.listeners.up then hit.listeners.up(stale) end
        assert(not hit.click(stale),'stale underlying touch mutated room after modal')
    end
    assert(same(run,before) and same(require('abyss_map').snapshot(host.map),world),'close changed business state')
    assert(tap(hit,6),'fresh room action did not work after close')
    if kind=='camp' then assert(run.hp>before.hp,'camp rest failed to heal')
    else assert(host.nodeUI.opened,'chest did not open') end
    print('M8_TASK_4_7_PASS '..kind..' room='..id..' checkpointEdges='..depth)
end
