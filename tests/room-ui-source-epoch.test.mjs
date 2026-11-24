import {sourceEpoch as combinedCurrent,sourceSlice,ciRepairSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import test from 'node:test';
import {entranceInventory} from './helpers/ui-entrance-source.mjs';
import assert from 'node:assert/strict';
import {readFileSync as nativeReadFileSync} from 'node:fs';
import {jointUiSourceAt} from './helpers/joint-ui-source-epoch.mjs';
import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
import {beforeCharacterPreparationSource,beforeCurrentProductionSource} from './helpers/character-preparation-source.mjs';
import {actorFocusAdded,assertActorFocusInventory,deckPagesAdded,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';
import {pointerInputPath,readRetiredController,retiredControllerPath} from './helpers/input-retirement-source.mjs';
import {beforePc13ThenV2UiHudSource} from './helpers/pc13-reward-cover-source.mjs';
// Original assertions retain their explicit frozen source view.
const currentRaw=p=>nativeReadFileSync(p,'utf8');
function admittedRaw(path,read=currentRaw){
 if(path===retiredControllerPath)return beforeCharacterPreparationSource(path,readRetiredController(read).source,read);
 return beforeCurrentProductionSource(path,read(path),read);
}
const readRoomPrior=combinedCurrent.combinedReader(currentRaw,'jointUiPrior');
const roomPriorRead=path=>path===retiredControllerPath?
 combinedCurrent.preCombinedSource(path,admittedRaw(path),{target:'jointUiPrior',readSource:admittedRaw}):readRoomPrior(path);
import {roomUiSourceEpoch as room} from './helpers/room-ui-source-epoch.mjs';
import {componentUiSourceEpoch as component} from './helpers/component-ui-source-epoch.mjs';
import {preJointUiEpoch as epoch,preRoomUiEpoch as prior} from './helpers/combined-epoch/source-epoch.mjs';
const live=p=>jointUiSourceAt(p,beforePc13ThenV2UiHudSource(p,roomPriorRead(p),currentRaw),'room'),raw=p=>epoch.proof.current[p]?.source??null;
const changed=['src/lua/abyss_game_ui_view.lua','src/lua/abyss_map_ui.lua','src/lua/abyss_node_ui_faces.lua'];
import {preJoustEpoch as joint,joustIntegratedEpoch as current} from './helpers/combined-epoch/source-epoch.mjs';
import {joustSourceProof} from './helpers/joust-source-epoch.mjs';
import {readdirSync} from 'node:fs';
function joustReader(read){
 const admitted=path=>admittedRaw(path,read);
 return path=>{
  try{return sourceSlice(path,admitted(path),'pr612',admitted).replaceAll('\r\n','\n');}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
 };
}
const currentLive=joustReader(currentRaw);
// Preserve the original joint UI assertions against their explicit predecessor.
const jointReader=read=>current.combinedReader(joustReader(read),'joustPrior');
const jointLive=jointReader(currentRaw);
function prepareHistoricalRead(paths,createRead,readDisk=currentRaw){
 const observed=new Map();
 const readRaw=path=>{
  let source;
  try{source=readDisk(path);}
  catch(error){if(path!==retiredControllerPath||error.code!=='ENOENT')throw error;source=null;}
  if(observed.has(path))assert(source===observed.get(path),'fresh Room UI raw owner: '+path);
  else observed.set(path,source);
  return source;
 };
 const project=createRead(readRaw),projected=new Map([...new Set([...paths,pointerInputPath])].map(path=>[path,project(path)]));
 const confirmCohort=()=>{for(const path of observed.keys())readRaw(path);};
 // Only the deterministic historical output is retained. Every physical input
 // is reread around each projection, with a fresh read for each requested owner.
 const read=path=>{
  assert(projected.has(path),'exact Room UI replay owner: '+path);
  readRaw(path);
  return projected.get(path);
 };
 return use=>{
  confirmCohort();
  try{return use(read);}finally{confirmCohort();}
 };
}
function retainedPaths(historical){
 const liveLua=readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p);
 assertActorFocusInventory(liveLua,currentRaw);
 const activeAdditions=[...actorFocusAdded,...stasisUpgradeAddedPaths,...deckPagesAdded,pointerInputPath];
 const historicalPaths=Object.keys(combinedCurrent.proof.current);
 assert.deepEqual(entranceInventory(['config/architecture.json',...liveLua],currentRaw).sort(),
  [...historicalPaths.filter(p=>p!==retiredControllerPath),...activeAdditions].sort(),'complete live production inventory');
 assert.throws(()=>currentRaw(retiredControllerPath),{code:'ENOENT'});
 assert.equal(admittedRaw(retiredControllerPath),combinedCurrent.proof.current[retiredControllerPath].source);
 const styleAdded=historicalPaths.filter(p=>!Object.hasOwn(ciRepairSourceEpoch.proof.current,p)).sort();
 assert.deepEqual(styleAdded,['game_ui_navigation','game_ui_navigation_view','lowcost_art','merchant_pages','page_reveal','power_membership'].map(name=>'src/lua/abyss_'+name+'.lua'),'exact registered post-closeout source additions');
 combinedCurrent.preCombinedSource('config/architecture.json',currentRaw('config/architecture.json'),{target:'stsStylePrior',readSource:currentRaw});
 for(const p of styleAdded){
  assert.equal(combinedCurrent.proof.targets.stsStylePrior.files[p],null,'complete original absence must remain explicit');
  assert.equal(admittedRaw(p).replaceAll('\r\n','\n'),combinedCurrent.proof.current[p].source,'new module retains complete current source');
  assert(combinedCurrent.proof.owners.includes(p),'new module is an authenticated current owner');
 }
 const actual=historicalPaths.filter(p=>!styleAdded.includes(p));
 assert.deepEqual(actual.slice().sort(),Object.keys(ciRepairSourceEpoch.proof.current).sort(),'complete pre-style production inventory retained');
 const added=actual.filter(p=>!Object.hasOwn(historical.proof.current,p));
 assert.deepEqual(added,['src/lua/abyss_lumine_idle.lua'],'only the explicitly adopted idle may extend this historical corpus');
 for(const p of added){
  assert.equal(combinedCurrent.proof.targets.pr612.files[p],null,'original absence remains explicit');
  assert.equal(currentRaw(p).replaceAll('\r\n','\n'),combinedCurrent.proof.current[p].source,'new owner retains its exact current source');
 }
 assert.deepEqual(actual.filter(p=>!added.includes(p)).sort(),Object.keys(historical.proof.current).sort(),'every historical module is retained');
 return Object.keys(historical.proof.current);
}


test('joint UI current identity includes every live module and the entire inherited owner closure',()=>{
 for(const p of epoch.proof.owners)assert(joint.proof.owners.includes(p),p);
 for(const p of retainedPaths(joint))
  assert.equal(jointLive(p).replaceAll('\r\n','\n'),joint.proof.current[p].source,p);
 for(const target of Object.values(joint.proof.targets))assert.deepEqual(Object.keys(target.files).sort(),Object.keys(joint.proof.current).sort());
 assert.equal(joint.proof.targets.jointUiPrior.files['src/lua/abyss_battle_card_glow.lua'],null);
});

test('joint UI projection rejects every warm owner drift and deletion from the real composed source',()=>{
 const p='config/architecture.json',before=epoch.proof.current[p].source;
 let rawDrift=false;
 const readDisk=path=>{const source=currentRaw(path);return path===p&&rawDrift?source+'\n':source;};
 const verify=prepareHistoricalRead([...joint.proof.owners,p],jointReader,readDisk),source=verify(read=>read(p));
 rawDrift=true;
 assert.throws(()=>verify(()=>assert.fail('raw drift authorized the frozen reader')),/fresh Room UI raw owner/);
 rawDrift=false;
 assert.throws(()=>verify(()=>{rawDrift=true;}),/fresh Room UI raw owner/);
 rawDrift=false;
 const project=transform=>verify(read=>joint.preCombinedSource(p,source,{target:'jointUiPrior',readSource:transform(read)}));
 for(const owner of joint.proof.owners){
  let bad=false;
  const reader=read=>q=>{const s=read(q);return bad&&q===owner?s+'\n':s;};
  assert.equal(project(reader),before);bad=true;
  assert.throws(()=>project(reader),/linked owner identity/,owner);
  assert.throws(()=>project(read=>q=>q===owner?null:read(q)),/linked owner identity/,owner);
 }
 // JSON layout is explicitly supported; corrupt a token for the foreign case.
 for(const input of [source.replace('"layers"','"foreignLayers"'),source.slice(1),null,{},17]){
  let reads=0;assert.equal(joint.preCombinedSource(p,input,{target:'jointUiPrior',readSource(){reads++;throw Error('foreign');}}),input);assert.equal(reads,0);
 }
});

test('room epoch binds the exact committed owner slice without replacing component history',()=>{
 assert.equal(room.proof.currentCommit,'fbe7051b6e8698e43ba9c179e2307943a96c8491');
 assert.equal(room.proof.currentTreeCommitted,true);
 assert.equal(epoch.proof.currentTreeCommitted,false,'composed historical witnesses are not a committed full tree');
 assert.deepEqual(room.proof.owners,component.proof.owners);
 assert.deepEqual(epoch.proof.owners,prior.proof.owners,'retain the entire inherited authorization closure');
 assert.deepEqual(room.proof.owners.filter(p=>room.proof.current[p].sha256!==component.proof.current[p].sha256),changed);
 for(const p of room.proof.owners){
  assert.equal(live(p).replaceAll('\r\n','\n'),room.proof.current[p].source,p);
  assert.deepEqual(room.proof.targets.componentUiPrior.files[p],component.proof.current[p],p);
 }
 for(const p of epoch.proof.owners)assert.equal(live(p).replaceAll('\r\n','\n'),raw(p),p);
 assert.deepEqual(epoch.proof.targets.componentUiPrior.files,prior.proof.current);
 for(const [name,target]of Object.entries(prior.proof.targets))assert.deepEqual(epoch.proof.targets[name],target,name);
});

test('all changed room owners project exactly through LF CRLF and every inherited target',()=>{
 for(const p of changed){
  const current=raw(p),before=prior.proof.current[p].source;
  for(const input of [current,current.replaceAll('\n','\r\n')]){
   assert.equal(epoch.preCombinedSource(p,input,{target:'componentUiPrior',readSource:raw}),before,p);
   for(const target of Object.keys(prior.proof.targets)){
    const expected=prior.preCombinedSource(p,before,{target,readSource:q=>prior.proof.current[q]?.source??null});
    assert.equal(epoch.preCombinedSource(p,input,{target,readSource:raw}),expected,p+':'+target);
   }
  }
 }
});

test('changed-owner projection freshly rejects every inherited owner drift or deletion after warming',()=>{
 const p=changed[1],source=raw(p);
 for(const owner of epoch.proof.owners){
  let drift=false,reads=0;
  const reader=q=>{reads++;return drift&&q===owner?raw(q)+'\n':raw(q);};
  assert.equal(epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:reader}),prior.proof.current[p].source);
  assert.equal(reads,epoch.proof.owners.length,'complete fresh closure');drift=true;
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:q=>q===owner?null:raw(q)}),/linked owner identity/,owner);
  assert.throws(()=>epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource:q=>{if(q===owner)throw Error('removed');return raw(q);}}),/linked owner missing/,owner);
 }
 const reader=epoch.combinedReader(raw,'componentUiPrior');
 assert.equal(epoch.readerTarget(reader),'componentUiPrior');assert.equal(reader(p),prior.proof.current[p].source);
 assert.equal(epoch.combinedReader(reader,'componentUiPrior'),reader);
});

