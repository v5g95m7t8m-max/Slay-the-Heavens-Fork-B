local Run = require("abyss_run")
local CharacterSelect = require("abyss_character_select")
local Pointer = require('abyss_pointer_input')
local Theme = require('abyss_theme')
local V25View=require('abyss_v25_menu_view')
local Navigation=require('abyss_game_ui_navigation')
local M = {}
local menuKinds={start=true,settle=true,egg_open=true,titleQuit=true,continueRun=true}
local function titleAvailable(self,kind)
    if self.mode~='menu' or self.exitOpen or self.characterOpen then return false end
    return kind~='continueRun' or self.sessionPaused==true
end
local routeModes={battleRoute='battle',runRoute='node'}

local function mapReturnCovered(self)
    return self.characterOpen or self.easterEggOpen
        or self.deckUI.visible or self.potionUI.visible
        or self.choiceUI and self.choiceUI.visible
end

function M.mapReturnAvailable(self)
    if Theme.presentationProfile~='v25-reference' then return false end
    if self.disabled or self.settlementRequested or self.settlementBusy then return false end
    if mapReturnCovered(self) then return false end
    -- Closing the route preview remains safe while its caller is suspended.
    if self.routeOpen then return self.exitOpen==true end
    if self.exitOpen or self.menuOpen then return false end
    return self.mode=='map' and self.run~=nil and self.map~=nil and self.run.phase=='map'
        and not self.battleUI.busy and not self.motion.deathReveal
end

local function mapReturnIdentity(self)
    local map,run=self.map or {},self.run or {}
    return {map=self.map,mapAct=map.act,mapFloor=map.floor,mapNode=map.currentNodeId,mapSignature=map.sourceSignature,
        runAct=run.act,phase=run.phase,roomGeneration=run.roomGeneration,mode=self.mode,routeOpen=self.routeOpen==true,
        choiceGeneration=self.choiceUI and self.choiceUI.generation}
end

local function sameMapReturn(self,token)
    if not token then return false end
    local current=mapReturnIdentity(self)
    for key,value in pairs(current)do if token[key]~=value then return false end end
    for key,value in pairs(token)do if current[key]~=value then return false end end
    return true
end

function M.dismissFromOutside(platform,self)
    return function()
            if Pointer.blocked(platform) then return true end
            if self.settlementRequested or self.settlementBusy then return true end
            self:closeExit()
            return true
        end
end

local function bindV25Hover(box,hit,cursor,available)
    local officialMenu=Theme.presentationProfile=='official-assets-first' and (box:GetChild('v25MenuFace') or box:GetChild('v25Face'))
    if (Theme.presentationProfile~='v25-reference' and not officialMenu) or not cursor.CursorEnter then return end
    if not box:GetChild('v25Face') and not box:GetChild('v25MenuFace')then return end
    hit:AddCursorEventListener(cursor.CursorEnter,function()V25View.pointer(box,'enter',available())end)
end

local function battleRouteAvailable(self,enabled,mode)
    if self.mode~=mode or self.exitOpen or self.deckUI.visible or self.potionUI.visible
        or self.characterOpen or self.easterEggOpen then return false end
    if self.choiceUI and self.choiceUI.visible then return false end
    return enabled()
end

local function potionPointer(run,slot)
    if not (run and slot) then return nil end
    return {inventory=run.potions,id=run.potions[slot],phase=run.phase}
end
local function samePotionPointer(run,slot,held)
    if not slot then return true end
    return held and held.inventory==run.potions and held.id==run.potions[slot] and held.phase==run.phase
end

