import {currentProductionRereads} from './helpers/current-production-source-reads.mjs';
import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
import {originalPlanningSource} from './helpers/ci-complete-calibration-source-inverse.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preDefectIntegrationPlanningSource as parent,defectOnlyPlanningSource as utility,defectIntegrationPlanningProof as proof} from './helpers/defect-integration-planning-source-inverse.mjs';
import {preDefectUtilityPlanningSource,defectUtilityPlanningProof,defectUtilityPlanningKey,defectUtilityPlanningFloor} from './helpers/defect-utility-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource,enemyIntegrationPlanningProof} from './helpers/enemy-integration-planning-source-inverse.mjs';
import {preCurrentCiPlacementSource,preCiCompleteCalibrationSource,ciCompleteCalibrationProof} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {preM7FinalSource} from './helpers/m7-core-final-source-inverse.mjs';
import {preDefectUtilitySource,defectUtilitySourceProof} from './helpers/defect-utility-source-inverse.mjs';
import {pointerInputPath,readRetiredController,retiredControllerPath} from './helpers/input-retirement-source.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const path=proof.path,current=originalPlanningSource(path,read(path),'seven');

test('combined planning authenticates both exact preserved parents without accepting unrelated source changes',()=>{
 assert.equal(hash(current),proof.combinedSha256);
 for(const input of [current,current.replaceAll('\n','\r\n')]){
  assert.equal(hash(parent(path,input)),proof.parentSha256);
  assert.equal(hash(utility(path,input)),proof.utilitySha256);
  assert.equal(hash(parent(path,input)),enemyIntegrationPlanningProof.combinedSha256);
  assert.equal(hash(utility(path,input)),defectUtilityPlanningProof.afterSha256);
  assert.equal(hash(preEnemyIntegrationPlanningSource(path,parent(path,input))),enemyIntegrationPlanningProof.parentSha256);
  assert.equal(hash(preDefectUtilityPlanningSource(path,utility(path,input))),defectUtilityPlanningProof.beforeSha256);
  for(const source of [input,parent(path,input),utility(path,input)]){
   assert.equal(preCurrentCiPlacementSource(path,source),ciCompleteCalibrationProof.files[path].afterSource);
   assert.equal(preCiCompleteCalibrationSource(path,source),ciCompleteCalibrationProof.files[path].beforeSource);
  }
 }
});

test('the only difference from the six-slice cost inventory is the authenticated utility floor',()=>{
 const actual=JSON.parse(current),before=JSON.parse(parent(path,current));
 assert.equal(Object.keys(actual.jsPlanning.localLowerBounds).length,13);
 assert.equal(Object.keys(before.jsPlanning.localLowerBounds).length,12);
 assert.deepEqual(actual.jsPlanning.localLowerBounds[defectUtilityPlanningKey],defectUtilityPlanningFloor);
 delete actual.jsPlanning.localLowerBounds[defectUtilityPlanningKey];assert.deepEqual(actual,before);
});

test('combined epoch fails closed on fragments, duplicates, foreign paths, nonstrings and independent mutations',()=>{
 const mutants=[current+'\n',current.slice(1),current+current,current.replace('"durationMs": 20000','"durationMs": 19999'),
  current.replace('"durationMs": 30000','"durationMs": 29999'),current.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),
  current.replace('"conclusion": "failure"','"conclusion": "success"'),current.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000')];
 for(const input of mutants){
  assert.notEqual(input,current);
  for(const project of [parent,utility,preCurrentCiPlacementSource,preCiCompleteCalibrationSource])assert.equal(project(path,input),input);
 }
 for(const input of [undefined,null,{},42,parent(path,current),utility(path,current)])for(const project of [parent,utility])assert.equal(project(path,input),input);
 for(const foreign of ['foreign','scripts/ci-quality-shape.mjs'])for(const project of [parent,utility])assert.equal(project(foreign,current),current);
});

test('utility production inverse composes with the current M7 source chain without live owner reads',()=>{
 const p=defectUtilitySourceProof.path,source=preDefectActorSource(p,read(p),{readSource:historicalActorRead}),before=read('tests/fixtures/defect-utility-planning-before.lua');
 const fail=()=>assert.fail('standalone utility has no linked owner permission');
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preDefectUtilitySource(p,input),before);
  assert.equal(preM7FinalSource(p,input,{readSource:fail}),before);
 }
 for(const input of [source+'\n',source.slice(1),undefined,null,{},42])assert.equal(preM7FinalSource(p,input,{readSource:fail}),input);
 assert.equal(preM7FinalSource('foreign',source,{readSource:fail}),source);
});

