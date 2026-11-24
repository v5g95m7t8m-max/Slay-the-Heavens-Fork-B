local F=dofile('tests/lua/support/game_ui_fixture.lua')
local calls=0
local ui,root=F.fixture(nil,function(victory)assert(victory==false);calls=calls+1;return true end)
local function click(panel,name)
 local box=root:GetChild(panel):GetChild(name)
 assert(box.visible and root:GetChild(panel).visible,'exit action is hidden')
 return box:GetChild('hit').click()
end
assert(ui:start() and ui.characterOpen and ui.run==nil)
assert(ui:selectCharacter('traveler') and ui:selectElement('ironclad'))
local selection=ui.characterSelection.info
assert(click('exitEntry','open') and click('runMenu','abandon'))
assert(click('exitPanel','cancel'),'selection input guard blocked exit cancellation')
assert(ui.characterOpen and ui.characterSelection.info==selection and calls==0 and ui.run==nil)
assert(click('exitEntry','open') and click('runMenu','abandon'))
assert(click('exitPanel','confirm'),'selection input guard blocked exit confirmation')
assert(calls==1 and ui.settlementRequested and ui.run==nil)
assert(not ui:confirmExit() and calls==1,'duplicate settlement request')
print('CHARACTER_SELECTION_EXIT_PASS')

local PageReveal = require('abyss_page_reveal')
local stage = F.Viewport.apply(F.control({children=F.Layout}), 1280, 720)
local waiting
local host = F.GameUI.new(stage, F.Data, F.Presentation, 'click', {
    seed=1, imageSource='static', prologue=true,
    color=function(r,g,b,a) return {r=r,g=g,b=b,a=a} end,
    presentationReady=function(intent) return not waiting or intent.character~=waiting end,
})
local panel = stage:GetChild('characterPanel')
local cancel, confirm = panel:GetChild('cancel'), panel:GetChild('confirm')
local layers = panel:GetChild('details'):GetChild('infoMotion')
local cancelX, confirmX = cancel.anchoredPositionX, confirm.anchoredPositionX
local function tick()
    host:update(1/60)
    if host.pageReveal:step(PageReveal.intent(host),1/60) then host:refresh() end
    host.pageReveal:paint(true)
end
local function near(a,b) assert(math.abs(a-b)<.001,tostring(a)..' ~= '..tostring(b)) end
local function nextX(value,target) return value+(target-value)*9/60 end
local function rowWith(name)
    for _, row in ipairs(layers:GetChildren()) do
        if row.visible and row:GetChild('name').text==name then return row end
    end
end

for _=1,30 do tick() end
assert(host:start() and host.pageReveal.localOnly and host.pageReveal.alpha==0)
tick()
assert(host.pageReveal.state=='visible' and not confirm.visible)
near(cancel.x,cancelX-400*2/3)
tick()
near(cancel.x,cancelX+nextX(-400,0)*2/3)

assert(host:selectCharacter('hutao'))
local a = assert(rowWith('胡桃'))
near(a.x,nextX(-1000,0)*2/3)
near(confirm.x,confirmX+nextX(400,0)*2/3)
tick();tick()
local beforeA, beforeConfirm = a.x, confirm.x
waiting='arlecchino'
assert(host:selectCharacter('arlecchino'))
assert(host.pageReveal:covered() and host.pageReveal.alpha==0)
assert(rowWith('胡桃')==a and not rowWith('阿蕾奇诺') and confirm.visible)
tick()
assert(a.x>beforeA and confirm.x<beforeConfirm)
beforeA=a.x
waiting=nil
tick()
local b=assert(rowWith('阿蕾奇诺'))
assert(a.x>beforeA,'lower index updates its prior target on the switch frame')
beforeA=a.x
tick()
assert(a.x<beforeA,'old data begins its leftward exit on the next reference step')

assert(host:selectCharacter('furina'))
local c=assert(rowWith('芙宁娜'))
assert(rowWith('胡桃')==a and rowWith('阿蕾奇诺')==b)
beforeA,beforeConfirm=a.x,confirm.x
assert(host:selectCharacter('hutao'))
assert(rowWith('胡桃')==a and a.x>beforeA and confirm.x<=beforeConfirm)
assert(b.visible and c.visible and b:GetChild('name').text=='阿蕾奇诺' and c:GetChild('name').text=='芙宁娜')
beforeA,beforeConfirm=a.x,confirm.x
assert(host:selectCharacter('hutao'))
near(a.x,beforeA);near(confirm.x,beforeConfirm)
for _=1,65 do tick() end
assert(not b.visible and not c.visible)
near(a.x,0);near(confirm.x,confirmX)
waiting='arlecchino'
assert(panel:GetChild('character2'):GetChild('hit').click())
assert(host.pageReveal:covered() and not stage:GetChild('pageReveal'):GetChild('blocker').raycastTarget)
assert(not confirm:GetChild('hit').click(), 'pending role was allowed to start')
assert(panel:GetChild('character3'):GetChild('hit').click())
tick()
assert(host.pageReveal.state=='visible' and rowWith('芙宁娜'))
waiting=nil
assert(host:closeCharacters())
for _=1,60 do tick() end
assert(host:start())
tick()
assert(not confirm.visible and not rowWith('胡桃'))
near(cancel.x,cancelX-400*2/3)
print('CHARACTER_ENTRANCE_PASS publication, selected and retiring details, reselect, pooled cleanup')


-- A selection-enabled gate still leaves the deck browser's chrome interactive
-- while its grid is prepared behind the smaller input barrier.
local cover=stage:GetChild('pageReveal')
local deckFrame={0,0,918,452}
local deckGate=PageReveal.new(cover,function(intent)return intent.page=='battlePanel'end,nil,{
 full={0,0,1280,720},deckPanel=deckFrame,deckPaged=deckFrame,
},{characterLocal=true,duration=.35,color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local base={page='battlePanel',mode='battle',phase='combat'}
deckGate:step(base,1/60);deckGate:step(base,1/60);deckGate:step(base,.35)
assert(not deckGate:covered())
assert(deckGate:request({page='deckPanel',mode='battle',phase='combat',deckPaged=true}))
assert(deckGate:paint(true) and not cover.disableCursorEventPassthrough)
local blocker=cover:GetChild('blocker')
assert(blocker.raycastTarget and blocker.sizeDeltaX==918 and blocker.sizeDeltaY==452)
