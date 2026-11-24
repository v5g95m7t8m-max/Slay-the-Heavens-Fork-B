local native=dofile('tests/lua/support/map_room_transition_fixture.lua')
local Nodes=require('abyss_nodes')
local Map=require('abyss_map')
local Run=require('abyss_run')
local F,frame,onMap,hitFor,tap=native.ui,native.frame,native.onMap,native.hitFor,native.tap
local enter=Nodes.enter
local section=assert(ABYSS_MAP_ROOM_SECTION,'map room transition test section required')

local function observeCore(host,root)
    local trace={calls=0,opaqueFrame=false}
    local cover=root:GetChild('pageReveal')
    local veil=cover:GetChild('veil')
    Nodes.enter=function(...)
        trace.calls=trace.calls+1
        assert(trace.opaqueFrame and veil.imageColor.a==255,'core started before a separate opaque update')
        return enter(...)
    end
    function trace.tick(dt)
        OnUpdate(dt or frame)
        assert(script.updating and not host.disabled,'unexpected fatal UI fallback')
        if cover.visible and veil.imageColor.a==255 then trace.opaqueFrame=true end
    end
    function trace.settle(count)
        for _=1,count or 60 do
            if not host.pageReveal:covered() then return end
            trace.tick()
        end
        assert(not host.pageReveal:covered(),'page did not become interactive')
    end
    return trace,cover,veil
end

local function same(a,b,seen)
    if type(a)~=type(b) then return false end
    if type(a)~='table' then return a==b end
    seen=seen or {}
    if seen[a] then return seen[a]==b end
    seen[a]=b
    for k,v in pairs(a) do if not same(v,b[k],seen) then return false end end
    for k in pairs(b) do if a[k]==nil then return false end end
    return true
end

local function finishBattle(host,root,settle,kind)
    -- Terminal combat setup follows scripts/runtime-baseline/host.lua.
    for _,enemy in ipairs(host.run.combat.enemies)do enemy.hp=0 end
    assert(Run.finishCombat(host.run));host:refresh();settle()
    F.click(root,'battlePanel','continue');settle()
    if kind=='boss' then
        assert(host.mode=='node' and host.run.nodeFlow.roomKind=='boss_treasure',
            'Develop boss rewards should enter the existing automatic treasure room')
    else
        assert(host.mode=='map' and host.mapUI.navigationEnabled)
    end
end

