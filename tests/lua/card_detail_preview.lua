local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Combat=F.Combat
local function same(a,b)
 if type(a)~='table' or type(b)~='table' then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local passed=0
local function test(name,fn)fn();passed=passed+1;print('PASS '..name)end
local function setup(cards)
 local host,root=F.fixture();assert(F.start(host));host.run.deck=cards
 assert(host:openDeck());host:update(0)
 local panel=root:GetChild('deckPanel')
 return host,panel,panel:GetChild('grid')
end
local function face(panel)return panel:GetChild('cardFocus'):GetChild('face')end
local function body(panel)return face(panel):GetChild('label').text end
local function title(panel)return face(panel):GetChild('name').text end
local function toggle(panel)return panel:GetChild('upgradePreview'):GetChild('hit').click()end

test('ordinary real hit opens current details and preview is reversible without any run mutation',function()
 local host,panel,grid=setup({{uid=101,cardId='bash',upgraded=false}})
 local before=Combat.copy(host.run)
 local hit=grid.items[0]:GetChild('hit')
 assert(hit.visible,'ordinary card detail hit must be visible')
 local refresh=grid.refreshCallback
 assert(hit.click());assert(panel:GetChild('cardFocus').visible and not grid.visible)
 assert(not panel:GetChild('detailHit').visible,'simple cards have no paging')
 local currentFace=face(panel)
 local current=body(panel)
 assert(current:find('8',1,true),'current Bash damage')
 assert(toggle(panel));local upgraded=body(panel)
 assert(upgraded:find('10',1,true) and upgraded~=current,'upgraded Bash damage')
 assert(toggle(panel));assert(body(panel)==current)
 assert(toggle(panel));assert(body(panel)==upgraded)
 assert(same(before,host.run),'details/preview changed complete Run')
 assert(host.deckUI:back());assert(grid.visible and not panel:GetChild('cardFocus').visible)
 assert(face(panel)==currentFace and grid.refreshCallback==refresh,'one face and one grid generation suffice')
 assert(host:closeDeck());assert(same(before,host.run))
end)

test('already upgraded and unupgradeable cards remain current, never downgrade',function()
 for _,card in ipairs({{uid=1,cardId='bash',upgraded=true},{uid=2,cardId='burn',upgraded=false}})do
  local host,panel,grid=setup({card});local before=Combat.copy(host.run)
  assert(grid.items[0]:GetChild('hit').click())
  assert(not panel:GetChild('upgradePreview').visible)
  local text=body(panel)
  assert(not toggle(panel));assert(body(panel)==text)
  assert(same(before,host.run));host:closeDeck()
 end
end)

test('repeatable Searing Blow previews exactly one additional upgrade each time',function()
 local host,panel,grid=setup({{uid=11,cardId='searing_blow',upgraded=true,upgrades=2}})
 local before=Combat.copy(host.run)
 assert(grid.items[0]:GetChild('hit').click());local current=body(panel)
 assert(current:find('21',1,true));assert(title(panel):find('＋2',1,true))
 for _=1,3 do
  assert(toggle(panel));assert(body(panel):find('27',1,true))
  assert(title(panel):find('＋3',1,true))
  assert(toggle(panel));assert(body(panel)==current)
 end
 assert(same(before,host.run));host:closeDeck()
end)
test('combat detail preserves temporary cost and complete battle while previewing',function()
 local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
 local host,_,_,_,_,_,_,root=H.setup()
 host.run.combat.player.statuses.strength=3
 host.run.combat.discard={{uid=301,cardId='bash',upgraded=false,costForTurn=0,damageBonus=7}}
 local before=Combat.copy(host.run)
 assert(host.deckUI:openPile(host.run,'discard'));host.deckUI:update(0)
 local panel=root:GetChild('deckPanel');local grid=panel:GetChild('grid')
 assert(grid.items[0]:GetChild('hit').click())
 assert(face(panel):GetChild('cost').text=='0')
 assert(body(panel):find('18',1,true),'current damage bonus and strength retained')
 assert(toggle(panel));assert(face(panel):GetChild('cost').text=='0')
 assert(body(panel):find('20',1,true),'upgraded damage bonus and strength retained')
 assert(toggle(panel));assert(same(before,host.run),'combat preview modified real cost/piles/RNG')
 host.deckUI:close();assert(same(before,host.run))
end)