test('foreign predecessor and unchanged inputs stay opaque without authorizing reads',()=>{
 for(const p of changed)for(const source of [raw(p)+'\n',prior.proof.current[p].source]){
  let reads=0;
  assert.equal(epoch.preCombinedSource(p,source,{target:'componentUiPrior',readSource(){reads++;throw Error('unexpected');}}),source);
  assert.equal(reads,0,p);
 }
 const p='config/architecture.json';let reads=0;
 assert.equal(epoch.preCombinedSource(p,raw(p),{target:'componentUiPrior',readSource(){reads++;throw Error('unexpected');}}),raw(p));
 assert.equal(reads,0,'unchanged config cannot be used as a changed-owner authorization probe');
 assert.throws(()=>epoch.preCombinedSource(changed[0],raw(changed[0]),{target:'componentUiPrior',readSource:null}),/linked owner reader/);
});


test('Joust current source identity preserves every inherited target and all live modules',()=>{
 assert.deepEqual(current.proof.owners,[...new Set([...joint.proof.owners,joustSourceProof.path])]);
 assert.equal(current.proof.currentTreeCommitted,false);
 assert.equal(current.proof.joustCollectedBaseCommit,'6a614fc82697750ddb408750e54f59f801c24f1e');
 assert.deepEqual(current.proof.targets.joustPrior.files,joint.proof.current);
 for(const [name,target]of Object.entries(joint.proof.targets))assert.deepEqual(current.proof.targets[name],target,name);
 for(const p of retainedPaths(current))
  assert.equal(currentLive(p).replaceAll('\r\n','\n'),current.proof.current[p].source,p);
 const changed=Object.keys(current.proof.current).filter(p=>current.proof.current[p]?.sha256!==joint.proof.current[p]?.sha256);
 assert.deepEqual(changed,[joustSourceProof.path]);
 assert.equal(nativeReadFileSync('tests/fixtures/joust-event-before.lua','utf8').replaceAll('\r\n','\n'),joustSourceProof.before.source);
});

