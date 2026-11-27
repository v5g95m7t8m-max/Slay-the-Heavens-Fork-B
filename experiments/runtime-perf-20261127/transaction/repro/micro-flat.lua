local Run,Combat,Data=require('abyss_run'),require('abyss_combat'),require('abyss_data')
local run=Run.new(Data,'42')
assert(Run.startCombat(run,'louse_pair'))
local combat=run.combat
Combat.draw(combat,10-#combat.hand)
assert(#combat.hand==10 and #combat.enemies==2)
local visited,stack,n,f,kt={}, {run},0,0,0
while #stack>0 do
 local t=table.remove(stack)
 if not visited[t] then
  visited[t]=true; n=n+1
  for k,v in next,t do
   f=f+1
   if type(k)=='table' then kt=kt+1; stack[#stack+1]=k end
   if type(v)=='table' then stack[#stack+1]=v end
  end
 end
end
print('scope',n,f,kt)
local modules={}
for _,name in ipairs{'base','flat','direct'} do modules[name]=dofile('build/perf-tx/'..name..'.lua') end
local function ms(scope,pass,name,count)
 for i=1,count do
  local t=PERF_NOW()
  local restore,owner=modules[name].capture(run,combat)
  local duration=PERF_NOW()-t
  assert(type(restore)=='function')
  assert(modules[name].release(owner))
  if scope~='warm' then print(scope,pass,name,i,duration) end
 end
end
for _,name in ipairs{'base','flat','direct'} do ms('warm',0,name,4) end
for pass=1,9 do
 local order=({{'base','flat','direct'},{'flat','direct','base'},{'direct','base','flat'}})[(pass-1)%3+1]
 for _,name in ipairs(order) do ms('trial',pass,name,4) end
end
