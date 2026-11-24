import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);

for(const official of [false,true])for(const realBoss of [false,true])test(`${official?'official':'default'} ${realBoss?'real boss settlement':'staged boss result'} Tiny House reuses the real Neow host with readable once-only rewards`,t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});
 const dir=mkdtempSync(join(root,'tiny-house-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 buildLuaData('data',join(dir,'abyss_data.lua'));
 buildUI(dir,undefined,official?{officialAssets:true}:{});
 const modules=readdirSync(dir).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const body=`local generated=${luaString(dir.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
TINY_HOUSE_REAL_BOSS=${realBoss?'true':'false'}
dofile('tests/lua/support/tiny_house_pending_ui.lua')`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{
  cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,
  env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},windowsHide:true,
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/TINY_HOUSE_PENDING_UI_PASS/);
});

test('Tiny House exact source admission preserves the ordered full owner read and rejects warm drift',async()=>{
 const {readFileSync}=await import('node:fs');
 const {sourceEpoch}=await import('./helpers/closeout-source-epoch.mjs');
 const {currentProductionRereads}=await import('./helpers/current-production-source-reads.mjs');
 const {beforeTinyHouseUiSource}=await import('./helpers/tiny-house-ui-source.mjs');
 const {authenticateDevelopBackflow}=await import('./helpers/develop-release-backflow-source.mjs');
 const {proof}=sourceEpoch;
 const config='config/architecture.json',event='src/lua/abyss_node_ui_events.lua',pending='src/lua/abyss_relic_pending_ui.lua';
 const read=p=>readFileSync(p,'utf8'),reads=[];
 const priorReadOrder=[...proof.owners,...currentProductionRereads];
 let readFailure,eventReread;
 const project=()=>sourceEpoch.preCombinedSource(config,read(config),{target:'develop',readSource:p=>{
  reads.push(p);
  if(p===event&&reads.length===eventReread&&readFailure!==undefined){
   if(readFailure instanceof Error)throw readFailure;
   return readFailure;
  }
  return read(p);
 }});
 assert.equal(project(),proof.targets.develop.files[config].source);
 const expected=[...reads];
 assert.equal(expected.length,480,'complete fresh raw closure size');
 assert.equal(createHash('sha256').update(JSON.stringify(expected)).digest('hex'),
  'ad1c81a8f757224fa6520ca74d2a9b682f24925d2689141bc4b2eb1066d6a7fd','exact current admission order');
 let position=-1;
 for(const owner of priorReadOrder){
  position=expected.indexOf(owner,position+1);
  assert.notEqual(position,-1,'retained original admission read: '+owner);
 }
 eventReread=expected.lastIndexOf(event)+1;
 assert.equal(eventReread,480,'the event owner must be checked again after the initial scan');
 assert.notEqual(expected.indexOf(event)+1,eventReread,'the injected failure belongs to a fresh repeat read');
 for(readFailure of [null,read(event)+'\n',new Error('unavailable')]){
  reads.length=0;
  assert.throws(project,/linked owner (?:identity|missing): .*abyss_node_ui_events\.lua/);
  assert.deepEqual(reads,expected.slice(0,eventReread));
 }
 readFailure=undefined;reads.length=0;
 assert.equal(project(),proof.targets.develop.files[config].source);
 assert.deepEqual(reads,expected);
 const readBeforeTinyHouse=owner=>authenticateDevelopBackflow(owner,read(owner),read);
 const pendingSuccessor=readBeforeTinyHouse(pending);
 assert.equal(beforeTinyHouseUiSource(pending,pendingSuccessor,readBeforeTinyHouse),proof.current[pending].source);
 assert.throws(()=>beforeTinyHouseUiSource(pending,pendingSuccessor,()=>null),/linked owner identity/);
 const foreign=pendingSuccessor+'\n';
 assert.equal(beforeTinyHouseUiSource(pending,foreign,()=>{throw Error('cannot read unknown source');}),foreign);
});

test('Tiny House projects the exact copy helper before P1 and still rejects foreign source',async()=>{
 const {readFileSync}=await import('node:fs');
 const {assertIntegrationSuccessorsCurrent,beforeReleaseTinyHouseSource}=await import('./helpers/fork-preflight-source.mjs');
 const {beforeTinyHouseCiSource}=await import('./helpers/v2-ui-admission-ci-source.mjs');
 const path='tests/helpers/copy-integration-source-closure.mjs',raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const reader=input=>(file,encoding)=>file===path?input:readFileSync(file,encoding);
 const crlf=raw.replaceAll('\n','\r\n');
 const beforeTinyHouse=source=>beforeTinyHouseCiSource(path,beforeReleaseTinyHouseSource(path,source));
 const prior=beforeTinyHouse(raw);
 assert.notEqual(prior,beforeReleaseTinyHouseSource(path,raw));
 assert.equal(beforeTinyHouse(crlf).replaceAll('\r\n','\n'),prior);
 for(const input of [raw,crlf])assert.doesNotThrow(()=>assertIntegrationSuccessorsCurrent(reader(input)));
 for(const foreign of [raw+'\n',crlf+'\r\n',raw.replaceAll('\n','\r\r\n')]){
  assert.equal(beforeTinyHouse(foreign),foreign);
  assert.throws(()=>assertIntegrationSuccessorsCurrent(reader(foreign)),error=>
   error.message==='fresh complete integration source: '+path);
 }
});


test('capacity build exact projection preserves older receipts and rejects mixed current source',async()=>{
 const {readFileSync}=await import('node:fs');
 const {assertIntegrationSuccessorsCurrent}=await import('./helpers/fork-preflight-source.mjs');
 const {beforeReleaseCapacitySource}=await import('./helpers/release-integration-source.mjs');
 const {beforeRebasedRelease}=await import('./helpers/rebased-release-source.mjs');
 const {beforeDeckPagesSuiteSource}=await import('./helpers/input-retirement-source.mjs');
 const {beforeUiEntranceWitness}=await import('./helpers/ui-entrance-source.mjs');
 const project=(path,source)=>beforeReleaseCapacitySource(path,beforeRebasedRelease(path,beforeDeckPagesSuiteSource(path,beforeUiEntranceWitness(path,source))));
 const paths=['scripts/build-native-candidate.mjs','scripts/build-ui.mjs','scripts/monster-art.mjs',
  'scripts/official-portraits.mjs','tests/official-portraits-build.test.mjs'];
 const crlf=s=>s.replaceAll('\n','\r\n');
 const current=new Map(paths.map(path=>[path,readFileSync(path,'utf8').replaceAll('\r\n','\n')]));
 assert.doesNotThrow(()=>assertIntegrationSuccessorsCurrent((path,encoding)=>current.has(path)?crlf(current.get(path)):readFileSync(path,encoding)));
 for(const [path,raw] of current){
  const prior=project(path,raw);
  assert.notEqual(prior,raw);
  assert.equal(project(path,crlf(raw)),crlf(prior));
  for(const foreign of [prior,raw+'\n',raw.replaceAll('\n','\r\r\n'),null]){
   assert.equal(project(path,foreign),foreign);
   assert.throws(()=>assertIntegrationSuccessorsCurrent((owner,encoding)=>owner===path?foreign:readFileSync(owner,encoding)),
    error=>error.message==='fresh complete integration source: '+path);
  }
 }
});
