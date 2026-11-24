local Nodes = require("abyss_nodes")
local Run = require("abyss_run")
local PotionDiscardUI = require("abyss_potion_discard_ui")
local Narrative = require("abyss_narrative")
local Bgm = require("abyss_bgm")
local CharacterView = require("abyss_character_select_view")
local MenuView=require("abyss_game_ui_menu_view")
local Theme=require("abyss_theme")
local CardSkin=require('abyss_card_skin')
local number = require("abyss_numbers").integer
local NeowHistory=require('abyss_neow_history')
local EndingHistory=require('abyss_ending_history')
local Acts=require('abyss_acts')
local NativePages=require('abyss_native_pages')
local Input=require('abyss_game_ui_input')
local PageReveal=require('abyss_page_reveal')
local M = {}
local function building(status)
    return status and (status.phase=='building' or status.phase=='revealing')
end
local function currentAvatar(portraits)
    return portraits and (portraits.selection and portraits.selection.phase~='idle' and portraits.selection or portraits.avatar)
end

function M.present(menuView)
    return function() MenuView.present(menuView) end
end

function M.animate(menuView)
    return function(_,dt) MenuView.animate(menuView,dt) end
end

function M.paintArtLoading(platform,menu,self,menuLoading,characterPanel,characterLoading,originalCharacterHint)
    return function(_)
            if Theme.presentationProfile=='official-assets-first' then return end
            local bg=platform.background and platform.background:status()
            local portraits=platform.portraits and platform.portraits:status()
            local avatar=currentAvatar(portraits)
            local function percent(s)return math.min(99,math.floor(100*((s.nextIndex or 1)-1)/math.max(1,s.total or 1)))end
            local summary=menu:GetChild('summary')
            if self.mode=='menu' and not self.characterOpen and building(bg) then
                summary.text='正在载入画面… '..percent(bg)..'%';summary:SetVisible(true);menuLoading=true
            elseif menuLoading then summary:SetVisible(false);menuLoading=false end
            local hint=characterPanel:GetChild('hint')
            if self.characterOpen and building(avatar) then
                if not characterLoading then originalCharacterHint=hint.text end
                hint.text='正在载入角色画面… '..percent(avatar)..'%';characterLoading=true
            elseif characterLoading then hint.text=originalCharacterHint or '查看初始信息，确认后开始冒险。';characterLoading=false end
        end
end

local function enterBossTreasure(run,map)
    local flow = run.nodeFlow
    if not flow or not flow.complete or flow.result ~= 'boss_victory' then return end
    local chapter = Acts.get(run.act or 1)
    if chapter.terminal ~= 'boss_treasure' or run.floor ~= chapter.boss then return end
    local rooms = Nodes.available(run, map)
    local chest = rooms[1]
    if #rooms == 1 and chest.roomKind == 'boss_treasure' and Nodes.enter(run, map, chest.id) then return end
    -- A refused entry leaves the reward owner recoverable, including unclaimed items.
    Run.reopenCombatRewards(run)
end

function M.finishRunFlow(neowHistory,endingHistory,self)
    return function(run)
            if run and (run.phase=='victory' or run.phase=='defeat')then NeowHistory.finish(neowHistory,run,run.phase)end
            if run and EndingHistory.finish(endingHistory,run,self.map)then run.endingHistoryResult=EndingHistory.read(endingHistory)end
            if not self.sessionPaused and not self.exitOpen and not self.settlementRequested and run and run.phase == "map" then
                if run.nodeFlow and not run.nodeFlow.complete then Nodes.completeCombat(run, self.map) end
                enterBossTreasure(run, self.map)
            end
        end
end

function M.selectMode(self)
    return function(run)
            if self.sessionPaused then self.mode='menu'
            elseif self.battleUI.busy then self.mode = "battle"
            elseif not run then self.mode = "menu"
            elseif require('abyss_relic_pending').owner(run)then self.mode='node'
            elseif run.phase == "defeat" then self.mode = "defeat"
            elseif run.phase == "victory" then self.mode = "victory"
            elseif run.phase == "combat" or run.phase == "reward" then self.mode = "battle"
            elseif run.phase == "node" or run.phase == 'act_transition' or run.phase=='ending_proceed' then self.mode = "node"
            -- Camp/event results stay on screen until the player presses 继续.
            elseif self.nodeUI.run == run and self.nodeUI:holding() then self.mode = "node"
            else self.mode = "map" end
        end
