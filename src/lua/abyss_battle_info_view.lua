-- Detail pagination and native layout. This module neither handles input nor changes combat.
local Actors = require("abyss_actor")
local Theme = require("abyss_theme")
local number = require("abyss_numbers").integer
local M = {}
local UnitView=require("abyss_battle_unit_view")
local C, L, S = Theme.color, Theme.layout, Theme.space
local I, P = L.statusInfo, L.powerTips
local wrappedLines = require("abyss_battle_info_content").lines
local powerTitle = string.format("<color=#%02X%02X%02X>", P.title.r, P.title.g, P.title.b)

local function openPage(paging)
    paging.page = {items = {}, rows = 0, sections = 0}
    paging.pages[#paging.pages + 1] = paging.page
    paging.used = 0
end

local function needsPage(page, used, head, height, budget)
    return page.rows > 0 and (page.rows >= I.rows or used + head + height > budget
        or head > 0 and page.sections >= I.sections)
end

local function sectionLabel(paging, section, continued)
    local page = paging.page
    page.items[#page.items + 1] = {label = section.label .. (continued and "（续）" or ""), colour = section.colour}
    page.sections, paging.used = page.sections + 1, paging.used + I.section
end

function M.paginator(lines)
    local function appendSection(paging, section)
        local labelled, continued = false, false
        for _, row in ipairs(section.rows) do
            row.textLines, row.noteLines = lines(row.text,paging.width,paging.font), lines(row.note,paging.width,paging.font)
            local height = I.name + (row.textLines + row.noteLines) * I.line + I.entryGap
            local head = section.label and not labelled and I.section or 0
            if needsPage(paging.page, paging.used, head, height, paging.budget) then
                openPage(paging)
                continued, labelled = labelled, false
            end
            if section.label and not labelled then
                sectionLabel(paging, section, continued)
                labelled = true
            end
            local page = paging.page
            page.items[#page.items + 1] = {row = row}
            page.rows, paging.used = page.rows + 1, paging.used + height
        end
    end

    return function(card,width,font)
        local room = Theme.canvas.base[2] - L.topBar.height - S.s - Theme.canvas.safe.y
        local heading=card.keywordOnly and 0 or I.header+I.summary+I.divider
        local paging = {pages = {}, used = 0, width=width,font=font,budget = room - I.pad * 2 - heading - I.footer}
        openPage(paging)
        for _, section in ipairs(card.sections) do appendSection(paging, section) end
        return paging.pages
    end
end

local function footerText(info, pages)
    return not info.transient and (#pages > 1 and "第 " .. info.page .. "/" .. #pages .. " 页 · 点按卡片翻页"
        or "点按任意处关闭") or #pages > 1 and "共 " .. #pages .. " 页 · 点击查看全部" or nil
end

local function pageHeight(card, page, footer)
    local body = card.empty and I.section or 0
    for _, item in ipairs(page.items) do
        body = body + (item.label and I.section or I.name + (item.row.textLines + item.row.noteLines) * I.line + I.entryGap)
    end
    local heading=card.keywordOnly and 0 or I.header+I.summary+I.divider
    return I.pad * 2 + heading + body + (footer and I.footer or 0)
end

local function place(panel, name, x, y, width, height)
    local part = panel:GetChild(name)
    part:SetAnchoredPosition(x, y)
    if width then part:SetSizeDelta(width, height) end
    return part
end

local function detailActor(battle, info)
    return info and battle and (info.index == 0 and battle.player or battle.enemies[info.index])
end

local function powerColumns(rows, width, font, room)
    local column, used, columns = {}, 0, {}
    local pitch = math.ceil(font * 1.25)
    for i = 1, math.min(#rows, P.rows) do
        local row = rows[i]
        local count = wrappedLines(row.name, width, font, P.padding * 2)
        for paragraph in row.body:gmatch("[^\n]+") do
            count = count + wrappedLines(paragraph, width, font, P.padding * 2)
        end
        local height = math.max(L.nativeText.lineHeight, count * pitch + P.padding * 2)
        if used > 0 and used + height > room then
            columns[#columns + 1] = {rows = column, height = used - P.gap}
            column, used = {}, 0
        end
        column[#column + 1] = {row = row, height = height, y = used}
        used = used + height + P.gap
    end
    columns[#columns + 1] = {rows = column, height = used - P.gap}
    return columns
end

local function powerLayout(rows)
    local left = L.player.position[1] + L.player.portrait / 2 + S.l
    local safeRight = Theme.canvas.base[1] / 2 - Theme.canvas.safe.x
    local top = L.battlePotions.origin[2] - L.battlePotions.size[2] / 2 - S.s
    local floor = L.battleNotice.bandTop + S.s
    local width = P.width
    for font = P.font, P.minFont, -1 do
        local columns = powerColumns(rows, width, font, top - floor)
        local fits = left + #columns * (width + P.gap) - P.gap <= safeRight
        if fits and (#columns == 1 or #rows > 3 or font == P.minFont) then
            return columns, left, top, floor, width, font, 1
        end
        if #rows > 3 then width = math.max(P.minWidth, width - S.l) end
    end
    -- At the smallest size, use the whole safe battlefield for an unusually long list.
    local columns = powerColumns(rows, width, P.minFont, top - floor)
    local span = #columns * (width + P.gap) - P.gap
    local scale = math.min(1, 2 * safeRight / span)
    left = math.min(left, safeRight - span * scale)
    return columns, left, top, floor, width, P.minFont, scale
end

local function nativePowerBox(layer, index, geometry, entry)
    local box = place(layer, "tip" .. index, geometry.x, geometry.y, geometry.width, entry.height)
    place(box, "edge", 0, 0, geometry.width, entry.height)
    place(box, "face", 0, 0, geometry.width - 2, entry.height - 2)
    box:SetLocalScale(geometry.scale, geometry.scale, 1)
    local copy = place(box, "copy", 0, 0, geometry.width - P.padding * 2, entry.height)
    copy.fontSize, copy.minimumFontSize = geometry.font, geometry.font
    copy.text = powerTitle .. entry.row.name .. "</color>\n" .. entry.row.body
    box:SetVisible(true)
end

local function paintCardTips(panel, rows, anchor, beginCompact, finishCompact)
    local layer=panel:GetChild("powerTips")
    beginCompact(panel)
    panel:GetChild("more"):SetVisible(false)
    panel:GetChild("page"):SetVisible(false)
    local edge=Theme.canvas.base[1]/2-Theme.canvas.safe.x
    local top=Theme.canvas.base[2]/2-L.topBar.height-S.s
    local floor=-Theme.canvas.base[2]/2+Theme.canvas.safe.y
    local columns=powerColumns(rows,P.width,P.font,top-floor)
    local gap=I.cardHoverGap
    local right,left=anchor.x+anchor.halfW+gap,anchor.x-anchor.halfW-gap
    local width=#columns*(P.width+P.gap)-P.gap
    local direction=right+width<=edge or left-width<-edge and anchor.x<=0
    local index=0
    for column,items in ipairs(columns)do
        local offset=(column-1)*(P.width+P.gap)+P.width/2
        local x=direction and right+offset or left-offset
        x=math.max(-edge+P.width/2,math.min(edge-P.width/2,x))
        local y=math.min(top,math.max(anchor.y+anchor.halfH,floor+items.height))
        for _,entry in ipairs(items.rows)do
            index=index+1
            nativePowerBox(layer,index,{x=x,y=y-entry.y-entry.height/2,width=P.width,font=P.font,scale=1},entry)
        end
    end
    finishCompact(panel,layer,index,false)
end

function M.new(self, child, enemyPosition, describeInfo, paginate, tint, ink, picture)
    local textStyles={}
    local function readingSize(control,name,font)
        local original=textStyles[name]
        if not original then
            original={font=control.fontSize or Theme.font.reading,minimum=control.minimumFontSize or Theme.font.minimum}
            textStyles[name]=original
        end
        control.fontSize=font or original.font
        control.minimumFontSize=font and math.min(original.minimum,font) or original.minimum
    end
    local function cardAnchor(info)
        local slot=info.slot
        local box=child('card'..slot)
        local pose=self.cardPositions[info.uid]
        if info.reward then
            local anim=self.rewardView and self.rewardView.cards[slot]
            if not anim then return end
            local pick=L.rewardPick
            pose={(slot-(#info.reward.cards+1)/2)*pick.step,pick.y+anim.lift+anim.rise}
        end
        if not pose or box.visible==false then return end
        local r=(box.localRotationZ or 0)*math.pi/180
        local w,h=L.card.size[1]*(box.localScaleX or 1),L.card.size[2]*(box.localScaleY or 1)
        return {x=pose[1],y=pose[2],halfW=(math.abs(math.cos(r))*w+math.abs(math.sin(r))*h)/2,
            halfH=(math.abs(math.cos(r))*h+math.abs(math.sin(r))*w)/2}
    end
    local function pageGeometry(battle, info, height, width)
        local x, portrait
        if info.index == 0 then
            x, portrait = L.player.position[1], L.player.portrait
            x = x + portrait / 2 + S.l + I.width / 2
        else
            local enemyX, _, size = enemyPosition(battle, info.index)
            x, portrait = enemyX - size / 2 - S.l - I.width / 2, size
        end
        width=width or I.width
        local edge = Theme.canvas.base[1] / 2 - Theme.canvas.safe.x - width / 2
        x = math.max(-edge, math.min(edge, x))
        local top = Theme.canvas.base[2] / 2 - L.topBar.height - S.s
        local heroY=L.player.position[2]+UnitView.noticeLift(battle.player,L.player.portrait,L.player.position[2],true)
        local unitY = info.index == 0 and heroY or select(5,enemyPosition(battle,info.index)) or L.enemyRow.y
        local cardTop=unitY+portrait/2
        local y = math.min(top - height / 2, cardTop - height / 2)
        y = math.max(-Theme.canvas.base[2] / 2 + Theme.canvas.safe.y + height / 2, y)
        return {x = x, y = y, height = height, width=width,line = L.nativeText.lineHeight, inner = width - I.pad * 2,
            left = x - width / 2 + I.pad, right = x + width / 2 - I.pad,
            cursor = y + height / 2 - I.pad, sections = 0, rows = 0}
    end

    local function frame(panel, card, geometry)
        local x, y, height = geometry.x, geometry.y, geometry.height
        place(panel, "shadow", x + S.s, y - S.s, geometry.width + S.border * 2, height + S.border * 2)
        place(panel, "border", x, y, geometry.width + S.border * 2, height + S.border * 2)
        place(panel, "plate", x, y, geometry.width, height)
        place(panel, "page", x, y, geometry.width, height)
        tint(place(panel, "accent", x, y + height / 2 - I.accent / 2, geometry.width, I.accent), card.accent)
    end

    local function header(panel, card, geometry)
        panel:GetChild('title'):SetVisible(not card.keywordOnly)
        panel:GetChild('tag'):SetVisible(not card.keywordOnly and not geometry.reading)
        if card.keywordOnly then return end
        local titleWidth=geometry.inner-(geometry.reading and 0 or I.tagWidth)
        local title = place(panel, "title", geometry.left + titleWidth / 2, geometry.cursor - I.header / 2,titleWidth,geometry.line)
        title.text = card.title
        local tag = place(panel, "tag", geometry.right - I.tagWidth / 2, geometry.cursor - I.header / 2)
        tag:SetVisible(not geometry.reading)
        tag.text = card.tag
        ink(tag, card.accent)
        geometry.cursor = geometry.cursor - I.header
    end

    local function vitals(panel, card, geometry, summary, mid, glyph)
        local left, inner, line = geometry.left, geometry.inner, geometry.line
        place(panel, "hpIcon", left + glyph / 2, mid)
        place(panel, "summary", left + glyph + S.xs + (inner / 2 - glyph - S.xs) / 2, mid, inner / 2 - glyph - S.xs, line)
        summary.text = "生命 " .. number(card.hp) .. "/" .. number(card.maxHp)
        ink(summary, C.text)
        place(panel, "blockIcon", left + inner / 2 + glyph / 2, mid)
        local guard = place(panel, "guard", left + inner / 2 + glyph + S.xs + (inner / 2 - glyph - S.xs) / 2, mid, inner / 2 - glyph - S.xs, line)
        guard.text = "格挡 " .. number(card.block)
        ink(guard, card.block > 0 and C.block or C.textMuted)
        tint(panel:GetChild("blockIcon"), card.block > 0 and C.block or C.textMuted)
    end

    local function summaryLine(panel, card, geometry)
        for _,name in ipairs({'summary','rule'})do panel:GetChild(name):SetVisible(not card.keywordOnly)end
        if card.keywordOnly then
            for _,name in ipairs({'hpIcon','blockIcon','guard'})do panel:GetChild(name):SetVisible(false)end
            return
        end
        local mid, glyph = geometry.cursor - I.summary / 2, Theme.font.label
        local summary = panel:GetChild("summary")
        for _, name in ipairs({"hpIcon", "blockIcon", "guard"}) do panel:GetChild(name):SetVisible(card.hp ~= nil) end
        if card.hp then
            vitals(panel, card, geometry, summary, mid, glyph)
        else
            place(panel, "summary", geometry.x, mid, geometry.inner, geometry.line)
            summary.text = card.subtitle
            ink(summary, C.textDim)
        end
        geometry.cursor = geometry.cursor - I.summary
        place(panel, "rule", geometry.x, geometry.cursor - I.divider / 2,geometry.inner,S.hairline)
        geometry.cursor = geometry.cursor - I.divider
    end

    local function emptySection(panel, card, geometry)
        if card.empty then
            geometry.sections = 1
            local label = place(panel, "section1", geometry.x + S.xs + S.s, geometry.cursor - I.section / 2)
            label.text = card.empty
            ink(label, C.textMuted)
            panel:GetChild("sectionMark1"):SetVisible(false)
            panel:GetChild("section1"):SetVisible(true)
            geometry.cursor = geometry.cursor - I.section
        end
    end

    local function section(panel, item, geometry)
        geometry.sections = geometry.sections + 1
        local mark = place(panel, "sectionMark" .. geometry.sections, geometry.left + S.xs / 2, geometry.cursor - I.section / 2)
        local label = place(panel, "section" .. geometry.sections, geometry.x + S.xs + S.s, geometry.cursor - I.section / 2,geometry.inner,geometry.line)
        tint(mark, item.colour)
        label.text = item.label
        ink(label, item.colour)
        mark:SetVisible(true)
        label:SetVisible(true)
        geometry.cursor = geometry.cursor - I.section
    end

    local function detailRow(panel, row, geometry, textX)
        geometry.rows = geometry.rows + 1
        local i = geometry.rows
        local icon = place(panel, "icon" .. i, geometry.left + I.icon / 2, geometry.cursor - I.name / 2)
        picture(icon, row.icon and type(row.icon) == "number" and row.icon
            or row.status and Theme.icon.status[row.status]
            or Theme.icon.intent[row.icon or row.intent] or Theme.icon.intent.unknown)
        tint(icon, row.colour)
        local name = place(panel, "name" .. i, textX, geometry.cursor - I.name / 2,geometry.inner-I.icon-I.gap,geometry.line)
        name.text = row.name
        ink(name, row.colour)
        local rowTag = place(panel, "tag" .. i, geometry.right - I.tagWidth / 2, geometry.cursor - I.name / 2)
        rowTag.text = row.tag or ""
        geometry.cursor = geometry.cursor - I.name
        local text = place(panel, "text" .. i, textX, geometry.cursor - row.textLines * I.line / 2,
            geometry.inner - I.icon - I.gap, math.max(geometry.line, row.textLines * I.line + I.line))
        text.text = row.text
        readingSize(text,'text'..i,geometry.reading)
        geometry.cursor = geometry.cursor - row.textLines * I.line
        local note = place(panel, "note" .. i, textX, geometry.cursor - row.noteLines * I.line / 2,
            geometry.inner - I.icon - I.gap, math.max(geometry.line, row.noteLines * I.line + I.line))
        note.text = row.note or ""
        readingSize(note,'note'..i,geometry.reading)
        geometry.cursor = geometry.cursor - row.noteLines * I.line - I.entryGap
        for _, part in ipairs({icon, name, rowTag, text, note}) do part:SetVisible(true) end
        note:SetVisible(row.note ~= nil)
    end

    local function pageItems(panel, card, page, geometry)
        emptySection(panel, card, geometry)
        local textX = geometry.left + I.icon + I.gap + (geometry.inner - I.icon - I.gap) / 2
        for _, item in ipairs(page.items) do
            if item.label then section(panel, item, geometry)
            else detailRow(panel, item.row, geometry, textX) end
        end
    end

    local function hideUnused(panel, geometry)
        for i = geometry.sections + 1, I.sections do
            panel:GetChild("sectionMark" .. i):SetVisible(false)
            panel:GetChild("section" .. i):SetVisible(false)
        end
        for i = geometry.rows + 1, I.rows do
            for _, name in ipairs({"icon", "name", "tag", "text", "note"}) do panel:GetChild(name .. i):SetVisible(false) end
        end
    end

    local function finish(panel, info, geometry, footer)
        local more = panel:GetChild("more")
        more:SetVisible(footer ~= nil)
        more:SetAnchoredPosition(geometry.x, geometry.y - geometry.height / 2 + I.pad + I.footer / 2)
        more.text = footer or ""
        more:SetSizeDelta(geometry.inner,geometry.line)
        panel:SetVisible(true)
        panel:GetChild("hit"):SetVisible(not info.transient)
        panel:GetChild("page"):SetVisible(not info.transient)
        panel.disableCursorEventPassthrough = not info.transient
        panel:SetAsLastSibling()
    end

    local compact, shown = false, 0
    local staticFrame = {"shadow", "border", "plate", "accent", "rule"}
    local function beginCompact(panel)
        if compact then return end
        for _, name in ipairs(staticFrame) do panel:GetChild(name):SetVisible(false) end
        for _, name in ipairs({"title", "tag", "hpIcon", "summary", "blockIcon", "guard", "more", "hit", "page"}) do
            panel:GetChild(name):SetVisible(false)
        end
        hideUnused(panel, {sections = 0, rows = 0})
    end

    local function finishCompact(panel,layer,index,dismiss)
        for i = index + 1, shown do layer:GetChild("tip" .. i):SetVisible(false) end
        compact, shown = true, index
        layer:SetVisible(true)
        panel.disableCursorEventPassthrough = false
        panel:SetVisible(true)
        panel:SetAsLastSibling()
        child("statusDismiss"):SetVisible(dismiss)
    end

    local function paintPowers(panel, tip, rows, heroTop)
        local layer = panel:GetChild("powerTips")
        beginCompact(panel)
        local columns, left, top, floor, width, font, scale = powerLayout(rows)
        local index = 0
        for column, items in ipairs(columns) do
            local y = math.min(top, math.max(heroTop, floor + items.height * scale))
            local x = left + ((column - 1) * (width + P.gap) + width / 2) * scale
            for _, entry in ipairs(items.rows) do
                index = index + 1
                nativePowerBox(layer, index, {x=x, y=y-(entry.y+entry.height/2)*scale, width=width, font=font, scale=scale}, entry)
            end
        end
        finishCompact(panel,layer,index,tip.touch==true)
    end

    local function clearPowers(panel)
        if not compact then return end
        panel:GetChild("powerTips"):SetVisible(false)
        child("statusDismiss"):SetVisible(false)
        for _, name in ipairs(staticFrame) do panel:GetChild(name):SetVisible(true) end
        compact = false
    end

    local function cardInfo(info)
        return info and (info.kind=='card' or info.kind=='rewardCard')
    end
    local function renderCardTips(panel,battle,info,positionOnly)
        local anchor=battle and cardAnchor(info)
        local prior=info.sideAnchor
        if positionOnly and prior and anchor and prior.x==anchor.x and prior.y==anchor.y
            and prior.halfW==anchor.halfW and prior.halfH==anchor.halfH then return end
        if not positionOnly then
            self.powerTip=nil
            local actor=detailActor(battle,info)
            info.tips=actor and describeInfo(battle,info,actor)
        end
        info.sideAnchor=anchor
        if info.tips and anchor then paintCardTips(panel,info.tips,anchor,beginCompact,finishCompact)
        else
            clearPowers(panel)
            child("statusDismiss"):SetVisible(false)
            panel:SetVisible(false)
            if info.transient and not self:hasOverflowCard(info) then self.info=nil end
        end
    end
    local function describedCard(battle,info)
        local actor = detailActor(battle, info)
        if not actor or actor.id~=info.id or not Actors.isPresent(actor)then return end
        return describeInfo(battle,info,actor)
    end
    local function currentPowerRows(battle, tip)
        if not battle or tip.battle ~= battle or not self.active or self.gesture
            or self.carry or self.potionAim or self.potionMenu or not Actors.isPresent(battle.player) then
            self.powerTip = nil
            return
        end
        if self.busy then return end
        local rows = describeInfo(battle, tip, battle.player)
        if not rows and (tip.touch or tip.statusId or tip.offset) then self.powerTip = nil end
        return rows
    end

    local function updatePowers(panel, battle, info)
        local rows = not info and self.powerTip and currentPowerRows(battle, self.powerTip)
        if rows then
            local y = L.player.position[2]
            local top = y + UnitView.noticeLift(battle.player, L.player.portrait, y, true) + L.player.portrait / 2
            paintPowers(panel, self.powerTip, rows, top)
            return true
        end
        clearPowers(panel)
        if info then self.powerTip = nil end
    end

    return function(battle,positionOnly)
        local panel, info = child("statusInfo"), self.info
        if cardInfo(info) then return renderCardTips(panel,battle,info,positionOnly) end
        if positionOnly or updatePowers(panel,battle,info) then return end
        local card=describedCard(battle,info)
        if not card then
            self.info = nil
            panel:SetVisible(false)
            return
        end
        local width=I.width
        local pages = paginate(card,width)
        info.page = math.max(1, math.min(info.page or 1, #pages))
        info.pages = #pages
        local page = pages[info.page]
        local footer = footerText(info, pages)
        local geometry = pageGeometry(battle, info, pageHeight(card, page, footer),width)
        frame(panel, card, geometry)
        header(panel, card, geometry)
        summaryLine(panel, card, geometry)
        pageItems(panel, card, page, geometry)
        hideUnused(panel, geometry)
        finish(panel, info, geometry, footer)
    end
end

return M
