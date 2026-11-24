require('abyss_theme');require('abyss_data');require('abyss_ui_layout');require('abyss_ui_templates');require('abyss_presentation')
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
assert(require('abyss_theme').presentationProfile=='official-assets-first')
for _,path in ipairs({'right-click','deck-roundtrip'})do
 local h,u,p,e,t,drain,deckToggle,root=H.setup({'defend','strike'},{'cultist'},{keyEvents={KeyboardSprintKeyDown='rmb'}})
 local b=h.run.combat
 local function cardSlot(wanted)
  for i,instance in ipairs(b.hand) do if instance.cardId==wanted then return 'card'..i,instance end end
  error('missing card '..wanted)
 end
 local defend,first=cardSlot('defend')
 local strike,second=cardSlot('strike')
 local enemy=b.enemies[1]
 local _,slot=require('abyss_monster_surfaces').get(p):find(enemy.id)
 local target='enemy'..slot
 local notice=p:GetChild('notice')
 t(defend,21);assert(u.selected==first.uid,'guard not selected by real tap')
 b.energy=0
 t('playArea',22);assert(u.selected==first.uid and notice.text=='能量不足','real playArea rejection must be visible')
 h:refresh();assert(notice.text=='能量不足','ordinary refresh hid an active rejection')
 local hp,amount,turn,events=enemy.hp,#b.hand,b.turn,#b.events
 e(target,'down',23)
 if path=='right-click' then
  local keys=root.keyListeners or p.keyListeners
  assert(keys and keys.rmb and keys.rmb(),'real registered right click must cancel')
 else deckToggle() end
 assert(not u.selected and notice.text=='',path..' stale rejection remains: '..notice.text)
 assert(enemy.hp==hp and #b.hand==amount and b.energy==0 and b.turn==turn and #b.events==events)
 b.energy=3;h:refresh()
 t(strike,24);assert(u.selected==second.uid and notice.text=='','fresh different card must select with blank notice')
 e(target,'up',23);e(target,'click',23)
 assert(enemy.hp==hp and #b.hand==amount and b.energy==3 and b.turn==turn and #b.events==events,'stale target reaches the newly selected card')
 t(target,25);drain()
 assert(enemy.hp==hp-6 and #b.hand==amount-1 and b.energy==2 and b.turn==turn and notice.text=='','fresh target must play exactly once')
 print('TASK_42_2_NOTICE_PASS '..path)
end
