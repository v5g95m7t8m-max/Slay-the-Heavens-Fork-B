local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local D=require('abyss_card_display')
local h,u,p,event,_,_,_,root=H.setup({'defend','strike'},{'cultist'},{touchScreen=function()return true end})
h:resize(2556,1179)
local battle=h.run.combat
local instance=battle.hand[1]
local body=u.presentation[instance.cardId]
local complete=string.rep('测试一段完整正文。',10)..'<color=#FFBB99>结尾。</color>'
body.text,body.combatText=complete,complete
u:render()
local label=p:GetChild('card1'):GetChild('label')
assert(D.bodyOverflows(label),'fixture must exceed normal card capacity')
local before=H.F.Combat.copy(battle)
local deck=root:GetChild('deckPanel')
local close=deck:GetChild('close'):GetChild('hit')
local blocker=deck:GetChild('blocker')
local function hold(touch)
    event('card1','down',touch);h:update(.36)
    assert(u.info and u.info.uid==instance.uid)
end
local function focus(touch)
    hold(touch)
    event('card1','up',touch)
    assert(h.deckUI.focusRead and h.deckUI.visible and not u.active)
    local large=deck:GetChild('cardFocus'):GetChild('face'):GetChild('label')
    assert(large.text==complete and large.fontSize>=H.F.Theme.font.minimum)
    assert(large.localScaleX<1 and large.sizeDeltaX*large.localScaleX< H.F.Theme.layout.card.size[1])
    event('card1','click',touch)
    close.click({touchId=touch})
    blocker.click({touchId=touch})
    assert(h.deckUI.visible,'opening touch dismissed the full card')
end
hold(71)
event('card1','endDrag',71);event('card1','click',71)
assert(not h.deckUI.visible and not u.info,'cancelled hold opened the large card')
hold(75)
local source=p:GetChild('card1'):GetChild('hit')
source.listeners.up({touchId=75,dragging=true})
assert(not h.deckUI.visible and not u.info,'dragging Up opened the large card before EndDrag')
focus(72)
close.listeners.down({touchId=72})
close.listeners.down({touchId=99});close.listeners.up({touchId=99});close.click({touchId=99})
close.listeners.up({touchId=72});close.listeners.endDrag({touchId=72})
close.click({touchId=72,dragging=true})
assert(h.deckUI.visible,'cancelled close press dismissed the full card')
close.listeners.down({touchId=72});close.listeners.up({touchId=72})
close.listeners.down({touchId=74});close.listeners.up({touchId=74})
assert(close.click({touchId=74}) and not h.deckUI.visible and u.active,
    'missing Click from a completed touch blocked the next deliberate press')
focus(73)
battle.turn=battle.turn+1;h:update(.05)
assert(not h.deckUI.visible and not u.info,'old turn retained the full card')
event('card1','click',73)
assert(battle.energy==before.energy and #battle.hand==#before.hand and u.selected==nil)
local desktop,ui,desktopPanel,mouse=H.setup({'strike'},{'cultist'},
    {keyEvents={KeyboardSprintKeyDown='right'}})
local display=ui.presentation.strike
display.text,display.combatText=complete,complete
ui:render()
mouse('card1','enter',80);desktop:update(.36)
assert(ui.info and ui.info.transient and not desktop.deckUI.visible)
assert(desktopPanel.keyListeners.right() and desktop.deckUI.visible and not ui.selected,
    'explicit desktop inspect failed')
assert(desktop:closeDeck() and ui.active and desktop.run.combat.energy==3)
local S=dofile('tests/lua/support/looter_potion_ui_fixture.lua')
local rewards,rewardUI,_,rewardEvent,rewardTap=S.reward(true)
local offers=rewards.run.rewards
offers.cards={'perfected_strike'}
local offered=rewardUI.presentation.perfected_strike
offered.text,offered.combatText=complete,complete
rewardTap('cardReward',91)
rewardEvent('card1','down',92);rewards:update(.36);rewardEvent('card1','up',92)
rewards:update(.05)
assert(rewards.deckUI.focusRead and rewards.deckUI.visible and not offers.cardResolved,
    'opening redraw invalidated the live reward read or claimed it')
offers.cards={'defend'}
rewards:update(.05)
assert(not rewards.deckUI.visible and not offers.cardResolved,'old offer retained the reader')
print('CARD_BODY_FOCUS_PASS')
