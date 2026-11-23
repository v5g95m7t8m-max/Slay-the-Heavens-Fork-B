local H = dofile('tests/lua/support/battle_gesture_fixture.lua')
local control = dofile('tests/lua/support/monster_control_fixture.lua')
local Combat = H.F.Combat
local Intent = require('abyss_battle_intent_view')
local function inspect(h, ui, panel, box, mobile, id)
    local hit = box:GetChild('intentHit')
    local events = mobile and {'down','up','click'} or {'enter'}
    for _, kind in ipairs(events) do
        assert(hit.listeners[kind])({touchId=id,GetUIPos=function()
            return ui.canvasWidth/2+(box.x or 0),ui.canvasHeight/2+(box.y or 0)
        end})
    end
    for _=1,24 do h:update(.05) end
    local info = panel:GetChild('statusInfo')
    return info, info:GetChild('text1').text
end
for _, mobile in ipairs({false,true}) do
    local h, ui, panel = H.setup({'defend'}, {'jaw_worm'}, {touchScreen=function()return mobile end})
    local b = Combat.new(H.F.Data,{deck={'defend'},enemies={'jaw_worm'},seed=2})
    h.run.combat=b
    if mobile then h:resize(844,390) end
    h:refresh()
    local enemy=b.enemies[1]
    assert(Combat.intent(b,1).id=='jaw_worm_1')
    local box=control(panel,'enemy1')
    assert(box:GetChild('intent').text=='11')
    -- The selected move can advance before the displayed snapshot is rebuilt.
    -- Deliberately separate them without causing a UI sync.
    enemy.intentIndex=assert((function()
        for index, entry in ipairs(enemy.intents) do if entry.id=='jaw_worm_2' then return index end end
    end)())
    local forecast=Intent.intentView(b,1).text
    assert(forecast:find('格挡',1,true),'fixture must produce a different ordered future')
    local hp, energy, target = enemy.hp, b.energy, ui.target
    local info, message=inspect(h,ui,panel,box,mobile,30)
    assert(info.visible and message:find('11 点伤害',1,true) and not message:find('格挡',1,true),
        'existing intent-entry reader must explain displayed 11, not calculated future: '..tostring(message))
    assert(enemy.hp==hp and b.energy==energy and ui.target==target and Intent.intentView(b,1).text==forecast)
    local manager = require('abyss_monster_surfaces').get(panel)
    assert(manager:find(enemy.id) == box)
    -- A replacement table with the same ID must not inherit the visible intent.
    local replacement = Combat.copy(enemy)
    b.enemies[1] = replacement
    ui:renderDetailsOnly()
    assert(not info.visible,'same-battle replacement leaked retired actor intent')
    b.enemies[1] = enemy
    -- Reuse of an actor ID in a different battle must not retain the old snapshot.
    -- Keep the old detail pinned until the battle identity is replaced.
    local nextBattle=Combat.new(H.F.Data,{deck={'defend'},enemies={'jaw_worm'},seed=2})
    nextBattle.enemies[1].intentIndex=enemy.intentIndex
    assert(Combat.intent(nextBattle,1).id=='jaw_worm_2' and nextBattle.enemies[1].id==enemy.id)
    h.run.combat=nextBattle
    h:refresh()
    local nextBox=control(panel,'enemy1')
    local nextInfo,nextText=inspect(h,ui,panel,nextBox,mobile,31)
    assert(nextInfo.visible and not nextText:find('11 点伤害',1,true),'new battle leaked prior intent')
    assert(H.Run.obtainRelic(h.run,'runic_dome'));h:refresh()
    nextBox=control(panel,'enemy1')
    assert(not nextBox:GetChild('intentHit').visible and not nextBox:GetChild('intent').visible)
    assert(nextBox:GetChild('intent').text=='' and Combat.intent(nextBattle,1),
        'Runic Dome must suppress published face without changing core intent')
    print('CURRENT_ENEMY_INTENT_UI_PASS '..(mobile and 'touch' or 'mouse'))
end

-- Truly legacy actors retain their ordered details, including unequal hits.
do
    local h, ui, panel = H.setup({'defend'}, {'snake_dagger'})
    local b = h.run.combat
    local enemy = b.enemies[1]
    assert(not Intent.hasSourceIntent(enemy))
    enemy.ai, enemy.intentIndex = nil, 1
    enemy.intents = {{id='legacy_unequal_hits',kind='attack',effects={
        {op='damage',value=5},{op='damage',value=8},
    }}}
    h:refresh()
    local box = control(panel,'enemy1')
    assert(box:GetChild('intent').text=='5')
    local info, first = inspect(h,ui,panel,box,false,44)
    local second = info:GetChild('text2').text
    assert(info.visible and first:find('5 点伤害',1,true) and second:find('8 点伤害',1,true),
        'legacy reader must preserve each ordered amount: '..first..' / '..second)
    print('CURRENT_ENEMY_INTENT_UI_PASS legacy_unequal')
end

-- A source-backed multihit must preserve the published multiplier, not total damage.
do
    local h, ui, panel = H.setup({'defend'}, {'book_of_stabbing'})
    local b=Combat.new(H.F.Data,{deck={'defend'},enemies={'book_of_stabbing'},seed=2})
    local enemy=b.enemies[1]
    assert(Intent.hasSourceIntent(enemy))
    enemy.ai,enemy.intentIndex=nil,1
    enemy.intents={{id='multi_stab',kind='attack',effects={{op='damage',value=6,times=3}}}}
    h.run.combat=b;h:refresh()
    local box=control(panel,'enemy1')
    assert(box:GetChild('intent').text=='6x3')
    local info,message=inspect(h,ui,panel,box,false,45)
    assert(info.visible and message:find('6 点伤害 3 次',1,true) and not message:find('18 点伤害',1,true))
    print('CURRENT_ENEMY_INTENT_UI_PASS source_multi')
end
