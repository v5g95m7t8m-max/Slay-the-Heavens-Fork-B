import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const generated=process.argv[2];
const runtime=process.argv[3]==='gil-native-readback' ? JSON.parse(readFileSync(join(generated, 'performance-readback.json'))) : null;
let artFeatures;
if(runtime){
 lua.lua_pushboolean(L,true);
 lua.lua_setglobal(L,to_luastring('BASELINE_GIL'));
 lua.lua_pushjsfunction(L,state=>{
  artFeatures={};
  for(const key of ['cards','menuBackground','selectionAvatar','battlePortrait','monsters']){
   lua.lua_getfield(state,1,to_luastring(key));
   if(lua.lua_type(state,-1)!==lua.LUA_TBOOLEAN)throw Error('Missing packaged art flag: '+key);
   artFeatures[key]=lua.lua_toboolean(state,-1);lua.lua_pop(state,1);
  }
  return 0;
 });
 lua.lua_setglobal(L,to_luastring('BASELINE_ART_FEATURES'));
}
if(generated){
 lua.lua_pushstring(L,to_luastring(generated.replaceAll('\\','/')));
 lua.lua_setglobal(L,to_luastring('BASELINE_GENERATED'));
}
const sceneMode=process.argv.at(-1);
// The published arm mounts the shared worker over its older read-only checkout.
// Candidate expectations come from the formal controller without new imports.
const expectedScene=/^--act2-candidate=([1-9]\d{0,5})$/.exec(sceneMode);
if(sceneMode.startsWith('--act2-candidate')&&!expectedScene)throw Error('invalid approved Act II scene slot count');
if(generated&&(sceneMode==='--act2'||expectedScene)){
 lua.lua_pushboolean(L,true);
 lua.lua_setglobal(L,to_luastring('BASELINE_ACT2'));
 if(expectedScene){
  lua.lua_pushinteger(L,Number(expectedScene[1]));
  lua.lua_setglobal(L,to_luastring('BASELINE_ACT2_EXPECTED_SLOTS'));
 }
}
const rows=[];let previous=performance.now(),before=[0,0,0,0,0];
let beforeMethods={},beforeProperties={};
function histogram(state,index){
 const result={};lua.lua_pushnil(state);
 while(lua.lua_next(state,index)!==0){
  const key=to_jsstring(lua.lua_tostring(state,-2));
  Object.defineProperty(result,key,{value:lua.lua_tonumber(state,-1),enumerable:true});lua.lua_pop(state,1);
 }
 return result;
}
const delta=(current,previous)=>Object.fromEntries(Object.entries(current).map(([key,value])=>[key,value-(Object.hasOwn(previous,key)?previous[key]:0)]).filter(([,value])=>value!==0));
const keys=['requireCalls','moduleLoads','nativeCalls','propertyWrites','snapshots'];
lua.lua_pushjsfunction(L,state=>{
 const now=performance.now(),label=to_jsstring(lua.lua_tostring(state,1));
 const current=keys.map((_,i)=>lua.lua_tonumber(state,i+2));
 const methods=histogram(state,7),properties=histogram(state,8);
 rows.push({phase:label,elapsedMs:now-previous,...Object.fromEntries(keys.map((key,i)=>[key,current[i]-before[i]])),nativeMethods:delta(methods,beforeMethods),propertyNames:delta(properties,beforeProperties),memory:process.memoryUsage()});
 previous=now;before=current;beforeMethods=methods;beforeProperties=properties;return 0;
});
lua.lua_setglobal(L,to_luastring('BASELINE_MARK'));
const fixture=readFileSync('tests/lua/support/game_ui_fixture.lua','utf8');
const needle='return NativeContract.control(self,spec)';
if(fixture.split(needle).length!==2)throw Error('Host instrumentation anchor changed');
lua.lua_pushstring(L,to_luastring(fixture.replace(needle, 'local control=NativeContract.control(self,spec); ABYSS_HOST_CONTROL(control,spec); return control')));
lua.lua_setglobal(L,to_luastring('BASELINE_FIXTURE'));
const code=readFileSync(new URL('./host.lua',import.meta.url),'utf8');
if(lauxlib.luaL_dostring(L,to_luastring(code))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
if(runtime&&!artFeatures)throw Error('Packaged production entry did not report its live art flags');
console.log('RUNTIME_BASELINE_JSON '+JSON.stringify({rows,maxRssKiB:process.resourceUsage().maxRSS,
 ...(runtime&&{runtime,artFeatures})}));
