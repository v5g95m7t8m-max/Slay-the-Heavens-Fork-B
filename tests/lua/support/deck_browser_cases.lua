local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Gate=require('abyss_page_reveal')
local Run=require('abyss_run')
local root=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local cursor={CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='end'}
local host
local factory=F.deckBrowser()
local nativeCreate,nativeDestroy=factory.create,factory.destroy
local created,destroyed,chunks,fail=0,0,0,false
function factory.create(parent,part)
    if fail then fail=false;return nil end
    if part then chunks=chunks+1 else created=created+1 end
    return nativeCreate(parent,part)
end
function factory.destroy(control)
    destroyed=destroyed+1;return nativeDestroy(control)
end
local function readReady(intent)
    if intent.page~='deckPanel' then return true end
    local deck=host.deckUI
    if deck.prepareError then return false,deck.prepareError end
    return not (deck.pending or deck.pendingGrid or deck.calibrating)
end
host=F.GameUI.new(root,F.Data,F.Presentation,'click',{seed=1,imageSource='static',cursorEvents=cursor,
    deckBrowser=factory,presentationReady=readReady,
    keyEvents={KeyboardCraftspersonKey38Down='left',KeyboardCraftspersonKey39Down='right'},
    color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end})
local panel=root:GetChild('deckPanel')
local pool=panel:GetChild('pileGrid')
local deck=host.deckUI
local function tick()
    host:update(1/60)
    local changed,repaint=host.pageReveal:step(Gate.intent(host),1/60)
    if changed and repaint~=false then host:refresh() end
    host.pageReveal:paint(true)
end
local function settle()
    for _=1,80 do
        if not host.pageReveal:covered() then return end
        tick()
    end
    error(host.pageReveal.error or 'page never settled')
end
local function tap(hit,id)
    local event={touchId=id}
    if hit.listeners.down then hit.listeners.down(event) end
    if hit.listeners.up then hit.listeners.up(event) end
    return hit.click(event)
end
local function cells()
    local byPosition,count={},0
    for _,card in ipairs(pool:GetChildren()) do
        local hit=card:GetChild('hit')
        if card.visible then
            assert(hit.raycastTarget);count=count+1
            local x,y=card.x,card.y
            assert(x%177==0 and x>=-354 and x<=354)
            assert(y==155.5 or y==-81.5)
            local slot=(y==155.5 and 0 or 5)+x/177+3
            assert(not byPosition[slot]);byPosition[slot]=card
        else assert(hit.raycastTarget==false and not hit.click({touchId=999})) end
    end
    return byPosition,count
