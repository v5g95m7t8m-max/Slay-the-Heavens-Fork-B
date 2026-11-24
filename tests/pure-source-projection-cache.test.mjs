import test from 'node:test';
import {historicalTest} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cachePureSourceProjection,deepFreezeSourceProof} from './helpers/pure-source-projection-cache.mjs';
import {relicRound3Composition} from './helpers/relic-round3-composition.mjs';
import {relicArtComposition} from './helpers/relic-art-composition.mjs';
import {relicRound2Composition} from './helpers/relic-round2-composition.mjs';
// The original one-read catalog guard uses the unchanged helper and complete 98fef inputs.
import {preRound3CatalogSource,round3CatalogProof} from './helpers/epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import {preRound2UiSource,round2UiSourceLayer} from './helpers/round2-ui-source-inverse.mjs';
import {gameUiExtractionProof} from './helpers/epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {actorFocusAdded,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';
import {beforeInputRetirementReader,pointerInputPath,retiredControllerPath} from './helpers/input-retirement-source.mjs';
import {addedEntranceModules} from './helpers/ui-entrance-source.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const targets=deepFreezeSourceProof({one:{files:{a:{},b:{}}},two:{files:{a:{}}}});

test('cache keys retain complete raw source, path and target and include unknown-source results',()=>{
 let calls=0;
 const project=cachePureSourceProjection(targets,(path,source,target)=>{calls++;return source.startsWith('unknown')?source:[path,target,source].join('|');});
 const large='x'.repeat(5000);
 const cases=[['a',large,'one'],['a',large+'!','one'],['a',large,'two'],['b',large,'one'],
  ['a','unknown\n','one'],['a','unknown\r\n','one']];
 for(const args of cases){const previous=project(...args);assert.equal(project(...args),previous);}
 assert.equal(calls,cases.length);
 assert.equal(project('a','unknown\r\n','one'),'unknown\r\n');
 assert.equal(calls,cases.length);
});

test('exceptions retry instead of becoming cache entries and unregistered pairs never grow the cache',()=>{
 let calls=0;
 const project=cachePureSourceProjection(targets,(_path,source)=>{
  calls++;if(calls<=2)throw new Error('validation failed');return source;
 });
 for(let i=0;i<2;i++)assert.throws(()=>project('a','known','one'),/validation failed/);
 assert.equal(project('a','known','one'),'known');assert.equal(project('a','known','one'),'known');
 assert.equal(calls,3);
 for(const args of [['foreign','known','one'],['a','known','foreign'],['a',null,'one']]){
  project(...args);project(...args);
 }
 assert.equal(calls,9);
});

test('each proof path/target independently retains at most the configured number of complete inputs',()=>{
 const calls=new Map();
 const project=cachePureSourceProjection(targets,(path,source,target)=>{
  const key=[path,target,source].join('|');calls.set(key,(calls.get(key)??0)+1);return source;
 });
 project('a','independent','two');
 for(let i=0;i<64;i++)project('a','source'+i,'one');
 project('a','source0','one');assert.equal(calls.get('a|one|source0'),1);
 project('a','source64','one');project('a','source0','one');
 assert.equal(calls.get('a|one|source0'),2,'oldest input is recomputed after bounded eviction');
 project('a','independent','two');assert.equal(calls.get('a|two|independent'),1);
 let smallCalls=0;
 const small=cachePureSourceProjection(targets,(_path,source)=>{smallCalls++;return source;},{maxEntriesPerPair:1});
 for(const source of ['one','two','one'])small('a',source,'one');assert.equal(smallCalls,3);
 for(const maxEntriesPerPair of [0,-1,Infinity,1.5])assert.throws(()=>cachePureSourceProjection(targets,()=>{}, {maxEntriesPerPair}),/cache bound/);
});

test('all exported composition proofs are deeply immutable, including hunk line arrays',()=>{
 const frozen=value=>{
  if(value===null||typeof value!=='object')return;
  assert.ok(Object.isFrozen(value));for(const child of Object.values(value))frozen(child);
 };
 for(const proof of [relicRound3Composition,relicArtComposition,relicRound2Composition]){
  frozen(proof);
  assert.throws(()=>{proof.currentCommit='unreviewed';},TypeError);
  const target=Object.values(proof.targets)[0],binding=Object.values(target.files)[0];
  assert.throws(()=>{binding.afterSha256='unreviewed';},TypeError);
  assert.throws(()=>binding.hunks[0].after.push('unreviewed'),TypeError);
 }
});

