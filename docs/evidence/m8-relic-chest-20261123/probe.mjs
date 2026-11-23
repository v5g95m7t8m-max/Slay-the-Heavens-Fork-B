import {buildUI} from '../../../scripts/build-ui.mjs';
import {buildLuaData,luaString} from '../../../scripts/build-lua-data.mjs';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
process.chdir(fileURLToPath(new URL('../../../',import.meta.url)));
const dir=mkdtempSync(tmpdir()+'/relic-chest-').replaceAll('\\','/');
const witness=fileURLToPath(new URL('./probe.lua',import.meta.url)).replaceAll('\\','/');
try {
buildLuaData('data',dir+'/abyss_data.lua');buildUI(dir,undefined,{officialAssets:true,refinedReleaseMonsterArt:true,nativePageLifecycle:true});
const preload=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>`package.preload[${luaString(n.slice(0,-4))}]=assert(loadfile(${luaString(dir+'/'+n)}))`).join('\n');
const source="package.path='./src/lua/?.lua'\n"+preload+"\ndofile("+luaString(witness)+")";
const r=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{encoding:'utf8',timeout:30000,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.error)throw r.error;process.exitCode=r.status??1;

} finally { rmSync(dir,{recursive:true,force:true}); }
