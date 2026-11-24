local ShopUI = require("abyss_shop_ui")
local ShopSelection = require('abyss_shop_selection')
local Merchant = require('abyss_merchant')
local Motion = require('abyss_entrance_motion')
local Theme = require('abyss_theme')
local M = {}

-- Installs the shop setup responsibility on one node UI instance.
function M.install(ctx)
    ctx.merchant = Merchant.new(ctx.child("merchant"), { color = ctx.options.color, sound = ctx.options.sound, compact = true })

    local talk = ctx.child('merchant'):GetChild('talk')
    local hit = talk:GetChild('hit')
    local observed,held,released=false,nil,nil
    local function valid(token)
        return token and token.epoch==ctx.shopEpoch and token.run==ctx.self.run
            and token.map==ctx.self.map and token.actions==ctx.self.actions and not ctx.self.shopBusy
    end
    function ctx.bindShopEntry(cursor)
        if cursor and cursor.CursorDown and cursor.CursorUp then
            hit:AddCursorEventListener(cursor.CursorDown,function(event)
                observed=true;released=nil
                held={touch=event and event.touchId,epoch=ctx.shopEpoch,run=ctx.self.run,map=ctx.self.map,actions=ctx.self.actions}
                if not ctx.self.visible or ctx.self.shopBusy or ctx.self.shopOpen
                    or ctx.options.inputCovered and ctx.options.inputCovered() then held=nil end
            end)
            hit:AddCursorEventListener(cursor.CursorUp,function(event)
                if held and held.touch==(event and event.touchId) then released,held=held,nil end
            end)
            local function cancel(event)
                local touch=event and event.touchId
                if held and held.touch==touch then held=nil end
                if released and released.touch==touch then released=nil end
            end
            for _,name in ipairs({'CursorExit','CursorEndDrag','CursorDrag'})do
                if cursor[name] then hit:AddCursorEventListener(cursor[name],cancel) end
            end
        end
        hit:AddCursorEventListener(ctx.clickEvent,function(event)
            if observed then
                if not valid(released) then return false end
                local touch=event and event.touchId
                if touch~=nil and touch~=released.touch then return false end
                released=nil
            end
            return ctx.openShop(observed)
        end)
    end

    local panel, back, room = ctx.child('shopView'), ctx.child('back'), ctx.child('shopRoom')
    local shade, goods = ctx.root:GetChild('shopShade'), panel:GetChild('goods')
    local layout = Theme.layout.nativeNode
    local shelfBack = { math.min(layout.back[1], -510), layout.back[2] }
    local buttonTravel = 400 * Motion.scale
    local elapsed, rug, button, alpha, closing = nil, 0, 0, 0, false
    local shadeByte, goodsOffset, shadeWidth, shadeHeight
    local cards
    local function inShop()
        local node = ctx.self.run and ctx.self.run.nodeFlow
        return node and node.type == 'shop' and not node.complete and ctx.self.run.phase == 'node'
    end
    function ctx.shopControl(name)
        return panel:GetChild(name) or goods and goods:GetChild(name)
    end
    function ctx.shopGoodsVisible()
        return ctx.self.shopOpen and elapsed ~= 0 and ctx.self.mode == 'main'
    end
    local function height()
        local w, h = ctx.self.canvasWidth or 1280, ctx.self.canvasHeight or 720
        return h / math.min(w / 1280, h / 720)
    end
    local function visible(control, value)
        if control and control.visible ~= value then control:SetVisible(value) end
    end
    local function setProductsVisible(value)
        for _, pair in ipairs(cards or {}) do
            visible(pair.card, value and ctx.self.view.node.cards[pair.slot] ~= nil)
            visible(pair.price, pair.card.visible)
        end
        visible(goods, value)
    end
    local function paintShade()
        if not shade then return end
        local byte = Motion.alphaByte(alpha)
        visible(shade, byte > 0 and not ctx.self.pendingOwner)
        if shadeByte == byte then return end
        shadeByte = byte
        if byte > 0 and ctx.options.color then shade.imageColor = ctx.options.color(0, 0, 0, byte) end
    end
    local function paintBack()
        local position = ctx.shopBackPosition()
        back:SetAnchoredPosition(position[1], position[2])
        back:GetChild('label').text = ctx.self.shopOpen and '关闭' or '离开'
    end
    local function setEntryEnabled(value)
        ctx.action('merchant/talk', value, ctx.openShop)
    end
    local function setBackEnabled(value)
        local entry = ctx.self.actions.back
        if entry then ctx.action('back', value, entry.handler) end
    end
    function ctx.syncShop()
        local node = ctx.self.run and ctx.self.run.nodeFlow
        if ctx.shopId ~= (node and node.id) or ctx.shopRun ~= ctx.self.run or ctx.shopMap ~= ctx.self.map then
            ctx.cancelShop(true)
            ctx.shopId, ctx.shopRun, ctx.shopMap = node and node.id, ctx.self.run, ctx.self.map
        end
    end
    local function fitShade()
        if not shade then return end
        local w, h = ctx.self.canvasWidth or 1280, ctx.self.canvasHeight or 720
        if shadeWidth == w and shadeHeight == h then return end
        shadeWidth, shadeHeight = w, h
        local scale = math.min(w / 1280, h / 720)
        shade:SetSizeDelta(w / scale, h / scale)
    end
    local function resetShelfPosition()
        if rug ~= 0 then panel:SetAnchoredPosition(0, 0) end
        if goods and goodsOffset and goodsOffset ~= 0 then goods:SetAnchoredPosition(0, 0) end
        elapsed, rug, button, closing, goodsOffset = nil, 0, 0, false, 0
    end
    function ctx.cancelShop(reset)
        ctx.shopEpoch = (ctx.shopEpoch or 0) + 1
        held, released, ctx.shopPointerOpened = nil, nil, nil
        local retiring = closing
        resetShelfPosition()
        if reset then ctx.self.shopOpen = false;ctx.invalidateShopVisuals() end
        alpha = ctx.self.shopOpen and .85 or 0
        fitShade()
        paintShade()
        if retiring and not reset then paintBack();setBackEnabled(true) end
    end
    function ctx.suspendShop()
        ctx.invalidateShopVisuals()
        visible(shade, false)
    end
    function ctx.shopBackRetiring() return closing end
    function ctx.openShop(pointer)
        if not ctx.current() or not inShop() or ctx.self.mode ~= 'main' or ctx.self.shopOpen then return false end
        if not ctx.shopQuoteCurrent() then
            ctx.self:render()
            if not ctx.current() or not ctx.shopQuoteCurrent() then return false end
        end
        ctx.resetButtons()
        ctx.self.shopOpen, elapsed, rug, closing = true, 0, height(), false
        ctx.shopPointerOpened = pointer == true
        setEntryEnabled(false)
        setBackEnabled(true)
        -- Cursor commands run outside the update pass. The original overlay
        -- advances on the activation frame, before ShopScreen's first update.
        button = Motion.approach(-buttonTravel, 0, 9, Motion.scale, Motion.step)
        alpha = math.min(.85, alpha + 2 * Motion.step)
        panel:SetAnchoredPosition(0, rug)
        setProductsVisible(false)
        paintBack()
        ctx.paintShop()
        if ctx.options.sound then pcall(ctx.options.sound, 'shop_open') end
        return true
    end
    function ctx.closeShop()
        if not ctx.self.shopOpen then
            if closing then return false, 'shop_cancel_retiring' end
            return ctx.commit('leaveShop', nil, function() return '' end)
        end
        ctx.shopSelection:clear()
        ctx.resetButtons()
        ctx.shopEpoch = ctx.shopEpoch + 1
        held, released, ctx.shopPointerOpened = nil, nil, nil
        ctx.self.shopOpen, elapsed, closing = false, nil, true
        button = Motion.approach(button, -buttonTravel, 9, Motion.scale, Motion.step)
        alpha = math.max(0, alpha - 2 * Motion.step)
        local position = ctx.shopBackPosition()
        back:SetAnchoredPosition(position[1], position[2])
        setEntryEnabled(true)
        setBackEnabled(false)
        ctx.paintShop()
        return true
    end

    function ctx.showShopRoom(show, clickable)
        visible(room, show)
        visible(talk, clickable)
    end

    function ctx.paintShop()
        local active = inShop() == true
        local main = active and ctx.self.mode == 'main'
        if not main then ctx.invalidateShopVisuals() end
        local farewell = ctx.self:holding() and ctx.self.result.view == 'farewell'
        ctx.showShopRoom(active or farewell, main and not ctx.self.shopOpen)
        visible(panel, main and ctx.self.shopOpen == true)
        if ctx.self.shopOpen then setProductsVisible(elapsed ~= 0) end
        paintShade()
    end

    local function sample(time)
        return Motion.approach(height(), 0, 5, .5 * Motion.scale, time)
    end
    local function advanceRug(dt)
        if not elapsed then return end
        local first = elapsed == 0
        elapsed = elapsed + dt
        local nextRug, previous = sample(elapsed), sample(math.max(0, elapsed - Motion.step))
        if first then setProductsVisible(true) end
        if nextRug ~= rug then panel:SetAnchoredPosition(0, nextRug) end
        local offset = previous - nextRug
        if goods and offset ~= goodsOffset then
            goodsOffset = offset
            goods:SetAnchoredPosition(0, offset)
        end
        rug = nextRug
        if previous == 0 then elapsed = nil end
    end
    local function advanceButton(dt)
        local target = ctx.self.shopOpen and 0 or -buttonTravel
        if ctx.self.shopOpen or closing then
            local nextButton = Motion.approach(button, target, 9, Motion.scale, dt)
            if button ~= nextButton then
                button = nextButton
                if ctx.self.mode == 'main' and not ctx.shopSelection.selected then
                    local position = ctx.shopBackPosition()
                    back:SetAnchoredPosition(position[1], position[2])
                end
            end
            if closing and button == target then closing = false;paintBack();setBackEnabled(true) end
        end
    end
    function ctx.updateShop(dt)
        if not ctx.self.visible or ctx.self.pendingOwner or not inShop()
            or ctx.shopRun ~= ctx.self.run or ctx.shopMap ~= ctx.self.map or ctx.shopId ~= ctx.self.run.nodeFlow.id then return end
        if dt <= 0 then return end
        advanceRug(dt)
        advanceButton(dt)
        local nextAlpha = ctx.self.shopOpen and math.min(.85, alpha + dt * 2) or math.max(0, alpha - dt * 2)
        if nextAlpha ~= alpha then alpha = nextAlpha;paintShade() end
    end

    ctx.self.merchant = ctx.merchant

    ctx.shopSelection = ShopSelection.new(ctx.self, ctx.child('shopView'), ctx.options)
    ctx.renderShop, ctx.shopQuoteCurrent, ctx.invalidateShopVisuals = ShopUI.new(ctx.self, {
        selection = ctx.shopSelection,
        child = ctx.child, product = ctx.shopControl, reuseCard = ctx.reuseShopFace, show = ctx.show, state = ctx.state, ink = ctx.ink, picture = ctx.picture,relicPicture=ctx.relicPicture,
        fillCard = ctx.fillCard, cardName = ctx.cardName, relicName = ctx.relicName, relicText = ctx.relicText,
        action = ctx.action, pageArrows = ctx.pageArrows,
        commit = function(...) return ctx.commit(...) end,
    })
    cards = {}
    for i = 1, #layout.shop.columns do
        cards[i] = {slot = i, card = panel:GetChild('card'..i), price = panel:GetChild('price'..i)}
    end
    function ctx.shopFooter()
        setEntryEnabled(not ctx.self.shopOpen)
        if ctx.shopSelection.selected then return ctx.shopSelection:footer() end
        return ctx.self.shopOpen and '关闭' or '离开',nil,false,nil,nil,nil
    end
    function ctx.shopBackPosition()
        if (ctx.self.shopOpen or closing) and ctx.self.mode=='main' and inShop() then
            return {shelfBack[1] + button, shelfBack[2]}
        end
        return layout.back
    end
end
return M