historicalTest('warm pure projections never cache catalog or extracted UI linked-file validation',()=>{
 const path='config/architecture.json',source=readFileSync(path,'utf8');
 for(const [project,proof] of [[preRound3CatalogSource,round3CatalogProof],[preRound2UiSource,round2UiSourceLayer]]){
  assert.equal(hash(project(path,source)),proof.files[path].beforeSha256);
  let reads=0;
  for(let i=0;i<2;i++)assert.throws(()=>project(path,source,{readSource:()=>{reads++;throw Error('missing');}}),/linked.*missing/);
  assert.equal(reads,2,'each dynamic guard rereads the actual dependency after pure cache hits');
 }
});


test('warm current UI projections preserve their frozen intermediate epoch and reread every raw owner',()=>{
 // Current hosts reach the independently frozen GameUI extraction epoch, not the older round-two beforeSource.
 const live=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
 assert.throws(()=>live(retiredControllerPath),{code:'ENOENT'});
 const retired=beforeInputRetirementReader(live)(retiredControllerPath);
 const added=['scripts/deck-ui-layout.mjs',...stasisUpgradeAddedPaths,...actorFocusAdded,pointerInputPath,...addedEntranceModules];
 const paths=[...Object.keys(sourceEpoch.proof.current),...added].filter(p=>p!==retiredControllerPath);
 const current=Object.fromEntries(paths.map(p=>[p,live(p)]));
 const owners=[...new Set([...sourceEpoch.proof.owners,...added])];
 for(const path of ['config/architecture.json','src/lua/abyss_game_ui.lua']){
  const expected=gameUiExtractionProof.files[path];
  assert.equal(hash(expected.beforeSource),expected.beforeSha256);
  let bad=null,mode='good',seen=[];
  const raw=p=>{
   seen.push(p);
   if(p===bad){
    if(mode==='throw')throw Error('warm UI reader sentinel: '+p);
    if(mode==='missing')return undefined;if(mode==='null')return null;
    const value=p===retiredControllerPath?retired:current[p];
    if(mode==='present')return value;
    if(mode==='buffer')return Buffer.from(value);if(mode==='changed')return value+'\n';
   }
   return current[p];
  };
  const check=()=>assert.equal(preRound2UiSource(path,current[path],{readSource:raw}),expected.beforeSource);
  check();const first=[...seen];for(const owner of owners)assert(first.includes(owner),'fresh current UI owner: '+owner);
  seen=[];check();assert.deepEqual(seen,first,'a warm pure projection repeats the complete raw-read sequence');
  for(bad of owners){
   if(bad===retiredControllerPath)for(mode of ['missing','null']){
    seen=[];check();assert.deepEqual(seen,first,'retired Controller is absent while the current pointer is still read');
   }
   const modes=bad===retiredControllerPath?['present','changed','buffer','throw']:['changed','missing','null','buffer','throw'];
   for(mode of modes){
    seen=[];
    for(let repeat=0;repeat<2;repeat++)assert.throws(check,error=>{
     const owner=bad===pointerInputPath&&mode!=='throw'?retiredControllerPath:bad;
     assert.match(error.message,/linked owner/);
     assert(error.message.includes(owner),bad+' '+mode+': '+error.message);
     if(mode==='throw')assert.match(error.message,/warm UI reader sentinel/);return true;
    });
    assert(seen.includes(bad));
    // Keep each fault-type recovery on the config owner and each owner's full recovery.
    if(bad==='config/architecture.json'){const previous=mode;mode='good';check();mode=previous;}
   }
   if(bad!=='config/architecture.json'){mode='good';check();}
  }
 }
});

