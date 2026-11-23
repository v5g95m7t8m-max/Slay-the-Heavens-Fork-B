local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local AimArrow=require('abyss_battle_aim_arrow')
local Surfaces=require('abyss_monster_surfaces')
local theme=H.F.Theme
local function near(a,b) return math.abs(a-b)<.001 end
local original=AimArrow.render
local drawn
AimArrow.render=function(layer,aiming,sx,sy,...)
    drawn={sx,sy}
    return original(layer,aiming,sx,sy,...)
end
local function named(children,name)
    for _,entry in ipairs(children) do if entry.name==name then return entry end end
    error('missing layout: '..name)
end
local layout=named(named(H.F.Layout,'stage').children,'battlePanel')
local cases=0
for _,slot in ipairs({1,2,3,4,5}) do
    local host,ui,panel,event=H.setup({'defend'},{'cultist'})
    assert(H.Run.obtainRelic(host.run,'Potion Belt'))
    host.run.potions={[slot]='fire_potion'}
    host:refresh()
    local bottleName='potion'..slot
    local bottle=slot<=3 and panel:GetChild(bottleName) or panel:GetChild('potionHelp'):GetChild(bottleName)
    local ownerSpec=slot<=3 and layout or named(layout.children,'potionHelp')
    local x,y=table.unpack(named(ownerSpec.children,bottleName).position)
    local enemy=assert(Surfaces.get(panel):find(host.run.combat.enemies[1].id))
    local id=100+slot
    local function signal(kind,x,y)
        local cb=assert(bottle.listeners[kind],bottleName..'/'..kind)
        return cb({touchId=id,GetUIPos=function()return 640+x,360+y end})
    end
    local hp=host.run.combat.enemies[1].hp
    drawn=nil
    signal('down',x,y)
    signal('drag',enemy.x,enemy.y)
    local aim=assert(ui.potionAim)
    assert(aim.moving)
    local match=near(aim.origin[1],x) and near(aim.origin[2],y)
        and drawn and near(drawn[1],x) and near(drawn[2],y)
    print(string.format('slot %d: rendered=%s,%s actual=%s,%s',slot,tostring(drawn and drawn[1]),tostring(drawn and drawn[2]),x,y))
    assert(host.run.potions[slot]=='fire_potion' and host.run.combat.enemies[1].hp==hp)
    event('dragLayer','up',id,enemy.x,enemy.y)
    assert(not ui.potionAim and host.run.potions[slot]==nil and host.run.combat.enemies[1].hp==hp-20)
    if match then cases=cases+1 end
end
assert(cases==5,(theme.presentationProfile or 'legacy')..' matched '..cases..'/5 visual origins')
print((theme.presentationProfile or 'legacy')..' ORIGIN_PASS '..cases)
