local NativeContract = dofile('tests/lua/support/native_ui_contract.lua')
package.path = "src/lua/?.lua;build/lua/?.lua;" .. package.path
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local UI = require("abyss_battle_ui")
local Combat = require("abyss_combat")
local Run = require("abyss_run")
local Data = require("abyss_data")
local Theme = require("abyss_theme")
local Presentation = require("abyss_presentation")

local Layout = require("abyss_ui_layout")
-- Separate file keeps the existing battle UI suite inside its unchanged timeout.
-- This is the actual generated full native tree, not a permissive UI mock.
local function control(definition)
    local c = { name = definition.name, visible = definition.visible ~= false, children = {}, text = "",
        sizeDeltaX = definition.size[1], sizeDeltaY = definition.size[2], interactable = true,
        x = definition.position and definition.position[1] or 0, y = definition.position and definition.position[2] or 0 }
    for _, entry in ipairs(definition.children or {}) do c.children[entry.name] = control(entry) end
    function c:GetChild(key) return assert(self.children[key], "unknown control " .. self.name .. "/" .. key) end
    function c:SetVisible(value) assert(type(value) == "boolean") self.visible = value end
    function c:AddCursorEventListener(event, fn) NativeContract.listener(event,fn);
        self.listeners = self.listeners or {}
        self.listeners[event] = fn
        if event == "click" then self.click = fn end
    end
    function c:SetAnchoredPosition(x, y) self.x, self.y = x, y end
    function c:SetSizeDelta(x, y) NativeContract.sizeDelta(x,y); self.sizeDeltaX, self.sizeDeltaY = x, y end
    function c:SetLocalScale(x, y) self.localScaleX, self.localScaleY = x, y end
    function c:SetImage(...)
        assert(select("#", ...) == 2, "SetImage expects exactly source and id")
        local source, id = ...
        assert(source == "static" and type(id) == "number") self.imageId = id
    end
    function c:SetAsLastSibling() self.raised = true end
    return c
end
local function setup()
    local root = control({name="root",size={1280,720},children=Layout})
    local stage = root:GetChild("stage"):GetChild("battlePanel")
    local ui = UI.new(stage,Data,Presentation,"click",F.withMonsterActors({
        imageSource="static",color=function(r,g,b,a) return {r=r,g=g,b=b,a=a} end
    }),{embedded=true})
    ui.run = Run.new(Data,1)
    assert(Run.startCombat(ui.run,"raven_adept_solo"))
    ui:render()
    local function click(name)
        local box = F.actorControl(stage,name)
        if box.click then if box.interactable then box.click() end else box:GetChild("hit").click() end
        if ui.feedback and ui.feedback.busy then
            for _=1,400 do if not ui.busy then break end ui:update(0.05) end
            assert(not ui.busy,"presentation must release input")
        end
    end
    return ui,stage,click
end
-- Read a unit's statuses the way a player does: open its detail panel, then close it.
local readPowers=dofile('tests/lua/support/power_tip_fixture.lua')
local inspect=dofile('tests/lua/support/status_detail_fixture.lua')
local function details(ui,stage, box)
    box:GetChild('hit').click()
    local _, rows=readPowers(stage)
    local titles={}
    for _,row in ipairs(rows)do
        local title=assert(row:match('^<color=#[%x]+>(.-)</color>'),'compact section title')
        titles[#titles+1]=title
    end
    inspect(ui,stage)
    return table.concat(titles,' | ')
end
local count = 0
local function test(name,fn) fn(); count=count+1; print("ok Raven Adept UI "..count.." - "..name) end

test("Raven Adept displays Ritual opener, persistent status and next modified attack", function()
    local ui, stage, click = setup()
    local box = F.actorControl(stage,'enemy1')
    assert(box.children.intent.text == "")
    assert(box.children.intentIcon.imageId == Theme.icon.intent.buff)
    click("enemy1")
    assert(inspect(ui,stage):find("这名敌人将要进行强化。",1,true))
    assert(not ui.run.combat.enemies[1].statuses.ritual,'forecast does not apply Ritual')
    click("endTurn")
    assert(ui.run.combat.enemies[1].statuses.ritual==3,'turn actually grants three Ritual')
    local text = details(ui,stage, box)
    assert(text:find("仪式 3",1,true))
    assert(not text:find("力量",1,true))
    assert(box.children.intent.text == "6")
    click("endTurn")
    text = details(ui,stage, box)
    assert(text:find("仪式 3",1,true))
    assert(text:find("力量",1,true))
    assert(box.children.intent.text == "9")
end)
print("LUA_CULTIST_UI_PASS " .. count)
