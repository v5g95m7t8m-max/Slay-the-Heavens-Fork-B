// The entrance candidate uses the current runtime. Historical replays can
// read their pinned predecessor after verifying the complete changed Lua cohort.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';

const archive=readFileSync(new URL('../fixtures/ui-entrance-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),
 '7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9','exact entrance predecessor archive');
const {base,reviewedSource,files,witnesses}=JSON.parse(gunzipSync(archive));
assert.equal(base,'301b854cd8a0bb689c3250f5b05b56bd47409780');
assert.equal(reviewedSource,'50b61b8fa243a39c189bf138a14702d73b39a903');
const owners=Object.keys(files);
export const addedEntranceModules=Object.freeze(owners.filter(path=>files[path].before===null));
const readLive=path=>readFileSync(path,'utf8');
const binding=path=>Object.hasOwn(files,path)?files[path]:undefined;
const currentInput=(path,source)=>['src/lua/abyss_node_ui_faces.lua','src/lua/abyss_game_ui.lua','src/lua/abyss_game_ui_run.lua','src/lua/abyss_game_ui_view.lua',
 'tests/lua/shop_entry.lua','tests/helpers/combined-epoch/source-epoch-runtime.mjs',
 'tests/integration-source-epoch.test.mjs','tests/session-menu-navigation.test.mjs','tests/tiny-house-pending-ui.cases.mjs',
 'tests/helpers/develop-release-backflow-source.mjs','tests/sts-style-source-epoch.test.mjs',
 'tests/watcher-actor-boundary.test.mjs','tests/defect-actor-boundary.test.mjs',
 'tests/competition-roster-config-composition.test.mjs','tests/silent-final-source-epoch.test.mjs',
 'tests/defect-integration-source.test.mjs','tests/defect-final-source-epoch.test.mjs'].includes(path)
 ?beforeCurrentReplayFixes(path,source):source;
function currentMatches(path,source,expected){
 const normalized=currentInput(path,source);
 if(['src/lua/abyss_node_ui_faces.lua','src/lua/abyss_game_ui.lua','src/lua/abyss_game_ui_run.lua','src/lua/abyss_game_ui_view.lua'].includes(path)
  &&normalized===source)return false;
 return matches(normalized,expected);
}
const predecessors=new Map();

function project(path,source,row){
 if(row)source=currentInput(path,source);
 if(!row||!matches(source,row.after))return source;
 if(!row.before)return null;
 if(!predecessors.has(path)){
  const prior=restoreExactFixtureHunks({
   path,beforeSha256:row.before.sha256,afterSha256:row.after.sha256,hunks:row.hunks,
  },path,source);
  assert(matches(prior,row.before),'exact entrance predecessor: '+path);
  predecessors.set(path,prior);
 }
 const prior=predecessors.get(path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeUiEntrance(path,source){
 return project(path,source,binding(path));
}

export function beforeUiEntranceWitness(path,source){
 return project(path,source,Object.hasOwn(witnesses,path)?witnesses[path]:undefined);
}

export function authenticateUiEntrance(read){
 assert.equal(typeof read,'function','linked owner reader');
 for(const owner of owners){
  let source;
  try{source=read(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+error.message);}
  assert(currentMatches(owner,source,files[owner].after),'combined linked owner identity: '+owner+' during entrance validation');
 }
}

export function entranceReader(read,authenticated=false){
 return owner=>{
  const source=read(owner);
  const row=binding(owner);
  if(!row)return source;
  if(authenticated)assert(currentMatches(owner,source,row.after),'combined linked owner identity: '+owner+' during entrance validation');
  const prior=beforeUiEntrance(owner,source);
  if(prior!==source&&!authenticated){
   authenticateUiEntrance(read);
   authenticated=true;
  }
  return prior;
 };
}

export function assertCurrentUiEntrance(path,source){
 const row=binding(path);
 if(row)assert(currentMatches(path,source,row.after),'fresh current production owner: '+path);
}

export function entrancePredecessor(path,source,read=readLive,{allowConfigLayout=false}={}){
 const input=source;
 if(allowConfigLayout&&path==='config/architecture.json'&&typeof source==='string'
  &&!matches(source,files[path].after)){
  // Only the caller's JSON layout may vary. Tokens retain key order, duplicate
  // keys and string spelling; every linked owner still requires exact bytes.
  let valid=true;try{JSON.parse(source);}catch{valid=false;}
  const tokens=source.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,token=>token.startsWith('"')?token:'');
  if(valid&&createHash('sha256').update(tokens).digest('hex')==='1491505818bb5df2d41ed3db63d5463c24b71837516b09844655854b7f89682b'){
   source=read(path);
   assert(matches(source,files[path].after),'combined linked owner identity: '+path+' during entrance validation');
  }
 }
 const predecessor=beforeUiEntrance(path,source);
 if(predecessor===source)return {source:input,read};
 authenticateUiEntrance(read);
 return {source:predecessor,read:entranceReader(read,true)};
}

export function entranceInventory(paths,read){
 for(const module of addedEntranceModules){
  assert.equal(paths.filter(path=>path===module).length,1,'complete entrance module inventory: '+module);
 }
 authenticateUiEntrance(read);
 return paths.filter(path=>!addedEntranceModules.includes(path));
}
