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

-- The head reader mirrors Release disclosure without altering settled moves.
do
    local function same(a,b)
        if type(a)~=type(b) then return false end
        if type(a)~='table' then return a==b end
        for k,v in pairs(a) do if not same(v,b[k]) then return false end end
        for k in pairs(b) do if a[k]==nil then return false end end
        return true
    end
    for _, case in ipairs({
        {'automaton','spawn_orbs','UNKNOWN','', '这名敌人的意图不明（但不是攻击）。'},
        {'hexaghost','inferno','ATTACK_DEBUFF','2x6','这名敌人将要对你施加负面效果并攻击造成 2 点伤害。'},
    }) do
        local id,move,enum,overhead,expected=table.unpack(case)
        local h,u,p=H.setup({'defend'},{id},{touchScreen=function() return true end})
        local battle=Combat.new(H.F.Data,{deck={'defend'},enemies={id},seed=42})
        local actor=battle.enemies[1]
        for i,v in ipairs(actor.intents) do if v.id==move then actor.intentIndex=i;break end end
        assert(Combat.intent(battle,1).id==move and Intent.selectedDescriptor(battle,1).intent==enum)
        h.run.combat=battle;h:resize(844,390);h:refresh()
        local box=control(p,'enemy1')
        local glyph,number=box:GetChild('intentIcon'),box:GetChild('intent')
        assert(number.text==overhead and box:GetChild('intentHit').visible)
        if enum=='UNKNOWN' then
            assert(not glyph.visible and not box:GetChild('intentBadge').visible)
            assert(Intent.intentView(battle,1).text:find('召唤 2 名青铜浮核',1,true))
        else
            assert(glyph.visible and number.visible and Intent.selectedDescriptor(battle,1).isMultiDamage)
        end
        local before,rng=Combat.copy(battle),{}
        for _,key in ipairs({'eventRng','miscRng','treasureRng','cardRng'}) do rng[key]=Combat.copy(assert(h.run[key])) end
        local target=u.target
        local info,copy=inspect(h,u,p,box,true,78)
        assert(info.visible and u.info.kind=='intent' and copy==expected,move..': '..copy)
        assert(same(battle,before) and u.target==target)
        for key,stream in pairs(rng) do assert(same(h.run[key],stream),key..' changed during read') end
        if enum=='UNKNOWN' then
            local settled=Combat.copy(battle);assert(Combat.endTurn(settled))
            local orbs=0
            for _,enemy in ipairs(settled.enemies) do if enemy.definitionId=='bronze_orb' then orbs=orbs+1 end end
            assert(#settled.enemies==3 and orbs==2 and #battle.enemies==1)
        end
        print('CURRENT_ENEMY_INTENT_UI_PASS '..move)
    end
end