function M.bindCommand(platform,self,canManagePotions,clickEvent,owner)
    return function(box, kind, action, enabled, potionSlot)
            local hit = box:GetChild("hit")
            local held, released, observed
            local menuAction = menuKinds[kind]
            local rewardAction = kind == "combatRewards"
            local characterAction = kind:match("^character_")~=nil
            local resourceAction = kind:match('^resource_')~=nil
            local mapReturn = kind=='mapReturn'
            local routeMode = routeModes[kind]
            local mapContext = mapReturn or routeMode
            local cursor = platform.cursorEvents or {}
            local runMenuAction = kind:sub(1, 4) == 'run_'
            local function eggAvailable()
                if self.easterEggOpen then return kind=='egg_close' end
                return kind=='egg_open' and self.easterEgg:refresh()
            end
            local function menuAvailable()
                if kind=='titleQuit' or kind=='continueRun'then return titleAvailable(self,kind) end
                if menuAction then
                    if self.exitOpen or self.deckUI.visible then return false end
                    return self.mode == "victory" or self.mode == "defeat"
                        or kind == "start" and self.mode == "menu"
                end
                return kind == "open" and not self.exitOpen or kind ~= "open" and self.exitOpen == true
            end
            local function resultAvailable()
                if rewardAction then
                    return self.rewardReturnAvailable == true and self.mode == "map" and self.run and self.run.phase == "map" and self.run.pendingCombatRewards ~= nil
                        and not self.exitOpen and not self.deckUI.visible and not self.potionUI.visible
                end
                return menuAvailable()
            end
            local function characterAvailable()
                if characterAction then
                    return self.characterOpen==true and not self.exitOpen and not self.starting
                        and (not enabled or enabled())
                        and (self.mode=="menu" or self.mode=="defeat" or self.mode=="victory")
                end
                -- The exit modal owns confirmation/cancellation above selection.
                if self.characterOpen and not self.exitOpen and kind ~= 'open' then return false end
                return resultAvailable()
            end
            local function runMenuAvailable()
                if runMenuAction then
                    if kind~='run_mainMenu' and Navigation.minimalRunMenu(self) then return false end
                    return self.exitOpen and self.menuOpen == true and not self.routeOpen and (not enabled or enabled())
                end
                if self.menuOpen or self.routeOpen then return false end
                return characterAvailable()
            end
            local function modalAvailable()
                if menuAction and self.motion.deathReveal then return false end
                if kind == 'routeClose' then return self.exitOpen and self.routeOpen == true end
                if mapReturn then return M.mapReturnAvailable(self) end
                return runMenuAvailable()
            end
            local function covered()
                if not Pointer.blocked(platform) then return false end
                local gate=self.pageReveal
                return not (characterAction and kind~='character_confirm' and kind~='character_deck'
                    and gate and gate:allowsCharacterEdit())
            end
            local function available()
                if covered() then return false end
                if self.prologue and self.prologue:covering() then return false end
                if self.disabled or self.settlementRequested or self.settlementBusy then return false end
                if routeMode then return battleRouteAvailable(self,enabled,routeMode)end
                if resourceAction then return not self.potionUI.visible and canManagePotions(self.run) and (not enabled or enabled()) end
                if self.easterEggOpen or kind=='egg_open' or kind=='egg_close' then return eggAvailable()end
                return modalAvailable()
            end
            local function currentMapReturn(token)
                return token.menuGeneration==owner.menuGeneration and token.deckGeneration==self.deckUI.generation
                    and token.potionGeneration==self.potionUI.generation and sameMapReturn(self,token.mapReturn)
            end
            local function currentReward(token)
                return not rewardAction or token.menuGeneration==owner.menuGeneration
                    and token.pending==self.run.pendingCombatRewards and token.rewardGeneration==self.rewardReturnGeneration
            end
            local function current(token)
                return token and token.generation == owner.exitGeneration and token.run == self.run
                    and (not resourceAction or token.deckGeneration==self.deckUI.generation and token.mode==self.mode
                        and token.potionGeneration==self.potionUI.generation)
                    and samePotionPointer(self.run,potionSlot,token.potion)
                    and (not menuAction and not characterAction or token.menuGeneration == owner.menuGeneration) and available()
                    and currentReward(token)
                    and (not mapContext or currentMapReturn(token))
            end
            local function touch(event) return event and event.touchId end
            bindV25Hover(box,hit,cursor,available)
            if cursor.CursorDown and cursor.CursorUp then
                hit:AddCursorEventListener(cursor.CursorDown, function(event)
                    if held and not current(held) then held = nil end
                    if released and not current(released) then released = nil end
                    if held and held.touch ~= touch(event) then return end
                    observed, held, released = true, nil, nil
                    if available() then held = {generation=owner.exitGeneration,menuGeneration=owner.menuGeneration,run=self.run,touch=touch(event),
                        deckGeneration=self.deckUI.generation,potionGeneration=self.potionUI.generation,mode=self.mode,
                        pending=self.run and self.run.pendingCombatRewards,rewardGeneration=self.rewardReturnGeneration,
                        potion=potionPointer(self.run,potionSlot),
                        mapReturn=mapContext and mapReturnIdentity(self) or nil} end
                    V25View.pointer(box,'down',held~=nil)
                end)
                hit:AddCursorEventListener(cursor.CursorUp, function(event)
                    if not held or held.touch ~= touch(event) then return end
                    released = current(held) and held or nil
                    held = nil
                    V25View.pointer(box,'up',available())
                end)
                for _, event in pairs({cursor.CursorExit, cursor.CursorEndDrag}) do
                    if event then hit:AddCursorEventListener(event, function(pointer)
                        local pointerOwner = held or released
                        if not pointer or pointerOwner and pointerOwner.touch == touch(pointer) then
                            held,released=nil,nil
                        end
                        if not pointerOwner or not pointer or pointerOwner.touch==touch(pointer)then V25View.pointer(box,'exit',available())end
                    end) end
                end
            end
            hit:AddCursorEventListener(clickEvent, function(event)
                if covered() then return false end
                if observed or cursor.CursorDown and cursor.CursorUp and touch(event) ~= nil then
                    local token = released
                    if not current(token) then
                        if not held or held.touch == touch(event) then held, released = nil, nil end
                        return false
                    end
                    if token.touch ~= touch(event) then return false end
                    held, released = nil, nil
                elseif not available() then return false end
                return action()
            end)
        end