end

function M.syncMenuContext(self,owner)
    local menuRun,menuMode
    return function(run,inMenu)
            if menuRun ~= run or menuMode ~= self.mode then
                owner.menuGeneration = owner.menuGeneration + 1
                menuRun, menuMode = run, self.mode
            end
            if self.characterOpen and (not inMenu or self.settlementRequested or self.settlementBusy) then
                self.characterOpen=false;owner.exitGeneration=owner.exitGeneration+1;owner.menuGeneration=owner.menuGeneration+1
            end
        end
end

function M.syncCardChoice(self)
    return function(run)
            if self.choiceUI then
                self.choiceUI:refresh(run,not self.sessionPaused and not self.battleUI.busy and not self.exitOpen and not self.settlementRequested
                    and not self.settlementBusy and not self.deckUI.visible and not self.potionUI.visible)
            end
        end
end

function M.closeStaleDeck(self)
    return function(run,inMenu)
            if self.deckUI.previewInfo then
                if not self.characterOpen or not self.characterSelection.deckOpen or self.deckUI.previewInfo~=self.characterSelection.info then
                    self.deckUI:close();self.characterSelection.deckOpen=false
                end
                return
            end
            if self.deckUI.visible and (inMenu or run and run.phase=='ending_proceed' or self.battleUI.busy or self.deckUI.run ~= run
            or self.deckUI.pileKind and (run.phase~='combat' or run.combat~=self.deckUI.battle))then self.deckUI:close()end
        end
end

function M.openCardChoice(self,platform)
    return function(run)
            if not self.sessionPaused and run and run.phase=="combat" and run.combat.pendingChoice and not self.battleUI.busy
                and not self.deckUI.visible and not self.exitOpen then
                PageReveal.registerSource(platform,'deckPanel')
                self.deckUI:open(run,run.combat.pendingChoice,function(token,uid)
                    self.battleUI:chooseCard(token,uid)
                    self:refresh()
                end)
            end
        end
end

function M.syncRewardReturn(self)
    return function(run,deckOpen,potionOpen,blocked,covering)
            local returnAvailable = self.mode == "map" and run and run.pendingCombatRewards ~= nil
                and not deckOpen and not potionOpen and not blocked and not covering or false
            if self.rewardReturnAvailable ~= returnAvailable then
                self.rewardReturnAvailable = returnAvailable
                self.rewardReturnGeneration = (self.rewardReturnGeneration or 0) + 1
            end
            return returnAvailable
        end
end

local function mapPotionFrame(open,hit,run,mapSlots)
    local values=Theme.layout.nativeNode.topBar.potions
    local x,y,w,h=table.unpack(values)
    if mapSlots then
        local capacity=run and require('abyss_run').potionCapacity(run) or 3
        -- Keep the leftmost slot clear of live gold when Potion Belt adds two.
        x,y,w,h=-250+math.max(0,capacity-3)*21,338,capacity*42,44
        if Theme.presentationProfile=='official-assets-first' then
            local hud=Theme.officialAssets.battleHud
            x,y,w,h=hud.potionX+(capacity-1)*hud.potionStep/2,hud.y,capacity*hud.potionStep,44
        end
    end
    open:SetAnchoredPosition(x,y);hit:SetSizeDelta(w,h)
end

