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
local advanced=arg[2]=='advanced'
local A=require('abyss_actor')
local SF=require('abyss_silent_final_cards')
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
local data=F.Combat.copy(F.Data)
data.statuses=SF.withCardDefinitions(F.Data).statuses
local combat=F.Combat.new(data,{enemies={'bronze_orb','cultist'},deck={'strike'},seed=42,enableStances=advanced})
assert((combat.experimentalMechanics==true)==advanced,'combat dispatcher mismatch')
local orb,secondary=combat.enemies[1],combat.enemies[2]
local corpseApplied=0
local apply=SF.apply
SF.apply=function(api,state,item,...)
 if state==combat and item.effect.kind=='corpseDamage'then corpseApplied=corpseApplied+1 end
 return apply(api,state,item,...)
end
orb.block=0
A.applyPower(combat,orb,'corpse_explosion',1,combat.player)
assert(table.concat(orb.powerOrder,',')=='corpse_explosion','pre-lethal Corpse Explosion status missing')
run.combat=combat
local ids={}
for index,e in ipairs(combat.enemies) do e.hp=1; assert(e.id and not ids[e.id]); ids[e.id]=index end
local function visible(box)
 if not box or box.alive==false or not box.activeInHierarchy then return false end
 repeat if box.visible==false then return false end; box=box.parent until not box
 return true
end
host:refresh();settle()
local manager=assert(Surfaces.get(battle))
assert(#combat.enemies==2 and not list.visible and cues==0)
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
 if forceEarly and frame==firstContact then list:SetVisible(true) end
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
assert(corpseApplied==1,'real Corpse Explosion death hook must be applied exactly once')
assert(reward and firstContact and edges==1 and cues==1,'reward never revealed exactly once')
assert(contact[orb.id]==firstContact and contact[orb.id]<contact[secondary.id],'expected direct lethal contact before chain lethal contact')
assert(retired[orb.id]<=reward and retired[secondary.id]<=reward, 'actor retirement must not be after reward')
assert(rewardSet and lastRelease>0 and lastRelease<rewardSet, 'actor destroy must precede reward SetVisible within the frame')
for _,gone in pairs(monitored)do assert(type(gone)=='number' and gone<rewardSet,'actor destroy not observed')end
print('ACTOR_DESTROY_THEN_REWARD_SET',lastRelease,rewardSet)
assert(host.run==run and run.combat==combat and run.phase=='reward')
for id,index in pairs(ids)do print('ACTOR',index,id,contact[id],retired[id])end
print('CHAIN_LETHAL_REWARD_PASS',advanced and 'advanced' or 'native',firstContact,reward,reward-firstContact,edges,cues,corpseApplied)
