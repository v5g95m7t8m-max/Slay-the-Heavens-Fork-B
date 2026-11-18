import {enemyFastRead} from './helpers/release-enemy-fast-source.mjs';
import {artFeatureReceipt} from '../scripts/art-features.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyPlatformRelease, loadChecks, growthWarnings } from '../scripts/platform-load.mjs';
import { checkArchitecture } from '../scripts/check-architecture.mjs';
import { candidateScriptFiles, excludedProductionModules } from '../scripts/native-candidate-scripts.mjs';
import { sourceInputs, payloadDigest } from '../scripts/build-native-candidate.mjs';

// Complete 2x2 synthetic images, not official screenshots or device acceptance.
const raw = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGPUj2xmYGBgYmBgYGBgAAAMWgEPfzx+rwAAAABJRU5ErkJggg==', 'base64');
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkKKKK9k8o/9k=', 'base64');
const artifact = {path: 'report.txt', sha256: createHash('sha256').update(raw).digest('hex')};
const measuredAt = '2026-10-30T01:00:00Z';
const now = Date.parse('2026-10-30T02:00:00Z');
// Independent acceptance oracle: removing a required check from production
// must fail these tests rather than silently shrinking the fixture with it.
const requiredChecks = ['staticGlobal', 'staticRegions', 'clientCompute', 'clientMemory', 'serverProcessor',
  'serverMemory', 'combatPeak', 'complexHand', 'enemyEffectsConcurrency', 'sceneTransitions', 'repeatedEntryExit',
  'officialUpload', 'launchAndOperate', 'mobilePerformance', 'mobileInteraction'];
const receipt = {sourceCommit: 'a'.repeat(40), sourceDirty: false, buildId: '12345678-1234-1234-1234-123456789abc',
  payloadDigest: 'b'.repeat(64), candidate: {sha256: 'c'.repeat(64)}, startedAt: '2026-10-30T00:00:00Z',
  release: {notesSha256: 'd'.repeat(64)}};
function fixture() {
  const reading = limitMB => ({source: 'official-editor', unit: 'MB', limitMB, valueMB: 0.01, measuredAt, artifacts: [artifact]});
  return {schemaVersion: 1, sourceCommit: receipt.sourceCommit, buildId: receipt.buildId,
    payloadDigest: receipt.payloadDigest, candidateSha256: receipt.candidate.sha256,
    recordedAt: measuredAt, reviewer: 'fixture reviewer', clientVersion: '7.1.0', uidRedacted: true,
    loadTierUnchanged: true, dynamicDetectionEnabled: true, detectorOverheadAcknowledged: true,
    levelStorage: {...reading(20), valueMB: 8.96}, serverStorage: reading(3),
    rawDynamicReport: {source: 'official-sandbox', artifacts: [artifact]},
    screenshots: {artifacts: [artifact]},
    checks: Object.fromEntries(requiredChecks.map(name => [name, {status: 'PASS', measuredAt, notes: 'fixture reviewed', unresolved: [], artifacts: [artifact]}]))};
}
const verify = (evidence, candidate = receipt, read = () => raw) => verifyPlatformRelease(candidate, evidence, read, now);

test('official evidence is mandatory and a complete matching synthetic fixture passes', () => {
  assert.equal(verify().status, 'UNVERIFIED');
  assert.equal(verify(fixture()).status, 'PASS');
});
test('official screenshots require complete decoded PNG or JPEG bytes bound to the checked hash', () => {
  const withImage = bytes => {
    const evidence = fixture();
    evidence.screenshots.artifacts = [{path: 'image', sha256: createHash('sha256').update(bytes).digest('hex')}];
    return evidence;
  };
  for (const bytes of [raw, jpeg]) {
    assert.equal(verify(withImage(bytes), receipt, path => path === 'image' ? bytes : raw).status, 'PASS');
  }
  const badCrc = Buffer.from(raw); badCrc[badCrc.length - 17] ^= 1;
  const invalid = [raw.subarray(0, 8), raw.subarray(0, raw.length - 12), badCrc,
    jpeg.subarray(0, 3), jpeg.subarray(0, jpeg.length - 20), Buffer.from('P6\n1 1\n255\nabc')];
  for (const bytes of invalid) {
    const result = verify(withImage(bytes), receipt, path => path === 'image' ? bytes : raw);
    assert.equal(result.status, 'BLOCKED', `must reject incomplete or unsupported image (${bytes.length} bytes)`);
    assert(result.errors.some(error => error.includes('screenshots:')));
  }
  const originalOptimize = process.env.PYTHONOPTIMIZE;
  try {
    process.env.PYTHONOPTIMIZE = '1';
    const unsupported = Buffer.from('P6\n1 1\n255\nabc');
    assert.equal(verify(withImage(unsupported), receipt, path => path === 'image' ? unsupported : raw).status, 'BLOCKED',
      'optimized Python must not remove image format validation');
    assert.equal(verify(withImage(raw), receipt, path => path === 'image' ? raw : raw).status, 'PASS');
  } finally {
    if (originalOptimize === undefined) delete process.env.PYTHONOPTIMIZE;
    else process.env.PYTHONOPTIMIZE = originalOptimize;
  }
  let reads = 0;
  const evidence = withImage(raw);
  const result = verify(evidence, receipt, path => path === 'image' ? (++reads === 1 ? raw : raw.subarray(0, 8)) : raw);
  assert.equal(result.status, 'PASS');
  assert.equal(reads, 1, 'decode the exact bytes that passed the evidence hash, without a second path read');
});

