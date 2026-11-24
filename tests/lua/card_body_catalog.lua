local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local F,C,Run=H.F,H.F.Combat,H.Run
local Display=require('abyss_card_display')
local Presentation=require('abyss_character_presentation')
local Keywords=require('abyss_card_keywords')
local run=Run.new(F.Data,42,{character='ironclad',experimental=true,campaign=true,campaignProfile='competition-two-act'})
local displays=Presentation.prepare(F.Presentation,run.data)
assert(Run.startCombat(run,'cultist_solo'))
local battle=run.combat
local _,_,panel,_,_,_,_,root=H.setup()
local choice=F.control(F.Templates.AbyssDeckCard):GetChild('face')
local pile=F.control(F.Templates.AbyssBattlePileCard):GetChild('face')
local focus=root:GetChild('deckPanel'):GetChild('cardFocus'):GetChild('face')
local shop=root:GetChild('nodePanel'):GetChild('shopView'):GetChild('card1')
local hand,reward=panel:GetChild('card1'),panel:GetChild('card2')
local fit=Display.newTextFitter()
local bodyCount,definitions,checks=0,0,0
local function check(face,label,text,where,writer)
    local target=face:GetChild(label)
    local fits,placed=writer(target,text,face,fit)
    assert(fits and placed and target.text==text and target.fontSize>=F.Theme.font.minimum,where..': '..text)
    checks=checks+1
end
local function printed(definition,instance,display,tag)
    local text=Display.permanentText(display,definition,instance)
    check(reward,'label',text,tag..' reward',Display.writeBody)
    check(choice,'label',text,tag..' deck and choice',Display.writeBody)
    check(shop,'description',text,tag..' shop and upgrade',Display.writeBody)
    check(focus,'label',text,tag..' large card',Display.writeFocusedBody)
    local tips=Keywords.cardTips(battle.catalog.statuses,definition,instance.upgraded,text)
    local pure=definition.effects[1]
    if pure and pure.op=='gainDevotion' then
        assert(tips and tips[1].body:len()>0,'condensed card lost its real definition: '..tag)
    end
end
local function live(case,instance,display,tag)
    local boost=case>1 and 999 or nil
    local player,enemy=battle.player,battle.enemies[1]
    player.statuses.strength,player.statuses.dexterity,player.block=boost,boost,boost or 0
    player.statuses.weak,player.statuses.frail=case==3 and 2 or nil,case==3 and 2 or nil
    enemy.statuses.vulnerable=case>1 and 2 or nil
    instance.costForTurn=case>1 and instance.cardId=='strike' and 0 or nil
    local definition=C.cardDefinition(battle,instance)
    local preview=C.cardPreview(battle,instance,1,definition)
    local text=Display.combatText(display,definition,instance,preview,battle,1)
    check(hand,'label',text,tag..' hand',Display.writeBody)
    check(pile,'label',text,tag..' combat pile',Display.writeBody)
    check(focus,'label',text,tag..' large combat card',Display.writeFocusedBody)
end
local ids={}
for id in pairs(battle.catalog.cards) do ids[#ids+1]=id end
table.sort(ids)
for _,id in ipairs(ids) do
    local display=assert(displays[id],id..' has no presentation')
    definitions=definitions+1
    for _,upgraded in ipairs({false,true}) do
        local instance={uid=9001,cardId=id,upgraded=upgraded}
        local tag=id..(upgraded and '+' or '')
        battle.hand={instance}
        printed(C.cardDefinition(battle,instance),instance,display,tag)
        for case=1,3 do live(case,instance,display,tag) end
        bodyCount=bodyCount+4
    end
end
assert(definitions==368 and bodyCount==2944 and checks==9568)
local host=H.setup()
host.deckUI:setPresentation(displays)
assert(host.deckUI:open(run))
assert(host.deckUI:showCardDetails({uid=9002,cardId='devotion'}))
assert(table.concat(host.deckUI.cardDetail.notes):find('至少10层',1,true),
    'permanent deck lost the registered Devotion definition')
assert(host.deckUI:close())
print('CARD_BODY_CATALOG_PASS '..definitions..' cards, '..bodyCount..' versions, '..checks..' face checks')
