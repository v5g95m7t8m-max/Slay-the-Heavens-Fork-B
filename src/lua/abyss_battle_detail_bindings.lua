-- Read state, issue Run commands. No damage/energy/outcome rules live in this view.
local Combat = require("abyss_combat")
local Actors = require("abyss_actor")
local Theme = require("abyss_theme")
local Pointer = require('abyss_pointer_input')
local M = {}
local L = Theme.layout
local function validPower(value,id)
    return value and value.id==id and not value.hidden
end
local function travelerMode(owner)
    local run = owner.run
    return run and run.phase == "combat" and not run.combat.originalV4
        and (run.character == nil or run.character == "ironclad")
end

local function bindTraveler(owner, host, dependencies, control, describe, shared)
    local held, released, observed
    local handlers = {}
    local function on(kind, callback)
        if shared then handlers[kind] = callback else control:AddCursorEventListener(kind, callback) end
    end
    local function touchScreen() return host.platform.touchScreen() == true end
    local function clear() held, released = nil, nil end
    local function ownsPointer(event, token)
        return not event or token and token.touch == event.touchId
    end
    local function cancelPointer(event)
        if ownsPointer(event, held or released) then clear() end
    end
    function handlers.observe()
        observed = true
        clear()
    end
    local function ready()
        return owner.active and not owner.busy and not owner.gesture and not owner.carry
            and not owner.potionAim and not owner.potionMenu and owner.run and owner.run.phase == "combat"
    end
    local function activate(spec, touch)
        if not spec then return end
        if travelerMode(owner) then owner:showPowerTip(spec, control, touch)
        else owner:showStatus(0) end
    end
    if host.cursor and host.cursor.CursorEnter and host.cursor.CursorExit then
        on(host.cursor.CursorEnter, function()
            if travelerMode(owner) and not touchScreen() then activate(describe(), false) end
        end)
        on(host.cursor.CursorExit, function(event)
            if ownsPointer(event, held) then held = nil end
            if not touchScreen() then owner:closePowerTip(control) end
        end)
    end
    function handlers.press()
        if ready() then activate(describe(), true) end
    end
    local function tapSpec(event)
        local touch, token = event and event.touchId, released
        if dependencies.consumeReleasedDragClick(event) or owner.suppressClick then return end
        if observed and (not token or token.touch ~= touch) then return end
        clear()
        if token and not dependencies.dragReady(token) then return end
        local spec = describe()
        if not token or spec and spec.statusId == token.spec.statusId and spec.offset == token.spec.offset then
            return spec
        end
    end
    on(host.clickEvent, function(event)
        if Pointer.blocked(host.platform) or not ready() then return end
        if travelerMode(owner) and not touchScreen() then return end
        local spec = tapSpec(event)
        if spec and not (owner.info and dependencies.swallowed(event)) then activate(spec, true) end
    end)
    if host.cursor and host.cursor.CursorDown and host.cursor.CursorUp then
        on(host.cursor.CursorDown, function(event)
            handlers.observe()
            if not ready() or travelerMode(owner) and not touchScreen() then return end
            if dependencies.down(event, true) then return end
            local run, spec = owner.run, describe()
            if spec then held = {run = run, battle = run.combat, turn = run.combat.turn,
                touch = event and event.touchId, spec = spec} end
        end)
        on(host.cursor.CursorUp, function(event)
            if held and held.touch == (event and event.touchId) then
                if not (event and event.dragging) then released = held end
                held = nil
            end
        end)
        if host.cursor.CursorDrag then control:AddCursorEventListener(host.cursor.CursorDrag, function(event)
            if travelerMode(owner) then cancelPointer(event) end
        end) end
        if host.cursor.CursorEndDrag then on(host.cursor.CursorEndDrag, cancelPointer) end
    end
    return handlers
end

