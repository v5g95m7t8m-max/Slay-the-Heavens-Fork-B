import { mkdtempSync,readdirSync,rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd(), req=createRequire(resolve('package.json'));
const { buildUI }=await import(pathToFileURL(resolve('scripts/build-ui.mjs')));
const { buildLuaData,luaString }=await import(pathToFileURL(resolve('scripts/build-lua-data.mjs')));
const dir=mkdtempSync(resolve(tmpdir(),'current-intent-ui-'));
try {
 buildLuaData('data',dir+'/abyss_data.lua');
 buildUI(dir,undefined,{officialAssets:true, refinedReleaseMonsterArt:true, nativePageLifecycle:true});
 const pre=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>
   `package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(dir+'/'+n)}))`).join('\n');
 const r=spawnSync(process.execPath,[req.resolve('fengari-node-cli/src/lua-cli.js'),'-e',
   "package.path='./src/lua/?.lua;'..package.path\n"+pre+"\ndofile('tests/lua/current_enemy_intent_tooltip.lua')"],
   {stdio:'inherit',cwd:root,timeout:90000,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 if(r.error) throw r.error;process.exitCode=r.status??1;
} finally { rmSync(dir,{recursive:true,force:true}); }
