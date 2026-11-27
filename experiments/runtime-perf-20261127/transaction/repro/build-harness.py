from pathlib import Path
prod=Path('tests/lua/support/production_performance.lua').read_text()
prod=prod.replace("host.seed=42","host.seed=10",1).replace("host.run.runSeed=='42'","host.run.runSeed=='10'",1)
prod=prod[:prod.index("local panel=stage:GetChild('deckPanel')",prod.index("mark('consecutive-play')"))]
prod=prod.replace("local coldLookups=assert(counts.mapGroupLookups","local coldLookups=not PERF_OBSERVER and 0 or assert(counts.mapGroupLookups")
prod=prod.replace("local first=assert(F.Nodes.available(host.run,host.map)[1])","assert(host.run.encounters.normal[1]=='2 Louse')\nlocal first=assert(F.Nodes.available(host.run,host.map)[1])").replace("local firstDecoded=decoded(art)","assert(#battle.enemies==2 and host.run.encounterSource=='2 Louse')\nlocal firstDecoded=decoded(art)")
prod=prod.replace("for _=1,60 do OnUpdate(1/60) end", """for _=1,30 do OnUpdate(1/60) end
for i=1,120 do
 local t=PERF_NOW()
 OnUpdate(1/60)
 PERF_PRINT('steady',i,PERF_NOW()-t)
end""")
prod=prod.replace("""    if hit.listeners.down then hit.listeners.down(event) end
    if hit.listeners.up then hit.listeners.up(event) end
    hit.click(event)
    if awaitPresentation~=false then settle() end""","""    local t=PERF_NOW()
    if hit.listeners.down then hit.listeners.down(event) end
    PERF_PRINT('down',touchId,PERF_NOW()-t)
    t=PERF_NOW()
    if hit.listeners.up then hit.listeners.up(event) end
    PERF_PRINT('up',touchId,PERF_NOW()-t)
    t=PERF_NOW()
    hit.click(event)
    PERF_PRINT('click',touchId,PERF_NOW()-t)
    if awaitPresentation~=false then
        local updates=0
        while not ready() and updates<240 do
            updates=updates+1
            t=PERF_NOW()
            OnUpdate(1/60)
            PERF_PRINT('feedback-tick',touchId,PERF_NOW()-t)
        end
        assert(ready())
    end""")
prod=prod.replace("local battlePanel=stage:GetChild('battlePanel')", """local battlePanel=stage:GetChild('battlePanel')
if PERF_OBSERVER then
 local function trace(owner,key,label)
    local original=owner[key]
    owner[key]=function(...)
       local t=PERF_NOW()
       local ret=table.pack(original(...))
       PERF_PRINT(label,PERF_TOUCH or 0,PERF_NOW()-t)
       return table.unpack(ret,1,ret.n)
    end
 end
 trace(require('abyss_run'),'play','run-play')
 trace(F.Combat,'play','combat-play')
 trace(require('abyss_snapshot'),'capture','capture')
 trace(host.battleUI,'render','battle-render')
 trace(host,'refresh','host-refresh')
end""")
prod=prod.replace("    local t=PERF_NOW()\n    if hit.listeners.down", "    PERF_TOUCH=touchId\n    local t=PERF_NOW()\n    if hit.listeners.down")
prod=prod.replace("mark('consecutive-play')","""mark('consecutive-play')
print('TX_RESULT',#battle.hand,battle.energy,battle.enemies[1].hp,battle.enemies[2].hp,#battle.events,battle.turn)
destroy(script.object)
OnDestroy()
assert(not script.updating)
print('TX_HOST_PASS')""")
Path('build/perf-tx/production-scenario.lua').write_text(prod)
host=Path('scripts/runtime-baseline/host.lua').read_text()
host=host.replace("require=function(name)","if PERF_OBSERVER then require=function(name)",1).replace("local function mark(label)","end\nlocal function mark(label)",1)
host=host.replace("ABYSS_HOST_CONTROL=function(control,spec)observe(control,counts,BASELINE_GENERATED~=nil,spec)end","ABYSS_HOST_CONTROL=function(control,spec) if PERF_OBSERVER then observe(control,counts,BASELINE_GENERATED~=nil,spec)end end")
host=host.replace("""local Snapshot=require('abyss_snapshot');local capture=Snapshot.capture
Snapshot.capture=function(...)counts.snapshots=counts.snapshots+1;return capture(...)end""","""package.loaded.abyss_snapshot=dofile('build/perf-tx/'..PERF_ARM..'.lua')
if PERF_OBSERVER then
 local Snapshot=require('abyss_snapshot');local capture=Snapshot.capture
 Snapshot.capture=function(...)counts.snapshots=counts.snapshots+1;return capture(...)end
end""")
host=host.replace("tests/lua/support/production_performance.lua","build/perf-tx/production-scenario.lua")
Path('build/perf-tx/host.lua').write_text(host)
worker=Path('scripts/runtime-baseline/worker.mjs').read_text()
worker=worker.replace("const generated=process.argv[2];","""const generated=process.argv[2]
const arm=process.argv[3]
if(!['base','queue','direct','flat'].includes(arm))throw Error('unrecognized arm')
lua.lua_pushstring(L,to_luastring(arm));
lua.lua_setglobal(L,to_luastring('PERF_ARM'));
lua.lua_pushboolean(L,process.argv[4]==='observer');
lua.lua_setglobal(L,to_luastring('PERF_OBSERVER'));
lua.lua_pushjsfunction(L,S=>{lua.lua_pushnumber(S,performance.now());return 1});
lua.lua_setglobal(L,to_luastring('PERF_NOW'));
const timeline=[]
lua.lua_pushjsfunction(L,S=>{
 timeline.push([to_jsstring(lua.lua_tostring(S,1)),lua.lua_tonumber(S,2),lua.lua_tonumber(S,3)]);
 return 0;
});
lua.lua_setglobal(L,to_luastring('PERF_PRINT'));""")
worker=worker.replace("...(runtime&&{runtime,artFeatures})", "timeline, ...(runtime&&{runtime,artFeatures})")
Path('build/perf-tx/worker.mjs').write_text(worker)