end
local function roster(size)
    local ids={'demon_form','bash','defend','burn','heavy_blade','inflame','strike'}
    local cards={}
    for i=1,size do cards[i]={uid=1000+i,cardId=ids[(i-1)%#ids+1],upgraded=i%3==0} end
    return cards
end
settle();assert(host:start());settle();assert(F.confirmStart(host));settle()
local run=host.run
run.deck=roster(11)
local nextHit=panel:GetChild('next'):GetChild('hit')
local previousHit=panel:GetChild('previous'):GetChild('hit')
local back=panel:GetChild('pileReturn'):GetChild('hit')
local page=panel:GetChild('pageHint')
assert(host:openDeck())
assert(created==0 and page.text=='第 1/2 页 · 11 张' and deck.pendingGrid and nextHit.interactable)
assert(not previousHit.interactable and not previousHit.raycastTarget and not panel:GetChild('grid').visible)
assert(tap(back,1) and not deck.visible and created==0)
settle();assert(host:openDeck());settle()
local shown,count=cells()
assert(count==10 and created==10 and chunks==50)
local held=shown[1]:GetChild('hit')
held.listeners.down({touchId=7})
assert(tap(nextHit,8));settle()
held.listeners.up({touchId=7})
assert(not held.click({touchId=7}) and not deck.detailPages)
shown,count=cells()
assert(count==1 and deck.pageIndex==2 and not nextHit.interactable and not nextHit.raycastTarget)
local valid=shown[1]:GetChild('hit')
assert(tap(valid,9))
assert(deck.cardDetail.instance.uid==1011)
settle();assert(deck:back());settle()
assert(deck.pageIndex==2)
local validPress={touchId=32}
valid.listeners.down(validPress)
assert(panel.keyListeners.left());settle()
valid.listeners.up(validPress)
assert(not valid.click(validPress) and deck.pageIndex==1)
assert(panel.keyListeners.right());settle()
assert(host:closeDeck());settle();assert(host:openDeck() and deck.pageIndex==2);settle()
assert(deck:setSort('type') and deck.pageIndex==1);settle()
assert(deck.setFilter==nil and page.text=='第 1/2 页 · 11 张')
assert(panel:GetChild('deckSort').visible and panel:GetChild('browserDescription').text=='这些牌将会出现在每一场战斗中。')
assert(host:closeDeck());settle()
for _,amount in ipairs({10,75})do
    run.deck=roster(amount)
    assert(host:openDeck());settle()
    local pages=math.ceil(amount/10)
    assert(deck.pageCount==pages and deck.pageIndex==1)
    for _=2,pages do assert(tap(nextHit,8));settle() end
    local _,last=cells()
    assert(last==amount-(pages-1)*10 and not nextHit.interactable)
    assert(host:closeDeck());settle()
end

assert(Run.startCombat(run,'cultist_solo'))
run.relics={'frozen_eye'}
run.combat.draw=roster(20)
run.combat.draw[20].costForTurn=0
run.combat.discard=roster(7)
run.combat.exhaust={}
host:refresh();settle()
assert(host:openDeck('draw'));settle()
assert(deck.cards[1].uid==1020 and run.combat.draw[1].uid==1001)
assert(not panel:GetChild('deckSort').visible and not panel:GetChild('rarityTip').visible)
assert(panel:GetChild('pileChrome'):GetChild('drawBadge').visible)
local top=cells()[1]:GetChild('face')
assert(top:GetChild('cost').text=='0' and not top:GetChild('costHalo').visible)
assert(deck:stepPage(1));settle()
assert(host:closeDeck());settle();assert(host:openDeck('draw') and deck.pageIndex==2)
settle();assert(host:closeDeck());settle()
assert(host:openDeck('discard') and deck.pageIndex==1);settle()
assert(panel:GetChild('pileChrome'):GetChild('discardBadge').visible and not panel:GetChild('deckSort').visible)
assert(host:closeDeck());settle()
assert(host:openDeck('exhaust') and deck.pageCount==0);settle()
assert(panel:GetChild('pileChrome'):GetChild('empty').visible and page.text=='第 0/0 页 · 0 张')
assert(panel:GetChild('browserDescription').text=='在这场战斗中被 消耗 的牌。')
assert(host:closeDeck());settle()
assert(created==10 and chunks==50 and destroyed==0 and #pool:GetChildren()==10)
local replacement=Run.new(F.Data,2)
host.run=replacement;host:refresh();settle()
assert(destroyed==10 and #pool:GetChildren()==0)
-- A real preparation budget may yield before reaching the failing native create.
local previousClock=factory.clock
local budgetClock=0
factory.clock=function()budgetClock=budgetClock+.005;return budgetClock end
fail=true;assert(host:openDeck());tick();tick()
assert(host.pageReveal:covered() and deck.pendingGrid and not deck.prepareError,
    'budgeted preparation must remain pending before native creation')
for _=3,80 do
    if host.pageReveal.state=='failed' then break end
    tick()
end
factory.clock=previousClock
assert(host.pageReveal.state=='failed' and deck.prepareError)
assert(host:recoverPage() and not deck.visible)
settle();assert(host:openDeck());settle()
assert(not deck.prepareError and deck.pageIndex==1)
local beforeDestroy=destroyed
host:onEngineDestroy()
assert(destroyed==beforeDestroy,'engine teardown owns destruction')
print('DECK_PAGES_PASS')
