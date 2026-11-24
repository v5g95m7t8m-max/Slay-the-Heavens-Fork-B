local advanceShop = dofile('tests/lua/support/shop_timeline.lua')
local NativeContract = dofile('tests/lua/support/native_ui_contract.lua')
local GameUI = require("abyss_game_ui")
local Combat = require("abyss_combat")
local Nodes = require("abyss_nodes")
local Data = require("abyss_data")
local Presentation = require("abyss_presentation")
local Layout = require("abyss_ui_layout")
local NativeTemplates = require("abyss_ui_templates")
local hasBrowserBinding,browserBinding=pcall(require,"abyss_deck_browser_binding")
local BrowserParts = hasBrowserBinding and type(browserBinding)=='table' and browserBinding.parts or {}
local Templates = {}
for name,spec in pairs(NativeTemplates)do Templates[name]=spec end
if #BrowserParts>0 then
    local card=Combat.copy(NativeTemplates.AbyssBattlePileCard)
    for _,part in ipairs(BrowserParts)do
        local mount=card
        for _,segment in ipairs(part.path)do
            for _,child in ipairs(mount.children)do if child.name==segment then mount=child;break end end
        end
        mount.children=NativeTemplates[part.name].children
    end
    Templates.AbyssBattlePileCard=card
end
local Viewport = require("abyss_viewport")
local Theme = require("abyss_theme")
local Surfaces = require("abyss_monster_surfaces")
local function preview(name, text)
    print("LORE_PREVIEW\t" .. name .. "\t" .. text:gsub("\n", "\\n"))
end
-- These methods capture no node state. Keep them as own fields so overrides
-- and pairs/rawget see the same control shape without per-node closures.
local Control = {}
-- The engine owns activation. Expose only the documented read-only hierarchy
-- result on controls; tests change private engine state, not native properties.
local engineActive = setmetatable({}, { __mode = 'k' })
local engineAlive = setmetatable({}, { __mode = 'k' })
local function destroyControl(control)
    engineAlive[control]=false
    for _,child in pairs(control.children or {}) do destroyControl(child) end
    for _,item in pairs(control.items or {}) do destroyControl(item) end
end
local function activeInHierarchy(control)
    while control do
        if engineActive[control] == false then return false end
        control = control.parent
    end
    return true
end
local function setEngineActive(control,value)
    assert(type(value)=='boolean'); engineActive[control]=value
end
local function nativeField(control,key)
    assert(key~='interactable' or rawget(control,'kind')~='cursorArea',
        'Native CursorArea has no interactable field; use raycastTarget')
end
local controlMethods = {
    __index = function(control,key)
        nativeField(control,key)
        if key=='alive' then return engineAlive[control]~=false end
        if key=='activeInHierarchy' then return activeInHierarchy(control) end
        return Control[key]
    end,
    __newindex = function(control,key,value)
        nativeField(control,key)
        assert(key~='alive','Native alive is read-only')
        assert(key~='activeInHierarchy','Native activeInHierarchy is read-only')
        rawset(control,key,value)
    end,
}
function Control:GetChild(name)
    if engineAlive[self]==false then error('GetChild on invalid object')end
    return self.children[name]
end
function Control:SetVisible(value) assert(type(value) == "boolean"); self.visible = value end
function Control:SetSizeDelta(width, height) NativeContract.sizeDelta(width,height); self.size = {width, height}; self.sizeDeltaX, self.sizeDeltaY = width, height end
function Control:SetLocalScale(x, y, z) self.scale = {x, y, z}; self.localScaleX, self.localScaleY = x, y end
function Control:SetAnchoredPosition(x, y)
    self.x, self.y, self.anchoredPositionX, self.anchoredPositionY = x, y, x, y
end
function Control:SetImage(...)
    assert(select("#", ...) == 2, "SetImage expects exactly source and id")
    local source, id = ...
    assert(source == "static" and type(id) == "number"); self.imageId = id
end
function Control:SetAnchorMin(x,y)self.anchorMin={x,y}end
function Control:SetAnchorMax(x,y)self.anchorMax={x,y}end
function Control:SetPivot(x,y)self.pivot={x,y}end
function Control:SetLocalRotation(x,y,z)NativeContract.transform3(x,y,z);self.rotation={x,y,z}end
function Control:SetAsLastSibling() self.raised = true end
function Control:AddCursorEventListener(event, fn) NativeContract.listener(event,fn);
    assert(self.kind~='container','Native containers do not support AddCursorEventListener; use a cursorArea')
    self.listeners = self.listeners or {}
    assert(not self.listeners[event], "duplicate cursor listener: " .. tostring(event))
    self.listeners[event] = fn
    if event == "click" then self.click = fn end
