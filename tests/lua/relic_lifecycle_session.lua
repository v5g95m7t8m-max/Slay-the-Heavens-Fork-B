local F=dofile('tests/helpers/relic-lifecycle-baseline-support.lua')
dofile('tests/lua/common_relic_equipment.lua')
local R,B,Shop=F.R,F.boss,F.shop
do
 local r=R.new(F.D,42);local root=F.root(r)
 assert(R.obtainRelic(r,'empty_cage'));local uid=r.deck[1].uid
 local called,accepted=F.call(root,'boss adapter first selection',B.select,r,uid,R)
 F.eq(called,true,'first selection runs');F.eq(accepted,true,'first selection accepted')
 called,accepted=F.call(root,'boss duplicate selection rejected',B.select,r,uid,R)
 F.eq(called,true,'duplicate selection runs');F.eq(accepted,false,'duplicate selection rejected')
 called,accepted=F.call(root,'boss adapter final selection',B.select,r,r.deck[2].uid,R)
 F.eq(called,true,'final selection runs');F.eq(accepted,true,'final selection accepted')
 F.eq(r.pendingBossRelic,nil,'two selected cards removed')
end
do
 local r=R.new(F.D,42);assert(R.obtainRelic(r,'calling_bell'));local root=F.root(r)
 local called,accepted=F.call(root,'boss reward Run adapter',B.claim,r,'relic',1,R)
 F.eq(called,true,'claim runs');F.eq(accepted,true,'first claim accepted')
 called,accepted=F.call(root,'boss already claimed refuses',B.claimRelic,r,1,R)
 F.eq(called,true,'repeated claim runs');F.eq(accepted,false,'repeated claim rejected')
 called,accepted=F.call(root,'boss finishes pending rewards',B.claim,r,'done',nil,R)
 F.eq(called,true,'finish runs');F.eq(accepted,true,'finish accepted')
 F.eq(r.pendingBossRelic,nil,'finished boss rewards cleared')
end
do
 local r=R.new(F.D,42);local original=r.deck[1];original.upgraded=true;original.upgrades=1
 assert(R.obtainRelic(r,'dollys_mirror'));local root=F.root(r)
 local called,accepted=F.call(root,'mirror ordinary public selection',Shop.chooseMirror,r,original.uid,R)
 F.eq(called,true,'mirror selection runs');F.eq(accepted,true,'mirror selection accepted')
 F.eq(r.deck[#r.deck].cardId,original.cardId,'mirror identity');assert(r.deck[#r.deck].uid~=original.uid)
end
do
 local r=R.new(F.D,42);local root=F.root(r);local check=F.unchanged(r)
 local original=F.hooks.onEquip;local sentinel={kind='post-equipment-error'};root.sentinel=sentinel
 F.hooks.onEquip=function(owner,id,...)
  local ok,why=original(owner,id,...);if id=='whetstone'then error(sentinel,0)end;return ok,why
 end
 local called,accepted=F.call(root,'real obtain rollback after equipment RNG and upgrades',R.obtainRelic,r,'whetstone')
 F.hooks.onEquip=original;F.eq(called,true,'Run catches callback');F.eq(accepted,false,'outer command rejected');check()
 assert(R.obtainRelic(r,'whetstone'));F.snapshot('real equipment retry',root)
end
F.finish('session')
