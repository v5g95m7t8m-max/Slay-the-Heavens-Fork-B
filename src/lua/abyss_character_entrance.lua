local Motion = require('abyss_entrance_motion')
local Select = require('abyss_character_select')
local portraitTint = require('abyss_theme').color.buttonPressedText
local M = {}
local buttonTravel, infoStart = 400 * Motion.scale, -1000 * Motion.scale
local order = {}
for i, key in ipairs(Select.characters) do order[key] = i end
for i, key in ipairs(Select.elements) do order[key] = #Select.characters + i end

function M.new(panel, platform, paintInfo)
    local details = panel:GetChild('details')
    local layers = details:GetChild('infoMotion')
    if not layers then return end
    local cancel, confirm = panel:GetChild('cancel'), panel:GetChild('confirm')
    local cancelX, cancelY = cancel.anchoredPositionX or cancel.x, cancel.anchoredPositionY or cancel.y
    local confirmX, confirmY = confirm.anchoredPositionX or confirm.x, confirm.anchoredPositionY or confirm.y
    local background = panel:GetChild('v25Background')
    local artwork = panel:GetChild('lumineSelectionBackground')
    local landscape = background and background:GetChild('landscape')
    local shade = background and background:GetChild('selectionShade')
    local rows, byKey, bytes = {}, {}, {}
    for i = 1, #layers:GetChildren() do
        rows[i] = {control = layers:GetChild('info'..i), x = infoStart}
    end
    local selected, showing, paused, cancelOffset, confirmOffset, alpha, darken, nativeSelected, portrait

    local function show(control, visible)
        if control and control.visible ~= visible then control:SetVisible(visible) end
    end
    local function colour(control, r, g, b, opacity)
        if not control or not platform.color then return end
        local a = Motion.alphaByte(opacity)
        if bytes[control] ~= a then
            bytes[control] = a
            control.imageColor = platform.color(r, g, b, a)
        end
        return a
    end
    local function paintBackground()
        show(artwork, nativeSelected == true)
        local a = nativeSelected and alpha or 0
        local b = (1 - a) * darken
        local l = b < 1 and (1 - a) * (1 - darken) / (1 - b) or 0
        show(landscape, (colour(landscape, 255, 255, 255, l) or 255) > 0)
        show(shade, (colour(shade, 0, 0, 0, b) or 0) > 0)
        colour(portrait, portraitTint.r, portraitTint.g, portraitTint.b, alpha)
    end
    local function restoreBackground()
        colour(landscape, 255, 255, 255, 1)
        colour(shade, 0, 0, 0, 0)
        colour(portrait, portraitTint.r, portraitTint.g, portraitTint.b, 1)
        show(landscape, true)
        show(shade, false)
        show(artwork, false)
    end
    local function position(row, target, dt)
        local x = Motion.approach(row.x, target, 9, Motion.scale, dt)
        if x ~= row.x then row.x = x;row.control:SetAnchoredPosition(x, 0) end
    end
    local function moveRows(dt, deferred)
        for _, row in ipairs(rows) do
            if row.key then
                local target = (row == selected or row == deferred) and 0 or infoStart
                position(row, target, dt)
                if target == infoStart and row.x == infoStart then
                    byKey[row.key], row.key = nil, nil
                    row.control:SetVisible(false)
                end
            end
        end
    end
    local function advanceSelection(dt, changedLayer)
        local nextConfirm = Motion.approach(confirmOffset, 0, 9, Motion.scale, dt)
        if nextConfirm ~= confirmOffset then
            confirmOffset = nextConfirm
            confirm:SetAnchoredPosition(confirmX + confirmOffset, confirmY)
        end
        local a = Motion.approach(alpha, 1, 12, .01, dt)
        local d = Motion.approach(darken, 1, 8, .003, dt)
        if changedLayer or a ~= alpha or d ~= darken then alpha, darken = a, d;paintBackground() end
    end

    local motion = {}
    function motion.show(_, info, native, fallbackPortrait)
        if not showing then
            showing, paused = true, false
            cancelOffset, confirmOffset, alpha, darken = -buttonTravel, buttonTravel, 0, .8
            cancel:SetAnchoredPosition(cancelX + cancelOffset, cancelY)
            confirm:SetAnchoredPosition(confirmX + confirmOffset, confirmY)
            cancel:SetVisible(true)
            paintBackground()
        end
        if not info or selected and selected.key == info.id then return end
        local row = byKey[info.id]
        if not row then
            for _, available in ipairs(rows) do if not available.key then row = available;break end end
            assert(row, 'no free character detail panel')
            row.key, byKey[info.id] = info.id, row
            paintInfo(row.control, info)
            row.control:SetAnchoredPosition(row.x, 0)
            row.control:SetVisible(true)
        end
        row.control:SetAsLastSibling()
        local old = selected
        selected, nativeSelected, portrait = row, native, not native and fallbackPortrait or nil
        -- The selected option, confirmation and alphas advance on the original
        -- selection update. A lower old index has already run that step.
        moveRows(Motion.step, old and order[old.key] < order[row.key] and old or nil)
        advanceSelection(Motion.step, true)
        confirm:SetVisible(true)
    end

    function motion.update(_, dt)
        if not showing or paused or dt <= 0 then return end
        local x = Motion.approach(cancelOffset, 0, 9, Motion.scale, dt)
        if x ~= cancelOffset then cancelOffset = x;cancel:SetAnchoredPosition(cancelX + x, cancelY) end
        if not selected then return end
        moveRows(dt)
        advanceSelection(dt)
    end

    function motion.pause(_, value)
        if not showing or paused == value then return end
        paused = value
        if value then restoreBackground() else paintBackground() end
    end

    function motion.hide(_)
        if not showing then return end
        selected, showing, paused, nativeSelected, byKey = nil, false, false, false, {}
        for _, row in ipairs(rows) do
            row.key, row.x = nil, infoStart
            row.control:SetVisible(false)
        end
        cancel:SetVisible(false)
        confirm:SetVisible(false)
        restoreBackground()
        portrait = nil
    end
    return motion
end

return M
