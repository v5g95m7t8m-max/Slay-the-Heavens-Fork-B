local testStart=dofile('tests/lua/support/game_ui_fixture.lua').start
local F = dofile("tests/lua/support/game_ui_fixture.lua")
local Run = require("abyss_run")
local count = 0
local function test(name, fn) fn(); count = count + 1; print("ok BGM host " .. count .. " - " .. name) end
test("host emits scene changes once, deck refresh never restarts music and settlement pauses", function()
    local sent = {}
    local ui = F.fixture(nil, function() return true end, function(signal) sent[#sent + 1] = signal end)
    assert(sent[1] == "ABYSS_BGM_STOP")
    assert(testStart(ui) and sent[2] == "ABYSS_BGM_MAP")
    assert(ui:openDeck() and ui:closeDeck() and #sent == 2)
    assert(Run.startCombat(ui.run, "louse_pair"))
    ui.run.nodeFlow = { type = "elite" }
    ui:refresh(); ui:refresh()
    assert(sent[3] == "ABYSS_BGM_ELITE" and #sent == 3)
    ui.run.phase, ui.battleUI.busy = "defeat", true
    ui:refresh()
    assert(#sent == 3, "terminal core state must wait for visible feedback")
    ui.battleUI.busy = false
    ui:refresh()
    assert(sent[4] == "ABYSS_BGM_DEFEAT")
    assert(ui:settle() and sent[5] == "ABYSS_BGM_STOP")
    ui:refresh(); assert(#sent == 5)
end)
test("audio failure cannot prevent starting/restarting a run or mutate RNG", function()
    local baseline = F.fixture()
    local attempts = 0
    local ui = F.fixture(nil, nil, function() attempts = attempts + 1; error("audio unavailable") end)
    assert(testStart(ui) and testStart(baseline))
    local seed = ui.run.seed
    for i = 1, 10 do ui:refresh() end
    assert(ui.run.seed == seed and ui.run.seed == baseline.run.seed and attempts == 2)
    ui.run.phase = "defeat"; ui:refresh()
    assert(testStart(ui) and attempts == 4)
end)
test("map and title navigation neither restarts nor leaks music across a retained or ended run", function()
    local sent, settlement = {}, 0
    local cursor = {CursorDown="down", CursorUp="up", CursorExit="exit", CursorEndDrag="endDrag"}
    local ui, root = F.fixture(nil, function(victory) assert(not victory); settlement = settlement + 1; return true end,
        function(signal) sent[#sent + 1] = signal end, cursor)
    local id = 0
    local function tap(panel, name)
        id = id + 1
        local hit = root:GetChild(panel):GetChild(name):GetChild("hit")
        local event = {touchId=id}
        hit.listeners.down(event); hit.listeners.up(event)
        return hit.click(event)
    end
    local function exact(sequence)
        assert(table.concat(sent, ",") == sequence, table.concat(sent, ","))
    end
    local stop, map = "ABYSS_BGM_STOP", "ABYSS_BGM_MAP"
    local expected = stop
    exact(expected)
    assert(testStart(ui))
    expected = expected .. "," .. map
    local run, mapState = ui.run, ui.map
    exact(expected)
    for _ = 1, 2 do
        assert(ui:openMenu())
        exact(expected)
        assert(tap("runMenu", "mainMenu") and ui.sessionPaused)
        expected = expected .. "," .. stop
        exact(expected)
        ui:refresh(); ui:update(1)
        assert(tap("menuPanel", "titleQuit") and tap("exitPanel", "cancel") and settlement == 0)
        exact(expected)
        assert(tap("menuPanel", "continueRun") and not ui.sessionPaused)
        assert(ui.run == run and ui.map == mapState)
        expected = expected .. "," .. map
        exact(expected)
        ui:refresh(); ui:update(1)
        exact(expected)
    end
    assert(ui:openMenu() and tap("runMenu", "mainMenu"))
    expected = expected .. "," .. stop
    assert(tap("menuPanel", "titleQuit") and tap("exitPanel", "confirm"))
    assert(settlement == 1 and ui.settlementRequested and not ui:continueRun())
    ui:update(1); ui:refresh()
    exact(expected)
end)
print("native BGM host: " .. count .. " passed")
