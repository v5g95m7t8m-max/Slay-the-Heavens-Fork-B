local view=__PRECISION_VIEW
local Combat=require('abyss_combat')
__PRECISION_ART_STATUS=require('abyss_card_art_runtime').status
function __precisionDump()
    for i,r in ipairs(__PRECISION_ORDER)do
        local id=tostring(r.box.Id)
        print('PRECISION trace '..table.concat({i,id,tostring(r.page),tostring(r.metadata.cardId),
            tostring(r.ready),tostring(r.allocated),tostring(r.cancelled),tostring(r.removed),
            tostring(r.failed),tostring(r.cursor),tostring(r.pool.visible)},':'))
    end
end
local function fmt(v)return v and 'true' or 'false'end
function __PRECISION_STATUS()
    local run=view.run
    local battle=run and run.combat
    local runtime=require('abyss_card_art_runtime')
    local ready=runtime.presentationReady('battlePanel')
    local report=runtime.status()
    local ids={}
    if battle then for i,card in ipairs(battle.hand) do ids[i]=card.cardId end end
    return string.format('{"mode":"%s","run":%s,"cards":%d,"enemies":%d,"energy":%d,"turn":%d,"operable":%s,"deck":%s,"gate":"%s","busy":%s,"artReady":%s,"artControls":%d,"cardIds":"%s","phase":"%s"}',
        view.mode,fmt(run),battle and #battle.hand or 0,battle and #battle.enemies or 0,
        battle and battle.energy or 0,battle and battle.turn or 0,
        fmt(not view.disabled and not view.battleUI.busy and not view.pageReveal:covered()),fmt(view.deckUI.visible),view.pageReveal.state,fmt(view.battleUI.busy),fmt(ready),report.liveControls,table.concat(ids,','),run and run.phase or 'none')
end
function __precisionSkipOpening()
    -- Seeded fixture skips the introductory event while retaining actual game UI.
    view.run.phase='map'
    view.run.nodeFlow=nil
    view:refresh()
end
function __precisionBattle(ids,count)
    local run=assert(view.run)
    local deck={}
    for i=1,count do deck[i]=ids[i]end
    local enemies={'jaw_worm','cultist','red_slaver','blue_slaver'}
    local battle=assert(Combat.new(run.data,{seed=17,deck=deck,enemies=enemies,hp=run.hp,maxHp=run.maxHp,gold=run.gold}))
    Combat.draw(battle,count-#battle.hand)
    assert(#battle.hand==count and #battle.enemies==4)
    run.combat=battle
    run.encounterId,run.encounterTier='precision_four','normal'
    run.phase='combat'
    view:refresh()
end
function __precisionReward()
    local run=assert(view.run)
    for _,enemy in ipairs(run.combat.enemies)do enemy.hp=0 end
    assert(require('abyss_run').finishCombat(run))
    run.rewards.cards={'cleave','defend','whirlwind'}
    run.rewards.cardUpgrades={true}
    view:refresh()
    view.battleUI.rewardScreen='cards'
    view:refresh()
end
function __precisionShop()
    local Run,Map,Nodes=require('abyss_run'),require('abyss_map'),require('abyss_nodes')
    local run=Run.new(view.data,42)
    local map=Map.generate(run.data,42)
    for _=1,17 do
        local choices,found=Map.available(map),false
        for _,choice in ipairs(choices)do
            if choice.type=='shop'then assert(Nodes.enter(run,map,choice.id));found=true;break end
        end
        if found then break end
        assert(Map.choose(map,assert(choices[1]).id))
    end
    assert(run.nodeFlow and run.nodeFlow.type=='shop','isolated shop fixture did not enter shop')
    run.nodeFlow.cards[1].id='cleave'
    view.run,view.map=run,map
    view.battleUI.run=run
    view.nodeUI.run,view.nodeUI.map=run,map
    view.mapUI.map=map
    view:refresh()
end
function __precisionExit()
    view.run=nil
    view.battleUI.run=nil
    view.nodeUI.run=nil
    view:refresh()
end
