import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beforeDeckBrowserBackflow,beforeInputRetirementStsSuite} from './input-retirement-source.mjs';
import {inputRetirementStsWitness} from './input-retirement-sts-binding.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';

const normalize=source=>source.replaceAll('\r\n','\n');
const hash=(source,algorithm='sha256')=>createHash(algorithm).update(source).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const deckPagesTest='tests/deck-pages.test.mjs';
const inputRetirementJsTests=[
 deckPagesTest,'tests/input-device-scope.test.mjs',
 'tests/pointer-cover-ownership.test.mjs','tests/relic-view-input.test.mjs',
];
const inputRetirementLuaTests=Object.freeze({
 'tests/lua/pointer_cover_ownership.lua':['eb14e1f188aa70fb74dfc3095f20e77878568d415c2d847d49d30584b2a835f2','ac0a41487871098126b45c7df0ba2d4737ebe127'],
 'tests/lua/relic_view_input.lua':['8e9ee14e9294e7ab4245964673024361733963f959900b8ea72cc52a9de14525','58909591f427a365c40e2a05d3fe607412b4b83f'],
});
const retiredInputLuaTests=[
 'tests/lua/controller.lua','tests/lua/controller_current.lua','tests/lua/controller_host.lua',
 'tests/lua/controller_rooms.lua','tests/lua/deck_controller_lifecycle.lua',
 'tests/lua/potion_controller_cancel_composition.lua','tests/lua/relic_view_controller_click.lua',
];
function assertInputRetirementLuaSources(read){
 for(const [path,[sha,id]] of Object.entries(inputRetirementLuaTests)){
  const source=read(path,'utf8');
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===sha&&blob(normalize(source))===id,
   'fresh Lua input retirement inventory source: '+path);
 }
 for(const path of retiredInputLuaTests)
  assert.throws(()=>read(path,'utf8'),{code:'ENOENT'},'retired Lua input inventory source must be absent: '+path);
}
// The live deck test is a browser-backflow successor. Bridge only this
// historical reader at the leaf; detached callers keep their sealed helper.
function historicalStsSuite(paths,read){
 const readDeckWitness=(path,encoding)=>{
  const source=read(path,encoding);
  return path===deckPagesTest&&encoding==='utf8'?beforeDeckBrowserBackflow(path,source):source;
 };
 return beforeInputRetirementStsSuite(paths,readDeckWitness,inputRetirementStsWitness);
}
// These historical inventories use the prior test names. Current Full
// inventory, discovery and runners continue to use the tests on disk.
export function beforeInputRetirementTestInventory(paths,kind,read=readFileSync,{required=false}={}){
 assert(kind==='js'||kind==='lua','known input retirement inventory kind');
 const added=kind==='js'?inputRetirementJsTests:Object.keys(inputRetirementLuaTests);
 if(!required&&!added.some(path=>paths.includes(path)))return paths;
 if(kind==='js')return historicalStsSuite(paths,read).paths;
 const names=new Set(paths);
 assert.equal(names.size,paths.length,'unique live Lua discovery inventory for input retirement');
 for(const path of added)
  assert(names.delete(path),'missing Lua input retirement inventory source: '+path);
 for(const path of retiredInputLuaTests){
  assert(!names.has(path),'retired Lua input fixture must be absent from discovery inventory: '+path);
  names.add(path);
 }
 assertInputRetirementLuaSources(read);
 return [...names].sort();
}
// A frozen receipt can name a retired test only by its complete checked
// predecessor hash, after authenticating the actual current Lua cohort.
export function readRetiredInputLuaReceipt(path,digest,read=readFileSync,row=stsStylePriorRuntime.files[path]){
 if(!retiredInputLuaTests.includes(path))return undefined;
 if(!row||row.sha256!==digest)return undefined;
 assertInputRetirementLuaSources(read);
 assert.equal(hash(row.source),digest,'immutable retired Lua receipt: '+path);
 assert.equal(blob(row.source),row.gitBlob,'immutable retired Lua receipt blob: '+path);
 return row.source;
}
export function readRetiredInputTestReceipt(path,digest,read=readFileSync){
 if(path!=='tests/relic-view-controller-click.test.mjs')
  return readRetiredInputLuaReceipt(path,digest,read);
 if(digest!=='85c750ee51df46f92a27d76003d1cb89138c6745cee7df41c64b8db831439759')return undefined;
 const prior=historicalStsSuite(inputRetirementJsTests,read);
 const source=prior.read(path,'utf8');
 assert.equal(hash(source),digest,'immutable retired JS receipt: '+path);
 return source;
}