end

function M.installUtilities(self,child,clickEvent,platform,inCombat,exitPanel,runMenu)
    child("deckEntry"):GetChild("open"):GetChild("hit"):AddCursorEventListener(clickEvent, function() return self:openDeck() end)
    child("relicEntry"):GetChild("open"):GetChild("hit"):AddCursorEventListener(clickEvent, function() return self:openRelics() end)
    if not self.potionUI.localPanel then
        local potionHit=child('potionEntry'):GetChild('open'):GetChild('hit')
        local function openPotion()
            if inCombat() then return false end
            return self:openPotions()
        end
        potionHit:AddCursorEventListener(clickEvent,openPotion)
    end
    exitPanel.disableCursorEventPassthrough = true
    exitPanel:GetChild("blocker"):AddCursorEventListener(clickEvent, function() return true end)
    runMenu.disableCursorEventPassthrough = true
    -- 点击菜单外的空白继续游戏，并吞掉点击以避免穿透到战斗或地图。
    local dismissFromOutside = M.dismissFromOutside(platform,self)
    runMenu:GetChild('blocker'):AddCursorEventListener(clickEvent, function()
        if self.exitOpen and self.menuOpen and not self.routeOpen then return dismissFromOutside() end
        return true
    end)
    runMenu:GetChild('catch'):AddCursorEventListener(clickEvent, function() return true end)
end

function M.installMenu(self,child,clickEvent,resourceHint,bindCommand,start,settlement,exitEntry,exitPanel)
    for _,entry in ipairs({{'battlePanel','battle'},{'mapPanel','map'}})do
        local panel,mode=entry[1],entry[2]
        for _,kind in ipairs({'hp','gold'})do
            bindCommand(child(panel):GetChild('resourceHints'):GetChild(kind),'resource_'..kind,
                function()return resourceHint(kind)end,function()return self.mode==mode end)
        end
    end
    -- Source menu actions use the same pointer ownership as exit actions, and also
    -- expire whenever their menu/run context is hidden or replaced.
    bindCommand(start, "start", function()
        if Theme.presentationProfile=='official-assets-first' and self.sessionPaused then
            return self:requestNavigation('abandon')
        end
        return self:start()
    end)
    bindCommand(child('menuPanel'):GetChild('continueRun'),'continueRun',function()return self:continueRun()end)
    local quit=child('menuPanel'):GetChild('titleQuit')
    if quit then
        bindCommand(quit,'titleQuit',function()return self:openExit()end)
    end
    if self.potionUI.localPanel then
        local entry=child('potionEntry')
        for i=1,Theme.layout.battlePotions.count do
            local box=entry:GetChild('slot'..i)
            bindCommand(box,'resource_potion',function()return self:openPotions(i)end,
                function()return box.visible and self.run.phase~='combat' and self.run.potions[i]~=nil end,i)
        end
    end
    bindCommand(settlement, "settle", function() return self:settle() end)
    if self.easterEgg then
        local egg=self.easterEgg
        egg.panel:GetChild('blocker'):AddCursorEventListener(clickEvent,function()return true end)
        bindCommand(egg.button,'egg_open',function()return egg:open()end)
        bindCommand(egg.panel:GetChild('close'),'egg_close',function()return egg:close()end)
    end
    bindCommand(child("combatRewards"), "combatRewards", function()
        local ok, reason = Run.reopenCombatRewards(self.run)
        if ok then self:refresh() end
        return ok, reason
    end)
    bindCommand(exitEntry:GetChild("open"), "open", function() return self:openMenu() end)
    bindCommand(exitPanel:GetChild("cancel"), "cancel", function() return self:closeExit() end)
    bindCommand(exitPanel:GetChild("confirm"), "confirm", function() return self:confirmExit() end)
