local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local Display=require('abyss_card_display')
local C=H.F.Combat
local h,u,p,event=H.setup({'defend','perfected_strike','bash','shockwave','strike'},{'cultist'},
    {touchScreen=function()return true end})
h:resize(2556,1179)
local battle=h.run.combat
local panel=p:GetChild('statusInfo')
local function slot(id)
    for i,card in ipairs(battle.hand)do if card.cardId==id then return i,card end end
    error('missing fixture card '..id)
end
local function assertBody(box,expected)
    local label=box:GetChild('label')
    assert(label.text==expected,'card face lost canonical body: '..label.text..' / '..expected)
    assert(select(2,Display.fitBody(label.text,{label.sizeDeltaX,label.sizeDeltaY})),'native card body overflows')
end
local function tip(index)
    return panel:GetChild('powerTips'):GetChild('tip'..index)
end
local function read(id,touch,keywords)
    local i,card=slot(id)
    local name='card'..i
    local box=p:GetChild(name)
    local energy,hp,count=battle.energy,battle.player.hp,#battle.hand
    local definition=C.cardDefinition(battle,card)
    local expected=Display.combatText(u.presentation[id],definition,card,C.cardPreview(battle,card),battle)
    assertBody(box,expected)
    event(name,'down',touch);h:update(.36)
    assert(u.info and u.info.uid==card.uid and u.hover==i,'read pose must own the held UID')
    assert(box.localScaleX>1 and math.abs(box.localRotationZ)<.1,'held card must lift, grow and straighten')
    assertBody(box,expected)
    assert(panel.visible==(#keywords>0),'only a genuine keyword can show a tooltip')
    if panel.visible then
        for index,keyword in ipairs(keywords)do
            assert(tip(index).visible and tip(index):GetChild('copy').text:find(keyword,1,true))
        end
        assert(not tip(#keywords+1).visible,'extra card text leaked into the keyword tip list')
        assert(not panel:GetChild('title').visible and not panel:GetChild('summary').visible
            and not panel:GetChild('hit').visible and not panel:GetChild('page').visible)
    end
    local other='card'..(i%#battle.hand+1)
    event(other,'up',touch);event(other,'click',touch);event(other,'exit',touch)
    event(name,'up',touch+100);event(name,'exit',touch+100)
    assert(u.info and u.info.uid==card.uid,'foreign source or touch retired the read')
    event(name,'up',touch);event(name,'click',touch);h:update(.4)
    local draw=p:GetChild('drawIcon'):GetChild('hit')
    assert(not draw.click({touchId=touch}) and not h.deckUI.visible,'retargeted release opened the draw pile')
    assert(not u.info and not panel.visible and not u.hover,'released read left card details open')
    assert(battle.energy==energy and battle.player.hp==hp and #battle.hand==count,'reading must not play a card')
    assert(u.selected==nil,'reading must not leave a selected card')
end
read('defend',17,{})
read('perfected_strike',17,{})
read('bash',17,{'易伤'})
read('shockwave',17,{'虚弱','易伤','消耗'})
local i=slot('perfected_strike')
local name='card'..i
event(name,'down',18);h:update(.36)
table.remove(battle.hand,i);h:update(.05)
assert(not u.info and not panel.visible and not u.hover,'departed UID must retire an already-open read')
event(name,'up',18);event(name,'click',18)
assert(#battle.hand==4,'stale release consumed a replacement card')
local bash='card'..slot('bash')
event(bash,'down',19);h:update(.36)
battle.turn=battle.turn+1;h:update(.05)
assert(not u.info and not panel.visible and not u.hover,'prior turn left an already-open read')
event(bash,'up',19);event(bash,'click',19)
event(bash,'down',20);h:update(.36)
assert(u:cancelAim() and not u.info and not panel.visible)
event(bash,'up',20);event(bash,'click',20)
event(bash,'down',21);h:update(.36)
assert(u.info and not u:openHelp({index=0},nil,true),'unrelated hover stole the held card')
event(bash,'exit',21)
assert(not u.info and not panel.visible and not u.hover,'leaving the held source stranded the read')
event(bash,'up',21);event(bash,'click',21)
event(bash,'down',22);u.active=false;h:update(.4)
assert(not u.info and not panel.visible,'inactive owner allowed delayed help')
assert(#battle.hand==4 and battle.energy==3 and not u.selected,'invalidated help changed combat')
print('R2_HAND_HELP_PASS')
