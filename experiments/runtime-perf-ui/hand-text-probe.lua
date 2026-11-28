-- Scoped offline ten-hand, two-enemy Host probe. Run with LuaTeX --luaonly.
-- Geometry/state and test-control work are not a GPU or official input measurement.
package.path='build/lua/?.lua;src/lua/?.lua;'..package.path
local candidate=os.getenv('UI_PROBE_CANDIDATE')
if candidate then package.preload.abyss_battle_card_view=assert(loadfile(candidate))end
local measured=arg[1]=='counts'
local reject=arg[1]=='negative'
local count={nativeCalls=0,propertyWrites=0,methods={},properties={}}
if measured then
 local observe=dofile('scripts/runtime-baseline/observer.lua')
 local file=assert(io.open('tests/lua/support/game_ui_fixture.lua'))
 local fixture=file:read('*a');file:close()
 local new,n=fixture:gsub('return NativeContract.control%(self,spec%)','local box=NativeContract.control(self,spec); ABYSS_PROBE_OBSERVE(box,spec); return box')
 assert(n==1)
 ABYSS_PROBE_OBSERVE=function(box,spec)observe(box,count,true,spec)end
 ORIGINAL_FIXTURE=dofile
 dofile=function(path) if path=='tests/lua/support/game_ui_fixture.lua' then return assert(load(new,'@'..path))() end;return ORIGINAL_FIXTURE(path) end
end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local Combat=require('abyss_combat')
local Theme=require('abyss_theme')
assert(Theme.presentationProfile=='official-assets-first')
local Cursor={CursorDown='down',CursorDrag='drag',CursorUp='up',CursorEndDrag='endDrag',CursorEnter='enter',CursorExit='exit'}
local fitCount,renderCount=0,0
if measured then
 local Display=require('abyss_card_display')
 local fit=Display.fit
 Display.fit=function(...)fitCount=fitCount+1;return fit(...)end
end
local host,root=F.fixture(nil,nil,nil,Cursor)
host.seed=42
assert(F.start(host))
assert(host.run.runSeed=='42')
assert(Run.startCombat(host.run,'small_slimes'))
local state=host.run.combat
for i,actor in ipairs(state.enemies) do actor.sourcePosition=({{x=-230,y=32},{x=35,y=8}})[i] end
Combat.draw(state,20)
assert(#state.hand==10 and #state.enemies==2 and state.energy==3)
host:resize(1280,720)
host:refresh()
local ui,panel=host.battleUI,root:GetChild('battlePanel')
local realRender=ui.render
if measured then
 ui.render=function(...)renderCount=renderCount+1;return realRender(...)end
end
local surface={}
local function readFaces(label)
 for i=1,#state.hand do
  local box=assert(panel:GetChild('card'..i))
  for _,part in ipairs({'name','type','label','cost'}) do
   local t=assert(box:GetChild(part))
   surface[#surface+1]=table.concat({label,i,part,t.text,t.fontSize or -1,tostring(t.visible),'/'},'|')
  end
 end
end
local function dispatch(name,touch)
 local box=F.actorControl(panel,name)
 local hit=box.listeners and box or box:GetChild('hit')
 assert(hit and hit.listeners.click and hit.raycastTarget~=false)
 local event={touchId=touch,GetUIPos=function()return 640+(box.x or 0),360+(box.y or 0)end}
 return function() if hit.listeners.down then hit.listeners.down(event)end end, function()
  if hit.listeners.up then hit.listeners.up(event)end
  return hit.listeners.click(event)
 end
end
local function click(name,touch) local down,finish=dispatch(name,touch);down();return finish()end
local function drain()
 for i=1,400 do
  if not ui.busy and not host.motion.deathReveal then return i-1 end
  host:update(.05)
 end
 error('playback failed to unlock')
end
local function numbers()
 return {count.nativeCalls,count.propertyWrites,fitCount,renderCount}
end
local function stage(name,f)
 local prev=numbers()
 local start,wallStart=os.clock(),os.gettimeofday()
 local a=f()
 local elapsed,wall=(os.clock()-start)*1000,(os.gettimeofday()-wallStart)*1000
 local after=numbers()
 for i=1,#after do after[i]=after[i]-prev[i] end
 print(('UI_SAMPLE %s %.6f %.6f %d %d %d %d %.2f'):format(name,elapsed,wall,after[1],after[2],after[3],after[4],collectgarbage('count')))
 return a
end
drain()
readFaces('start')
if reject then
 local slot
 for i,card in ipairs(state.hand)do if card.cardId=='strike'then slot=i;break end end
 assert(slot)
 click('card'..slot,10)
 assert(ui.selected==state.hand[slot].uid)
 local hp,energy,uid,events=state.enemies[1].hp,state.energy,ui.selected,#state.events
 ui.render=function(self,...)
  if self.busy and self.displayBattle then error('ui-perf prep render guard') end
  return realRender(self,...)
 end
 click('enemy1',11)
 assert(state.enemies[1].hp==hp and state.energy==energy and #state.events==events and ui.selected==uid and not ui.busy,
    'presentation error reached or mutated the gameplay transaction')
 print('UI_NEGATIVE_PASS precommit render failed before command')
 return
end
for i=1,120 do stage('steady',function()host:update(1/60)end)end
for i=1,3 do
 local slot
 for j,card in ipairs(state.hand)do if card.cardId=='strike'then slot=j;break end end
 assert(slot,'seed no longer has three Strikes')
 local uid=state.hand[slot].uid
 local target=(i-1)%2+1
 local hp,energy=state.enemies[target].hp,state.energy
 stage('choose',function()click('card'..slot,100+i*2)end);assert(ui.selected==uid)
 local down,finish=dispatch('enemy'..target,101+i*2)
 stage('target-down',down)
 assert(state.energy==energy and state.enemies[target].hp==hp,'target preview committed a command')
 stage('commit',finish)
 assert(state.energy==energy-1 and state.enemies[target].hp==hp-6 and ui.selected==nil,'command does not match real Strike')
 local ticks=stage('settle',drain);assert(ticks>0)
 readFaces('after'..i)
end
local id=0
local function visit(box)
 id=id+1
 for _,part in ipairs(box:GetChildren())do visit(part)end
end
visit(root)
print('UI_SIGNATURE '..id..'|energy='..state.energy..'|hp='..state.enemies[1].hp..','..state.enemies[2].hp..'|'..table.concat(surface,';'))

local f=assert(io.open('/proc/self/status'))
local proc=f:read('*a');f:close()
local hwm=assert(proc:match('VmHWM:%s+(%d+) kB'))
print('UI_PROCESS '..hwm..' '.._VERSION..' LuaTeX:'..status.luatex_version)