test('exact production length rejection preserves full byte checks and fresh owner admission',async()=>{
 const {beforeCurrentReplayFixes}=await import('./helpers/current-replay-fix-sources.mjs');
 const {authenticateUiEntrance}=await import('./helpers/ui-entrance-source.mjs');
 const originals=[
  ['src/lua/abyss_node_ui_faces.lua','d56aed5198b7111008f25c86f1f03eee36bab8549ebd9b92dd7f99f9e4cf6f58'],
  ['src/lua/abyss_game_ui.lua','1b1e3b9722dbc0c4c0af8c06243a15e118cf61d7a506ef6f801b2e735c85ed14'],
  ['src/lua/abyss_game_ui_run.lua','c2198e3d704115f83c6c172be3eb8515d72997d97779678df0bc4616b4e741f0'],
  ['src/lua/abyss_game_ui_view.lua','84d9fb22584a5978d5c04170f3b3b145c26ff71865acf53b36b2496f01489ed1'],
 ];
 for(const [path,expected]of originals){
  const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  const prior=beforeCurrentReplayFixes(path,source);assert.notEqual(prior,source);assert.equal(hash(prior),expected);
  const crlf=source.replaceAll('\n','\r\n');
  assert.equal(beforeCurrentReplayFixes(path,crlf),prior.replaceAll('\n','\r\n'));
  const sameLength=source.slice(0,-1)+'!';assert.equal(sameLength.length,source.length);
  for(const unknown of [source.slice(1),source+'\n',sameLength,source.replaceAll('\n','\r\r\n')])
   assert.equal(beforeCurrentReplayFixes(path,unknown),unknown,'unknown complete bytes cannot project');
  const bytes=Buffer.from(source);assert.equal(beforeCurrentReplayFixes(path,bytes),bytes,'Buffer inputs remain outside this string-only inverse');
  assert.equal(beforeCurrentReplayFixes('foreign/'+path,source),source,'path remains part of the exact identity');
  assert.equal(beforeCurrentReplayFixes(path,source),prior,'unknown inputs do not alter the exact projection');
 }
 let reads=[],bad=null;
 const read=path=>{reads.push(path);const source=readFileSync(path,'utf8');return path===bad?source.replaceAll('\r\n','\n').slice(0,-1)+'!':source;};
 authenticateUiEntrance(read);const first=[...reads];assert.equal(first.length,20);
 reads=[];authenticateUiEntrance(read);assert.deepEqual(reads,first,'warm calls retain every linked read');
 for(const [path]of originals){
  bad=path;reads=[];assert.throws(()=>authenticateUiEntrance(read),error=>{assert.match(error.message,/linked owner identity/);assert(error.message.includes(path));return true;});
  assert(reads.includes(path));bad=null;reads=[];authenticateUiEntrance(read);assert.deepEqual(reads,first,'recovery freshly authenticates the complete cohort');
 }
 authenticateUiEntrance(path=>readFileSync(path,'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
});

test('current view successor requires fresh raw owner bytes before historical projection',async()=>{
 const {beforeCurrentReplayFixes}=await import('./helpers/current-replay-fix-sources.mjs');
 const {authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');
 const path='src/lua/abyss_game_ui_view.lua',source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const prior=beforeCurrentReplayFixes(path,source);
 assert.notEqual(prior,source);assert.equal(hash(prior),'84d9fb22584a5978d5c04170f3b3b145c26ff71865acf53b36b2496f01489ed1');
 const oldEd=prior.replace("            menu:SetVisible(inMenu and not self.characterOpen and not self.easterEggOpen)\n            -- A deck open still commits one battle render below (input retirement,\n            -- art ownership and suspension), after the host's visibility writes.\n            self.battleUI:setActive(self.mode == \"battle\" and not deckOpen and not potionOpen and not blocked,\n                suspendBattle(run,deckOpen,potionOpen),self.mode=='battle' and deckOpen)\n            child(\"battlePanel\"):SetVisible(self.mode == \"battle\")","            menu:SetVisible(inMenu and not self.characterOpen and not self.easterEggOpen)\n            -- Commit activation and suspension before later native page callbacks.\n            -- The final render still observes commands committed by those callbacks.\n            self.battleUI:setActive(self.mode == \"battle\" and not deckOpen and not potionOpen and not blocked,\n                suspendBattle(run,deckOpen,potionOpen))\n            child(\"battlePanel\"):SetVisible(self.mode == \"battle\")");
 assert.equal(hash(oldEd),'7ceaafb63819eba11bfe133d838fcb3970f3525ae89e8af572813a8d536cf72a','complete preceding eager-only view');
 assert.equal(beforeCurrentReplayFixes(path,oldEd),oldEd,'a prior implementation cannot impersonate current raw source');
 assert.equal(beforeUiEntrance(path,source),beforeUiEntrance(path,prior),'pure historical projections keep the exact preceding layer');
 const sameLength=source.slice(0,-1)+'!';assert.equal(sameLength.length,source.length);
 let bad,reads=[];
 const read=p=>{reads.push(p);return p===path&&bad!==undefined?bad:readFileSync(p,'utf8');};
 authenticateUiEntrance(read);const first=[...reads];assert.equal(first.length,20);
 reads=[];authenticateUiEntrance(read);assert.deepEqual(reads,first);
 for(bad of [prior,oldEd,sameLength,null,Buffer.from(source)]){
  reads=[];assert.throws(()=>authenticateUiEntrance(read),error=>{assert.match(error.message,/linked owner identity/);assert(error.message.includes(path));return true;});
  assert(reads.includes(path));bad=undefined;reads=[];authenticateUiEntrance(read);assert.deepEqual(reads,first,'every recovery authenticates all current owners');
 }
 const crlf=source.replaceAll('\n','\r\n');
 assert.equal(beforeCurrentReplayFixes(path,crlf),prior.replaceAll('\n','\r\n'));
 authenticateUiEntrance(p=>p===path?crlf:readFileSync(p,'utf8'));
 for(const drift of [source+'\n',source.replaceAll('\n','\r\r\n')])assert.equal(beforeCurrentReplayFixes(path,drift),drift);
});
