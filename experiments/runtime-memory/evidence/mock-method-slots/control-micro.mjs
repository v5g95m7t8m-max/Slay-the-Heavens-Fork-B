import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const [root,generated,fixtureSource]=process.argv.slice(2);
if (!global.gc) throw Error('Micro allocation attribution requires --expose-gc');
process.chdir(root);
const req=createRequire(join(root,'package.json'));
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=req('fengari');
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const run=code=>{if(lauxlib.luaL_dostring(L,to_luastring(code))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));};
lua.lua_pushstring(L,to_luastring(readFileSync(fixtureSource,'utf8')));
lua.lua_setglobal(L,to_luastring('probedFixture'));
run(`package.path=${JSON.stringify(generated+'/?.lua;src/lua/?.lua;')}..package.path
 F=assert(load(probedFixture,'@game_ui_fixture.lua'))()
 probedFixture=nil
 local test=F.control({name='small',kind='container',children={{name='child',kind='image'}}})
 assert(test:GetChild('child')); local SetVisible=test.SetVisible
 assert(test.SetVisible==test:GetChild('child').SetVisible)
 local override=function(c,v) c.visible=v==false end
 test.SetVisible=override
 assert(test.SetVisible==override)
 test:SetVisible(false); assert(test.visible)
 test.SetVisible=SetVisible
 test:SetVisible(false); assert(not test.visible)
 test:SetVisible(true); assert(test.visible)`);
for(let i=0;i<3;i++)global.gc();
const before=process.memoryUsage();
run(`root=F.control({name='canvas',children=F.Layout})`);
for(let i=0;i<3;i++)global.gc();
const after=process.memoryUsage();
run(`local methods={'GetChild','AddKeyEventListener','SetVisible','SetSizeDelta','SetLocalScale','SetAnchoredPosition','SetImage','SetAsLastSibling','AddCursorEventListener'}
local nodes,own,lookup=0,0,0
local function count(n)
 nodes=nodes+1
 for i=1,#methods do
   if rawget(n,methods[i]) then own=own+1 end
   assert(type(n[methods[i]])=='function'); lookup=lookup+1
 end
 for _,c in pairs(n.children) do count(c) end
end
count(root); return nodes,own,lookup`);
console.log(JSON.stringify({armSha:createHash('sha256').update(readFileSync(fixtureSource)).digest('hex'),nodes:lua.lua_tointeger(L,-3),own:lua.lua_tointeger(L,-2),lookup:lua.lua_tointeger(L,-1),before,after,deltaHeapUsed:after.heapUsed-before.heapUsed}));
