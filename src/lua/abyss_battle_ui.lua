-- Read state, issue Run commands. No damage/energy/outcome rules live in this view.
local Combat = require("abyss_combat")
local Run = require("abyss_run")
local Theme = require("abyss_theme")
local Feedback = require("abyss_feedback")
local CardView = require("abyss_battle_card_view")
local StatusView = require("abyss_battle_status_view")
local PotionView = require("abyss_battle_potion_view")
local PotionPopup = require("abyss_battle_potion_popup")
local IntentView = require("abyss_battle_intent_view")
local UnitView = require("abyss_battle_unit_view")
local InfoContent = require("abyss_battle_info_content")
local InfoView = require("abyss_battle_info_view")
local Pointer = require('abyss_pointer_input')
local M = {}
local C = Theme.color
local reasons = { insufficient_energy = "能量不足", invalid_target = "请选择存活的敌人", card_content_unavailable = "此卡牌尚未实装，可选择其他卡牌或跳过。",
    card_not_in_hand = "这张牌已离开手牌", not_player_turn = "敌方行动中",
    normality_limit = "平庸：本回合已打出三张牌",
    advanced_card_not_enabled = "此牌效果尚未接入", not_in_combat = "战斗已经结束",
    empty_potion_slot = "此药水已使用", invalid_potion_slot = "请选择有效药水",
    smoke_not_allowed = '此战斗不能使用烟雾弹',
    effect_overflow = "当前状态已达上限", potion_slots_full = "药水槽已满，请先丢弃旧药水。",
    potion_content_unavailable = "该稀有度药水尚未实装。", potion_blocked_by_sozu = "遗物阻止获得药水。" }
local temporaryOps = {gainTemporaryStrength=true, gainTemporaryDexterity=true}
local stanceNames={Neutral="无姿态",Calm="平静",Wrath="愤怒",Divinity="神格"}
local orbNames={lightning="闪电",frost="冰霜",dark="黑暗",plasma="等离子"}
local intentColors = { attack = C.danger, defend = C.block, buff = C.buff, debuff = C.debuff }
local kindNames = { buff = "增益", debuff = "减益" }
local statusKind = StatusView.statusKind
local statusDetail = StatusView.statusDetail
local potionText = PotionView.potionText
local intentView = IntentView.intentView
local function needsTarget(state, instance)
    -- Ask the core to validate the same card with and without a target.
    local _, reason = Combat.canPlay(state, instance.uid, nil)
    return reason == "invalid_target"
end
local function install(services, functions)
    for name, fn in pairs(functions) do services[name] = fn end