-- Explicit ports preserve the approved implementation without a shared constructor closure.
function M.install(owner, _ownership, host, dependencies)
    local function statusActorAt(slot)
        local battle=owner.run and owner.run.combat
        if not battle then return end
        if slot==0 then return battle,0,battle.player end
        local entry=dependencies.enemyAt(slot,battle)
        if entry then return battle,entry.index,entry.actor end
    end
    local function hasCursorPair(first,second)
        return host.cursor and host.cursor[first] and host.cursor[second]
    end
    local function closeTransientCard(control)
        local info=owner.info
        if info and info.source==control and info.transient and info.kind then
            dependencies.closeInfo(true)
            return true
        end
    end
    local function forgetHelp(control,hoverSlot,input)
        input.held,input.released,input.consumed=nil,nil,nil
        if hoverSlot and owner.hover==hoverSlot then owner.hover=nil end
        if owner.help and owner.help.source==control then owner.help=nil end
        if owner.info and owner.info.source==control then owner.info=nil end
    end
    -- hoverSlot: a reward card also reports pointer enter/exit for its hover pose (one listener per event).
    local function bindHelp(control,describe,clickable,hoverSlot,guard,cleanups,travel)
        local function current()return not guard or guard()end
        if not current() then return end
        local input={}
        local function on(kind, callback)
            if not travel then return control:AddCursorEventListener(kind, callback) end
            control:AddCursorEventListener(kind, function(event)
                if host.cursor and kind == host.cursor.CursorDown then
                    travel.observe()
                    input.pointerObserved, input.held, input.released, input.consumed = true, nil, nil, nil
                end
                if travelerMode(owner) then return travel[kind](event) end
                return callback(event)
            end)
        end
        local function cancelCardRead(event)
            local info=owner.info
            if not (hoverSlot and info and info.press) then return false end
            if info.source==control and event and info.press.touch==event.touchId then
                dependencies.closeInfo()
                owner:render(true)
            end
            return true
        end
        local function enterCard()
            local info=owner.info
            if host.platform.touchScreen and host.platform.touchScreen() or info and info.press then return false end
            if info and info.source~=control and (info.kind=='card' or info.kind=='rewardCard') then
                dependencies.closeInfo(true)
            end
            owner:setHover(hoverSlot)
            return true
        end
        local function cancel(silent,engineDestroyed,event)
            if engineDestroyed then input.engineDestroyed=true end
            if input.engineDestroyed then forgetHelp(control,hoverSlot,input);return end
            input.held,input.released,input.consumed=nil,nil,nil
            if cancelCardRead(event) then return end
            local closed=closeTransientCard(control)
            if hoverSlot and owner.hover==hoverSlot then owner:setHover(nil) end
            if owner.help and owner.help.source==control then owner.help=nil end
            if closed and not silent then owner:renderDetailsOnly() end
        end
        if cleanups then cleanups[#cleanups+1]={control=control,cancel=cancel} end
        if hasCursorPair("CursorEnter","CursorExit") then
            on(host.cursor.CursorEnter,function()
                if not current() then return false end
                if hoverSlot and not enterCard() then return end
                owner:queueHelp(describe(),control,false)
            end)
            if not current() then return end
            on(host.cursor.CursorExit,function(event) cancel(false,false,event) end)
            if not current() then return end
        end
        if not clickable then return end
        if not current() then return end
        local function ready(token)
            local run=owner.run
            return current() and token and owner.active and not owner.busy and not owner.gesture and run==token.run
                and run.phase=="combat" and run.combat==token.battle and run.combat.turn==token.turn
                and dependencies.helpActorReady(token,run)
                and (token.spec.kind~="potion" or run.potions==token.spec.inventory and run.potions[token.spec.slot]==token.spec.potionId)
        end
        on(host.clickEvent,function(event)
            if not current() or Pointer.blocked(host.platform)then return false end
            local touch=event and event.touchId
            if input.consumed and input.consumed.touch==touch then input.consumed=nil;return end
            if input.pointerObserved then
                local token=input.released;input.released=nil
                if not ready(token) or token.touch~=touch then return end
            end
            if dependencies.swallowed(event) then return end
            local spec=describe()
            if spec then owner:openHelp(spec,control,false) end
        end)
        if not current() then return end
        if hasCursorPair("CursorDown","CursorUp") then
            on(host.cursor.CursorDown,function(event)
                if not current() then return false end
                input.pointerObserved=true;input.held,input.released,input.consumed=nil,nil,nil
                if dependencies.down(event) then return end
                local run=owner.run
                if not run or run.phase~="combat" then return end
                local spec=describe()
                if not spec then return end
                local actor=spec.index==0 and run.combat.player or run.combat.enemies[spec.index]
                local token={run=run,battle=run.combat,turn=run.combat.turn,touch=event and event.touchId,spec=spec,actor=actor}
                if ready(token) then input.held=token;owner:queueHelp(describe(),control,true,token.touch) end
            end)
            if not current() then return end
            on(host.cursor.CursorUp,function(event)
                local token=input.held;input.held=nil
                if not ready(token) or token.touch~=(event and event.touchId) then return end
                local help=owner.help
                if help and help.source==control and help.fired then
                    input.consumed={touch=token.touch}
                    if owner.info and owner.info.source==control then owner.info.transient=false;owner:renderDetailsOnly() end
                else input.released=token end
                if help and help.source==control then owner.help=nil end
            end)
            if not current() then return end
            if host.cursor.CursorEndDrag then on(host.cursor.CursorEndDrag,cancel) end
        end
    end

    local function statusSpec(screenSlot, position)
        local _, index, actor = statusActorAt(screenSlot)
        if not Actors.isPresent(actor) then return end
        local entries = Combat.statusView(actor)
        if not entries[position] then return end
        local slots = L.statusIcon.perRow * L.statusIcon.rows
        local overflow = position == slots and #entries >= slots
        return {index = index, screenSlot = screenSlot > 0 and screenSlot or nil, position = position,
            statusId = not overflow and entries[position].id or nil, offset = overflow and position or nil}
    end

    local function bindActorHelp(screenSlot, box, entryAt, guard, cleanups)
        if guard and not guard() then return end
        if screenSlot > 0 then bindHelp(box:GetChild("intentHit"), function()
            local entry = entryAt()
            return entry and {kind = "intent", index = entry.index, screenSlot = screenSlot, controlBox = guard and box or nil}
        end, true, nil, guard, cleanups) end
        if guard or screenSlot == 0 and host.platform and host.platform.touchScreen then return end
        for slot = 1, L.statusIcon.perRow * L.statusIcon.rows do
            local position = slot
            bindHelp(box:GetChild("statusRow"):GetChild("hit" .. slot), function()
                return statusSpec(screenSlot, position)
            end, true)
        end
    end

    local function bindTravelerControls()
        local hero = dependencies.child("hero")
        hero.disableCursorEventPassthrough = true
        bindTraveler(owner, host, dependencies, hero:GetChild("hit"), function() return {index = 0} end)
        local row = hero:GetChild("statusRow")
        row.disableCursorEventPassthrough = true
        bindTraveler(owner, host, dependencies, row:GetChild("hit"), function() return {index = 0} end)
        local si = L.statusIcon
        for slot = 1, si.perRow * si.rows do
            local index = slot
            local control = row:GetChild("hit" .. slot)
            control:SetSizeDelta(si.size + si.gap, si.size + si.gap)
            local function describe() return statusSpec(0, index) end
            bindHelp(control, describe, true, nil, nil, nil, bindTraveler(owner, host, dependencies, control, describe, true))
        end
        local ground = dependencies.child("statusDismiss")
        ground:AddCursorEventListener(host.clickEvent, function(event)
            if not Pointer.blocked(host.platform) and not (event and event.dragging)
                and owner.powerTip and owner.powerTip.touch then owner:closePowerTip() end
        end)
    end

    local function bindDetailControls()
        -- Enemy portraits keep targeting; the hero portrait and every status row only open
        -- details, so a status tap never plays a card or moves the potion target.
        local nativeDevice = host.platform and host.platform.touchScreen
        if nativeDevice then bindTravelerControls()
        else dependencies.listen(dependencies.child("hero"):GetChild("hit"), function() owner:showStatus(0) end) end
        local names = {"hero", "enemy1", "enemy2", "enemy3", "enemy4", "enemy5"}
        for i = nativeDevice and 2 or 1, host.monsterSurfaces and 1 or #names do
            local screenSlot, name = i - 1, names[i]
            dependencies.listen(dependencies.child(name):GetChild("statusRow"):GetChild("hit"), function()
                local entry=screenSlot>0 and dependencies.enemyAt(screenSlot)
                if screenSlot==0 or entry then owner:showStatus(entry and entry.index or 0) end
            end)
        end
        local info = dependencies.child("statusInfo")
        info.disableCursorEventPassthrough = true
        dependencies.listen(info:GetChild("hit"), function() if dependencies.closeInfo() then owner:renderDetailsOnly() end end)
        -- A tap on the card itself turns to the next page; a single page closes like any tap.
        -- Not routed through listen(): that dismisses the open card before any handler runs.
        local function infoPage()
            local open = owner.info
            if not open then return end
            owner.swallow = nil
            if (open.pages or 1) > 1 then open.page = open.page % open.pages + 1 owner:renderDetailsOnly()
            elseif dependencies.closeInfo() then owner:renderDetailsOnly() end
        end
        info:GetChild("page"):AddCursorEventListener(host.clickEvent,function(event)
            if Pointer.blocked(host.platform)then return false end
            local swallow=owner.swallow
            if swallow and swallow.touch==(event and event.touchId) then owner.swallow=nil;return end
            return infoPage()
        end)
        if host.cursor and host.cursor.CursorDown then
            info:GetChild("page"):AddCursorEventListener(host.cursor.CursorDown,function() owner.swallow=nil end)
        end
        bindActorHelp(0,dependencies.child("hero"),function()end)
        if not host.monsterSurfaces then
            for i=1,5 do
                local slot=i
                bindActorHelp(slot,dependencies.child("enemy"..slot),function()return dependencies.enemyAt(slot)end)
            end
        end
        for slot=1,10 do
            local index=slot
            bindHelp(dependencies.child("card"..slot):GetChild("hit"),function() return owner:cardHelpSpec(index) end,false,slot)
        end
        for slot=1,L.battlePotions.count do
            local index=slot
            bindHelp(dependencies.child("potionHelp"..slot),function() return owner:potionHelpSpec(index) end,false)
            bindHelp(dependencies.child("potion"..slot),function() return owner:potionHelpSpec(index) end,false)
        end
    end
    local bound=setmetatable({}, {__mode="k"})
    local function bindEnemyDetailControls(screenSlot,box)
        -- A preceding native registration may synchronously retire this surface.
        if host.monsterSurfaces and host.monsterSurfaces:control(screenSlot)~=box then return end
        if bound[box] then return end
        local manager=assert(host.monsterSurfaces,"dynamic monster surfaces required")
        local captured=assert(manager:entry(screenSlot),"dynamic enemy must be published before binding")
        local actorId=captured.id
        local run,battle=owner.run,owner.run and owner.run.combat
        local binding={controls={}};bound[box]=binding
        local function entryAt()
            if binding.retired or box.alive==false or host.monsterSurfaces~=manager or manager:control(screenSlot)~=box
                or owner.run~=run or not run or run.combat~=battle then return end
            local entry=manager:entry(screenSlot)
            local current=entry and battle.enemies[entry.index]
            if entry and entry.id==actorId and current and current.id==actorId then return entry end
        end
        local function guard()return entryAt()~=nil end
        bindActorHelp(screenSlot,box,entryAt,guard,binding.controls)
    end
    local function unbindEnemyDetailControls(_screenSlot,box,engineDestroyed)
        local binding=bound[box]
        if not binding then return end
        binding.retired=true
        for _,item in ipairs(binding.controls)do
            if item.cancel then item.cancel(true,engineDestroyed) end
        end
        bound[box]=nil
    end
    local powerBindings=setmetatable({}, {__mode="k"})
    local function bindEnemyPowerControl(actorSlot,powerSlot,powerBox,powerManager)
        if powerBindings[powerBox] or powerManager:control(powerSlot)~=powerBox then return end
        local manager=host.monsterSurfaces
        local actorBox=manager and manager:control(actorSlot)
        local actorEntry=manager and manager:entry(actorSlot)
        local powerEntry=powerManager:entry(powerSlot)
        if not actorBox or not actorEntry or not powerEntry then return end
        local actorId,powerId=actorEntry.id,powerEntry.id
        local run,battle=owner.run,owner.run and owner.run.combat
        local binding={controls={}};powerBindings[powerBox]=binding
        local function surfaceCurrent()
            return not (binding.retired or powerBox.alive==false or actorBox.alive==false
                or host.monsterSurfaces~=manager or manager:control(actorSlot)~=actorBox
                or owner.run~=run or not run or run.combat~=battle
                or powerManager:control(powerSlot)~=powerBox)
        end
        local function describe()
            if not surfaceCurrent() then return end
            local entry=manager:entry(actorSlot)
            local power=powerManager:entry(powerSlot)
            local actor=entry and battle and battle.enemies[entry.index]
            if not entry or entry.id~=actorId or not actor or actor.id~=actorId
                or not Actors.isPresent(actor) or not validPower(power,powerId) then return end
            if power.status and power.status.overflow then
                return {index=entry.index,screenSlot=actorSlot,controlBox=actorBox}
            end
            -- Resolve by power identity, never the row position or a feedback snapshot.
            for _,status in ipairs(Combat.statusView(actor))do
                if status.id==powerId then
                    return {index=entry.index,screenSlot=actorSlot,controlBox=actorBox,statusId=powerId}
                end
            end
        end
        bindHelp(powerBox:GetChild("hit"),describe,true,nil,function()return describe()~=nil end,binding.controls)
    end
    local function unbindEnemyPowerControl(powerBox,engineDestroyed)
        local binding=powerBindings[powerBox]
        if not binding then return end
        binding.retired=true
        for _,item in ipairs(binding.controls)do
            if item.cancel then item.cancel(true,engineDestroyed) end
        end
        powerBindings[powerBox]=nil
    end
    return {
        statusActorAt=statusActorAt, bindDetailControls=bindDetailControls,
        bindEnemyPowerControl=bindEnemyPowerControl, unbindEnemyPowerControl=unbindEnemyPowerControl,
        bindEnemyDetailControls=bindEnemyDetailControls, unbindEnemyDetailControls=unbindEnemyDetailControls
    }
end
return M