test('20MB and 3MB are independent hard limits; 16MB is only a warning', () => {
  for (const [field, limit] of [['levelStorage', 20], ['serverStorage', 3]]) {
    const e = fixture(); e[field].valueMB = limit;
    assert.equal(verify(e).status, 'PASS');
    e[field].valueMB = limit + 0.01;
    assert.equal(verify(e).status, 'BLOCKED');
    for (const value of [-1, NaN, Infinity, '0.01']) { e[field].valueMB = value; assert.equal(verify(e).status, 'BLOCKED'); }
  }
  const e = fixture(); e.levelStorage.valueMB = 16.01;
  assert.equal(verify(e).warnings.length, 1);
  e.levelStorage.source = 'gil-file-size'; assert.equal(verify(e).status, 'BLOCKED');
});
test('each official load and mobile check is required, unresolved anomalies cannot pass', () => {
  assert.deepEqual(loadChecks, requiredChecks);
  for (const key of requiredChecks) {
    const e = fixture(); delete e.checks[key]; assert.equal(verify(e).status, 'BLOCKED', key);
    e.checks[key] = {status: 'PASS', measuredAt, notes: 'reviewed', unresolved: ['overload'], artifacts: [artifact]};
    assert.equal(verify(e).status, 'BLOCKED', key);
  }
});
test('rejects another candidate, old times, altered evidence, dirty source and missing detector report', () => {
  for (const field of ['sourceCommit', 'buildId', 'payloadDigest', 'candidateSha256']) {
    const e = fixture(); e[field] = 'other'; assert.equal(verify(e).status, 'BLOCKED');
  }
  for (const field of ['loadTierUnchanged', 'uidRedacted', 'dynamicDetectionEnabled', 'detectorOverheadAcknowledged']) {
    const e = fixture(); e[field] = false; assert.equal(verify(e).status, 'BLOCKED');
  }
  for (const date of ['2026-10-29', '2030-01-01', 'bad date', '2026-10-30T01:00:00']) {
    const e = fixture(); e.levelStorage.measuredAt = date; assert.equal(verify(e).status, 'BLOCKED');
  }
  assert.equal(verify(fixture(), {...receipt, sourceDirty: true}).status, 'BLOCKED');
  assert.equal(verify(fixture(), {...receipt, release: undefined}).status, 'BLOCKED');
  assert.equal(verify(fixture(), receipt, () => Buffer.from('altered')).status, 'BLOCKED');
  const e = fixture(); delete e.rawDynamicReport; assert.equal(verify(e).status, 'BLOCKED');
});
test('production exclusion has no imports, and growth is reported without treating source bytes as platform MB', () => {
  const a = checkArchitecture(); assert.deepEqual(a.errors, []);
  assert(!a.edges.some(edge => excludedProductionModules.includes(edge.to)));
  const scripts = candidateScriptFiles();
  assert(!scripts.some(row => row.name === 'abyss_random'));
  assert(readFileSync('src/lua/abyss_random.lua').length > 0, 'development source is preserved');
  assert.equal(growthWarnings({luaBytes: 111}, {luaBytes: 100}).length, 1);
});

