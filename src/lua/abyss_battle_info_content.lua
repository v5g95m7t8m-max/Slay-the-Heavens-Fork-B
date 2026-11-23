-- Read-only detail projection. Combat owns the effects, durations and preview values.
local Combat = require("abyss_combat")
local Intent = require("abyss_battle_intent_view")
local Theme = require("abyss_theme")
local number = require("abyss_numbers").integer
local M = {}
local C, L = Theme.color, Theme.layout
local tailStates={
    available={name='可用',text='致命伤害时复活，基础回复生命上限一半（向下取整，至少1点）；每局一次，仙灵药水优先。',colour=C.positive},
    spent={name='本局已用',text='本局已使用，不能再次复活。',colour=C.textMuted},
    blocked_by_mark={name='绽放印记阻断',text='绽放印记阻止复活，保留本局的一次使用机会。',colour=C.danger},
}

-- CJK glyphs take one font size; ASCII takes about half. Count UTF-8 lead bytes.
function M.lines(text, boxWidth, fontSize, inset)
    if not text or text == "" then return 0 end
    local I, width = L.statusInfo, 0
    for i = 1, #text do
        local b = text:byte(i)
        width = width + (b < 128 and 0.55 or b >= 192 and 1 or 0)
    end
    local per = math.max(1,math.floor(((boxWidth or I.width) - (inset or I.pad * 2 + I.icon + I.gap)) / (fontSize or Theme.font.reading)))
    return math.max(1, math.ceil(width / per))
end

local function find(list, key, value)
    for _, entry in ipairs(list) do if entry[key] == value then return entry end end
end

local function selectedEntries(entries, info)
    if info.position and info.kind == "powerTips" then
        local position = info.position
        if position == L.statusIcon.perRow * L.statusIcon.rows then
            return {table.unpack(entries, position)}
        end
        return {entries[position]}
    elseif info.statusId then
        local selected = find(entries, "id", info.statusId)
        if not selected then return end
        return {selected}
    elseif info.offset then
        local remaining = {}
        for i = info.offset, #entries do remaining[#remaining + 1] = entries[i] end
        return remaining
    end
    return entries
end

local function ownedStatusText(self, describe, entry, battle, actor)
    local text, tag, note = describe.statusDetail(entry, battle.rules, actor, battle)
    if entry.id=='stasis' and actor.stasisCardId then
        local display=self.presentation[actor.stasisCardId]
        local definition=battle.catalog.cards[actor.stasisCardId]
        local name=display and display.name or definition and definition.name or actor.stasisCardId
        text='正在扣押「'..name..(actor.stasisCardUpgraded and '+' or '')..'」。击败此浮核后归还'
        note='手牌已满时归还到弃牌堆'
    elseif entry.id=='constricted' and actor.constrictedSourceName then
        note='来源：'..actor.constrictedSourceName
    end
    return text, tag, note
end

-- The head icon explains the published intent, never the ordered outcome forecast.
local attackTips = {
    ATTACK = "这名敌人将要攻击造成 ",
    ATTACK_BUFF = "这名敌人将要进行强化并攻击造成 ",
    ATTACK_DEBUFF = "这名敌人将要对你施加负面效果并攻击造成 ",
    ATTACK_DEFEND = "这名敌人将要格挡并攻击造成 ",
}
local currentTips = {
    BUFF = {"策略", "这名敌人将要进行强化。"},
    DEBUFF = {"策略", "这名敌人将要对你施加一种负面效果。"},
    STRONG_DEBUFF = {"策略", "这名敌人将要对你施加一种强大的负面效果。"},
    DEFEND = {"守势", "这名敌人将要在这个回合进行格挡。"},
    DEFEND_DEBUFF = {"守势", "这名敌人将要进行格挡并对你施加一种负面效果。"},
    DEFEND_BUFF = {"守势", "这名敌人将要进行格挡并进行强化。"},
    ESCAPE = {"胆小", "这名敌人将要逃跑。"},
    MAGIC = {"魔法", "这名敌人将要在这个回合使用神秘的魔法。"},
    SLEEP = {"熟睡", "这名敌人正在睡觉。"},
    STUN = {"击晕", "这名敌人在这个回合被击晕了。"},
    UNKNOWN = {"不明", "这名敌人的意图不明（但不是攻击）。"},
}
local function intentTip(face)
    local enum = face.enum
    local attack = attackTips[enum]
    if attack and face.damage and face.damage >= 0 then
        local repeatText = enum ~= 'ATTACK_DEBUFF' and face.times and face.times > 1
            and (' ' .. number(face.times) .. ' 次') or ''
        return {name = enum == 'ATTACK_DEBUFF' and '策略' or '攻势',
            text = attack .. number(face.damage) .. ' 点伤害' .. repeatText .. '。'}
    end
    local copy = currentTips[enum] or currentTips.UNKNOWN
    return {name = copy[1], text = copy[2]}
