import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {experimentalCharacterControls} from '../scripts/character-ui-layout.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';

const require=createRequire(import.meta.url);
const parts=n=>n.controls??n.children??[];
const all=n=>[n,...parts(n).flatMap(all)];
const cards=theme=>experimentalCharacterControls(theme).find(n=>n.name==='choicePanel').children.filter(n=>/^card\d+$/.test(n.name));

test('official choice profile keeps two unchanged faces while default retains ten and Match retains twelve',()=>{
 const snapshot=structuredClone(nativeTheme),official=officialAssetsTheme(nativeTheme);
 assert.equal(cards(nativeTheme).length,10);
 assert.equal(cards(official).length,2);
 assert.deepEqual(cards(official).map(n=>n.position),[[-108,0],[108,0]]);
 const legacy=structuredClone(official);legacy.layout.combatChoice=structuredClone(nativeTheme.layout.combatChoice);
 for(let i=0;i<2;i++){
  assert.deepEqual(cards(official)[i].size,cards(legacy)[i].size);
  assert.deepEqual(cards(official)[i].children,cards(legacy)[i].children,'only host count/position may change');
 }
 assert.deepEqual(official.layout.nativeNode.forge,nativeTheme.layout.nativeNode.forge);
 assert.deepEqual(official.layout.nativeNode.picker,{...nativeTheme.layout.nativeNode.picker,columns:[-246,0,246]});
 assert.deepEqual(nativeTheme,snapshot);
});

test('generated official two-face choice pages ten real discard candidates with ordered commit and stale guards',async t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const dir=mkdtempSync(join(root,'official-choice-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 buildLuaData('data',join(dir,'abyss_data.lua'));
 buildUI(dir,undefined,{officialAssets:true,nativePageLifecycle:true});
 const layout=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 assert.equal(parts(all(layout).find(n=>n.name==='choicePanel')).filter(n=>/^card\d+$/.test(n.name)).length,2);
 const picker=all(layout).find(n=>n.name==='pickerView');
 const slots=parts(picker).filter(n=>/^card\d+$/.test(n.name));
 assert.equal(slots.length,6,'six semantic parents remain for camp and Match');
 assert.deepEqual(slots.slice(0,3).map(n=>n.position[0]),[-246,0,246]);
 for(const slot of slots.slice(3)){assert.equal(slot.visible,false);assert.deepEqual(slot.children,[]);}
 assert.equal(parts(parts(picker).find(n=>n.name==='forgeGrid')).length,12);
 const modules=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const prelude=`
local generated=${luaString(dir.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
`;
 function runFixture(name,expected){
  const body=prelude+`dofile('tests/lua/support/${name}.lua')`;
  const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{
   cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
  });
  assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
  assert.match(result.stdout,expected);
 }
 await t.test('combat choices retain ordered selection and reject stale gestures',()=>
  runFixture('official_choice_pagination',/OFFICIAL_CHOICE_PAGINATION_PASS/));
 await t.test('room pickers and Match preserve their existing flows',()=>
  runFixture('official_node_picker_pagination',/OFFICIAL_NODE_PICKER_PAGINATION_PASS/));
 await t.test('room picker text, cards and actions have disjoint resolved bounds',()=>
  runFixture('official_node_picker_layout',/OFFICIAL_NODE_PICKER_LAYOUT_PASS/));
});
