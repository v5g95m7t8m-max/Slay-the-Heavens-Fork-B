import {createRequire} from 'node:module'
import {performance} from 'node:perf_hooks'
import {readFileSync} from 'node:fs'
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari')
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L)
lua.lua_pushjsfunction(L,S=>{lua.lua_pushnumber(S,performance.now());return 1});
lua.lua_setglobal(L,to_luastring('PERF_NOW'))
lua.lua_pushstring(L,to_luastring(process.argv[3] ?? 'base'));lua.lua_setglobal(L,to_luastring('PERF_ARM'))
const file=process.argv[2];
const src="package.path='build/lua/?.lua;src/lua/?.lua;'..package.path\n"+readFileSync(file,'utf8');
if(lauxlib.luaL_dostring(L,to_luastring(src))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
