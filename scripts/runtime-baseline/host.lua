-- Opt-in offline Host measurement, not official client/device performance.
local generated=BASELINE_GENERATED or './build/lua'
if BASELINE_GIL then
 -- Formal samples resolve each Lua module exclusively from native readback.
 package.path=generated..'/?.lua'
else
 package.path=generated..'/?.lua;./src/lua/?.lua;'..package.path
end
local counts={requireCalls=0,moduleLoads=0,nativeCalls=0,propertyWrites=0,snapshots=0,methods={},properties={}}
local originalRequire=require
require=function(name)
 counts.requireCalls=counts.requireCalls+1
 local loaded=package.loaded[name]
 local value=originalRequire(name)
 if not loaded then counts.moduleLoads=counts.moduleLoads+1 end
 return value
end
local function mark(label)
 BASELINE_MARK(label,counts.requireCalls,counts.moduleLoads,counts.nativeCalls,counts.propertyWrites,counts.snapshots,counts.methods,counts.properties)
end
local observe=dofile('scripts/runtime-baseline/observer.lua')
local verifyTurn=dofile('scripts/runtime-baseline/turn.lua')
ABYSS_HOST_CONTROL=function(control,spec)observe(control,counts,BASELINE_GENERATED~=nil,spec)end
mark(BASELINE_ACT2 and 'act2-begin' or 'begin')
local Snapshot=require('abyss_snapshot');local capture=Snapshot.capture
Snapshot.capture=function(...)counts.snapshots=counts.snapshots+1;return capture(...)end
local F=assert(load(BASELINE_FIXTURE,'@tests/lua/support/game_ui_fixture.lua'))()
if BASELINE_GENERATED then return assert(loadfile('tests/lua/support/production_performance.lua'))(F,counts,mark) end
local Run=require('abyss_run')
local host,root=F.fixture()
mark('cold-host')
assert(host:disable())
host,root=F.fixture()
mark('warm-host')
assert(host:setFastMode(true));assert(F.start(host));assert(host.run.phase=='map');assert(host.run.runSeed=='1','fixture seed changed')
mark('start-map')
assert(host.mapUI:choose(F.Nodes.available(host.run,host.map)[1].id))
assert(host.run.phase=='combat')
mark('map-combat')
local battle,previousTurn=host.run.combat,host.run.combat.turn
F.click(root,'battlePanel','endTurn')
for _=1,400 do if not host.battleUI.busy then break end;host:update(.05)end
verifyTurn(host,battle,previousTurn)
mark('combat-turn')
for _=1,300 do host:update(1/60)end
mark('idle-300')
assert(host:openDeck());host:closeDeck()
mark('deck-roundtrip')
-- Terminal-state setup follows the existing short-route Host fixture; not a win benchmark.
for _,enemy in ipairs(host.run.combat.enemies)do enemy.hp=0 end
assert(Run.finishCombat(host.run));host:refresh();assert(host.run.phase=='reward')
mark('terminal-reward')
F.click(root,'battlePanel','continue')
assert(host.run.phase=='map' and host.run.pendingCombatRewards)
mark('reward-map')
assert(host:disable())
mark('disable')
print('RUNTIME_BASELINE_PASS seed=1 idleFrames=300')