test('Joust projections retain every target and reject warm drift or deletion of each raw owner',()=>{
 const p=joustSourceProof.path;
 const verify=prepareHistoricalRead([...current.proof.owners,p],joustReader),source=verify(read=>read(p));
 const project=(input,target,transform=read=>read)=>verify(read=>current.preCombinedSource(p,input,{target,readSource:transform(read)}));
 for(const target of Object.keys(current.proof.targets))for(const input of [source,source.replaceAll('\n','\r\n')])
  assert.equal(project(input,target),current.proof.targets[target].files[p].source,target);
 for(const owner of current.proof.owners){
  let drift=false,reads=0;
  const reader=read=>q=>{reads++;const text=read(q);return drift&&q===owner?text+'\n':text;};
  assert.equal(project(source,'joustPrior',reader),joustSourceProof.before.source);
  assert.equal(reads,current.proof.owners.length,'fresh complete closure');drift=true;
  assert.throws(()=>project(source,'joustPrior',reader),/linked owner identity/,owner);
  assert.throws(()=>project(source,'joustPrior',read=>q=>q===owner?null:read(q)),/linked owner identity/,owner);
 }
 const reader=current.combinedReader(currentLive,'joustPrior');
 assert.equal(current.readerTarget(reader),'joustPrior');assert.equal(reader(p),joustSourceProof.before.source);
 assert.equal(current.combinedReader(reader,'joustPrior'),reader);
 // An inherited changed owner must also authorize the new Joust owner afresh.
 const inherited='config/architecture.json';
 assert.throws(()=>current.preCombinedSource(inherited,currentLive(inherited),{target:'jointUiPrior',readSource:q=>q===p?source+'\n':currentLive(q)}),/linked owner identity/);
});

test('Joust source proof rejects unknown source without authorization reads',()=>{
 const p=joustSourceProof.path,source=currentLive(p);
 for(const input of [source+'\n',source.replace('placeBet','foreignBet'),joustSourceProof.before.source,null,{},17]){
  let reads=0;assert.equal(current.preCombinedSource(p,input,{target:'joustPrior',readSource(){reads++;throw Error('unexpected');}}),input);assert.equal(reads,0);
 }
 assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource:null}),/linked owner reader/);
 assert.throws(()=>current.preCombinedSource(p,source,{target:'unknown'}),/unknown source target/);
 assert.throws(()=>current.preCombinedSource(p,source,{target:'joustPrior',readSource(){throw Error('removed');}}),/linked owner missing/);
});