test('release CLI rejects missing evidence, changed candidate, current payload drift and broken art provenance', () => {
  mkdirSync('build', {recursive: true});
  const directory = mkdtempSync(resolve('build/platform-load-fixture-'));
  try {
    const path = join(directory, 'candidate.gil'), receiptPath = join(directory, 'candidate.json');
    writeFileSync(path, raw);
    const current = {...receipt, artFeatures:artFeatureReceipt({}), payloadDigest: payloadDigest(sourceInputs(process.cwd())),
      candidate: {path, sha256: createHash('sha256').update(raw).digest('hex')}};
    const run = value => {
      writeFileSync(receiptPath, JSON.stringify(value));
      return spawnSync(process.execPath, ['scripts/platform-load.mjs', 'release', receiptPath], {encoding: 'utf8', timeout: 15000});
    };
    let result = run(current);
    assert.equal(result.status, 1); assert.match(result.stdout, /UNVERIFIED/);
    result = run({...current, candidate: {...current.candidate, sha256: 'f'.repeat(64)}});
    assert.equal(result.status, 1); assert.match(result.stderr, /Candidate file changed/);
    result = run({...current, payloadDigest: 'f'.repeat(64)});
    assert.equal(result.status, 1); assert.match(result.stderr, /payload differs/);
    result = run({...current, nativeCardArt: {inputs: [], outputs: []}});
    assert.equal(result.status, 1); assert.match(result.stderr, /native art candidate provenance/);
    assert.equal(JSON.parse(readFileSync('build/platform-load-release.json')).status, 'BLOCKED', 'cannot leave stale PASS after a failure');
  } finally {
    const rel = relative(resolve('build'), directory);
    assert(!isAbsolute(rel) && !rel.startsWith('..') && rel.startsWith('platform-load-fixture-'));
    rmSync(directory, {recursive: true, force: true});
  }
});

import * as costs from '../scripts/production-costs.mjs';

const costProfile=(overrides={})=>({schemaVersion:1,uiProfile:'default',renderProfile:'native-v2',
 artFeatures:{cards:false,menuBackground:false,selectionAvatar:false,battlePortrait:false,monsters:false},
 nativePageLifecycle:false,legacyCardFrames:false,experimentalCharacters:false,performanceArt:false,
 cardArt:'disabled',staticCardHosts:[],privateCardAssets:false,privateUiMasks:false,releaseCandidate:false,...overrides});

test('default generated card hosts are counted alongside Official hosts without double counting',()=>{
 const layout=JSON.parse(readFileSync('build/lua/game-ui.json'));
 const templates=JSON.parse(readFileSync('build/lua/game-ui-templates.json'));
 const r=costs.productionCosts([],layout,templates);
 assert.equal(r.cardHosts.length,61,'default artPlate hosts must not disappear from the bill');
 const mixed={name:'Game',controls:[{name:'card',children:[{name:'artPlate',kind:'image'},
  {name:'stsReferenceChrome',kind:'container'}]}]};
 assert.equal(costs.productionCosts([],mixed,[]).cardHosts.length,1,'one host with both markers is one instance');
});

test('cost deltas require known matching assembly profiles, not matching layout contents',()=>{
 const r={schemaVersion:1,assemblyProfile:costProfile(),lua:[],templates:[],cardHosts:[],pages:[{path:'Game/page',jsonBytes:10}]};
 for(const unknown of [undefined,null,{}, {...costProfile(),artFeatures:undefined}])
  assert.equal(costs.productionCostDelta({...r,assemblyProfile:unknown},r).status,'UNVERIFIED-configuration-unknown');
 for(const other of [costProfile({uiProfile:'official-assets'}),costProfile({nativePageLifecycle:true}),
  costProfile({artFeatures:{...r.assemblyProfile.artFeatures,selectionAvatar:true}})])
  assert.equal(costs.productionCostDelta({...r,assemblyProfile:other},r).status,'UNVERIFIED-configuration-mismatch');
 const staticProfile=hosts=>costProfile({cardArt:'static',artFeatures:{...r.assemblyProfile.artFeatures,cards:true},staticCardHosts:hosts});
 assert.equal(costs.productionCostDelta({...r,assemblyProfile:staticProfile(['battlePanel/card1'])},
  {...r,assemblyProfile:staticProfile(['battlePanel/card1','battlePanel/card2'])}).status,'UNVERIFIED-configuration-mismatch');
 assert.equal(costs.productionCostDelta({...r,assemblyProfile:staticProfile(['battlePanel/card2','battlePanel/card1'])},
  {...r,assemblyProfile:staticProfile(['battlePanel/card1','battlePanel/card2'])}).status,'offline-comparison-not-official-storage');
 const changed={...r,pages:[{path:'Game/page',jsonBytes:25}]};
 assert.equal(costs.productionCostDelta(changed,r).pages[0].deltaBytes,15,'normal layout growth remains comparable');
});