end

function M.installRunMenu(self,bindCommand,runMenu,canViewRoute,child,owner)
    local bar=Theme.presentationProfile=='official-assets-first' and child('battlePanel'):GetChild('topBar')
    local function openRoute()
        if not self:openMenu()then return false end
        self.routeOpen=true;self:refresh();return true
    end
    local shortcut=bar and bar:GetChild('battleRoute')
    if shortcut then bindCommand(shortcut,'battleRoute',openRoute,canViewRoute)end
    local nodeShortcut=Theme.presentationProfile=='official-assets-first' and child('nodePanel'):GetChild('runRoute')
    if nodeShortcut then bindCommand(nodeShortcut,'runRoute',openRoute,canViewRoute)end
    bindCommand(runMenu:GetChild('resume'), 'run_resume', function() return self:closeExit() end)
    bindCommand(runMenu:GetChild('mainMenu'),'run_mainMenu',function()return self:returnToMainMenu()end,
        function()return Navigation.hasRun(self) and not self.sessionPaused end)
    bindCommand(runMenu:GetChild('quit'),'run_quit',function()
        owner.exitGeneration=owner.exitGeneration+1
        self.menuOpen=false;self.navigationAction=nil;self:refresh();return true
    end,function()return Navigation.hasRun(self) and not self.sessionPaused end)
    bindCommand(runMenu:GetChild('abandon'), 'run_abandon', function()
        if Navigation.hasRun(self) then return self:requestNavigation('abandon') end
        owner.exitGeneration = owner.exitGeneration + 1
        self.menuOpen = false
        self:refresh()
        return true
    end)
    bindCommand(runMenu:GetChild('map'), 'run_map', function()
        owner.exitGeneration = owner.exitGeneration + 1
        self.routeOpen = true
        self:refresh()
        return true
    end, canViewRoute)
    local v25=Theme.presentationProfile=='v25-reference'
    bindCommand(child('mapPanel'):GetChild('previewBack'),v25 and 'mapReturn' or 'routeClose',function()
        if v25 and not self.routeOpen then return self:openMenu() end
        return self:closeExit()
    end)
end

function M.installCharacters(self,characterPanel,clickEvent,bindCommand)
    characterPanel.disableCursorEventPassthrough=true
    characterPanel:GetChild("blocker"):AddCursorEventListener(clickEvent,function()return true end)
    bindCommand(characterPanel:GetChild("cancel"),"character_cancel",function() return self:closeCharacters() end)
    bindCommand(characterPanel:GetChild('confirm'),'character_confirm',function()return self:confirmCharacter()end,
        function()return self.characterSelection:canConfirm() and not self.characterSelection.deckOpen end)
    local starterDeck=Theme.presentationProfile~='official-assets-first' and characterPanel:GetChild('details'):GetChild('deckOpen')
    if starterDeck then
        bindCommand(starterDeck,'character_deck',function()
            return self:openStarterDeck()
        end,function()return self.characterSelection.info~=nil and not self.characterSelection.deckOpen end)
    end
    for i,id in ipairs(CharacterSelect.characters)do
        local box=characterPanel:GetChild(i==5 and 'traveler' or 'character'..i)
        bindCommand(box,'character_'..i,function()return self:selectCharacter(id)end,
            function()return self.characterSelection:allowsCharacter(id)end)
    end
    for i,id in ipairs(CharacterSelect.elements)do
        bindCommand(characterPanel:GetChild('elements'):GetChild('element'..i),'character_element'..i,
            function()return self:selectElement(id)end,function()return self.characterSelection.character=='traveler'
                and self.characterSelection:allowsElement(id)end)
    end
end

return M
