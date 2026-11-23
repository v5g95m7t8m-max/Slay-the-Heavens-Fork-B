local GameUI=require('abyss_game_ui')
local make=GameUI.new
local held
local serial,lastRelease,rewardSet=0,0,nil
local monitored={}
GameUI.new=function(root,data,presentation,event,platform)
 platform.controllerApi={events={Confirm='navConfirm',Cancel='navCancel'},directions={Left='left',Right='right'},modes={Specified='specified'},
  isController=function()return false end,getFocus=function()end,setFocus=function()end}
 platform.presentationReady=function(intent)return not (held and intent.page=='battlePanel')end
 local api=platform.monsterActors
 local release=api.destroy
 api.destroy=function(box)
  local result=release(box)
  if monitored[box] then serial=serial+1;monitored[box]=serial;lastRelease=serial end
  return result
 end
 return make(root,data,presentation,event,platform)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local Gate=require('abyss_page_reveal')
local Surfaces=require('abyss_monster_surfaces')
local forceEarly=arg[1]=='early'
local cues=0
local host,root=F.fixture(nil,function()return true end,nil,{CursorDown='down',CursorUp='up'},nil,function(cue)
 if cue=='victory' then cues=cues+1 end
end)
local battle=root:GetChild('battlePanel')
local cover=root:GetChild('pageReveal')
local list=battle:GetChild('rewardList')
local banner=battle:GetChild('feedback'):GetChild('bannerPlate')
local function tick()host:update(1/60);host.pageReveal:step(Gate.intent(host));host:refresh()end
local function settle()
 for _=1,4 do tick()end
 assert(not cover.visible and not host.pageReveal:covered())
end
settle();assert(host:start());settle();assert(F.confirmStart(host));settle()
assert(Run.startCombat(host.run,'cultist_solo'));host:refresh();settle()
local run=host.run
local combat=F.Combat.new(run.data,{enemies={'cultist'},deck={'twin_strike'},seed=42})
local enemy=combat.enemies[1]
run.combat=combat
local ids={}
for index,e in ipairs(combat.enemies) do e.hp=6; assert(e.id and not ids[e.id]); ids[e.id]=index end
local function visible(box)
 if not box or box.alive==false or not box.activeInHierarchy then return false end
 repeat if box.visible==false then return false end; box=box.parent until not box
 return true
end
host:refresh();settle()
local manager=assert(Surfaces.get(battle))
assert(#combat.enemies==1 and not list.visible and cues==0)
local rawSet=list.SetVisible
list.SetVisible=function(self,v)
 if v and not self.visible and not rewardSet then serial=serial+1;rewardSet=serial end
 return rawSet(self,v)
end
for id in pairs(ids) do
 local box=manager:find(id)
 assert(visible(box),'pre-lethal stable actor is missing')
 monitored[box]=true
end
host.battleUI:playSlot(1);host.battleUI:playSelected(1)
local damage=0
for _,event in ipairs(combat.events) do if event.kind=='damage' then damage=damage+1 end end
assert(damage==2,'expected real Twin Strike to execute two damage events')
assert(enemy.hp==0 and run.phase=='reward','expected real overkill and committed reward')
local nonlethalFrame=0
local contact,retired={},{}
local reward,firstContact,edges=nil,nil,0
local previous=false
local function claimOnce()
local gold=run.gold
battle:GetChild('goldReward').click()
local claimed=run.gold
assert(run.rewards.goldClaimed and claimed>gold,'reward action did not claim')
battle:GetChild('goldReward').click()
assert(run.gold==claimed,'reward action double-claimed')
end
for frame=1,400 do
 host:update(1/60)
 assert(not cover.visible and not host.pageReveal:covered(),'lethal feedback/settlement flashed a cover')
 assert(not banner.visible,'victory displayed a separate combat feedback plate')
 local remaining=0
 local shown=host.battleUI.displayBattle
 if shown and shown.enemies and shown.enemies[1] and shown.enemies[1].hp==1 and nonlethalFrame==0 then
  nonlethalFrame=frame
  assert(visible(manager:find(enemy.id)) and not visible(list),'first hit HP 1 must display before reward')
 end
 for id in pairs(ids) do
  local box=manager:find(id)
  if visible(box) then remaining=remaining+1 end
  if not contact[id] and host.battleUI.feedback.deaths[id] then
   contact[id]=frame; firstContact=firstContact or frame
   assert(visible(box),'actor must remain visible on lethal contact: '..tostring(id))
  end
  if not box then
   assert(contact[id],'retired actor never had visible contact: '..tostring(id))
   retired[id]=retired[id] or frame
  elseif retired[id] then error('retired actor resurfaced')
  end
 end
 if forceEarly and frame==nonlethalFrame then list:SetVisible(true) end
 local now=visible(list)
 if now then
  assert(remaining==0 and next(retired) and not host.battleUI.busy,'rewards revealed before all lethal actors retired')
  for id in pairs(ids) do assert(retired[id] and retired[id]>contact[id],'actor did not retire after a visible lethal frame') end
  if not previous then edges=edges+1;reward=reward or frame;claimOnce() end
 end
 if reward then assert(now and cues==1,'reward sheet or victory cue unstable after reveal') end
 if cues>0 then assert(now and not host.battleUI.busy,'victory cue did not hand off to rewards') end
 previous=now
 if reward and frame>=reward+8 then break end
end
assert(reward and firstContact and edges==1 and cues==1,'reward never revealed exactly once')
assert(nonlethalFrame>0 and nonlethalFrame<firstContact,'first hit must be visible before second-hit lethal')
assert(retired[enemy.id]<=reward,'actor retirement must not be after reward')
assert(rewardSet and lastRelease>0 and lastRelease<rewardSet,'actor destroy must precede visible rewards')
assert(host.run==run and run.combat==combat and run.phase=='reward')
print('TWIN_STRIKE_OVERKILL_PASS',nonlethalFrame,firstContact,retired[enemy.id],reward,edges,cues,damage,lastRelease,rewardSet)