function M.refreshPotionEntry(child,inCombat,canManagePotions,platform)
    return function(run,mapVisible)
            local open=child("potionEntry"):GetChild("open")
            local potionHit=open:GetChild("hit")
            local anchor=Theme.presentationProfile=='v25-reference' and child('mapPanel'):GetChild('v25MapPotionAnchor')
            local official=Theme.presentationProfile=='official-assets-first'
            -- Battle rewards retain mode='battle' after combat has ended. The
            -- shared official entry keeps its physical slots on every run page.
            local mapSlots=official and run~=nil or anchor and mapVisible==true
            if anchor or official then mapPotionFrame(open,potionHit,run,mapSlots)end
            if official then
                potionHit.interactable=not inCombat();potionHit.raycastTarget=false
                for i=1,Theme.layout.battlePotions.count do
                    local slot=child('potionEntry'):GetChild('slot'..i)
                    if slot then
                        local occupied=not inCombat() and run~=nil and run.potions[i]~=nil
                        slot:SetVisible(occupied);slot:GetChild('hit').raycastTarget=occupied
                    end
                end
            else
                potionHit.interactable=not inCombat() and canManagePotions(run);potionHit.raycastTarget=potionHit.interactable
            end
            PotionDiscardUI.refreshEntry(potionHit,run,platform,mapSlots)
        end
end

local function mapPotionVisible(self)
    return self.mode=='map' or self.mode=='node' or self.routeOpen==true
end

