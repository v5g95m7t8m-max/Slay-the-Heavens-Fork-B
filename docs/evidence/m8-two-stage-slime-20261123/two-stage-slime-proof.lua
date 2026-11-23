package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/lua/support/battle_action_fixture.lua')
local finishDeath=dofile('tests/lua/support/monster_death_fixture.lua')
local checkIntent=dofile('tests/lua/support/intent_face_assertion.lua')
local Surfaces=require('abyss_monster_surfaces')
local Intent=require('abyss_battle_intent_view')
local EnemySetup=require('abyss_combat_enemy_setup')
local C=H.F.Combat
if ABYSS_TEST_COLLISION then
 local split=EnemySetup.splitPosition
 EnemySetup.splitPosition=function(parent,i) return split(parent,parent.definitionId=='slime_boss' and i or 1) end
end
local function split(s,i,h,u,tap,drain,touch)
 local actor=s.enemies[i]; local target=math.floor(actor.maxHp/2)
 C.damage(s,s.player,actor,actor.hp-target,true)
 assert(C.intent(s,i).kind=='split')
 h:refresh();tap('endTurn',touch);drain()
 finishDeath(h,u,actor.id);h:refresh()
 return actor,target
end
local function run(width,height,shoot)
 local h,u,p,_,tap,drain=H.setup({'strike'},{'slime_boss'})
 h:resize(width,height)
 local s=h.run.combat
 local boss,half=split(s,1,h,u,tap,drain,101)
 assert(boss.hp==0 and s.enemies[1].definitionId=='spike_slime_l' and s.enemies[3].definitionId=='acid_slime_l')
 assert(s.enemies[1].hp==half and s.enemies[3].hp==half)
 local left=1;local right=3
 local growLeft,growRight=s.enemies[left],s.enemies[right]
 local hp=math.floor(half/2)
 C.damage(s,s.player,growLeft,growLeft.hp-hp,true)
 C.damage(s,s.player,growRight,growRight.hp-hp,true)
 assert(C.intent(s,left).kind=='split' and C.intent(s,right).kind=='split')
 h:refresh();tap('endTurn',102);drain()
 finishDeath(h,u,growLeft.id);finishDeath(h,u,growRight.id);h:refresh()
 local surfaces=assert(Surfaces.get(p))
 local visible,oldEnd={},-640
 for index,actor in ipairs(s.enemies) do
  local box,slot=surfaces:find(actor.id)
  if actor.hp>0 then
   assert(box and box.visible and actor.hp==hp and actor.maxHp==hp)
   assert(actor.definitionId=='spike_slime_m' or actor.definitionId=='acid_slime_m')
   assert(box:GetChild('hp').text==hp..'/'..hp)
   checkIntent(box,Intent.intentView(s,index))
   local hit=box:GetChild('hit')
   local x=box.x+hit.x
   local a,b=x-hit.sizeDeltaX/2,x+hit.sizeDeltaX/2
   assert(a>oldEnd,'split children hitboxes overlap: '..a..' <= '..oldEnd)
   assert(b<=640,'outside canvas')
   oldEnd=b
   visible[#visible+1]={actor=actor,slot=slot,a=a,b=b}
  else assert(not box,'retired parent retained a surface') end
 end
 assert(#visible==4)
 -- Leftmost and rightmost are exercised across widths. Confirm all other HP is unchanged.
 tap('card1',103);tap('enemy'..visible[shoot].slot,104);drain()
 for i,row in ipairs(visible) do
   assert(row.actor.hp==(i==shoot and hp-6 or hp),'selection did not preserve child identity')
   print(string.format('SLIME_BOUNDS %dx%d %s %.2f %.2f HP=%d',width,height,row.actor.definitionId,row.a,row.b,row.actor.hp))
 end
end
run(1280,720,1);run(960,720,4)
print('TWO_STAGE_SLIME_PROOF_PASS')