if section=='rooms' then
for _,kind in ipairs({'camp','shop','event','combat','elite','boss','treasure'}) do
    local host,root,assets,settle,_,id,hit=onMap(kind)
    local map,run,oldFloor,oldGeneration=host.map,host.run,host.map.floor,host.run.roomGeneration
    local expectedRun=F.Combat.copy(run,{[run.data]=run.data})
    local expectedMap=Map.snapshot(map)
    assert(enter(expectedRun,expectedMap,id))
    local expectedType=expectedRun.nodeFlow.type
    local trace,cover,veil=observeCore(host,root)
    local mapPaints,roomPaints=0,0
    local mapRender, roomRender=host.mapUI.render,host.nodeUI.render
    host.mapUI.render=function(...)mapPaints=mapPaints+1;return mapRender(...)end
    host.nodeUI.render=function(...)roomPaints=roomPaints+1;return roomRender(...)end
    local accepted,status,requestId=tap(hit,1)
    assert(trace.calls==0,'entry work occurred before the source received feedback')
    assert(accepted and status=='selection_pending' and requestId~=nil,'actual map tap did not explicitly accept pending entry')
    assert(host.map==map and host.run==run and host.map.floor==oldFloor and host.run.roomGeneration==oldGeneration)
    assert(trace.calls==0 and cover.visible and root:GetChild('mapPanel').visible,'entry work occurred before source feedback')
    assert(not tap(hit,2),'second touch queued another request')
    for _, other in ipairs(Nodes.available(run,map)) do
        if other.id~=id then assert(not tap(hitFor(host,root,other.id),3),'another node displaced the accepted request');break end
    end
    for _=1,4 do
        trace.tick()
        if veil.imageColor.a>0 then break end
    end
    assert(veil.imageColor.a>0 and trace.calls==0,'fade had no scheduling opportunity before core entry')
    for _=1,60 do if trace.calls>0 then break end;trace.tick() end
    assert(trace.calls==1 and cover.visible,'core completion unlocked input before the destination reveal')
    if host.mode=='battle' then
        local battle=run.combat
        local turn=battle.turn
        local button=root:GetChild('battlePanel'):GetChild('endTurn')
        local endTurn=assert(button.click and button or button:GetChild('hit'))
        assert(not tap(endTurn,4) and battle.turn==turn,'covered battle accepted a direct end-turn listener')
    end
    trace.settle()
    assert(trace.calls==1 and map.currentNodeId==id and run.roomGeneration==oldGeneration+1 and run.nodeFlow.type==expectedType)
    assert(same(map,expectedMap) and same(run,expectedRun),'UI departure changed rule/RNG outputs')
    local phases={'input_received','feedback_submitted','core_enter_start','core_enter_end','native_preparation_start',
        'projection_built','native_preparation_end','page_ready','input_enabled'}
    assert(#assets.events==#phases,'room telemetry lost or repeated a phase')
    for i, phase in ipairs(phases) do
        assert(assets.events[i].phase==phase and assets.events[i].request==requestId,'out-of-order room telemetry: '..phase)
    end
    assert(not tap(hit,4),'covered or off-page map listener accepted a stale tap')
    if host.mode=='node' then
        assert(roomPaints==1 and mapPaints==0,kind..' reintroduced outgoing map or incoming room redraws: '..mapPaints..'/'..roomPaints)
        assert(root:GetChild('nodePanel').active)
    end
    if kind=='camp' then
        local panel=root:GetChild('nodePanel')
        assert(F.click(root,'nodePanel','campView/forge'));settle()
        assert(host.nodeUI.mode=='picker')
        assert(F.click(root,'nodePanel','back'));settle()
        assert(F.click(root,'nodePanel','campView/rest'));settle()
        OnUpdate(2)
        assert(F.click(root,'nodePanel','confirm'));settle()
        assert(host.mode=='map' and host.mapUI.navigationEnabled and not panel.active)
    elseif kind=='shop' then
        local room=root:GetChild('nodePanel')
        local shelf=room:GetChild('shopView')
        local prepared=assert(host.nodeUI.actions['shopView/card1'],'merchant room did not prepare a quote')
        assert(not shelf.visible and not host.nodeUI:press('shopView/card1'),'hidden shelf accepted input')
        local talk=room:GetChild('merchant'):GetChild('talk'):GetChild('hit')
        assert(tap(talk,5))
        assert(shelf.visible and not shelf:GetChild('card1').visible,'opening frame published a product')
        dofile('tests/lua/support/shop_timeline.lua')(host)
        assert(host.nodeUI.actions['shopView/card1']==prepared and shelf:GetChild('card1').visible)
    elseif host.mode=='battle' then
        finishBattle(host,root,settle,kind)
    end
    Nodes.enter=enter
    OnDestroy()
end
end

if section=='readiness' then
for _, delay in ipairs({.25,1,3}) do
    local host,root,assets,_,resize,id,hit=onMap('camp')
    local trace,cover=observeCore(host,root)
    local wait,recovery=cover:GetChild('message'),cover:GetChild('cancel')
    assets.value=false
    assert(tap(hit,10))
    resize(1344)
    for _=1,60 do if trace.calls>0 then break end;trace.tick() end
    assert(trace.calls==1,'resized departure never entered its room')
    local hiddenUntil=math.min(delay,.35)
    for _=1,math.floor(hiddenUntil/frame)do
        trace.tick()
        assert(cover.visible and not wait.visible and not recovery.visible,'short pending flashed a prompt')
    end
    for _=1,math.floor((delay-hiddenUntil)/frame)do trace.tick()end
    assert(cover.visible and wait.visible==(delay>=1) and not recovery.visible)
    assert(host.map.currentNodeId==id and not F.click(root,'nodePanel','campView/rest'),'unprepared room accepted rules input')
    assets.value=true;trace.settle()
    assert(trace.calls==1 and not wait.visible and not recovery.visible and host.mode=='node','late ready did not publish same room')
    Nodes.enter=enter
    OnDestroy()
end

for _, reason in ipairs({'injected_room_asset_failure','no_progress','projection_error'}) do
    local host,root,assets,_,_,id,hit=onMap('camp')
    local trace,cover=observeCore(host,root)
    assets.value=reason=='projection_error'
    if reason=='injected_room_asset_failure' then assets.failure=reason end
    if reason=='projection_error' then
        local render=host.nodeUI.render
        host.nodeUI.render=function(...)
            host.nodeUI.render=render
            error('injected_room_projection_failure')
        end
    end
    assert(tap(hit,20))
    for _=1,300 do
        if host.pageReveal.state=='failed' then break end
        trace.tick()
    end
    assert(host.pageReveal.state=='failed' and cover:GetChild('cancel').visible and trace.calls==1)
    if reason~='injected_room_asset_failure' then assets.value=true end
    for _=1,25 do trace.tick() end
    assert(cover.visible and host.pageReveal.state=='failed','late readiness escaped recovery')
    local run,map=host.run,host.map
    assert(tap(cover:GetChild('cancel'):GetChild('hit'),21),'failed presentation recovery unavailable')
    assert(host.exitOpen and host.menuOpen,'recovery did not open the safe menu')
    assets.value,assets.failure=true,nil
    assert(host:closeExit());trace.settle()
    assert(host.run==run and host.map==map and map.currentNodeId==id and trace.calls==1,'recovery replayed or reverted the committed room')
    Nodes.enter=enter
    OnDestroy()
end
end

if section=='cancellation' then
for _, interruption in ipairs({'menu','destroy','rejected'}) do
    local host,root,_,settle,_,id,hit=onMap('camp')
    local trace,cover=observeCore(host,root)
    local map,run=host.map,host.run
    local oldMap,oldRun=Map.snapshot(map),F.Combat.copy(run,{[run.data]=run.data})
    if interruption=='rejected' then
        Nodes.enter=function()
            assert(trace.opaqueFrame,'rejected core still ran before scheduled feedback')
            trace.calls=trace.calls+1
            return false,'combat_unavailable'
        end
    end
    assert(tap(hit,30))
    trace.tick()
    if interruption=='menu' then
        assert(host:openMenu() and host.exitOpen)
        assert(host:closeExit() and not host.exitOpen)
        trace.settle()
        assert(host.mapUI.navigationEnabled and not cover.visible and trace.calls==0)
    elseif interruption=='destroy' then
        OnDestroy();OnUpdate(frame)
        assert(host.disabled and not script.updating and trace.calls==0)
    else
        trace.settle()
        assert(host.mapUI.entryError and host.mapUI.navigationEnabled and trace.calls==1 and not cover.visible)
    end
    assert(same(map,oldMap) and same(run,oldRun),'an uncommitted request changed route, RNG, or rules')
    assert(map.currentNodeId~=id)
    Nodes.enter=enter
    if interruption~='destroy' then settle();OnDestroy()end
end

local host,root,_,_,_,id,hit=onMap('camp')
local trace,cover=observeCore(host,root)
local oldMap=Map.snapshot(host.map)
local oldRun=F.Combat.copy(host.run,{[host.run.data]=host.run.data})
local raise=cover.SetAsLastSibling
function cover:SetAsLastSibling()
    self.SetAsLastSibling=raise
    error('injected_current_cover_raise_failure')
end
assert(not tap(hit,40),'a rejected native cover write accepted a room request')
assert(trace.calls==0 and host.nodeEntry==nil and not host.pageReveal:covered() and not cover.visible)
assert(same(host.map,oldMap) and same(host.run,oldRun),'failed feedback submission ran the room transaction')
assert(tap(hit,41),'failed feedback submission blocked the next legal tap')
trace.settle()
assert(trace.calls==1 and host.map.currentNodeId==id)
Nodes.enter=enter
OnDestroy()
end