function M.refreshDeckEntry(child,self)
    return function(run)
            local deckHit = child("deckEntry"):GetChild("open"):GetChild("hit")
            deckHit.interactable = not self.battleUI.busy;deckHit.raycastTarget=deckHit.interactable
            -- The shared deck button carries the deck size, so no screen repeats it as loose text.
            for _, state in ipairs({ "normal", "hover", "pressed", "disabled" }) do
                local variant = deckHit:GetChild(state)
                if variant then
                    variant:GetChild("label").text = run and "卡组 " .. #run.deck or "卡组"
                    variant:GetChild('count').text=run and number(#run.deck) or ''
                    local hud=variant:GetChild('officialBattleHud')
                    if hud then hud:GetChild('count').text=run and number(#run.deck)or ''end
                end
            end
        end
end

local function refreshRewardsBack(button,available)
    button:SetVisible(available)
    if button:GetChild('v25Face') then
        require('abyss_v25_menu_view').button(button,available)
    end
    -- Route preview raises the map. Raise this sibling when navigation returns.
    if available then button:SetAsLastSibling() end
end

function M.refreshUtilities(child,self,inCombat,refreshPotionEntry,refreshDeckEntry)
    return function(run,inMenu,deckOpen,potionOpen,blocked,returnAvailable)
            local ending=run and run.phase=='ending_proceed'
            local hudVisible=not ending and not inMenu and not deckOpen and not blocked
            local utilitiesVisible=hudVisible and not potionOpen
            local inventoryVisible=hudVisible and (not potionOpen or self.potionUI.localPanel==true)
            refreshRewardsBack(child("combatRewards"),returnAvailable)
            child("deckEntry"):SetVisible(utilitiesVisible)
            -- STS has no separate relic button: the discs under the HP row are the one control.
            child("relicEntry"):SetVisible(false)
            self.relicUI:refreshBar(run,inventoryVisible,potionOpen)
            for _,state in ipairs({'normal','hover','pressed','disabled'})do
                local variant=child('relicEntry'):GetChild('open'):GetChild('hit'):GetChild(state)
                variant:GetChild('label').text=run and '遗物 '..#run.relics or '遗物'
                variant:GetChild('count').text=run and number(#run.relics) or ''
            end
            child("potionEntry"):SetVisible(not inCombat() and inventoryVisible)
            refreshPotionEntry(run,mapPotionVisible(self))
            child("nodePanel"):GetChild("potions"):SetVisible(false)
            refreshDeckEntry(run)
        end
end

function M.refreshMapResources(child)
    return function(run)
            if run then
                local resources = child("mapPanel"):GetChild("resources")
                resources:GetChild("hp").text = number(run.hp) .. "/" .. number(run.maxHp)
                resources:GetChild("gold").text = number(run.gold)
            end
        end
end

function M.suspendBattle(self,openingCovered)
    return function(run,deckOpen,potionOpen)
            return run~=nil and (self.sessionPaused or self.mode=='battle' and run.phase=='combat'
                and (deckOpen or potionOpen or self.exitOpen)) and not self.disabled
                and not self.settlementRequested and not self.settlementBusy and not openingCovered()
        end
end

function M.refreshPageVisibility(menu,self,suspendBattle,child,refreshMapResources,nativePageLifecycle)
    local syncNative=nativePageLifecycle==true and NativePages.new(child,self) or nil
    local coveredMapRun,coveredDeckBattle
    local visibilityPass=0
    local function refreshMapVisibility(run,deckOpen,blocked)
        local onMap=self.mode=="map"
        local returningFromDeck=coveredMapRun~=nil and coveredMapRun==run
        coveredMapRun=onMap and deckOpen and run or nil
        self.mapUI:setVisible(onMap and not deckOpen and not blocked,onMap,returningFromDeck)
        if self.sessionPaused then self.mapUI:setNavigationEnabled(false) end
        child("mapPanel"):SetVisible(onMap)
        refreshMapResources(run)
    end
    local function coveredPaintCheck(run,battle,pass)
        if not self.pageReveal or not battle or run.phase~='combat' or self.battleUI.busy then return end
        local events,epoch=battle.events,self.pageReveal.epoch
        local eventCount=#events
        -- Inventory and the health cap can change without a combat event.
        local potionInventory,maxHp=battle.potionInventory,run.maxHp
        return function()
            return visibilityPass==pass and self.run==run and run.phase=='combat' and run.combat==battle
                and self.deckUI.visible and not self.battleUI.active and not self.battleUI.busy
                and self.pageReveal.epoch==epoch and battle.events==events and #events==eventCount
                and battle.potionInventory==potionInventory and run.maxHp==maxHp
        end
    end
    local function refreshBattleVisibility(run,deckOpen,potionOpen,blocked,pass)
        -- Reuse a cover only after its eager render has committed suspension.
        -- The active flag changes before the native setter and can survive failure.
        local deckBattle=self.mode=='battle' and deckOpen and run and run.combat or nil
        local deferDeckRender=deckBattle~=nil and coveredDeckBattle==deckBattle
        local coveredPaint
        if not deferDeckRender then
            coveredDeckBattle=nil
            coveredPaint=coveredPaintCheck(run,deckBattle,pass)
        end
        self.battleUI:setActive(self.mode == "battle" and not deckOpen and not potionOpen and not blocked,
            suspendBattle(run,deckOpen,potionOpen),deferDeckRender)
        if visibilityPass==pass then coveredDeckBattle=deckBattle end
        return coveredPaint
    end
    return function(run,inMenu,deckOpen,potionOpen,blocked)
            visibilityPass=visibilityPass+1
            local pass=visibilityPass
            if syncNative then syncNative(run) end
            menu:SetVisible(inMenu and not self.characterOpen and not self.easterEggOpen)
            local coveredPaint=refreshBattleVisibility(run,deckOpen,potionOpen,blocked,pass)
            child("battlePanel"):SetVisible(self.mode == "battle")
            refreshMapVisibility(run,deckOpen,potionOpen or blocked)
            self.nodeUI:setVisible(self.mode == "node" and not deckOpen and not potionOpen and not blocked,self.mode == "node",true)
            child("nodePanel"):SetVisible(self.mode == "node")
            return coveredPaint
        end
end

function M.renderBattlePage(self,child)
    return function(run,coveredPaint)
            -- Page readiness can reuse the eager deck cover, unless a native
            -- callback advanced the page or the combat after that paint.
            if not (coveredPaint and coveredPaint()) then
                self.battleUI:render()
            end
            if run.phase == "combat" and self.presentedBattle ~= run.combat then
                self.presentedBattle = run.combat
                local guardian = false
                for _, enemy in ipairs(run.combat.enemies) do
                    if enemy.definitionId == "guardian" then guardian = true end
                end
                child("battlePanel"):GetChild("notice").text = guardian
                    and Narrative.flow.bossEntrance.full or ""
                self.bossEntrance=guardian and {battle=run.combat,remaining=6} or nil
            end
        end
end

function M.updateBossEntrance(self,child)
    return function(dt)
            local entrance=self.bossEntrance
            if not entrance then return end
            local notice=child("battlePanel"):GetChild("notice")
            entrance.remaining=entrance.remaining-dt
            if not self.run or self.run.combat~=entrance.battle or self.run.phase~="combat"
                or notice.text~=Narrative.flow.bossEntrance.full or entrance.remaining<=0 then
                if notice.text==Narrative.flow.bossEntrance.full then notice.text="" end
                self.bossEntrance=nil
            end
        end
end

function M.renderMapPage(self)
    return function(run,deckOpen,potionOpen,blocked,covering)
            if deckOpen then return self.mapUI:setNavigationEnabled(false,true) end
            -- While the cinematic's last fade uncovers the map, the map is visible but inert.
            self.mapUI:setNavigationEnabled(not potionOpen and not blocked and not covering and #Nodes.available(run, self.map) > 0)
            if run.neowStatus=='unavailable' and self.map.floor==0 and not self.mapUI.entryError then
                self.mapUI.entryError='开局恩赐暂不可用：未取得上一局历史；本次保持原开局资源。'
                self.mapUI:render()
            end
        end
end

local function recordEntryProjection(self,platform,entry,epoch)
    if self.nodeEntry~=entry or self.run~=entry.run or self.map~=entry.map
        or entry.run.roomGeneration~=entry.committedGeneration or self.pageReveal.epoch~=epoch then return end
    self.nodeEntry=nil
    if platform.entryTrace then pcall(platform.entryTrace,'projection_built',entry.id,self.mode)end
end

function M.renderCurrentPage(self,renderBattlePage,renderMapPage,platform)
    return function(run,deckOpen,potionOpen,blocked,covering,coveredPaint)
            local entry=self.nodeEntry
            local epoch=entry and self.pageReveal.epoch
            PageReveal.registerSource(platform,PageReveal.basePage(self.mode))
            if self.mode == "battle" then
                renderBattlePage(run,coveredPaint)
            elseif self.mode == "map" then
                renderMapPage(run,deckOpen,potionOpen,blocked,covering)
            elseif self.mode == "node" then self.nodeUI:render() end
            if entry and entry.committedGeneration then recordEntryProjection(self,platform,entry,epoch)end
        end
end

function M.exitDialogOwnsForeground(self)
    return function()
            return self.exitOpen == true and not self.routeOpen and not self.menuOpen
        end
end

function M.refreshExitDialog(exitDialogOwnsForeground,exitPanel,self)
    return function()
            if exitDialogOwnsForeground() then
                exitPanel:SetAsLastSibling()
                require('abyss_game_ui_navigation_view').dialog(self,exitPanel)
                exitPanel:GetChild("status").text = self.settlementRequested and "结算请求已发送，等待平台结算界面。"
                    or self.exitError and "退出请求失败，请重试或继续游戏。" or ""
                local enabled = not self.settlementRequested and not self.settlementBusy
                for _, name in ipairs({"cancel", "confirm"}) do
                    local hit=exitPanel:GetChild(name):GetChild("hit");hit.interactable,hit.raycastTarget=enabled,enabled
                end
            end
        end
end

function M.syncPortraits(platform,self)
    return function()
            if not platform.portraits then return end
            local character
            if self.characterOpen then
                character=self.characterSelection.info and self.characterSelection.info.id
            elseif self.run then character=self.run.character or 'ironclad'end
            local gate=self.pageReveal
            local retained=self.selectionMotion and gate and gate.published and gate.published.page=='characterPanel'
                and gate.published.character
            platform.portraits:sync(self.mode,self.characterOpen,self.settlementRequested or self.settlementBusy,character,
                self.mode=='menu' and not self.characterOpen,retained)
            return retained
        end
end

function M.exitEntryVisible(self)
    return function()
            local minimal=(Theme.presentationProfile=='official-assets-first' or Theme.presentationProfile=='v25-reference')
                and Theme.menuPresentation and Theme.menuPresentation.minimal
            if minimal and self.mode=='menu' and not self.characterOpen then return false end
            return not (self.prologue and self.prologue:covering())
                and not (self.potionUI.localPanel and self.potionUI.visible)
                and not self.easterEggOpen and not self.exitOpen and not self.settlementRequested and not self.settlementBusy
        end
end

function M.refreshForeground(characterPanel,self,platform,exitEntry,exitEntryVisible,exitPanel,exitDialogOwnsForeground,runMenu,canViewRoute,child,refreshExitDialog)
    local official=Theme.presentationProfile=='official-assets-first'
    local hud=official and Theme.officialAssets.battleHud
    local backKey=official and platform.keyEvents and platform.keyEvents.KeyboardCraftspersonKey42Down
    local menuKeyListener=backKey and runMenu.AddKeyEventListener
    if menuKeyListener then
        runMenu:AddKeyEventListener(backKey,function()
            return not self.disabled and runMenu.visible and self.exitOpen and self.menuOpen and self:closeExit() or false
        end)
    end
    local utilitiesReady=false
    local routeLabels={}
    local function routeCaption(back)
        if not hud then return end
        local label=back:GetChild('label')
        if not label then return end
        if routeLabels[label]==nil then routeLabels[label]=label.text or ''end
        label.text=self.routeOpen and self.mode=='battle' and hud.routeBackText or routeLabels[label]
    end
    local function utilityFace(variant)
        local overlay=variant:GetChild('officialBattleHud')
        if not overlay then return end
        for _,part in ipairs(variant:GetChildren())do part:SetVisible(part==overlay)end
    end
    local function battleUtilities()
        if not hud or utilitiesReady then return end
        for _,entry in ipairs({{child('deckEntry'):GetChild('open'),hud.deck},{exitEntry:GetChild('open'),hud.menu}})do
            local control,values=entry[1],entry[2]
            control:SetAnchoredPosition(values[1],values[2])
            local hit=control:GetChild('hit')
            for _,name in ipairs({'normal','hover','pressed','disabled'})do
                local variant=hit:GetChild(name)
                variant:SetLocalScale((variant.localScaleX or 1)*values[3],(variant.localScaleY or 1)*values[3],1)
                utilityFace(variant)
            end
        end
        utilitiesReady=true
    end
    local function characterForeground()
        if not characterPanel then return end
        characterPanel:SetVisible(self.characterOpen==true and not self.deckUI.visible)
        if self.characterOpen and not self.deckUI.visible then
            PageReveal.registerSource(platform,'characterPanel')
            if self.selectionMotion then
                if not self.selectionChromeReady then
                    CharacterView.prepare(characterPanel,self.characterSelection,platform)
                    self.selectionChromeReady=true
                end
            else CharacterView.render(characterPanel,self.characterSelection,platform) end
            characterPanel:SetAsLastSibling()
        end
    end
    return function()
            battleUtilities()
            characterForeground()
            if self.choiceUI and self.choiceUI.visible then self.choiceUI.root:SetAsLastSibling() end
            -- Shared utilities stay above the deck overlay; the confirmation stays
            -- above every page, including an in-flight battle presentation.
            exitEntry:SetVisible(exitEntryVisible())
            exitEntry:SetAsLastSibling()
            exitPanel:SetVisible(exitDialogOwnsForeground())
            runMenu:SetVisible(self.exitOpen == true and self.menuOpen == true and not self.routeOpen)
            if menuKeyListener and runMenu.disableKeyEventPassthrough ~= runMenu.visible then
                runMenu.disableKeyEventPassthrough = runMenu.visible
            end
            require('abyss_game_ui_navigation_view').runMenu(self,runMenu,canViewRoute())
            if runMenu.visible then runMenu:SetAsLastSibling() end
            local back = child('mapPanel'):GetChild('previewBack')
            local showBack=self.routeOpen==true
            if Theme.presentationProfile=='v25-reference' then
                showBack=Input.mapReturnAvailable(self)
                back:GetChild('hit').raycastTarget=showBack
            end
            back:SetVisible(showBack)
            if hud and back:GetChild('v25Face') then
                require('abyss_v25_menu_view').button(back,showBack and not self.disabled
                    and not self.settlementRequested and not self.settlementBusy)
            end
            routeCaption(back)
            if self.routeOpen then
                self.mapUI.map = self.map
                self.mapUI:setVisible(true)
                self.mapUI:setNavigationEnabled(false)
                child('mapPanel'):SetAsLastSibling()
            end
            refreshExitDialog()
        end
end

function M.overlaysBlocked(self)
    return function()
            local blocked = self.easterEggOpen or self.exitOpen or self.settlementRequested or self.settlementBusy or self.characterOpen
                or self.choiceUI and self.choiceUI.visible
            return blocked
        end
end

function M.syncOpening(self,openingCovered)
    return function(run)
            if self.prologue and (self.settlementRequested or not self.starting and run and (run.phase=='defeat' or run.phase=='victory')) then self.prologue:cancel() end
            return openingCovered()
        end
end

-- Completed UI preparation stages, not bytes or an unobservable GPU/network percentage.
function M.openingProgress(self,child,platform)
    return function()
        local done=self.openingPrepared or 0
        if done<6 or self.starting then return done end
        if not self.run or not self.map then return 6 end
        if self.mode~='node' and self.mode~='map' then return 6 end
        local page=child(self.mode=='node' and 'nodePanel' or 'mapPanel')
        if platform.nativePageLifecycle==true and page.active~=true then return 6 end
        return 7
    end
end

function M.openingForeground(self,child,prologuePanel,runMenu,exitPanel)
    return function(covering)
            if self.prologue and self.prologue:opaque() then
                child('mapPanel'):SetVisible(false);child('nodePanel'):SetVisible(false)
            end
            if not covering then return end
            prologuePanel:SetAsLastSibling()
            if self.menuOpen then runMenu:SetAsLastSibling()
            elseif self.exitOpen then exitPanel:SetAsLastSibling() end
        end
end

function M.syncOfficialBattleScene(root,self)
    local lastBackdropVisible,lastBackdrop
    return function(run)
            local scenes=root:GetChild('officialBattleBackdrop')
            if not scenes then return end
            local visible=self.mode=='battle'
            if visible~=lastBackdropVisible then scenes:SetVisible(visible);lastBackdropVisible=visible end
            local floor=math.max(1,run and run.floor or 1)
            local act,row=Acts.forFloor(floor);local chapter=math.min(2,act)
            local key=floor==Acts.get(act).boss and 'boss'..chapter or 'act'..chapter..'_'..((row-1)%3+1)
            if key==lastBackdrop then return end
            for _,name in ipairs({'act1_1','act1_2','act1_3','act2_1','act2_2','act2_3','boss1','boss2'})do
                scenes:GetChild(name):SetVisible(name==key)
            end
            lastBackdrop=key
        end
end

local function surfaceScopes(self)
    return {battle=self.mode=='battle',node=self.mode=='node',character=self.characterOpen==true,
        deck=self.deckUI and self.deckUI.visible==true,choice=self.choiceUI and self.choiceUI.visible==true}
end
local function requestReveal(self,platform)
    local intent=PageReveal.intent(self)
    PageReveal.registerSource(platform,intent.page)
    if self.pageReveal then return self.pageReveal:begin(intent)end
    return true
end
local function paintReveal(self)
    if not self.pageReveal then return end
    local modalOwnsInput=self.exitOpen and not self.routeOpen
    self.pageReveal:paint(not modalOwnsInput)
    if modalOwnsInput then
        self.root:GetChild('runMenu'):SetAsLastSibling()
        self.root:GetChild('exitPanel'):SetAsLastSibling()
    end
end
local function finishReveal(self,platform,roomPainted)
    local intent=PageReveal.intent(self)
    PageReveal.registerSource(platform,intent.page)
    if self.pageReveal then
        self.pageReveal:finish(intent,roomPainted)
        if not self.selectionMotion and self.pageReveal.localOnly and self.pageReveal:covered()then
            CharacterView.render(self.root:GetChild('characterPanel'),self.characterSelection,platform,false)
        end
    end
end
local function publishCharacter(self,platform,syncPortraits,retained)
    local motion=self.selectionMotion
    if not motion then return end
    if not self.characterOpen then self.selectionChromeReady=nil;motion:hide();return end
    local paused=self.deckUI.visible or self.exitOpen or self.sessionPaused or self.settlementBusy
    motion:pause(paused == true)
    if paused then return end
    local gate=self.pageReveal
    if gate and not gate:publishedIntent(PageReveal.intent(self)) then return end
    PageReveal.registerSource(platform,'characterPanel')
    local panel=self.root:GetChild('characterPanel')
    local info=self.characterSelection.info
    if retained=='ironclad' and (not info or info.id~='ironclad') then syncPortraits() end
    CharacterView.render(panel,self.characterSelection,platform,true,motion)
end

-- Sorting has already painted the deck projection. Keep its publication and
-- resource cleanup boundary without repainting the covered battle/map/room.
function M.deckChanged(self,owner,platform,changed)
    return function()
        if not owner.ready or self.disabled then return end
        local intent=PageReveal.intent(self)
        if intent.page~='deckPanel' or self.exitOpen or self.settlementRequested or self.settlementBusy then
            return changed()
        end
        local surfaceFrame=CardSkin.beginFrame()
        requestReveal(self,platform)
        CardSkin.endFrame(surfaceFrame,surfaceScopes(self))
        -- Readiness checks this generation's visible cells and native leases;
        -- a deferred or replaced face still acquires the original input cover.
        finishReveal(self,platform)
        paintReveal(self)
    end
end

local function refreshOpenPotions(potions, canManagePotions)
    if not potions.visible then return end
    if canManagePotions(potions.run) then potions:render() else potions:close() end
end

local function beginRefresh(self,platform,refreshForeground)
    local entry=self.nodeEntry
    if entry and entry.committedGeneration and (self.run~=entry.run or self.map~=entry.map or self.sessionPaused)then
        self.nodeEntry=nil
    end
    if requestReveal(self,platform)then
        if not (self.pageReveal and self.pageReveal.projectionError)then return true end
        -- A room projection can fail after the rule transaction succeeded.
        -- Keep the recovery menu usable without trying the failing panel again.
        refreshForeground()
    end
    paintReveal(self);return false
end

function M.refresh(self,finishRunFlow,syncOpening,selectMode,syncOfficialBattleScene,syncMenuContext,platform,syncCardChoice,closeStaleDeck,openCardChoice,canManagePotions,overlaysBlocked,syncRewardReturn,refreshUtilities,refreshPageVisibility,renderCurrentPage,bgm,present,refreshForeground,syncPortraits,openingForeground)
    return function(_)
            if self.disabled then return false,"ui_disabled" end
            local run = self.run
            self.deckUI:syncRun(run)
            finishRunFlow(run)
            local covering = syncOpening(run)
            selectMode(run)
            if not beginRefresh(self,platform,refreshForeground)then return end
            local surfaceFrame=CardSkin.beginFrame()
            syncOfficialBattleScene(run)
            local inMenu = self.mode == "menu" or self.mode == "defeat" or self.mode == "victory"
            syncMenuContext(run,inMenu)
            if platform.background then platform.background:sync(self.mode,self.characterOpen,self.settlementRequested or self.settlementBusy) end
            syncCardChoice(run)
            closeStaleDeck(run,inMenu)
            openCardChoice(run)
            local deckOpen = self.deckUI.visible
            refreshOpenPotions(self.potionUI,canManagePotions)
            local potionOpen=self.potionUI.visible
            local blocked=overlaysBlocked() or covering
            local returnAvailable=syncRewardReturn(run,deckOpen,potionOpen,blocked,covering)
            refreshUtilities(run,inMenu,deckOpen,potionOpen,blocked,returnAvailable)
            local coveredPaint=refreshPageVisibility(run,inMenu,deckOpen,potionOpen,blocked)
            renderCurrentPage(run,deckOpen,potionOpen,blocked,covering,coveredPaint)
            bgm:update(self.settlementRequested and "stop" or Bgm.scene(self.mode, run, self.battleUI.busy, bgm.cue))
            present()
            refreshForeground()
            if self.easterEgg then self.easterEgg:refresh()end
            local retained=syncPortraits()
            CardSkin.endFrame(surfaceFrame,surfaceScopes(self))
            finishReveal(self,platform,self.nodeUI.visible and not self.nodeUI.pendingOwner)
            publishCharacter(self,platform,syncPortraits,retained)
            paintReveal(self)
            openingForeground(covering)
        end
end

return M
