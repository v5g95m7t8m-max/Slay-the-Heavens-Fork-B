import {actorFocusAdded,assertActorFocusInventory,deckPagesAdded,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';
import {pointerInputPath,readRetiredController,retiredControllerPath} from './helpers/input-retirement-source.mjs';
import {beforeCharacterPreparationSource} from './helpers/character-preparation-source.mjs';
import {entranceInventory} from './helpers/ui-entrance-source.mjs';
import {assertCurrentJsInventory,beforeInputRetirementTestInventory,beforeShopEntryInventory} from './helpers/fork-preflight-source.mjs';
import test from 'node:test';
import {integratedRead,integratedCiProof,integratedPriorInventory,assertIntegratedCurrent} from './helpers/integrated-ci-source.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './helpers/combined-epoch/source-epoch-runtime.mjs';
import {extendStsStyleEpoch} from './helpers/sts-style-source-epoch-runtime.mjs';
import {extendFeedbackSourceEpoch,extendFeedbackCiProof,extendFeedbackHelperClosure,feedbackBase,feedbackBinding,
 feedbackHash,feedbackProductionPaths,feedbackCiPaths,feedbackHelperPaths,feedbackClosurePaths,feedbackAddedTests,
 feedbackPriorCiSha,feedbackPriorClosureSha,renderFeedbackCiBinding} from './helpers/sts-feedback-source-runtime.mjs';
import {gunzipSync} from 'node:zlib';
import {readFileSync,readdirSync} from 'node:fs';
import {discoverJs,jsPlanningWeights,timings} from '../scripts/ci-shards.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const bind=source=>({source,sha256:hash(source)}),commit='c'.repeat(40);
const readProduction=path=>readFileSync(path,'utf8');
const readProductionHistory=path=>path===retiredControllerPath?readRetiredController(readProduction).source:readProduction(path);
function fixture(){
 const config='config/architecture.json',one='src/lua/one.lua',two='src/lua/two.lua',added='src/lua/abyss_page_reveal.lua';
 const current={[config]:bind('{}\n'),[one]:bind('return 1\n'),[two]:bind('return 2\n')};
 const original=createSourceEpochProjector({schemaVersion:1,normalization:'LF',currentCommit:commit,currentTreeCommitted:false,
  current,owners:[one],targets:{develop:{commit:'d'.repeat(40),files:{...current,[one]:bind('return 0\n')}}}});
 const outer={schemaVersion:1,normalization:'LF',baseCommit:commit,currentCommit:'e'.repeat(40),
  inventoryBefore:Object.keys(current).sort(),inventoryAfter:[...Object.keys(current),added].sort(),addedPaths:[added],
  owners:[added,one].sort(),current:{[one]:bind('return 10\n'),[added]:bind('return 30\n')},before:{[one]:current[one],[added]:null}};
 return {config,one,two,added,original,outer};
}

test('release additions remain in raw Full and exact historical inventories reject gaps and source drift',()=>{
 assertIntegratedCurrent();
 const rawJs=discoverJs(),rawLua=readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort();
 assertCurrentJsInventory(rawJs,integratedCiProof.inventory);
 // These five tests remain in current Full discovery. Only the authenticated
 // historical view may omit them; a missing live test is not a valid prior view.
 const liveLuaAdditions=['tests/lua/detail_latency.lua','tests/lua/potion_management_visual.lua',
  'tests/lua/shop_dismiss.lua','tests/lua/shop_entry.lua','tests/lua/traveler_power_tooltip.lua'];
 const liveLuaInventory=[...integratedCiProof.luaInventory,...liveLuaAdditions].sort();
 const historicalLua=(paths,read=readFileSync)=>{
  paths=beforeInputRetirementTestInventory(paths,'lua',read,{required:true});
  assert.deepEqual(paths,liveLuaInventory,'exact live Lua discovery inventory');
  const prior=beforeShopEntryInventory(paths,'lua',read);
  assert.deepEqual(prior,integratedCiProof.luaInventory,'exact integrated Lua predecessor inventory');
  return prior;
 };
 const currentLua=historicalLua(rawLua);
 assert.deepEqual(historicalLua(rawLua,(path,encoding)=>readFileSync(path,encoding).replaceAll('\r\n','\n').replaceAll('\n','\r\n')),currentLua);
 for(const path of liveLuaAdditions){
  assert.throws(()=>historicalLua(rawLua.filter(test=>test!==path)),/live Lua discovery inventory/);
  assert.throws(()=>historicalLua([...rawLua,path].sort()),/live Lua discovery inventory/);
  const bytes=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  for(const foreign of [null,bytes+'\n',bytes.replace('\n','\r\r\n')])
   assert.throws(()=>historicalLua(rawLua,(file,encoding)=>file===path?foreign:readFileSync(file,encoding)),/fresh .*?(?:test|source)/);
 }
 assert.throws(()=>historicalLua([...rawLua,'tests/lua/foreign.lua'].sort()),/live Lua discovery inventory/);
 const newTest=rawJs.find(path=>!integratedCiProof.inventory.includes(path));
 assert.throws(()=>assertCurrentJsInventory(integratedCiProof.inventory,integratedCiProof.inventory),/inventory/);
 for(const target of Object.keys(integratedCiProof.sources)){
  assert.deepEqual(integratedPriorInventory(rawJs,target),integratedCiProof.inventories[target].js);
  assert.throws(()=>integratedPriorInventory(rawJs,target,'js',(path,encoding)=>
   readFileSync(path,encoding)+(path===newTest?'\n':'')),/fresh added inventory source/);
 }
 for(const [kind,current]of [['js',integratedCiProof.inventory],['lua',currentLua]])for(const target of Object.keys(integratedCiProof.sources)){
  const prior=integratedCiProof.inventories[target][kind],added=current.filter(path=>!prior.includes(path));
  if(target==='release'&&kind==='js'&&added.length===0){
   assert.deepEqual(current,prior,'source-only continuation retains the complete identical JS inventory');
   assert.throws(()=>integratedPriorInventory(current.slice(1),target,kind),/inventory/);
  }else assert(added.length>0,'this release adds real '+kind+' work');
  assert.deepEqual(integratedPriorInventory(current,target,kind),prior);
  for(const path of added){
   assert.throws(()=>integratedPriorInventory(current.filter(p=>p!==path),target,kind),/inventory/);
   for(const value of [null,readFileSync(path,'utf8')+'\n'])assert.throws(()=>integratedPriorInventory(current,target,kind,
    (p,e)=>p===path?value:readFileSync(p,e)),/added inventory source|replaceAll/);
  }
  for(const changed of [[...current,current[0]],[...current,'tests/foreign.'+kind]])assert.throws(()=>integratedPriorInventory(changed,target,kind),/inventory/);
 }
});
test('style continuation preserves every old complete target and adds a complete prior view without rewriting its input',()=>{
 const f=fixture(),unchanged=JSON.stringify(f.outer),next=extendStsStyleEpoch(f.original,f.outer),p=next.proof;
 assert.equal(JSON.stringify(f.outer),unchanged);assert(!Object.isFrozen(f.outer));
 assert.deepEqual(Object.keys(p.current).sort(),f.outer.inventoryAfter);
 for(const [path,row]of Object.entries(f.original.proof.targets.develop.files))assert.deepEqual(p.targets.develop.files[path],row);
 for(const [path,row]of Object.entries(f.original.proof.current))assert.deepEqual(p.targets.stsStylePrior.files[path],row);
 assert.equal(p.targets.develop.files[f.added],null);assert.equal(p.targets.stsStylePrior.files[f.added],null);
 assert.deepEqual(p.current[f.two],f.original.proof.current[f.two]);assert(Object.isFrozen(p));
});
test('the new source closure freshly rejects every missing/foreign owner and never authorizes unknown source bytes',()=>{
 const f=fixture(),next=extendStsStyleEpoch(f.original,f.outer),p=next.proof,raw=path=>p.current[path]?.source??null;
 const project=read=>next.preCombinedSource(f.one,raw(f.one),{target:'develop',readSource:read});
 assert.equal(project(raw),'return 0\n');
 for(const owner of p.owners)for(const missing of [null,undefined,17,raw(owner)+'\n']){
  assert.throws(()=>project(path=>path===owner?missing:raw(path)),/linked owner identity/);
 }
 assert.equal(project(raw),'return 0\n');
 for(const input of [raw(f.one)+'\n',null,{},17]){
  let calls=0;assert.equal(next.preCombinedSource(f.one,input,{target:'develop',readSource:()=>{calls++;throw Error('must not read');}}),input);assert.equal(calls,0);
 }
 // A target's absent witness is retained here; only a checked materializer retires it.
 let reads=0;assert.equal(next.preCombinedSource(f.added,raw(f.added),{target:'develop',readSource:()=>{reads++;}}),raw(f.added));assert.equal(reads,0);
});
test('incomplete inventories, invented predecessors and unowned additions cannot form a style epoch',()=>{
 const f=fixture();
 for(const mutate of [p=>p.inventoryBefore.pop(),p=>p.inventoryAfter.pop(),p=>p.before[f.one]=bind('foreign\n'),
  p=>delete p.before[f.added],p=>p.owners=[],p=>p.addedPaths.push(f.added),p=>p.current[f.added]=null]){
  const patch=structuredClone(f.outer);mutate(patch);assert.throws(()=>extendStsStyleEpoch(f.original,patch));
 }
});

test('real style source retains the complete CI-repair and every older target while authenticating all current raw owners',async()=>{
 const {sourceEpoch,ciRepairSourceEpoch,releaseSourceEpoch,prePowerMembershipEpoch}=await import('./helpers/closeout-source-epoch.mjs');
 const p=sourceEpoch.proof,before=ciRepairSourceEpoch.proof,read=readProduction;
 assert.equal(Object.keys(before.current).length,347); // config plus all 346 prior Lua modules.
 assert.equal(Object.keys(releaseSourceEpoch.proof.current).length,350); // Frozen release: page reveal, low-cost art, merchant pages.
 assert.equal(Object.keys(prePowerMembershipEpoch.proof.current).length,352); // Final menu adds navigation and navigation view.
 assert.deepEqual(Object.keys(p.current).sort(),[...Object.keys(prePowerMembershipEpoch.proof.current),'src/lua/abyss_power_membership.lua'].sort());
 const actual=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert(Object.hasOwn(p.current,retiredControllerPath),'the archived controller must remain available to historical targets');
 const previous=Object.keys(p.current).filter(path=>path!==retiredControllerPath);
 assert.deepEqual([...previous,...stasisUpgradeAddedPaths,...actorFocusAdded,...deckPagesAdded,pointerInputPath].sort(),entranceInventory(actual,read));
 assertActorFocusInventory(actual.filter(path=>path!=='config/architecture.json'),read);
 for(const [path,row]of Object.entries(before.current))assert.deepEqual(p.targets.stsStylePrior.files[path],row,path+' complete prior');
 for(const [name,target]of Object.entries(before.targets))for(const [path,row]of Object.entries(target.files))assert.deepEqual(p.targets[name].files[path],row,name+'/'+path);
 for(const path of Object.keys(p.current))assert.equal(beforeCharacterPreparationSource(path,readProductionHistory(path)).replaceAll('\r\n','\n'),p.current[path].source,path+' exact historical input');
 const config='config/architecture.json',raw=read(config),prior=p.targets.stsStylePrior.files[config].source;
 assert.equal(sourceEpoch.preCombinedSource(config,raw,{target:'stsStylePrior',readSource:read}),prior);
 for(const owner of p.owners.filter(path=>!before.owners.includes(path))){
  const foreign=readProductionHistory(owner)+'\n';
  // The retired controller has an absence witness. Removing its live replacement must still fail.
  const missing=owner===retiredControllerPath?pointerInputPath:owner;
  for(const [changed,value] of [[missing,null],[owner,foreign]]){
   assert.throws(()=>sourceEpoch.preCombinedSource(config,raw,{target:'stsStylePrior',readSource:path=>path===changed?value:read(path)}),/linked owner|pointer input/,changed);
  }
 }
});

test('real style CI admits only full inventory, complete source and freshly verified executable helpers',async()=>{
 const readFileSync=integratedRead('sts');
 const {stsStyleCiProof:p,assertStsStyleCiCurrent,preStsStyleCiSource,stsStylePriorInventory}=await import('./helpers/sts-style-ci-source.mjs');
 const files=discoverJs();assertStsStyleCiCurrent(files);assert.deepEqual(stsStylePriorInventory(files),p.beforeInventory);
 for(const [path,row]of Object.entries(p.files)){
  const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(preStsStyleCiSource(path,raw),row.before?.source??raw);
  for(const foreign of [raw+'\n',null,{},17])assert.equal(preStsStyleCiSource(path,foreign),foreign);
 }
 for(const [path,sha]of Object.entries({
  'tests/noncombat-v25-layout.test.mjs':'f5a4a31b19d4cb9dddf39b2395e762ca5b1841e949b359767fe1a961ecea5819',
  'tests/official-assets-legibility.test.mjs':'746cb957243c1874348a76b41c3a4cac861b55e69bf232578c38281d5ca6b595',
  'tests/defect-actor-boundary.test.mjs':'190f4e4d0975c34181a961642ff3c51bf55d24d9af2ccd6b59e07e4e88654acf',
 }))assert.equal(p.files[path]?.before?.sha256,sha,'complete unchanged cb test predecessor: '+path);
 for(const path of ['scripts/test-affected.mjs','tests/test-affected.test.mjs','scripts/ci-media-lfs.mjs',
  'scripts/check-license.mjs','tests/ci-reviewed-lfs.test.mjs','.gitattributes','config/ci-media-lfs.json','docs/legal/assets.json',
  'docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs']){
  assert(p.files[path]?.after,'exact CI/storage execution witness: '+path);
  assert.throws(()=>assertStsStyleCiCurrent(files,(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh complete StS CI source/,path);
 }
 assert.equal(p.files['docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs'].before,null,'new verifier cannot invent a historical source');
 for(const path of Object.keys(p.helperSources))assert.throws(()=>assertStsStyleCiCurrent(files,(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh (?:StS helper|complete StS CI) source/,path);
 for(const changed of [files.slice(1),[...files,files[0]],[...files,'tests/foreign.test.mjs']])assert.throws(()=>assertStsStyleCiCurrent(changed),/inventory/);
 for(const path of p.addedTests)for(const platform of ['win32','linux']){
  assert.equal(timings.js[platform][path],undefined,'new style regression cannot acquire a historical hosted observation');
  assert(jsPlanningWeights([path],platform)[path]>=timings.unknownJsMs,'new style regression retains its unknown-cost floor');
 }
 assert(p.helperSources['tests/helpers/historical-sts-style-entry.mjs']);
 assert(p.helperSources['tests/helpers/generate-sts-style-source-epoch.mjs']);
});

function feedbackFixture(){
 const current=Object.fromEntries(['config/architecture.json',...feedbackProductionPaths].map((p,i)=>[p,feedbackBinding(p.endsWith('.json')?'{}\n':`return ${i}\n`)]));
 const original=createSourceEpochProjector({schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),
  current,owners:[],targets:{develop:{commit:'b'.repeat(40),files:current}}});
 const patch={schemaVersion:1,normalization:'LF',baseCommit:feedbackBase,sourceCommit:'c'.repeat(40),inventory:Object.keys(current).sort(),
  before:Object.fromEntries(feedbackProductionPaths.map(p=>[p,current[p]])),
  current:Object.fromEntries(feedbackProductionPaths.map((p,i)=>[p,feedbackBinding(`return ${i+20}\n`)]))};
 return {original,patch};
}
test('feedback synthetic source delta preserves all prior targets and materializes only the exact forward target',()=>{
 const f=feedbackFixture(),before=JSON.stringify(f.patch),next=extendFeedbackSourceEpoch(f.original,f.patch),p=next.proof;
 assert.equal(JSON.stringify(f.patch),before);assert.deepEqual(p.targets.develop,f.original.proof.targets.develop);
 assert.deepEqual(p.targets.stsFeedbackPrior,{commit:feedbackBase,files:f.original.proof.current});
 assert.deepEqual(Object.keys(p.current).sort(),f.patch.inventory);
 for(const path of feedbackProductionPaths)assert.deepEqual(p.current[path],f.patch.current[path]);
 for(const mutate of [p=>{p.before[feedbackProductionPaths[0]]=feedbackBinding('foreign\n');},p=>{p.inventory.push('src/lua/ghost.lua');},p=>{p.current['src/lua/ghost.lua']=feedbackBinding('return true\n');}]){
  const changed=structuredClone(f.patch);mutate(changed);assert.throws(()=>extendFeedbackSourceEpoch(f.original,changed));
 }
});
test('feedback synthetic owners remain fresh after success and unknown source never authorizes a view',()=>{
 const f=feedbackFixture(),next=extendFeedbackSourceEpoch(f.original,f.patch),p=next.proof,path=feedbackProductionPaths[0];
 const raw=owner=>p.current[owner]?.source??null,prior=f.original.proof.current[path].source;
 assert.equal(next.preCombinedSource(path,raw(path),{target:'stsFeedbackPrior',readSource:raw}),prior);
 for(const owner of p.owners)for(const bad of [null,raw(owner)+'\n'])assert.throws(()=>next.preCombinedSource(path,raw(path),
  {target:'stsFeedbackPrior',readSource:p=>p===owner?bad:raw(p)}),/linked owner identity/);
 let reads=0;const read=()=>{reads++;throw Error('must not read');};
 for(const foreign of ['foreign\n',null,{},17])assert.equal(next.preCombinedSource(path,foreign,{target:'stsFeedbackPrior',readSource:read}),foreign);
 assert.equal(next.preCombinedSource('src/lua/unknown.lua','return true\n',{target:'stsFeedbackPrior',readSource:read}),'return true\n');assert.equal(reads,0);
 assert.throws(()=>next.preCombinedSource(path,raw(path),{target:'unknown',readSource:raw}),/unknown source target/);
});
function feedbackCiFixture(){
 const original=JSON.parse(gunzipSync(readFileSync('tests/helpers/sts-style-ci-source.json.gz'))),files={};
 for(const path of feedbackCiPaths){const before=original.files[path]?.after??original.helperSources[path]??null;
  files[path]={before,after:feedbackBinding((before?.source??'')+'// feedback fixture\n')};
 }
 const closure=JSON.parse(original.files['tests/helpers/closeout-source-closure.json'].after.source);
 const patch={schemaVersion:1,normalization:'LF',baseCommit:feedbackBase,sourceCommit:'c'.repeat(40),priorArchiveSha256:feedbackPriorCiSha,
  inventoryBefore:original.afterInventory,inventoryAfter:[...original.afterInventory,...feedbackAddedTests].sort(),addedTests:feedbackAddedTests,
  files,helperSources:Object.fromEntries(feedbackHelperPaths.map(p=>[p,files[p].after])),
  helperClosure:Object.fromEntries(feedbackClosurePaths.map(p=>[p,{before:closure[p]??null,after:'d'.repeat(64)}]))};
 return {original,patch,closure};
}
test('feedback synthetic CI retains immutable before sources and real Full inventory without accepting unregistered inputs',()=>{
 const f=feedbackCiFixture(),snapshot=JSON.stringify(f.original),next=extendFeedbackCiProof(f.original,f.patch);
 assert.equal(JSON.stringify(f.original),snapshot);
 for(const [p,row]of Object.entries(f.original.files))assert.deepEqual(next.files[p].before,row.before,'cb predecessor unchanged: '+p);
 assert.deepEqual(next.afterInventory,f.patch.inventoryAfter);assert.equal(next.afterInventory.length,f.original.afterInventory.length+feedbackAddedTests.length);
 for(const path of feedbackAddedTests){assert.equal(f.patch.files[path].before,null);assert(next.addedTests.includes(path));}
 for(const mutate of [p=>{p.files['scripts/unknown.mjs']=p.files[feedbackCiPaths[0]];},p=>{p.inventoryAfter=p.inventoryBefore;},
  p=>{p.files['scripts/official-assets-layout.mjs'].before=feedbackBinding('foreign\n');},p=>{delete p.helperSources[feedbackHelperPaths[0]];}]){
  const changed=structuredClone(f.patch);mutate(changed);assert.throws(()=>extendFeedbackCiProof(f.original,changed));
 }
});
test('feedback synthetic helper-copy closure extends exact dependencies while preserving the original map',()=>{
 const f=feedbackCiFixture(),snapshot=JSON.stringify(f.closure),next=extendFeedbackHelperClosure(f.closure,f.patch.helperClosure);
 assert.equal(JSON.stringify(f.closure),snapshot);
 for(const [p,sha]of Object.entries(f.closure))if(!feedbackClosurePaths.includes(p))assert.equal(next[p],sha);
 for(const mutate of [p=>{p['tests/helpers/ghost.mjs']={before:null,after:'d'.repeat(64)};},p=>{p[feedbackClosurePaths[0]].before='e'.repeat(64);},p=>{delete p[feedbackClosurePaths[0]];}]){
  const changed=structuredClone(f.patch.helperClosure);mutate(changed);assert.throws(()=>extendFeedbackHelperClosure(f.closure,changed));
 }
});
test('feedback real current source and CI preserve all four immutable archives and every historical view',async()=>{
 assert.equal(readFileSync('tests/helpers/sts-feedback-ci-binding.mjs','utf8').replaceAll('\r\n','\n'),
  renderFeedbackCiBinding(feedbackHash(readFileSync('tests/helpers/sts-feedback-ci.json.gz'))),'new trust leaf cannot grow arbitrary authorization policy');
 for(const [path,sha]of Object.entries({
  'tests/helpers/sts-style-source-epoch.json.gz':'cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9',
  'tests/helpers/sts-style-prior-runtime.json.gz':'10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330',
  'tests/helpers/sts-style-ci-source.json.gz':feedbackPriorCiSha,'tests/helpers/closeout-source-closure.json':feedbackPriorClosureSha,
 }))assert.equal(feedbackHash(readFileSync(path)),sha,path);
 const {sourceEpoch,stsStyleEpoch}=await import('./helpers/closeout-source-epoch.mjs'),p=sourceEpoch.proof;
 for(const [path,row]of Object.entries(stsStyleEpoch.proof.current))assert.deepEqual(p.targets.stsFeedbackPrior.files[path],row,path);
 for(const [name,target]of Object.entries(stsStyleEpoch.proof.targets)){
  assert.equal(p.targets[name].commit,target.commit,name);
  for(const [path,row]of Object.entries(target.files))assert.deepEqual(p.targets[name].files[path],row,name+'/'+path);
 }
 for(const path of ['src/lua/abyss_lowcost_art.lua','src/lua/abyss_merchant_pages.lua']){
  assert.equal(p.targets.stsFeedbackPrior.files[path],null,'new module has no invented predecessor');
  for(const name of Object.keys(stsStyleEpoch.proof.targets))assert.equal(p.targets[name].files[path],null,name+'/'+path);
 }
 for(const [path,row]of Object.entries(p.current))assert.equal(beforeCharacterPreparationSource(path,readProductionHistory(path)).replaceAll('\r\n','\n'),row.source,path);
 const anchor=feedbackProductionPaths[0],raw=readProduction;
 assert.equal(sourceEpoch.preCombinedSource(anchor,raw(anchor),{target:'stsFeedbackPrior',readSource:raw}),stsStyleEpoch.proof.current[anchor].source);
 for(const path of feedbackProductionPaths){
  assert(p.owners.includes(path),'current owner must guard every changed feedback source: '+path);
  for(const missing of [null,raw(path)+'\n'])assert.throws(()=>sourceEpoch.preCombinedSource(anchor,raw(anchor),
   {target:'stsFeedbackPrior',readSource:p=>p===path?missing:raw(p)}),/linked owner identity/,path);
 }
 const {assertStsStyleCiCurrent,stsStyleCiProof,stsStyleBeforeFeedbackCiProof:previousCi}=await import('./helpers/sts-style-ci-source.mjs');assertStsStyleCiCurrent(discoverJs());
 const {menuRedPriorEpoch}=await import('./helpers/closeout-source-epoch.mjs');
 assert.equal(stsStyleCiProof.feedback.sourceCommit,menuRedPriorEpoch.proof.currentCommit,'feedback production and CI retain their exact source slice before the explicit menu continuation');
 assert.deepEqual(stsStyleCiProof.afterInventory,[...previousCi.afterInventory,...feedbackAddedTests].sort());
 for(const [path,row]of Object.entries(previousCi.files))assert.deepEqual(stsStyleCiProof.files[path].before,row.before,'complete original CI before: '+path);
 for(const path of feedbackCiPaths)assert.throws(()=>assertStsStyleCiCurrent(discoverJs(),(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh (?:complete StS CI|StS helper) source/,path);
 for(const path of feedbackAddedTests)for(const platform of ['win32','linux']){
  assert.equal(timings.js[platform][path],undefined);assert(jsPlanningWeights([path],platform)[path]>=timings.unknownJsMs);
 }
});