end
-- Module ports are linked once after installation, never through per-frame trampolines.
local function ports(links, names)
    local result = {}
    links[#links + 1] = {ports=result, names=names}
    return result
end
local function connect(links, services)
    for _, link in ipairs(links) do
        for _, name in ipairs(link.names) do
            link.ports[name] = assert(services[name], "missing battle port " .. name)
        end
    end
end
local function configureInputSurface(host, self)
    host.stage = host.options.embedded and host.root or assert(host.root:GetChild("stage"), "missing stage")
    host.cursor = host.platform.cursorEvents
    self.dragEnabled = host.cursor and host.cursor.CursorDown and host.cursor.CursorDrag and host.cursor.CursorUp and host.cursor.CursorEndDrag
    self.instructions = self.dragEnabled and "拖到战场出牌区域松手，目标牌拖向敌人；再点原牌取消。"
        or "点选卡牌，再点敌人或战场出牌区域；再点原牌取消。"
end
function M.new(root, data, presentation, clickEvent, platform, options)
    options = options or {}
    local self = { root = root, data = data, presentation = presentation, target = 1, seed = 1, busy = false, active = true }
    local ownership = {}
    local host = {root=root, platform=platform, options=options, clickEvent=clickEvent}
    local services, links = {}, {}
    install(services, require("abyss_battle_input_state").install(self, ownership, host, ports(links, {
    })))
    install(services, require("abyss_battle_targeting").install(self, ownership, host, ports(links, {
        "dragReady", "aimReady"
    })))
    install(services, require("abyss_battle_details").install(self, ownership, host, ports(links, {
        "tint", "ink", "child", "cancelPotionAim", "cancelCardInputs",
        "cancelPotionInputs", "cancelActionInputs"
    })))
    install(services, require("abyss_battle_card_layout").install(self, ownership, host, ports(links, {
    })))
    install(services, require("abyss_battle_render_state").install(self, ownership, host, ports(links, {
        "aimReady", "cancelPotionAim", "cardReady", "potionReady", "actionReady",
        "enemyReady", "canHover", "rewardScreen", "label"
    })))
    install(services, require("abyss_battle_render_hud").install(self, ownership, host, ports(links, {
        "show", "button", "child", "label", "tint",
        "ink"
    })))
    install(services, require("abyss_battle_render_actors").install(self, ownership, host, ports(links, {
        "dragTarget", "picture", "tint", "ink", "enemySlot",
        "child", "button", "show", "potionDragTarget", "point"
    })))
    install(services, require("abyss_battle_render").install(self, ownership, host, ports(links, {
        "prepareRenderInputs", "renderFeedbackReady", "syncRenderIdentity", "renderFrame", "syncRewardOwner",
        "syncRewardEntrance", "prepareRenderPotions", "renderStartControls", "rewardNavigation", "renderRewardRows",
        "renderRewardButtons", "renderPotionReward", "renderRewardStage", "renderPlayArea", "renderHudVisibility",
        "renderPlayerTotals", "renderSceneHeading", "renderEnergy", "renderPilesAndTurn", "renderResult",
        "renderEnemies", "renderDetails", "button", "renderRewardActions", "renderContinue",
        "renderPotions"
    })))
    install(services, require("abyss_battle_actions").install(self, ownership, host, ports(links, {
        "sameEnemySlot", "cardReady", "cancelCardInputs", "rewardTarget", "updateCarry",
        "aimReady", "cancelPotionAim", "notice", "rewardScreen", "cancelActionInputs", "updateEnemyNames", "updateEnemyIntents"
    })))
    install(services, require("abyss_battle_card_gestures").install(self, ownership, host, ports(links, {
        "closeInfo", "cardReady", "dragTarget", "notice", "cancelCardInputs",
        "cancelActionInputs", "cancelPotionInputs", "cancelPotionAim", "refresh", "rewardScreen",
        "movePotion", "releasePotionDrag", "aimReady"
    })))
    install(services, require("abyss_battle_action_bindings").install(self, ownership, host, ports(links, {
        "swallowed", "cardReady", "down", "point", "inPlayArea",
        "child", "actionReady", "consumeReleasedDragClick"
    })))
    install(services, require("abyss_battle_potion_bindings").install(self, ownership, host, ports(links, {
        "potionBinding", "cancelPotionAim", "cancelCardInputs", "cancelActionInputs", "refresh",
        "child", "swallowed", "potionReady", "down", "consumeReleasedDragClick",
        "point", "beginPotionAim", "potionDragTarget"
    })))
    install(services, require("abyss_battle_card_bindings").install(self, ownership, host, ports(links, {
        "point", "child", "listen", "retireInterruptedPress",
        "down", "cancelPotionAim", "move", "release"
    })))
    install(services, require("abyss_battle_target_bindings").install(self, ownership, host, ports(links, {
        "child", "enemyAt", "swallowed", "discardEnemyPointer",
        "enemyReady", "down", "cancelPotionAim", "sameEnemySlot", "consumeReleasedDragClick"
    })))
    install(services, require("abyss_battle_detail_bindings").install(self, ownership, host, ports(links, {
        "enemyAt", "listen", "child", "closeInfo",
        "helpActorReady", "swallowed", "down", "consumeReleasedDragClick", "dragReady"
    })))
    connect(links, services)
    -- Runtime bindings keep only their own ports, not the construction registry.
    services = {
        picture=services.picture, tint=services.tint, ink=services.ink, child=services.child, enemyPosition=services.enemyPosition, renderEnemies=services.renderEnemies,
        describeInfo=services.describeInfo, show=services.show, placeCard=services.placeCard, placeReward=services.placeReward, dragTarget=services.dragTarget,
        dragPose=services.dragPose, notice=services.notice, refresh=services.refresh, bind=services.bind, cancelPotionAim=services.cancelPotionAim,
        rewardScreen=services.rewardScreen, bindPotionControls=services.bindPotionControls, bindCardControls=services.bindCardControls, bindEnemyControl=services.bindEnemyControl, unbindEnemyControl=services.unbindEnemyControl,
        bindEnemyPowerControl=services.bindEnemyPowerControl, unbindEnemyPowerControl=services.unbindEnemyPowerControl,
        bindEnemyDetailControls=services.bindEnemyDetailControls, unbindEnemyDetailControls=services.unbindEnemyDetailControls, bindDetailControls=services.bindDetailControls,
        potionDragTarget=services.potionDragTarget,
        down=services.down, swallowed=services.swallowed,
        cancelCardInputs=services.cancelCardInputs, cancelActionInputs=services.cancelActionInputs,
        cancelPotionInputs=services.cancelPotionInputs, consumeReleasedDragClick=services.consumeReleasedDragClick
    }
    configureInputSurface(host, self)
    -- A card click is the final event of one physical pointer sequence. Retain
    -- its original rule identity, not a global permission another Down can reset.
    ownership.cardInputs, ownership.pointerObserved, ownership.releasedDragTouch = {}, false, nil
    -- Potion controls may be click-only even when cards receive pointer events.
    -- Once a potion Down is observed, require its own one-shot release token.
    ownership.potionInputs, ownership.potionPointerObserved = {}, false
    -- Action buttons have their own pointer capability: some hosts deliver
    -- card/potion pointers but only Click for these preset buttons.
    ownership.actionInputs, ownership.actionPointerObserved, ownership.fieldPointerObserved = {}, false, false
    -- Dynamic spawns can occupy an old enemy slot. Pointer ownership follows
    -- the actor object, battle and turn, never a reusable numeric slot alone.
    ownership.enemyInputs, ownership.enemyPointerObserved = {}, false
    -- Source PC behavior: the card center follows the pointer, not the grab offset.
    -- Target cards require an explicit enemy hit, including a little touch padding.
    -- Open ground never substitutes the nearest enemy, even when only one remains.
    host.monsterSurfaces=require('abyss_monster_surfaces').new(host.stage,host.platform,function(slot,box)
        services.bindEnemyControl(slot,box);services.bindEnemyDetailControls(slot,box)
    end,function(slot,box,engineDestroyed)
        local failure
        local function cleanup(fn)local ok,why=pcall(fn);if not ok then failure=why end end
        cleanup(function()if host.monsterPowers then host.monsterPowers:release(box,engineDestroyed)end end)
        cleanup(function()if host.monsterIntentParticles then host.monsterIntentParticles:release(box,engineDestroyed)end end)
        cleanup(function()services.unbindEnemyControl(slot,box)end)
        cleanup(function()services.unbindEnemyDetailControls(slot,box,engineDestroyed)end)
        cleanup(function()if host.monsterArt and not engineDestroyed then host.monsterArt:release(box)end end)
        if failure then error(failure)end
    end)
    host.monsterArt=require('abyss_monster_art').new(host.stage,host.platform,nil,host.monsterSurfaces)
    host.monsterPowers=require('abyss_monster_power_view').new(host.platform,services.picture,services.tint,services.ink,
        function(actorSlot,powerSlot,box,pool)services.bindEnemyPowerControl(actorSlot,powerSlot,box,pool)end,
        function(_,box,engineDestroyed)services.unbindEnemyPowerControl(box,engineDestroyed)end)
    host.monsterIntentParticles=require('abyss_monster_intent_particle_view').new(host.platform,services.picture,services.tint)
    function self.releaseMonsterSurfaces(_)
        if host.cardView then host.cardView.destroy()end
        local ok,why=pcall(host.monsterSurfaces.clear,host.monsterSurfaces)
        local cleared,reason=pcall(host.monsterIntentParticles.clear,host.monsterIntentParticles)
        assert(ok and cleared,why or reason)
    end
    function self.onEngineDestroy(_)
        self.active=false
        if host.cardView then host.cardView.destroy()end
        local failure
        for _,manager in ipairs({host.monsterSurfaces,host.monsterPowers,host.monsterIntentParticles,host.monsterArt})do
            local ok,why=pcall(manager.onEngineDestroy,manager)
            if not ok then failure=why end
        end
        assert(not failure,failure)
    end
    host.unit = UnitView.new(services.picture, services.tint, services.ink, statusKind)
    host.lines = InfoContent.lines
    host.infoContent = InfoContent.new(self, {
        statusDetail = statusDetail, statusKind = statusKind, intentView = intentView, potionText = potionText,
        temporaryOps = temporaryOps, stanceNames = stanceNames, orbNames = orbNames,
        kindNames = kindNames, intentColors = intentColors,
    })
    host.paginate = InfoView.paginator(host.lines)
    host.renderInfo = InfoView.new(self, services.child, services.enemyPosition, services.describeInfo, host.paginate, services.tint, services.ink, services.picture)
    -- index 0 is the hero. Opening the same unit again closes it.
    -- Post-battle pick: centred cards on their own stage, never the hand arc.
    -- Hover/press only changes scale and a small lift, so a card's edge stays
    -- under the pointer and neighbours never overlap (step > hover width).
    host.cardView = CardView.new(self, {
        child = services.child, show = services.show, ink = services.ink, tint = services.tint, picture = services.picture, platform = host.platform,
        placeCard = services.placeCard, placeReward = services.placeReward,
        dragTarget = services.dragTarget, dragPose = services.dragPose, enemyPosition = services.enemyPosition,
        renderAimActors = services.renderEnemies,
        potionTarget = services.potionDragTarget,
    })
    self.feedback = Feedback.new(host.stage, host.platform, function(battle, acting)
        self.displayBattle, self.acting = battle, acting
        self:render()
    end, function(failure)
        self.busy, self.displayBattle, self.acting = false, nil, nil
        ownership.playbackIntents = nil
        local reconcileFailed,reconcileFailure=false,nil
        local sameBattle=self.feedbackRun and self.feedbackRun==self.run
            and self.feedbackBattle and self.feedbackBattle==self.run.combat
        if failure and sameBattle then
            local ok,why=pcall(host.monsterIntentParticles.reconcile,host.monsterIntentParticles,self.feedbackBattle)
            if not ok then reconcileFailed,reconcileFailure=true,why end
        end
        if sameBattle and #self.feedbackBattle.events == self.feedbackLast then
            -- UI is the event consumer. Release consumed frames; the event table identity stays stable.
            for i = #self.feedbackBattle.events, 1, -1 do self.feedbackBattle.events[i] = nil end
        end
        local notice=""
        if failure then notice="演出已恢复，可继续行动。" end
        services.notice(notice)
        local refreshed,why=pcall(services.refresh,failure ~= "cancelled")
        if reconcileFailed then
            local message='source intent reconciliation failed after '..tostring(failure)..': '..tostring(reconcileFailure)
            if not refreshed then message=message..'; refresh failed: '..tostring(why)end
            error(message)
        end
        if not refreshed then error(why)end
    end)
    -- An open detail panel owns the next pointer sequence: its Down closes the panel and
    -- the matching Click is swallowed, so no card, target or button acts underneath it.
    services.bind("start", function() if not self.run or self.run.phase == "defeat" then self:start() end end)
    services.bind("endTurn", function() self:endTurn() end)
    services.bind("playArea", function()
        if services.cancelPotionAim("已取消药水瞄准。") then services.refresh() return end
        local battle = self.run and self.run.phase == "combat" and self.run.combat
        if not battle or self.carry and self.carry.aiming then return end
        for _,instance in ipairs(battle.hand) do
            if instance.uid == self.selected then
                if needsTarget(battle,instance) then return self:cancelAim() end
                return self:playSelected(nil)
            end
        end
    end)
    services.bind("skip", function()
        if not self.active or not self.run or self.busy or self.run.phase ~= "reward" or self.rewardScreen ~= "cards" then return end
        -- PC SkipCardButton closes the picker; the unclaimed CARD row remains.
        services.rewardScreen("list")
        services.notice("")
        services.refresh()
    end)
    services.bind("cardReward", function()
        if not self.active or self.busy or not self.run or self.run.phase ~= "reward"
            or self.rewardScreen ~= "list" or self.run.rewards.cardResolved then return end
        local Cards=require('abyss_relic_card_rewards')
        if Cards.managed(self.run)then
            local ok=Cards.open(self.run,self.rewardOwner,Run)
            if ok then services.notice('');services.refresh(true)end
            return ok
        end
        services.rewardScreen("cards")
        services.notice("")
        services.refresh()
    end)
    services.bind("goldReward", function()
        if not self.active or self.busy or self.rewardScreen ~= "list" or not self.run then return end
        local ok = Run.claimGoldReward(self.run)
        if ok then services.notice("金币已领取。") services.refresh(true) end
    end)
    services.bind('emeraldKeyReward',function()
        if not self.active or self.busy or self.rewardScreen~='list' or not self.run then return false end
        local ok,why=Run.claimEmeraldKey(self.run)
        if ok then services.notice('已获得绿钥匙。');services.refresh(true)end
        return ok,why
    end)
    for i=1,2 do
        local slot=i
        services.bind('relicReward'..slot,function()
            if not self.active or self.busy or self.rewardScreen~='list' or not self.run then return false end
            local receipt=self.run.lastRelicObtain
            local sequence=receipt and receipt.sequence or 0
            local ok,why=Run.claimRelicReward(self.run,slot)
            if ok then
                local names=require('abyss_relic_names')
                services.notice('已获得遗物「'..names.get(self.run.data,why)..'」'..names.upgradeFeedback(self.run,sequence,presentation,why))
                services.refresh(true)
            end
            return ok,why
        end)
    end
    services.bind("claimPotion", function() return self:claimPotionReward() end)
    services.bind("stolenGold", function()
        if self.active and self.run and not self.busy and self.rewardScreen == "list"
            and Run.claimStolenGoldReward(self.run) then services.notice("已取回失金。") services.refresh(true) end
    end)
    services.bind("continue", function()
        if not self.active or self.busy or not self.run then return end
        if self.run.phase == "reward" then
            if self.rewardScreen ~= "list" then return end
            local ok,reason=Run.leaveCombatRewards(self.run)
            if not ok then services.notice(reasons[reason] or "当前无法离开奖励。") end
            services.refresh(ok)
        elseif not host.options.embedded and self.run.phase == "map" then assert(Run.startCombat(self.run, "cultist_solo")) services.refresh(true) end
    end)
    host.potionPopup=PotionPopup.new(host.stage:GetChild('potionHelp'):GetChild('potionPopup'),self,host.platform,host.clickEvent,{
        pointerDown=function(event)
            if self.active and not self.busy and not self.gesture then
                if event and event.touchId==ownership.releasedDragTouch then ownership.releasedDragTouch=nil end
                self.suppressClick=false
            end
        end,
        pointerClick=function(event,token)
            local origin=token and {touchId=token.touch} or event
            return not services.consumeReleasedDragClick(origin) and not self.suppressClick and not self.gesture
        end,
        pointerConsumed=function(event,token)
            -- Only a host with neither Down nor Up is truly click-only. Partial
            -- pointer capabilities still need the attributed tail barrier.
            if not (host.cursor and (host.cursor.CursorDown or host.cursor.CursorUp)) then return end
            -- Reuse the finite release barrier after the popup command closes
            -- its menu. Keep the owned ID and the native Click's one ambiguous
            -- tail separately when that Click omitted its ID.
            local touch=token and token.touch or event and event.touchId
            ownership.releasedDragTouch=touch;self.suppressClick={touch=event and event.touchId}
        end,
        item=function(slot)return Run.potionSlotView(self.run,slot)end,
        text=function(item,battle)return potionText(item,battle,true):match("\n(.*)") or ''end,
        use=function(slot)return self:usePotion(slot)end,
        discard=function(slot)
            if options.inputCovered and options.inputCovered()then return false,'panel_hidden' end
            local ok,reason=Run.discardPotion(self.run,slot)
            if ok then self.potionSlots[slot]=nil end
            services.notice(ok and '已丢弃药水。' or reasons[reason] or '当前不能丢弃此药水。')
            services.refresh();return ok,reason
        end,
        changed=function()services.refresh()end,
    })
    services.bindPotionControls()
    services.bindCardControls()
    services.bindDetailControls()
    for _,kind in ipairs({'draw','discard','exhaust'})do
        local hit=services.child(kind..'Icon'):GetChild('hit')
        local function available()
            return host.options.onPile~=nil and self.active and not self.busy and not self.gesture and not self.carry
                and self.run and self.run.phase=='combat' and self.run.combat.phase=='player'
        end
        local function openPile()
            if available()then
                return host.options.onPile(kind)
            end
            return false
        end
        hit:AddCursorEventListener(host.clickEvent,function(event)
            if Pointer.blocked(host.platform) or services.swallowed(event)
                or services.consumeReleasedDragClick(event) or self.suppressClick then return false end
            return openPile()
        end)
        if self.dragEnabled then hit:AddCursorEventListener(host.cursor.CursorDown,services.down) end
    end
    local keys = host.platform.keyEvents
    local keyRoot = host.platform.keyRoot or host.root
    if keys and keys.KeyboardSprintKeyDown and keyRoot.AddKeyEventListener then
        -- The official sprint binding defaults to RMB. Listen on the persistent UI root.
        keyRoot:AddKeyEventListener(keys.KeyboardSprintKeyDown, function()
            local run, gesture = self.run, self.gesture or self.carry
            if host.root.visible==false then return false end
            if not (gesture or self.selected) then return self:openOverflowCard(self.info) end
            if not self.active or self.busy or not run or run.phase ~= 'combat' or run.combat.phase ~= 'player'
                then return false end
            services.cancelCardInputs()
            services.cancelActionInputs()
            services.cancelPotionInputs()
            self.gesture, self.carry, self.selected, self.cardAim = nil, nil, nil, nil
            self.hover, self.handHover, self.help = nil, nil, nil
            self.selectionEpoch = (self.selectionEpoch or 0) + 1
            if gesture then ownership.releasedDragTouch = gesture.touch end
            self.suppressClick = gesture ~= nil
            services.notice('')
            self:render()
            return true
        end)
    end
    services.refresh()
    return self
end
return M