end
function Control:AddKeyEventListener(event, fn) NativeContract.listener(event,fn);
    self.keyListeners = self.keyListeners or {}
    assert(not self.keyListeners[event], 'duplicate key listener')
    self.keyListeners[event] = fn
end
function Control:AddNavigationEventListener(event,fn) NativeContract.listener(event,fn);
    self.navigationListeners=self.navigationListeners or {}
    assert(not self.navigationListeners[event],'duplicate navigation listener')
    self.navigationListeners[event]=fn
end
function Control:RemoveNavigationEventListener(event,fn)
    if not self.navigationListeners or self.navigationListeners[event]~=fn then return false end
    self.navigationListeners[event]=nil
    return true
end
function Control:SetControllerNavigation(direction,mode,target)
    self.navigation=self.navigation or {};self.navigation[direction]={mode=mode,target=target}
end
function Control:GetChildren()
    if engineAlive[self]==false then error('GetChildren on invalid object')end
    local children={};for _,child in pairs(self.children)do children[#children+1]=child end;return children
end

local function control(spec, parent)
    local self = { name = spec.name, kind=spec.kind, children = {}, visible = spec.visible ~= false,
        text = spec.text and spec.text.content or "", parent = parent, raycastTarget = true,
        sizeDeltaX = spec.size and spec.size[1], sizeDeltaY = spec.size and spec.size[2],
        anchoredPositionX = (spec.position or {})[1] or 0, anchoredPositionY = (spec.position or {})[2] or 0 }
    if spec.kind~='cursorArea' then self.interactable=true end
    self.GetChild = Control.GetChild
    self.AddKeyEventListener = Control.AddKeyEventListener
    self.SetVisible = Control.SetVisible
    self.SetSizeDelta = Control.SetSizeDelta
    self.SetLocalScale = Control.SetLocalScale
    self.SetAnchoredPosition = Control.SetAnchoredPosition
    self.SetImage = Control.SetImage
    self.SetAsLastSibling = Control.SetAsLastSibling
    self.AddCursorEventListener = Control.AddCursorEventListener
    if spec.kind == "grid" then
        self.items, self.indexBase = {}, 0
        -- ClientUIGridScrollerControl geometry getters return the imported
        -- native configuration; fixed layout constraints remain engine-owned.
        function self:GetItemSize()return table.unpack(spec.grid.itemSize)end
        function self:GetItemSpacing()return table.unpack(spec.grid.spacing)end
        function self:GetPadding()return table.unpack(spec.grid.padding)end
        function self:recycle(slot, index)
            -- Optional destruction models native viewport churn; the default
            -- retains real reuse for existing identity-specific scenarios.
            if self.destroyOnRecycle and self.items[slot] then
                destroyControl(self.items[slot]);self.items[slot]=nil
            end
            if not self.items[slot] then self.items[slot] = control(assert(Templates[spec.itemTemplate]), self) end
            self.refreshCallback(self.items[slot], index)
            return self.items[slot]
        end
        function self:flush()
            for i = 0, math.min(self.itemCount, 12) - 1 do self:recycle(i, i + self.indexBase) end
        end
        function self:RefreshItems(amount, fn)
            if engineAlive[self]==false then error('RefreshItems on invalid object')end
            if self.destroyOnRefresh then
                for _,item in pairs(self.items) do destroyControl(item) end
                self.items={}
            end
            self.itemCount, self.refreshCallback = amount, fn
            if not self.deferRefresh then self:flush() end
        end
    end
    for _, child in ipairs(spec.children or {}) do self.children[child.name] = control(child, self) end
    -- Install native write guards after inert construction: all own methods and
    -- children exist before any consumer can observe the control. This avoids
    -- running __newindex for each initial method on every full scene node.
    setmetatable(self, controlMethods)
    return NativeContract.control(self,spec)
end
-- Test engine implements the actual full actor template clone API, not a static five-slot fallback.
local function monsterActors()
    local serial=0
    return {enabled=true,templateIndex=1,containerTemplateIndex=2,powerTemplateIndex=3,
      instantiate=function(index,parent)
        local spec=index==1 and assert(Templates.AbyssMonsterActor) or index==3 and assert(Templates.AbyssMonsterPower) or {name='actorPage',kind='container',size={1280,720}}
        assert(index==1 or index==2 or index==3,'unknown monster template index')
        local box=control(spec,parent);serial=serial+1
        parent.children['nativeActor'..serial]=box
        return box
      end,destroy=function(box)
        if box.parent then for key,child in pairs(box.parent.children)do if child==box then box.parent.children[key]=nil end end end
        destroyControl(box)
      end}
end
-- Explicit native platform fixture: production GameUI remains unmodified.
local function deckBrowser()
    local serial=0
    return {
        parts=BrowserParts,
        create=function(parent,part)
            local box=control(assert(NativeTemplates[part and part.name or 'AbyssBattlePileCard']),parent)
            serial=serial+1
            parent.children['nativeBrowserCard'..serial]=box
            return box
        end,
        destroy=function(box)
            for key,child in pairs(box.parent.children)do
                if child==box then box.parent.children[key]=nil;break end
            end
            destroyControl(box)
        end,
    }
end
-- Replay cases that exercise the predecessor's native Grid callbacks opt in.
local function legacyPileGrid(panel)
    local old=panel:GetChild('pileGrid')
    if old.kind=='grid' then return old end
    local grid=control({name='pileGrid',kind='grid',size={old.sizeDeltaX,old.sizeDeltaY},
        itemTemplate=Templates.AbyssBattlePileCard and 'AbyssBattlePileCard' or 'AbyssDeckCard',
        grid={columns=5,itemSize={150,210},spacing={27,27},padding={18,45,30,30}}},panel)
    panel.children.pileGrid=grid
    return grid
end
local function withMonsterActors(platform)
    if platform.nativeMonsterArtEnabled==nil then platform.nativeMonsterArtEnabled=require('abyss_art_features').flags.monsters end
    platform.monsterActors=platform.monsterActors or monsterActors()
    platform.imageTypes=platform.imageTypes or {basic=1,stretch=2}
    return platform
end
local function newGameUI(root,data,presentation,event,platform)
    return GameUI.new(root,data,presentation,event,withMonsterActors(platform))
end
-- Rule and gesture suites start on the map directly; prologue suites pass prologue = true.
local function fixture(data, settle, music, cursorEvents, prologue, sound, pointer, controllerApi, browserFactory)
    local canvas = control({ children = Layout })
    local root = Viewport.apply(canvas, 1280, 720)
    if not browserFactory then legacyPileGrid(root:GetChild('deckPanel')) end
    local ui = GameUI.new(root, data or Data, Presentation, "click",
        { seed = 1, nativeMonsterArtEnabled=require('abyss_art_features').flags.monsters, monsterActors=monsterActors(), imageTypes={basic=1,stretch=2}, imageSource = "static", color = function(r,g,b,a) return { r=r,g=g,b=b,a=a } end, settle = settle, music = music, cursorEvents = cursorEvents,
          prologue = prologue == true, sound = sound, cursorPosition = pointer and pointer.position,
          touchScreen = pointer and pointer.touchScreen, keyEvents = pointer and pointer.keyEvents, controllerApi=controllerApi, deckBrowser=browserFactory })
    root.ui = ui
    return ui, root
end
local function statValue(root, key)
    return root:GetChild("menuPanel"):GetChild("result"):GetChild("stat_" .. key):GetChild("value").text
end
local function resultText(root, name) return root:GetChild("menuPanel"):GetChild("result"):GetChild(name).text end
local function mapControl(panel, name)
    for _, group in pairs(panel.children) do
        if group.children[name] then return group.children[name] end
    end
    error("missing grouped map control " .. name)
end
local function actorControl(panel,name)
    local slot=name:match("^enemy(%d+)$")
    if slot then return assert(Surfaces.get(panel):control(tonumber(slot)),"missing dynamic actor "..slot)end
    return panel:GetChild(name)
end
local function click(root, panel, button)
    -- Higher-level shop actions include the deliberate merchant entry gesture.
    -- Raw listener suites separately verify the closed scene and transition lock.
    if panel=='nodePanel' and button:match('^shopView/') and root.ui and not root.ui.nodeUI.shopOpen then
        assert(root:GetChild(panel):GetChild('merchant'):GetChild('talk'):GetChild('hit').click())
        advanceShop(root.ui)
    end
    local box = panel == "mapPanel" and mapControl(root:GetChild(panel), button) or root:GetChild(panel)
    if panel=='nodePanel' and not box:GetChild('shopView'):GetChild('goods') then
        button=button:gsub('^shopView/goods/','shopView/')
    elseif panel=='nodePanel' then
        button=button:gsub('^shopView/(%a+)',function(name)
            return (name:match('^relic') or name:match('^potion') or name:match('^removal'))
                and 'shopView/goods/'..name or 'shopView/'..name
        end)
    end
    if panel ~= "mapPanel" then for part in button:gmatch("[^/]+") do box = assert(actorControl(box,part), button) end end
    local target = box.click and box or box:GetChild("hit")
    local parent = target
    while parent do assert(parent.visible, "click on hidden control " .. button); parent = parent.parent end
    if target.raycastTarget~=false and (target.kind~='presetButton' or target.interactable) then
        local result = target.click()
        -- High-level clicks wait for presentation, including the defeat-page reveal.
        -- Frame/gesture suites call listeners directly to assert the locked interval.
        for _ = 1, 400 do
            if not root.ui or not root.ui.battleUI.busy and not root.ui.motion.deathReveal then break end
            root.ui:update(0.05)
        end
        assert(not root.ui or not root.ui.battleUI.busy and not root.ui.motion.deathReveal)
        return result
    end
end
local function win(ui, root)
    for _ = 1, 60 do
        if ui.run.phase ~= "combat" then break end
        local battle = ui.run.combat
        for _ = 1, 10 do
            if ui.run.phase ~= "combat" then break end
            local slot
            for i, instance in ipairs(battle.hand) do
                if Combat.canPlay(battle, instance.uid, ui.battleUI.target) then slot = i break end
            end
            if not slot then break end
            click(root, "battlePanel", "card" .. slot)
            local instance = ui.run.phase == "combat" and battle.hand[slot]
            if instance and ui.battleUI.selected == instance.uid then
                local _, reason = Combat.canPlay(battle, instance.uid, nil)
                local button = "playArea"
                if reason == "invalid_target" then
                    local target=battle.enemies[ui.battleUI.target]
                    local _,screenSlot=Surfaces.get(root:GetChild('battlePanel')):find(target.id)
                    assert(screenSlot, "live target has no displayed enemy slot")
                    button = "enemy" .. screenSlot
                end
                click(root, "battlePanel", button)
            end
        end
        if ui.run.phase == "combat" then click(root, "battlePanel", "endTurn") end
    end
    assert(ui.run.phase == "reward")
end

-- Rule/room suites explicitly complete the production selection commands.
-- Entry-flow regressions use raw GameUI.start/select/confirm and native gestures.
local function confirmStart(ui,id)
    id=id or 'ironclad'
    local elements={ironclad=true,silent=true,defect=true,watcher=true}
    assert(ui:selectCharacter((elements[id] or id=='traveler') and 'traveler' or id))
    if elements[id] then assert(ui:selectElement(id))end
    -- Rule fixtures advance the real readiness scheduler before confirmation.
    -- Native Fade entry tests drive OnUpdate explicitly and retain timed phases.
    if ui.pageReveal and not ui.pageReveal:usesFade()then
        local intent=require('abyss_page_reveal').intent(ui)
        for _=1,2 do if ui.pageReveal:step(intent)then ui:refresh()end end
    end
    return ui:confirmCharacter()
end
local function startRun(ui,id)
    local ok,reason=ui:start()
    if not ok then return ok,reason end
    return confirmStart(ui,id)
end
local function startButton(root)
    local ok=click(root,'menuPanel','start')
    if not ok then return ok end
    return confirmStart(root.ui)
end

return {
    GameUI = {new=newGameUI},
    withMonsterActors = withMonsterActors,
    Combat = Combat,
    Nodes = Nodes,
    Data = Data,
    Presentation = Presentation,
    Layout = Layout,
    Templates = Templates,
    Viewport = Viewport,
    Theme = Theme,
    preview = preview,
    control = control,
    monsterActors = monsterActors,
    deckBrowser = deckBrowser,
    legacyPileGrid = legacyPileGrid,
    setEngineActive = setEngineActive,
    fixture = fixture,
    statValue = statValue,
    resultText = resultText,
    mapControl = mapControl,
    click = click,
    actorControl = actorControl,
    win = win,
    start = startRun,
    confirmStart = confirmStart,
    startButton = startButton,
}