import {defectActorEpoch,extendDefectActorEpoch} from './helpers/defect-actor-source-epoch.mjs';
import {sourceEpoch as actorCurrentEpoch,preDefectActorEpoch} from './helpers/combined-epoch/source-epoch.mjs';
// Freeze this original 79-owner Actor extension contract. Public sourceEpoch
// continues to exercise the complete expanded current closure elsewhere.
const historicalActorEpoch=extendDefectActorEpoch(preDefectActorEpoch);
const actorProof=defectActorEpoch.proof;
const actorPaths=['config/architecture.json','src/lua/abyss_combat_queued_play.lua','src/lua/abyss_defect_utility_cards.lua'];
const actorRaw=p=>actorProof.current[p]?.source??null;
// The Actor receipt checks its exact historical after-image, not today's
// architecture spelling. Project only through the complete current verifier.
const historicalActorRead=actorCurrentEpoch.combinedReader(read,'pr618');
test('Actor capability predecessor binds all three complete owners to independent 6a614fc Git blobs',()=>{
 const read=historicalActorRead;
 const blobs={
  'config/architecture.json':'3b79effde6d5cd59a502ecc32982dd98be1f24b6',
  'src/lua/abyss_combat_queued_play.lua':'d4fda1b3cc44b4a88a9f01fedc11c3e8716e66da',
  'src/lua/abyss_defect_utility_cards.lua':'414d1f260d3a617eb06b4caadfbef013296f1a70'
 };
 assert.deepEqual(actorProof.owners,actorPaths);
 assert.deepEqual(Object.keys(actorProof.current),actorPaths);
 assert.equal(actorProof.targets.prior.commit,'6a614fc82697750ddb408750e54f59f801c24f1e');
 for(const p of actorPaths){
  const old=actorProof.targets.prior.files[p];
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(old.source)}\0`).update(old.source).digest('hex'),blobs[p]);
  assert.deepEqual(old,preDefectActorEpoch.proof.current[p]);
  assert.equal(actorRaw(p),read(p));
 }
});
test('Actor capability extends the complete 79-owner epoch without replacing a historical binding',()=>{
 const current=historicalActorEpoch.proof,prior=preDefectActorEpoch.proof;
 assert.deepEqual(current.owners,prior.owners);assert.equal(current.owners.length,79);
 assert.deepEqual(current.targets.defectActorPrior.files,prior.current);
 for(const [target,binding]of Object.entries(prior.targets))assert.deepEqual(current.targets[target],binding,target);
 for(const [p,binding]of Object.entries(prior.current))assert.deepEqual(current.current[p],actorProof.current[p]??binding,p);
 assert.equal(current.currentTreeCommitted,false);
 assert.equal(current.defectActorCollectedBaseCommit,actorProof.targets.prior.commit);
 for(const key of ['source','sha256','gitBlob','rawGitBlob','mode']){
  const altered=structuredClone(prior);altered.current[actorPaths[1]][key]='foreign';
  assert.throws(()=>extendDefectActorEpoch({...preDefectActorEpoch,proof:altered}),/authenticated predecessor/,key);
 }
});
test('new capability sources require fresh three-owner permission before the old standalone Utility inverse',()=>{
 const p=defectUtilitySourceProof.path,source=actorRaw(p),old=actorProof.targets.prior.files[p].source;
 assert.equal(preDefectUtilitySource(p,source),source,'old single-source contract cannot admit the new ABI');
 assert.equal(preDefectUtilitySource(p,preDefectActorSource(p,source,{readSource:actorRaw})),beforeUtility());
 const fail=()=>assert.fail('old standalone source must not gain linked owner reads');
 assert.equal(preM7FinalSource(p,old,{readSource:fail}),beforeUtility());
 for(const readSource of [null,false,0,{},[]]){
  assert.throws(()=>preDefectActorSource(p,source,{readSource}),/reader/);
  assert.throws(()=>preM7FinalSource(p,source,{readSource}),/reader/);
 }
 for(const candidate of [source,source.replaceAll('\n','\r\n')])for(const bad of actorPaths){
  let drift=false,reads=[];const reader=q=>{reads.push(q);return drift&&q===bad?actorRaw(q)+'\n':actorRaw(q);};
  assert.equal(preDefectActorSource(p,candidate,{readSource:reader}),old);assert.deepEqual(reads,actorPaths);
  drift=true;assert.throws(()=>preDefectActorSource(p,candidate,{readSource:reader}),/linked owner identity/);
  for(const value of [null,undefined,{},false,17,Buffer.from(actorRaw(bad))])
   assert.throws(()=>preDefectActorSource(p,candidate,{readSource:q=>q===bad?value:actorRaw(q)}),/linked owner identity/);
  assert.throws(()=>preDefectActorSource(p,candidate,{readSource:q=>{if(q===bad)throw Error('missing');return actorRaw(q);}}),/linked owner missing/);
 }
});
function beforeUtility(){return read('tests/fixtures/defect-utility-planning-before.lua');}
test('foreign capability source bytes cannot trigger reader calls or hide unknown targets',()=>{
 for(const p of actorPaths)for(const source of [actorRaw(p)+(p==='config/architecture.json'?'-- foreign':'\n'),actorRaw(p).slice(1),actorRaw(p)+actorRaw(p),null,undefined,{},17]){
  let calls=0;const readSource=()=>{calls++;throw Error('must not read');};
  assert.equal(preDefectActorSource(p,source,{readSource}),source);assert.equal(calls,0);
  for(const target of ['unknown','',null,undefined,'__proto__'])
   assert.throws(()=>actorCurrentEpoch.preCombinedSource(p,source,{target,readSource:null}),/unknown source target/);
 }
 const source=actorRaw(actorPaths[1]);let calls=0;
 assert.equal(preDefectActorSource('foreign/'+actorPaths[1],source,{readSource:()=>{calls++;}}),source);assert.equal(calls,0);
});
function assertRawActorClosure(project,expected,priorReads,traceLength,traceHash){
 const physical=owner=>readFileSync(owner,'utf8');
 let bad,value,reads=[];
 const reader=owner=>{
  reads.push(owner);
  if(owner!==bad)return physical(owner);
  if(value instanceof Error)throw value;
  return value;
 };
 const replay=()=>project(reader);
 assert.equal(replay(),expected);
 const admittedReads=reads;
 assert.equal(admittedReads.length,traceLength);
 assert.equal(hash(JSON.stringify(admittedReads)),traceHash,'exact current raw owner order');
 let position=-1;
 for(const owner of priorReads){
  position=admittedReads.indexOf(owner,position+1);
  assert.notEqual(position,-1,'retained original raw owner: '+owner);
 }
 const accept=()=>{
  reads=[];assert.equal(replay(),expected);assert.deepEqual(reads,admittedReads);
 };
 const reject=(owner,replacement,diagnostic=/combined linked owner/)=>{
  bad=owner;value=replacement;reads=[];
  assert.throws(replay,diagnostic);
  assert.deepEqual(reads,admittedReads.slice(0,admittedReads.indexOf(owner)+1),'first failing owner stops projection: '+owner);
  bad=undefined;accept();
 };
 accept();
 assert.throws(()=>physical(retiredControllerPath),{code:'ENOENT'});
 const {source:retired,restored}=readRetiredController(physical);
 assert(restored,'physical absence requires the exact Pointer Input witness');
 bad=retiredControllerPath;
 for(value of [null,undefined])accept();
 reject(retiredControllerPath,retired,/combined linked owner identity: src\/lua\/abyss_controller\.lua/);
 reject(retiredControllerPath,retired+'\n');
 reject(retiredControllerPath,new Error('unavailable'));
 for(const owner of [...actorCurrentEpoch.proof.owners.filter(owner=>owner!==retiredControllerPath),pointerInputPath]){
  for(const fault of [physical(owner)+'\n',null,new Error('unavailable')]){
   reject(owner,fault,owner===pointerInputPath?/combined linked owner missing: src\/lua\/abyss_controller\.lua/:undefined);
  }
 }
 return admittedReads;
}
test('the full current facade freshly checks every original owner including after warm success',()=>{
 const epoch=actorCurrentEpoch,proof=epoch.proof,p=actorPaths[0],source=read(p);
 const project=readSource=>epoch.preCombinedSource(p,source,{target:'develop',readSource});
 const expected=proof.targets.develop.files[p].source;
 assertRawActorClosure(project,expected,[...proof.owners,...currentProductionRereads],480,
  'ad1c81a8f757224fa6520ca74d2a9b682f24925d2689141bc4b2eb1066d6a7fd');
});
test('capability config layout accepts only an input spelling and still binds exact raw owners',()=>{
 const p=actorPaths[0],source=actorRaw(p),old=actorProof.targets.prior.files[p].source;
 for(const layout of [JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t']){
  assert.equal(preDefectActorSource(p,layout,{readSource:actorRaw}),old);
  assert.throws(()=>preDefectActorSource(p,layout,{readSource:q=>q===p?layout:actorRaw(q)}),/linked owner identity/);
 }
 for(const foreign of [source.replace('"layers"','"layers":{},"layers"'),source.replace('"layers"','"laye\\u0072s"'),source+'-- bad','\ufeff'+source]){
  let calls=0;assert.equal(preDefectActorSource(p,foreign,{readSource:()=>{calls++;}}),foreign);assert.equal(calls,0);
 }
});

import {m7FinalReader} from './helpers/m7-core-final-source-inverse.mjs';
import {classPotionWatcherSourceProof} from './helpers/class-potion-watcher-source-inverse.mjs';
test('M7 live and explicit current readers preserve the queued historical capability chain',()=>{
 const p=actorPaths[1],source=read(p),expected=classPotionWatcherSourceProof[p].beforeSha256;
 assert.equal(hash(preM7FinalSource(p,source)),expected);
 assert.equal(hash(m7FinalReader()(p)),expected);
 const raw=q=>readFileSync(q,'utf8');
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(hash(preM7FinalSource(p,input,{readSource:raw})),expected);
 assert.equal(hash(m7FinalReader(raw)(p)),expected);
 const fail=()=>assert.fail('foreign queued input cannot authorize owner reads');
 for(const input of [source+'\n',source.slice(1),source+source,null,undefined,{},17])
  assert.equal(preM7FinalSource(p,input,{readSource:fail}),input);
 assert.equal(preM7FinalSource('foreign/'+p,source,{readSource:fail}),source);
 for(const readSource of [null,false,0,{},[]])assert.throws(()=>preM7FinalSource(p,source,{readSource}),/reader/);
 const config=actorPaths[0];
 assert.equal(preM7FinalSource(config,read(config)),actorCurrentEpoch.proof.targets.develop.files[config].source);
});
test('M7 queued capability authenticates all current owners freshly after warm success',()=>{
 const p=actorPaths[1],source=read(p),proof=actorCurrentEpoch.proof;
 const expected=classPotionWatcherSourceProof[p].beforeSha256;
 let bad,value,reads=[];
 const reader=q=>{reads.push(q);if(q===bad){if(value instanceof Error)throw value;return value;}return readFileSync(q,'utf8');};
 const project=()=>preM7FinalSource(p,source,{readSource:reader});
 assert.equal(hash(project()),expected);
 for(const owner of proof.owners){
  assert(reads.includes(owner),'successful projection freshly reads '+owner);
  const invalid=owner===retiredControllerPath?[readRetiredController(q=>readFileSync(q,'utf8')).source,new Error('missing')]
   :[readFileSync(owner,'utf8')+'\n',null,new Error('missing')];
  for(value of invalid){
   bad=owner;reads=[];
   assert.throws(project,error=>error===value||/combined linked owner/.test(error.message),owner);
   assert(reads.includes(owner),owner);
  }
  bad=undefined;reads=[];assert.equal(hash(project()),expected);
 }
});

test('Actor entry authenticates the complete raw current closure before exposing its real historical target',()=>{
 const epoch=actorCurrentEpoch,p=defectUtilitySourceProof.path,source=read(p),proof=epoch.proof;
 assert.equal(proof.targets.pr618.commit,'5fb26dcc5b00637785b4d926839c296a735a305a');
 for(const owner of actorPaths)for(const key of ['source','sha256','gitBlob'])
  assert.equal(proof.targets.pr618.files[owner][key],actorProof.current[owner][key]);
 const project=readSource=>preM7FinalSource(p,source,{readSource});
 const admittedReads=assertRawActorClosure(project,beforeUtility(),proof.owners,1443,
  '1e104db373ce2e1fdcb5c806685240db6bfc851f95ca2514b8a011d2d6981ffe');
 // Each of the three Actor reads now authenticates the actual current anchor,
 // adding this exact nested Actor/Stasis closure before the unchanged scan.
 const anchorReads=[
  ...Array(4).fill('config/architecture.json'),
  ...['actor','focus','stances','actor_artifact','stance_damage','act2_stasis','combat',
   'warrior_status_cards','blood_for_blood_cost','card_upgrade'].map(name=>'src/lua/abyss_'+name+'.lua'),
  'config/architecture.json',
 ];
 const priorReads=[];
 for(let offset=0;offset<admittedReads.length;offset+=481){
  const cohort=admittedReads.slice(offset,offset+481);
  assert.deepEqual(cohort.slice(21,36),anchorReads,'exact current-anchor addition');
  priorReads.push(...cohort.slice(0,21),...cohort.slice(36));
 }
 assert.equal(priorReads.length,1398);
 assert.equal(hash(JSON.stringify(priorReads)),'5f3ab63b052ddc6e263f47ebda67168b3691d8f719a83f853a9af3df0d53f564','complete original Actor order is unchanged');
 // Supplying just the old three-owner snapshot is never permission to bypass
 // the real current owners, even though it matches the old Actor verifier.
 assert.throws(()=>preM7FinalSource(p,source,{readSource:actorRaw}),/combined linked owner identity/);
 const config='config/architecture.json',reads=[];
 assert.throws(()=>preM7FinalSource(p,source,{readSource:owner=>{
  reads.push(owner);return owner===config?proof.targets.pr618.files[config].source:readFileSync(owner,'utf8');
 }}),/combined linked owner identity: config\/architecture\.json/);
 assert.deepEqual(reads,admittedReads.slice(0,admittedReads.indexOf(config)+1),'old config cannot masquerade as a current raw owner');
});