test('return retains sort and scroll, stale and destroyed callbacks cannot reopen details',function()
 local cards={};for i=1,20 do cards[i]={uid=i,cardId=i%2==0 and 'bash' or 'defend',upgraded=false}end
 local host,panel,grid=setup(cards)
 assert(host.deckUI:setSort('type'));host:update(0)
 grid.scrollProgress=.6
 local first=grid.items[0];local oldClick=first:GetChild('hit').click
 local oldRefresh=grid.refreshCallback
 assert(oldClick());assert(not oldClick(),'stale card cannot replace active detail')
 assert(toggle(panel));assert(host.deckUI:back());host:update(0)
 assert(host.deckUI.sortMode=='type')
 assert(grid.scrollProgress==.6,'detail return lost scroll position')
 assert(grid.refreshCallback==oldRefresh and grid.items[0]==first,'detail return rebuilt the scroller')
 local before=Combat.copy(host.run)
 grid.destroyOnRefresh=true;grid:RefreshItems(grid.itemCount,grid.refreshCallback)
 assert(first.alive==false);assert(not oldClick())
 assert(host:closeDeck());assert(not toggle(panel))
 oldRefresh(first,0);assert(not oldClick())
 assert(host:openDeck());host:update(0)
 assert(not panel:GetChild('upgradePreview').visible and not host.deckUI.cardDetail)
 assert(same(before,host.run));host:closeDeck()
end)

test('text-only and V4 inspection keep descriptions and reset preview state',function()
 local host,panel,grid=setup({{uid=1,cardId='bash',upgraded=false}})
 assert(grid.items[0]:GetChild('hit').click());assert(toggle(panel))
 assert(host.deckUI:showText('规则','测试正文'))
 assert(not toggle(panel));assert(not panel:GetChild('upgradePreview').visible and not panel:GetChild('cardFocus').visible)
 assert(host:closeDeck())
 local original=require('abyss_original_v4_display')
 local raw=assert(require('abyss_original_v4_data').cards[1])
 local definition={name=raw.name,originalV4=raw}
 do
  assert(host.deckUI:inspect(host.run,definition,false))
  assert(host.deckUI.detailTitle==definition.name)
  local text=original.describe(definition,false)
  assert(#text>0 and #host.deckUI.detailPages>0)
  assert(not panel:GetChild('upgradePreview').visible);host:closeDeck()
 end
end)

test('Searing Blow count-only constructor copies retain their real baseline',function()
 local host,panel,grid=setup({{uid=61,cardId='searing_blow',upgraded=false,upgrades=2,searingBlowCopyUpgrades=2}})
 local before=Combat.copy(host.run);assert(grid.items[0]:GetChild('hit').click())
 assert(body(panel):find('12',1,true))
 for _=1,2 do
  assert(toggle(panel));assert(body(panel):find('18',1,true))
  assert(toggle(panel));assert(body(panel):find('12',1,true))
 end
 assert(same(before,host.run));host:closeDeck()
end)
test('X and unplayable costs remain explicit and readonly',function()
for _,id in ipairs({'whirlwind','burn'})do
 local host,root=F.fixture();assert(F.start(host));host.run.deck={{uid=41,cardId=id,upgraded=false}}
 local before=F.Combat.copy(host.run);assert(host:openDeck());host:update(0)
 local panel=root:GetChild('deckPanel');assert(panel:GetChild('grid').items[0]:GetChild('hit').click())
 local cost=face(panel):GetChild('cost')
 assert(cost.text==(id=='whirlwind' and 'X' or '') and cost.visible==(id=='whirlwind'))
 assert(same(before,host.run));host:closeDeck()
end
end)
test('forced selection retains UID callback rather than opening details',function()
 local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
 local host,_,_,_,_,_,_,root=H.setup();local battle=host.run.combat
 battle.hand={{uid=301,cardId='bash',upgraded=false}};battle.pendingChoice={token='review',op='upgradeHand',uids={301}}
 local picked;assert(host.deckUI:open(host.run,battle.pendingChoice,function(token,uid)picked={token,uid}end));host.deckUI:update(0)
 local panel=root:GetChild('deckPanel');assert(not host.deckUI:showCardDetails(battle.hand[1]));assert(not host.deckUI:toggleUpgradePreview())
 assert(not panel:GetChild('close').visible)
 panel:GetChild('grid').items[0]:GetChild('hit').click();assert(picked[1]=='review' and picked[2]==301)
 assert(not host.deckUI.visible and not host.deckUI.cardDetail)
end)
test('a new Run never inherits a previous upgrade preview',function()
 local host,root=F.fixture();assert(F.start(host));host.run.deck={{uid=1,cardId='bash',upgraded=false}}
 assert(host:openDeck());host:update(0);local panel=root:GetChild('deckPanel');local old=panel:GetChild('grid').items[0]:GetChild('hit').click
 assert(old());assert(host.deckUI:toggleUpgradePreview());assert(host:closeDeck())
 local newer=F.Combat.copy(host.run);newer.deck={{uid=91,cardId='defend',upgraded=true}};host.run=newer
 assert(host:openDeck());host:update(0)
 assert(not host.deckUI.cardDetail);assert(panel:GetChild('grid').items[0]:GetChild('hit').click())
 assert(title(panel):find('防御',1,true));assert(not panel:GetChild('upgradePreview').visible)
 assert(not host.deckUI:toggleUpgradePreview());host:closeDeck()
end)
print('CARD_DETAIL_PREVIEW_PASS '..passed)