test('generated default and Official configurations are recorded separately and cannot be compared',async t=>{
 const {buildUI}=await import('../scripts/build-ui.mjs');
 const {buildLuaData}=await import('../scripts/build-lua-data.mjs');
 const {packageInventory}=await import('../scripts/platform-load.mjs');
 const dir=mkdtempSync(join(process.cwd(),'build/cost-profiles-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const reports=[];
 for(const [label,options]of [['default',{}],['official',{officialAssets:true}]]){
  const target=join(dir,label);buildUI(target,undefined,options);buildLuaData('data',join(target,'abyss_data.lua'));
  reports.push(packageInventory(target).costBreakdown);
 }
 assert.equal(reports[0].assemblyProfile.uiProfile,'default');
 assert.equal(reports[0].cardHosts.length,61);
 assert.equal(reports[0].cardHosts.reduce((n,r)=>n+r.controls,0),8892);
 assert.equal(reports[1].assemblyProfile.uiProfile,'official-assets');
 assert.equal(reports[1].assemblyProfile.artFeatures.selectionAvatar,true);
 assert.equal(reports[1].cardHosts.length,39);
 assert.equal(costs.productionCostDelta(reports[1],reports[0]).status,'UNVERIFIED-configuration-mismatch');
 const slot={image:100003,imageType:'stretch',position:[0,0],size:[1,1],anchorMin:[.5,.5],anchorMax:[.5,.5],pivot:[.5,.5],scale:[1,1],rotation:[0,0,0],colour:[255,255,255,255]};
 const registry={schemaVersion:2,editorCommit:'103025f9095d8089e3f9bf097f4d0c5fe039d546',canvas:[144,64],assets:{
  cleave:{cardId:'cleave',luaSha256:'a'.repeat(64),jsonSha256:'b'.repeat(64),slots:[slot]}}};
 const staticReports=[];
 for(const [label,hosts,growth]of [['one',['battlePanel/card1'],false],['two',['battlePanel/card1','battlePanel/card2'],false],['growth',['battlePanel/card1'],true]]){
  const target=join(dir,label),art=structuredClone(registry);if(growth)art.assets.cleave.slots.push(slot);
  buildUI(target,undefined,{nativeCardArt:{registry:art,hosts}});buildLuaData('data',join(target,'abyss_data.lua'));
  staticReports.push(packageInventory(target).costBreakdown);
 }
 assert.deepEqual(staticReports[0].assemblyProfile.staticCardHosts,['battlePanel/card1']);
 assert.equal(costs.productionCostDelta(staticReports[1],staticReports[0]).status,'UNVERIFIED-configuration-mismatch');
 assert.equal(costs.productionCostDelta(staticReports[2],staticReports[0]).status,'offline-comparison-not-official-storage','asset content growth at the same configured hosts remains comparable');
 const saved=readFileSync(join(dir,'default/assembly-profile.json'));
 rmSync(join(dir,'default/assembly-profile.json'));
 assert.equal(packageInventory(join(dir,'default')).costBreakdown.assemblyProfile,null,'legacy output without metadata stays unknown');
 writeFileSync(join(dir,'default/assembly-profile.json'),saved);
 const bad=JSON.parse(saved);bad.artFeatures.selectionAvatar=true;
 writeFileSync(join(dir,'default/assembly-profile.json'),JSON.stringify(bad));
 assert.equal(packageInventory(join(dir,'default')).costBreakdown.assemblyProfile,null,'metadata cannot contradict the actual art flags');
});

test('capacity CI continuation authenticates every current source before replaying immutable predecessors',async()=>{
 const adapter=await import('./helpers/release-bootstrap-ci-source.mjs');
 const {integratedCiProof,assertIntegratedCurrent}=await import('./helpers/integrated-ci-source.mjs');
 const historicalRead=enemyFastRead('release',readFileSync);
 const packet=adapter.capacityCiPacket;
 assert.ok(packet,'explicit complete capacity CI continuation is required');
 assert.deepEqual(Object.keys(packet.files).sort(),['scripts/official-portraits.mjs','scripts/platform-load.mjs','tests/official-portraits-build.test.mjs','tests/platform-load.test.mjs','tests/v25-portrait-profile.test.mjs']);
 assertIntegratedCurrent();
 for(const [path,row]of Object.entries(packet.files)){
  if(integratedCiProof.files[path])assert.deepEqual(row.before,integratedCiProof.files[path].current,'unchanged complete predecessor');
  else assert.equal(row.before.sha256,{'scripts/platform-load.mjs':'020cfad431d2924bc925690d972a4f732eff73de35af72c3592997404af6bf39',
   'tests/platform-load.test.mjs':'0c1bc43441bf22c0dfcdeac8a2512faff28fc6da31f962711229c66f71feaab5'}[path],'unchanged complete platform-load predecessor');
  const current=historicalRead(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(adapter.releaseBootstrapCiSource(path,current,row.before),row.before.source);
  for(const changed of [current+'\n',current.replace(/./,'!')]){
   assert.equal(adapter.releaseBootstrapCiSource(path,changed,row.before),changed,'unknown bytes cannot receive a trusted source view');
   assert.throws(()=>assertIntegratedCurrent((file,encoding)=>file===path?changed:readFileSync(file,encoding)),/fresh complete TASK-111 CI source/);
  }
  assert.throws(()=>assertIntegratedCurrent((file,encoding)=>{if(file===path)throw Error('ENOENT '+path);return readFileSync(file,encoding);}),/ENOENT/);
 }
 for(const [path,row]of Object.entries(adapter.capacityReviewCiPacket.files)){
  const current=historicalRead(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(current).digest('hex'),row.current.sha256);
  for(const changed of [current+'\n',current.replace(/./,'!')]){
   assert.equal(adapter.releaseBootstrapCiSource(path,changed),changed);
   assert.throws(()=>assertIntegratedCurrent((file,encoding)=>file===path?changed:readFileSync(file,encoding)),/fresh complete TASK-111 CI source/);
  }
  assert.throws(()=>assertIntegratedCurrent((file,encoding)=>{if(file===path)throw Error('ENOENT '+path);return readFileSync(file,encoding);}),/ENOENT/);
 }
 assertIntegratedCurrent();
});

test('costs count pages, templates and cards separately without treating ancestor-hidden pages as waste',()=>{
 const card={name:'card1',kind:'container',children:[{name:'stsReferenceChrome',kind:'container',children:[]},{name:'art',kind:'image',image:100001}]};
 const layout={name:'Game',controls:[{name:'stage',children:[{name:'battlePanel',visible:false,children:[card]},{name:'menuPanel',children:[]}]}]};
 const templates=[{name:'Deck',children:[{...card,name:'face'}]}];
 const r=costs.productionCosts([{name:'abyss_data',bytes:17},{name:'abyss_a',bytes:9}],layout,templates,{abyss_a:'core'});
 assert.equal(r.measurement,'offline-production-inputs-not-official-storage');
 assert.equal(r.cardHosts.length,2);assert.equal(r.cardHosts[0].controls,3);
 assert.equal(r.pages.find(p=>p.path.endsWith('battlePanel')).hiddenControls,4);
 assert.equal(r.templates[0].controls,4);
 assert.deepEqual(r.lua.map(x=>[x.name,x.category]),[['abyss_data','configuration'],['abyss_a','core']]);
 assert.equal(r.imageReferences.find(x=>x.image===100001).instances,2);
 assert.equal(r.officialStorageMB,null);
});
test('growth ranks comparable paths including added/removed modules and never invents an old path baseline',()=>{
 const before={schemaVersion:1,assemblyProfile:costProfile(),lua:[{name:'a',bytes:10},{name:'gone',bytes:8}],pages:[{path:'Game/stage/a',jsonBytes:20}],templates:[],cardHosts:[]};
 const after={schemaVersion:1,assemblyProfile:costProfile(),lua:[{name:'a',bytes:15},{name:'new',bytes:9}],pages:[{path:'Game/stage/a',jsonBytes:12}],templates:[],cardHosts:[]};
 assert.deepEqual(costs.productionCostDelta(after,before).lua.map(r=>[r.name,r.deltaBytes]),[['new',9],['a',5],['gone',-8]]);
 assert.equal(costs.productionCostDelta(after,before).pages[0].deltaBytes,-8);
 assert.equal(costs.productionCostDelta(after).status,'UNVERIFIED-no-comparable-breakdown');
 for(const partial of [{},{schemaVersion:1},{...before,lua:undefined},{...before,schemaVersion:2}]){
  assert.equal(costs.productionCostDelta(after,partial).status,'UNVERIFIED-no-comparable-breakdown');
 }
 for(const invalid of [[{name:'a',bytes:NaN}],[{name:'a',bytes:10},{name:'a',bytes:20}],[{bytes:10}]]){
  assert.equal(costs.productionCostDelta(after,{...before,lua:invalid}).status,'UNVERIFIED-no-comparable-breakdown');
 }
});
