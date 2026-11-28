-- Real generated GameUI host, native cursor/controller callbacks and Combat.
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local F=H.F
local passed,failed=0,0
local function test(name,fn)
    local ok,why=pcall(fn)
    if ok then passed=passed+1;print('PASS '..name)
    else failed=failed+1;print('FAIL '..name..': '..tostring(why))end
end
local function value(panel,slot)
    local text=panel:GetChild('card'..(slot or 1)):GetChild('label').text
    text=text:gsub('<color=#[%x]+>',''):gsub('</color>',''):gsub('↑',''):gsub('↓','')
    return tonumber(text:match('(%d+)'))
end
local function setup()
    local host,ui,panel,event,tap,drain=H.setup({'strike','strike'},{'raven_adept','jaw_worm'})
    F.Combat.addStatus(host.run.combat.enemies[1],'vulnerable',2)
    host:refresh()
    return host,ui,panel,event,tap,drain
end
test('default target is not explicit; Down previews before one Click commits unchanged damage',function()
    local host,ui,panel,event,tap=setup();local b=host.run.combat
    tap('card1',7);assert(ui.target==1 and value(panel)==6,'default target leaked')
    local hp=b.enemies[1].hp
    event('enemy1','down',8)
    assert(value(panel)==9,'explicit pointer Down must show 9 before commit; got '..tostring(value(panel)))
    assert(value(panel,2)==6 and b.energy==3 and #b.hand==2 and b.enemies[1].hp==hp,'preview mutated combat')
    event('enemy1','up',8);assert(value(panel)==9)
    event('enemy1','click',8)
    assert(b.energy==2 and #b.hand==1 and b.enemies[1].hp==hp-9 and not ui.selected and ui.cardAim==nil)
end)
test('pointer target changes 9 to 6 to 9 and EndDrag cancels only preview',function()
    local host,ui,panel,event,tap=setup();tap('card1',7)
    event('enemy1','down',8);assert(value(panel)==9)
    event('enemy2','down',9);assert(value(panel)==6)
    event('enemy1','down',10);assert(value(panel)==6 and ui.cardAim.touch==9,'foreign Down must not steal a still-held surface')
    event('enemy1','endDrag',8);assert(value(panel)==6 and ui.cardAim.touch==9,'releasing old surface must not clear the new preview')
    event('enemy1','down',10);assert(value(panel)==9 and ui.cardAim.touch==10)
    event('enemy1','endDrag',10);assert(value(panel)==6)
    event('enemy1','down',11);assert(value(panel)==9)
    event('enemy1','exit',12);assert(value(panel)==9,'foreign touch cleared current preview')
    event('enemy1','endDrag',10);assert(value(panel)==9,'old token cleared current preview')
    event('enemy1','exit',11);assert(value(panel)==6,'leaving target retained preview')
    assert(host.run.combat.energy==3 and #host.run.combat.hand==2)
end)
test('selection refresh and stale release cannot preview or submit replacement selection',function()
    local host,ui,panel,event,tap=setup();tap('card1',7)
    event('enemy1','down',8);event('enemy1','up',8);assert(value(panel)==9)
    tap('card1',9);assert(value(panel)==6 and not ui.selected and ui.cardAim==nil)
    tap('card1',9);assert(value(panel)==6)
    event('enemy1','click',8);assert(value(panel)==6 and host.run.combat.energy==3)
    event('enemy1','down',10);assert(value(panel)==9)
    tap('card2',11);assert(value(panel)==6 and value(panel,2)==6)
end)
test('state refresh recomputes; turn phase actor battle and inactive invalidate aim',function()
    for _,kind in ipairs({'status','turn','phase','actor','battle','inactive'})do
        local host,ui,panel,event,tap=setup();local b=host.run.combat
        tap('card1',7);event('enemy1','down',8);assert(value(panel)==9,kind)
        if kind=='status'then b.enemies[1].statuses.vulnerable=nil
        elseif kind=='turn'then b.turn=b.turn+1
        elseif kind=='phase'then b.phase='enemy'
        elseif kind=='actor'then b.enemies[1]=F.Combat.copy(b.enemies[1])
        elseif kind=='battle'then host.run.combat=F.Combat.new(F.Data,{deck={'strike'},enemies={'raven_adept'}})
        else ui.active=false end
        ui:render();assert(value(panel)==6,kind..' retained old preview')
        if kind~='status'then assert(ui.cardAim==nil,kind..' retained stale token')end
        assert(b.energy==3 and #b.hand==2,kind..' mutated combat')
    end
end)
test('new actual gesture retires an older enemy pointer preview',function()
    local host,ui,panel,event,tap=setup();tap('card1',7)
    event('enemy1','down',8);assert(value(panel)==9)
    event('card1','down',7);event('card1','drag',7,-285,0)
    assert(ui.gesture and ui.gesture.moving and value(panel)==6,'old pointer target overrode new drag')
    assert(ui.cardAim==nil and host.run.combat.energy==3)
end)
test('actual drag still previews and empty ground clears without automatic target',function()
    local host,ui,panel,event=setup();local b=host.run.combat
    local enemy=F.actorControl(panel,'enemy1')
    event('card1','down',7);event('card1','drag',7,enemy.x,enemy.y)
    assert(value(panel)==9)
    event('dragLayer','drag',7,-285,0);assert(value(panel)==6)
    assert(b.energy==3 and #b.hand==2)
end)
print('explicit target preview: '..passed..' passed, '..failed..' failed')
assert(failed==0)