end

-- Fixed presentation dependencies stay with the existing battle description helpers.
function M.new(self, describe, lines)
    local function projectedIntent(battle,index)
        if require('abyss_boss_relics').hidesIntents(self.run)then return Intent.hidden()end
        return describe.intentView(battle,index)
    end
    local function statusRow(entry, battle, actor)
        local text, tag, note = ownedStatusText(self, describe, entry, battle, actor)
        local kind = describe.statusKind(entry)
        return { status = entry.id, icon = (Theme.icon.status[entry.id] or Theme.icon.status[entry.id:match('^colorless_bomb_') and 'colorless_bomb' or entry.icon]),
            colour = kind == "buff" and C.buff or C.debuff, tag = tag, text = text, note = note,
            name = entry.name .. (entry.stack == "none" and "" or " " .. number(entry.amount)) }
    end

    local function intentCard(card, battle, info, actor)
        if require('abyss_boss_relics').hidesIntents(self.run) or not Intent.hasSourceIntent(actor) then
            local view = projectedIntent(battle, info.index)
            card.tag, card.accent, card.hp = "下一步行动", describe.intentColors[view.kind] or C.textDim, nil
            card.subtitle = "尚未执行 · 敌方回合时发生"
            card.sections[1] = {rows = view.rows}
            return card
        end
        local face = describe.displayedIntent and describe.displayedIntent(battle,actor)
        if not face or face.enum == 'NONE' then return end
        card.tag, card.accent, card.hp = "当前意图", describe.intentColors[face.kind] or C.textDim, nil
        local row = intentTip(face)
        row.colour = card.accent
        card.sections[1] = {rows = {row}}
        return card
    end

    local function potionRows(data, battle, info)
        if self.run.potions ~= info.inventory or self.run.potions[info.slot] ~= info.potionId then return end
        local definition = find(data.potions.potions, "id", info.potionId)
        if not definition then return end
        local keywordDefinition=Combat.copy(definition)
        for _,effect in ipairs(keywordDefinition.effects)do effect.value=require('abyss_inventory').potionValue(battle,effect)end
        return keywordDefinition, {{name = definition.name, text = describe.potionText(definition, battle, true):match("\n(.*)"),
            note = require('abyss_potion_text').note(definition) or (definition.targetPolicy == "enemy_one" and "对选中的一名敌人；先选药水，再点击敌人" or "对自己使用；短按药水生效"), colour = C.goldBright}}
    end

    local function keywordRow(status,id,effect,battle,actor,keywordText)
        if keywordText then return {status=id,name=status.name,text=status.description,
            colour=status.kind=='buff' and C.buff or C.debuff}end
        local row=statusRow({id=id,name=status.name,amount=effect.value,
            temporary=describe.temporaryOps[effect.op] and effect.value or 0,
            kind=status.kind,description=status.description,stack=status.stack},battle,actor)
        if status.stack=='duration' then row.tag='持续 '..number(effect.value)..' 回合'end
        return row
    end
    local function keywordRows(effects, battle, actor, rows, keywordText)
        for _, effect in ipairs(effects) do
            local id = effect.status or effect.op == "gainTemporaryStrength" and "strength"
            local status = id and battle.catalog.statuses[id]
            if status and (not keywordText or keywordText:find(status.name,1,true)) then
                rows[#rows + 1] = keywordRow(status,id,effect,battle,actor,keywordText)
            end
            if effect["then"] then keywordRows(effect["then"], battle, actor, rows, keywordText) end
        end
    end

    local function fullEffectRows(definition, instance, battle, rows,reward)
        local full
        local preview = not reward and Combat.cardPreview(battle, instance, self.target) or {}
        if definition.originalV4 then
            local original=require('abyss_original_v4_display')
            full=original.describe(definition,instance.upgraded)
            local keywords=original.keywordDefinitions(definition,instance.upgraded)
            if keywords~='' then full=full..'\n'..keywords end
            if preview.text and preview.text~='' then full=full..'\n'..preview.text end
        else
            local display=self.presentation[instance.cardId]
            local cardDisplay=require('abyss_card_display')
            full=reward and cardDisplay.permanentText(display,definition,instance)
                or cardDisplay.combatText(display,definition,instance,preview,battle,self.target)
        end
        -- Detail rows use their own colour; never split inline markup across pages.
        full=full:gsub('<color=[^>]+>',''):gsub('</color>','')
        local chunk, index = "", 0
        local function flush()
            if chunk ~= "" then
                index = index + 1
                rows[#rows + 1] = {name = "完整效果 " .. index, text = chunk, colour = C.goldBright, icon = Theme.icon.cardArt[definition.type]}
                chunk = ""
            end
        end
        for glyph in full:gmatch("[%z\1-\127\194-\244][\128-\191]*") do
            if lines(chunk .. glyph) > 2 then flush() end
            chunk = chunk .. glyph
        end
        flush()
    end

    local function cardTraits(definition, rows, keywordOnly)
        if definition.strikeTag and not keywordOnly then rows[#rows+1]={intent='unknown',colour=C.goldBright,name='打击类',
            text='带有打击标签',note='计入剑势如虹等效果'} end
        if definition.exhaust then rows[#rows + 1] = {icon = Theme.icon.exhaust, colour = C.goldBright, name = "消耗",
            text = "打出后移出本场战斗", note = "不进入弃牌堆"} end
        if definition.ethereal then rows[#rows + 1] = {intent = "unknown", colour = C.goldBright, name = "虚无",
            text = "回合结束时若仍在手中，将被消耗"} end
    end

    local function originRow(info,instance,rows)
        if info.kind~='card' or not self.run then return end
        local origin=require('abyss_card_origin_view').describe(self.run,instance,true)
        if origin~=''then rows[#rows+1]={intent='unknown',colour=C.goldBright,name='升级来源',text=origin}end
    end
    local function standardCardEffectRows(kind,definition,instance,battle,rows,reward)
        if kind~='potion' and not definition.originalV4 then fullEffectRows(definition,instance,battle,rows,reward)end
    end
    local function automaticKeywords(info)
        return Theme.presentationProfile=='official-assets-first' and info.kind=='card' and info.transient==true
    end
    local function cardRows(info,definition,instance,battle,actor,rows)
        local keywordOnly=automaticKeywords(info)
        if definition.originalV4 and not keywordOnly then fullEffectRows(definition,instance,battle,rows,info.reward)end
        local keywordText=keywordOnly and require('abyss_card_display').permanentText(self.presentation[instance.cardId],definition,instance)
        keywordRows(definition.effects, battle, actor, rows, keywordText)
        cardTraits(definition, rows, keywordOnly)
        if not keywordOnly then
            originRow(info,instance,rows)
            standardCardEffectRows(info.kind,definition,instance,battle,rows,info.reward)
        end
        return keywordOnly
    end
    local function keywordCard(card, data, presentation, battle, info, actor)
        local reward=info.reward
        if reward and not require('abyss_battle_reward_owner').ready(self,reward) then return end
        local instance = reward and {cardId=reward.cardId,upgraded=reward.upgraded} or find(battle.hand, "uid", info.uid)
        local definition, rows
        if info.kind == "potion" then
            definition, rows = potionRows(data, battle, info)
            if not definition then return end
        else
            if not instance then return end
            definition, rows = Combat.cardDefinition(battle, instance), {}
        end
        local keywordOnly=cardRows(info,definition,instance,battle,actor,rows)
        if #rows == 0 then return end
        card.title, card.tag, card.hp = info.kind == "potion" and definition.name or presentation[instance.cardId].name, "关键词", nil
        card.subtitle = info.kind == "potion" and "药水说明，尚未使用 · 查看不消耗" or "卡牌效果说明，尚未生效"
        card.keywordOnly=keywordOnly
        if keywordOnly then card.subtitle=nil end
        card.sections[1] = { rows = rows }
        return card
    end

    local function originalResources(card, battle)
        if not battle.originalV4 then return end
        local rows = {}
        for line in require("abyss_original_v4_display").summary(battle):gmatch("[^\n]+") do
            rows[#rows + 1] = {name = "当前资源", text = line, colour = C.gold, icon = Theme.icon.cardArt.skill}
        end
        card.title = battle.originalV4Rules and battle.originalV4Rules.roles[battle.originalV4.role].name or "角色资源"
        card.sections[#card.sections + 1] = {label = "角色资源与剩余次数", colour = C.gold, rows = rows}
    end

    local function discardResources(card, battle)
        if self.run and self.run.characterProfile and self.run.characterProfile.id == "silent" then
            card.sections[#card.sections + 1] = {label = "弃牌", colour = C.gold, rows = {
                {name = "本回合弃牌 " .. number(battle.discardedThisTurn or 0), text = "弃牌可触发退费，或降低部分牌本回合的费用。",
                    colour = C.gold, icon = Theme.icon.cardArt.skill}}}
        end
    end

    local function stanceResources(card, actor)
        if actor.stance and (self.run and self.run.character == "watcher" or actor.stanceKnown or actor.stance ~= "Neutral") then
            local stance = actor.stance
            local text = stance == "Wrath" and "普通攻击造成与受到的伤害均翻倍。"
                or stance == "Calm" and "离开平静时获得2点能量。"
                or stance == "Divinity" and "普通攻击伤害为3倍；下个你的回合开始退出。"
                or "当前没有姿态的伤害修正。"
            card.sections[#card.sections + 1] = {label = "姿态", colour = C.gold, rows = {
                {name = describe.stanceNames[stance], text = text, colour = C.gold, icon = Theme.icon.cardArt.power}}}
        end
    end

    local function orbResources(card, battle)
        if battle.orbs and (self.run and self.run.character == "defect" or battle.orbs.slots > 0 or #battle.orbs.balls > 0) then
            local view = require("abyss_orbs").view(battle)
            local rows = {{name = "球位 " .. #view.balls .. " / " .. view.slots, text = "左侧序号最先被唤起；集中 " .. number(view.focus) .. "。",
                colour = C.gold, icon = Theme.icon.cardArt.power}}
            for i, ball in ipairs(view.balls) do
                local passive = ball.kind == "dark" and "储伤增长 " or ball.kind == "frost" and "格挡 " or ball.kind == "plasma" and "能量 " or "伤害 "
                rows[#rows + 1] = {name = i .. " · " .. describe.orbNames[ball.kind], text = "被动：" .. passive .. number(ball.passive) .. "；唤起：" .. number(ball.evoke),
                    colour = C.gold, icon = Theme.icon.cardArt.power}
            end
            card.sections[#card.sections + 1] = {label = "充能球（按唤起顺序）", colour = C.gold, rows = rows}
        end
    end

    -- The current combat owns the live reserve; persistent Run counters may lag.
    -- This existing portrait surface is battle-only, not a noncombat relic list.
    local function relicResources(card,battle)
        local state=require('abyss_lizard_tail').state(battle)
        if not state then return end
        local view=assert(tailStates[state],'unknown Tail presentation state')
        local icon=Theme.icon.relic.lizard_tail
        card.sections[#card.sections+1]={label='遗物',colour=C.gold,rows={{
            name='蜥蜴尾巴 · '..view.name,text=view.text,colour=view.colour,
            icon=type(icon)=='table'and icon.id or icon}}}
    end

    local function playerResources(card, battle, info, actor)
        if actor == battle.player and not info.statusId and not info.offset then
            originalResources(card, battle)
            discardResources(card, battle)
            stanceResources(card, actor)
            orbResources(card, battle)
            relicResources(card, battle)
        end
    end

    local function statusSections(card, entries, battle, actor)
        for _, kind in ipairs({"buff", "debuff"}) do
            local rows = {}
            for _, entry in ipairs(entries) do
                if describe.statusKind(entry) == kind then rows[#rows + 1] = statusRow(entry, battle, actor) end
            end
            if #rows > 0 then
                card.sections[#card.sections + 1] = {label = describe.kindNames[kind], colour = kind == "buff" and C.buff or C.debuff, rows = rows}
            end
        end
    end

    local function powerRows(entries, battle, info, actor)
        local rows = {}
        for _, entry in ipairs(selectedEntries(entries, info) or {}) do
            local row = statusRow(entry, battle, actor)
            local body = row.text or ""
            if row.tag and row.tag ~= "" and tonumber(row.tag) == nil then body = body .. "。 " .. row.tag end
            if row.note and row.note ~= "" then body = body .. "。 " .. row.note end
            rows[#rows + 1] = {name = row.name, body = body}
        end
        return #rows > 0 and rows or nil
    end

    return function(data, presentation, battle, info, actor)
        local entries = Combat.statusView(actor)
        if info.kind == "powerTips" then return powerRows(entries, battle, info, actor) end
        local card = {title = actor.name or "旅行者", tag = "当前状态", accent = C.gold,
            hp = actor.hp, maxHp = actor.maxHp, block = actor.block, sections = {}}
        if info.kind == "intent" then return intentCard(card, battle, info, actor) end
        if info.kind == "card" or info.kind == "potion" or info.kind=='rewardCard' then return keywordCard(card, data, presentation, battle, info, actor) end
        entries = selectedEntries(entries, info)
        if not entries then return end
        if info.index > 0 and not info.statusId and not info.offset then
            local view = projectedIntent(battle, info.index)
            card.sections[#card.sections + 1] = {label = "意图 · 尚未执行", colour = describe.intentColors[view.kind] or C.textDim,
                rows = view.rows}
        end
        playerResources(card, battle, info, actor)
        statusSections(card, entries, battle, actor)
        if #card.sections == 0 then card.empty = "暂无状态" end
        return card
    end
end

return M
