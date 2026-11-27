import {beforeMapRoomReplayCohort} from './develop-replay-merge-source.mjs';
import {beforeMapNodeVisualsLineEndings} from './input-retirement-sts-binding.mjs';
import {readCloseoutLuaVocabularyReceipt} from './closeout-lua-vocabulary-source.mjs';
import {beforeCloseoutHistoryTooling,beforeCloseoutJoustCiFixture,readCloseoutCurrentBackflowReceipt} from './closeout-current-backflow-source.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readRetiredInputLuaReceipt,readRetiredInputTestReceipt} from './input-retirement-inventory.mjs';
import {beforeCombatEvents,beforeDevelopUiBackflows,beforePotionBackflow,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {beforeActionButtons} from './action-buttons-source.mjs';
import {authenticateDevelopBackflow,beforeDeckPages} from './develop-release-backflow-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';
import {stsStyleCiBytes} from './sts-style-ci-binding.mjs';
import {componentUiCiSourceProof} from './component-ui-ci-source-inverse.mjs';
import {beforeSelectionReceiptSource,selectionCopierReceipt} from './ui-selection-current-source.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeRunHudDeckLabel} from './run-hud-successors.mjs';
import {beforeCardReadingScope} from './chapter-battle-scene-source.mjs';
import {beforeKnownMasterBackflowSource} from './master-backflow-source.mjs';
import {readReleaseEntrancePredecessor} from './release-entrance-owner-source.mjs';
import {beforeReleaseClosureFixture} from './release-closure-fixture-source.mjs';

const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const lf=source=>source.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./calibration-replay-sources.json.gz',import.meta.url));
assert.equal(hash(bytes),'ba41b8ca02fb157121f08addffdd14ade94d0d759494cfa9b56344426746c926','exact historical calibration input archive');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);
assert.equal(packet.base,'469e80240c5b7c60f75ff434bebac62d73c0bd0c');
const matches=(source,row)=>typeof source==='string'&&!source.includes('\r\r\n')&&
 hash(lf(source))===row.sha256&&blob(lf(source))===row.gitBlob;
const officialBytes=readFileSync(new URL('./official-calibration-v220-source-receipt.json.gz',import.meta.url));
assert.equal(hash(officialBytes),'7d7a75a81cde23cd60e55a9eafc5dc635aa0030738332e3f7cc6076b9179328f','exact official calibration continuation');
const officialReceipt=JSON.parse(gunzipSync(officialBytes));
assert.equal(officialReceipt.schemaVersion,1);
assert.equal(officialReceipt.currentCommit,'ad375bbc11b6958c7f24fdf94b9681e1a8b48ff6');
const retirementBytes=readFileSync(new URL('./input-retirement-calibration-source.json.gz',import.meta.url));
assert.equal(hash(retirementBytes),'2ad6dd590a69fa7035d63d6fc2568dfff5ab815842192bc6a2eec619e316cfa1','exact calibration input retirement packet');
const retirement=JSON.parse(gunzipSync(retirementBytes));
assert.equal(retirement.base,'0461bcd30dac18818318cbafa77ad72fad069e0a');
for(const [path,row] of Object.entries(retirement.extra)){
 assert(Object.hasOwn(retirement.current,path),'registered calibration input successor: '+path);
 assert(matches(row.source,row),path+' exact retained fixture');
}
for(const row of retirement.retiredLua)assert(matches(row.source,row),'exact retired relic-view fixture');
for(const [path,row] of Object.entries(retirement.continuations))
 assert(matches(row.before.source,row.before),path+' exact input retirement CI test predecessor');
for(const [path,row] of Object.entries(packet.receipts))for(const [sha,retained] of Object.entries(row.before)){
 assert.equal(retained.sha256,sha,path+' recorded receipt identity');
 assert(matches(retained.source,retained),path+' exact retained receipt source');
}
for(const [path,row] of Object.entries(packet.continuations))
 assert(matches(row.before.source,row.before),path+' exact calibration continuation predecessor');

const runHudPotionFixture='tests/official-run-hud-reuse.test.mjs';
function beforeRunHudPotionFixture(path,source){
 if(path!==runHudPotionFixture||!matches(source,{
  sha256:'d25b9916ef640c869b28dc2c4227b522be54937e6e3ed91e6074de88653e30cd',gitBlob:'0d2a72ed384947c0d47be6eaac6de6d3ee2c2b6e',
 }))return source;
 const current=lf(source);
 // #872 appends a live potion assertion; only historical Run HUD reads omit it.
 const boundary=current.indexOf("\ntest('battle and noncombat potion popups share compact panel and action tokens',");
 assert(boundary>0,'exact Run HUD potion fixture suffix');
 const prior=current.slice(0,boundary);
 assert(matches(prior,{
  sha256:'0ac73d7298d2ef127daf0afc2b386073d19d9f5c25720b7f6513bfcaad4aa333',gitBlob:'bce30e2816a09bc594a84bec31c504b77ffe5d1f',
 }),'exact Run HUD potion fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

// The live budget test authenticates the #951 fixture rename before using the
// historical names. Frozen calibration receipts retain the previous test bytes.
function beforeReleaseLuaNameBudgetTest(path,source){
 if(path!=='tests/ci-windows-shape-expansion.test.mjs'||!matches(source,{
  sha256:'6601b5d58613272f5c2967ed444228e5d78fe1e570ae43bd8f0a67956bff9a41',
  gitBlob:'d0277ba31e28aa3849c7b54cbd3632f650c81a5c',
 }))return source;
 const prior=lf(source)
  .replace('import {beforeCurrentReleaseLuaNames,beforeInputRetirementTestInventory,',
   'import {beforeInputRetirementTestInventory,')
  .replace("beforeCurrentReleaseLuaNames(beforeInputRetirementTestInventory(lua,'lua',readFileSync,{required:true}),readFileSync)",
   "beforeInputRetirementTestInventory(lua,'lua',readFileSync,{required:true})");
 assert(matches(prior,retirement.continuations[path].after),'exact pre-rename budget fixture');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

function beforeRunHudCalibrationHelper(path,source){
 if(path!=='tests/helpers/run-hud-ci-source.mjs'||typeof source!=='string')return source;
 const normalized=lf(source);
 const crlf=source!==normalized;
 if(crlf&&source!==normalized.replaceAll('\n','\r\n'))return source;
 const priorHelper={
  sha256:'815c65ff6963579c7f48ea9ba390b8a6e16c24fbb0c13924ae8ad4a9da51ac7f',gitBlob:'60f9a0a326ff3120bf56671638579a06f74a7fc7',
 };
 let helper=normalized;
 if(matches(helper,{
  sha256:'05d070bf5f2f8e89cfe9a991084302bb496c6cb59bba428bac5f31d4d6c3ae85',gitBlob:'a80cc1d45dfc3d2c5b5440df4ca4a2d68e48c440',
 })){
  helper=helper.replace("import {beforeRunHudMapIcon} from './run-hud-successors.mjs';\n",'')
   .replace(' source=beforeRunHudMapIcon(path,source);\n','');
  assert(matches(helper,priorHelper),'exact Run HUD map icon predecessor');
 }
 if(!matches(helper,priorHelper))return source;
 const prior=helper
  .replace(/^import \{(?:beforePotionReadabilityEvidence|beforeCloseoutHistoryTooling|exactSourceMatches|restoreExactFixtureHunks)[^\n]*\n/gm,'')
  .replace(/^function beforeSilentPlanningSource[\s\S]*?(?=^export function preRunHudCiSource)/m,'')
  .replace(/^ source=(?:beforeSilentPlanningSource|beforeDefectPlanningSource|beforeCloseoutHistoryTooling|beforeCloseoutRunHudFixture)\(path,source\);\n/gm,'')
  .replace('preMenuRedCiSource(path,beforePotionReadabilityEvidence(path,source))','preMenuRedCiSource(path,source)');
 assert(matches(prior,{
  sha256:'084db705f3390910da925c32970a18279b78063f4a03d2331a19a775229c5524',gitBlob:'0543be2be1083af9594dbf48238e96d6a7a4bbf2',
 }),'exact archived Run HUD integration helper');
 return crlf?prior.replaceAll('\n','\r\n'):prior;
}

const prHistoryCalibrationReceipt={
 "path": "tests/pr-history.test.mjs",
 "before": {
  "sha256": "670d63a96197c8310b7cbfe3c98b1dbf64a7c918b1d22502c0807d9a8801e02e",
  "gitBlob": "00102c1f0557faf6c6b88e5415cbbdf0883ea9df"
 },
 "after": {
  "sha256": "7a76b431c86f1a4c2cf8c2049dde0a9cf6974e2f4855d75d7ff47f951134e10a",
  "gitBlob": "7909983f36297b4e573eb0643a07af355d71d202"
 },
 "hunks": [
  {
   "at": 7,
   "before": "import { receiptToolingSource } from './helpers/integration-1111-tooling.mjs';\nimport { preRunHudCiSource } from './helpers/run-hud-ci-source.mjs';",
   "after": "import { receiptToolingSource } from './helpers/integration-1111-tooling.mjs';\nimport { beforeCloseoutHistoryTooling } from './helpers/closeout-current-backflow-source.mjs';\nimport { preRunHudCiSource } from './helpers/run-hud-ci-source.mjs';"
  },
  {
   "at": 13,
   "before": "  const source = readFileSync(row.path, 'utf8').replaceAll('\\r\\n', '\\n');\n  assert.equal(source, row.after.source);\n  for (const input of [source, source.replaceAll('\\n', '\\r\\n')])\n    assert.equal(preRunHudCiSource(row.path, input), row.before.source);\n  for (const input of [source + '\\n', source.slice(1), source.slice(0, -1), source.replaceAll('\\n', '\\r\\r\\n'), null, {}, 17])\n    assert.equal(preRunHudCiSource(row.path, input), input);\n  for (const path of ['__proto__', 'constructor', 'foreign/' + row.path, row.path + '/extra'])\n    assert.equal(preRunHudCiSource(path, source), source);\n});",
   "after": "  const source = readFileSync(row.path, 'utf8').replaceAll('\\r\\n', '\\n');\n  assert.equal(beforeCloseoutHistoryTooling(row.path, source), row.after.source);\n  for (const fixture of [row.after.source, source]) {\n    for (const input of [fixture, fixture.replaceAll('\\n', '\\r\\n')])\n      assert.equal(preRunHudCiSource(row.path, input), row.before.source);\n    for (const input of [fixture + '\\n', fixture.slice(1), fixture.slice(0, -1), fixture.replaceAll('\\n', '\\r\\r\\n'), null, {}, 17])\n      assert.equal(preRunHudCiSource(row.path, input), input);\n    for (const path of ['__proto__', 'constructor', 'foreign/' + row.path, row.path + '/extra'])\n      assert.equal(preRunHudCiSource(path, fixture), fixture);\n  }\n  const mixed = source.replace('\\n', '\\r\\n');\n  assert.equal(preRunHudCiSource(row.path, mixed), mixed);\n});"
  }
 ]
};
function beforePrHistoryCalibrationFixture(path,source){
 const receipt=prHistoryCalibrationReceipt;
 if(path!==receipt.path||!matches(source,receipt.after))return source;
 const normalized=lf(source);
 if(source!==normalized&&source!==normalized.replaceAll('\n','\r\n'))return source;
 const prior=restoreExactFixtureHunks({path,beforeSha256:receipt.before.sha256,
  afterSha256:receipt.after.sha256,hunks:receipt.hunks},path,normalized);
 assert(matches(prior,receipt.before),'exact archived PR history calibration fixture');
 return source===normalized?prior:prior.replaceAll('\n','\r\n');
}

export function beforeCalibrationReplay(path,source){
 source=beforePrHistoryCalibrationFixture(path,source);
 source=beforeCloseoutJoustCiFixture(path,source);
 source=beforeCloseoutHistoryTooling(path,source);
 source=beforeRunHudCalibrationHelper(path,source);
 source=beforeReleaseLuaNameBudgetTest(path,source);
 source=beforeCurrentHistoricalStsSource(path,source);
 source=beforeMapNodeVisualsLineEndings(path,source);
 source=beforeRunHudPotionFixture(path,source);
 if(Object.hasOwn(retirement.continuations,path)){
  const {before,after}=retirement.continuations[path];
  if(matches(source,after))source=source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
 }
 if(!Object.hasOwn(packet.continuations,path))return source;
 const row=packet.continuations[path];
 if(!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
const copierPath='tests/helpers/copy-integration-source-closure.mjs';
const historicalStsEntry='tests/helpers/historical-sts-style-entry.mjs';
const isolatedStsEntry={
 sha256:'a762a913178c6d0fb8e4d8f72042bfe226145528657f90c173900a9cfaf4b619',gitBlob:'8fb1856e9fe072ab1bb0229937b35cfaad0966d5',
};
const retirementStsEntry={
 sha256:'96c580efcf1c7ed4e1be8b1bc3a27d15212c8b485e5a345d5ec450ad364017ae',gitBlob:'ce9126941e02931a16a28e10e20182c41799c7ef',
};
function historicalStsEntryAfterInputRetirement(){
 // The archived StS CI contract still reads the original launcher as data.
 // Its historical projection never participates in executing the capsule.
 const {source}=JSON.parse(gunzipSync(stsStyleCiBytes)).helperSources[historicalStsEntry];
 const path="import {runLua} from '../../scripts/test-lua.mjs';";
 const prior=source.replace(path,()=>`import {beforeInputRetirement,beforeInputRetirementStsSuite} from './input-retirement-source.mjs';
import {inputRetirementStsFixtureSource,inputRetirementStsWitness} from './input-retirement-sts-binding.mjs';
${path}`)
  .replace("assertStsStyleCiCurrent(discoverJs(),(p,e)=>readFileSync(join(root,p),e));",()=>`const suite=beforeInputRetirementStsSuite(discoverJs(),(p,e)=>inputRetirementStsFixtureSource(p,readFileSync(join(root,p),e)),inputRetirementStsWitness);
assertStsStyleCiCurrent(suite.paths,suite.read);`)
  .replace('update(raw(script).replaceAll','update(beforeInputRetirement(script,raw(script)).replaceAll');
 assert(matches(prior,retirementStsEntry),'exact historical StS runner predecessor');
 return prior;
}
export function beforeCurrentHistoricalStsSource(path,source){
 if(Buffer.isBuffer(source)){
  const text=source.toString('utf8'),prior=beforeCurrentHistoricalStsSource(path,text);
  return prior===text?source:Buffer.from(prior);
 }
 if(path==='tests/integration-source-epoch.test.mjs'||path==='tests/effects-target-group-source-epoch.test.mjs')
  source=beforeKnownMasterBackflowSource(path,source);
 // New exact integration tests first continue to the entrance witness's reviewed input.
 if(['tests/integration-source-epoch.test.mjs','tests/helpers/combined-epoch/source-epoch-runtime.mjs',
  'tests/session-menu-navigation.test.mjs','tests/tiny-house-pending-ui.cases.mjs'].includes(path))source=beforeCurrentReplayFixes(path,source);
 source=beforeUiEntranceWitness(path,source);
 if(path===copierPath)return beforeCurrentReplayCopier(path,source);
 if(path!==historicalStsEntry)return beforeCurrentReplayFixes(path,source);
 if(matches(source,isolatedStsEntry)&&(!source.includes('\r')||lf(source).replaceAll('\n','\r\n')===source)){
  const prior=historicalStsEntryAfterInputRetirement();
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(!matches(source,{
  sha256:'f358b5956f55a33890ea4f4481b75bcd0bfc56048cbc50e4b45a0f9870654c3b',gitBlob:'eb9b2d891344249dfb6644f8800240e3078d38b6',
 }))return source;
 const prior=lf(source)
  .replace("import {beforeCurrentHistoricalStsSource} from './calibration-replay-sources.mjs';\n",'')
  .replace('beforeCurrentHistoricalStsSource(p,readFileSync(join(root,p),e))','readFileSync(join(root,p),e)');
 assert(matches(prior,retirementStsEntry),'exact historical StS runner predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeCurrentReplayCopier(path,source){
 if(path===copierPath&&[{
  sha256:'1016f4f6c7c2d6f2617d29a09e2813a995bf66e73194fd4c606542c8ea46307e',gitBlob:'fd0837f1d73202bc28e71912ba008e35f7755de0',
 },{
  sha256:'9c0b358a3b75b59ebe7218f988297661b71a42b47d20e34a3b9734a2c0a71a10',gitBlob:'143ce2350c049fa4fe641e86dc34b18d094a8c73',
 }].some(revision=>matches(source,revision))){
  const prior=lf(source).replace(/const entranceFiles=Object.freeze\(\{\n[\s\S]+?\n\}\);\n/,'')
   .replace('Object.entries(entranceFiles)','Object.entries(currentReplayFiles)');
  assert.equal(hash(prior),'98ff5c37986a48db7ec6257a537193a57156cbdcce8e20cf48f5d206ff64aa40','exact merged entrance copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path===copierPath&&matches(source,{
  sha256:'69eb9c5241f43631e1e341747b0565a92b0e348ba7a9c3e9ea4479a524e98d91',gitBlob:'e39d70be38e7a42b6078c656d4624ed71d448ee5',
 })){
  const prior=lf(source).replace(/const entranceFiles=Object.freeze\(\{\n[\s\S]+?\n\}\);\n/,'')
   .replace('Object.entries(entranceFiles)','Object.entries(currentReplayFiles)');
  assert.equal(hash(prior),'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b','exact entrance copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path!==copierPath||!(matches(source,{
  sha256:'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b',gitBlob:'a796a1ddf69bd0a3c19e21eb7be78d21f498e720',
 })||matches(source,{
  sha256:'98ff5c37986a48db7ec6257a537193a57156cbdcce8e20cf48f5d206ff64aa40',gitBlob:'dfe81edcd36a45f8ffed7d42c849b7755708463b',
 })))return source;
 const text=lf(source);
 const block='const currentReplayFiles=Object.freeze({\n';
 const start=text.indexOf(block),end=text.indexOf('const inside=',start);
 assert(start>=0&&end>start,'exact current replay copy closure extension');
 const prior=(text.slice(0,start)+text.slice(end)).replace('Object.entries(currentReplayFiles))','Object.entries(actionButtonFiles))');
 assert(matches(prior,{
  sha256:'848e21017bfe022dd0a5e8215ffa94aee50b328ac9d7055ef1fade4f3a170677',gitBlob:'f3005ce3dcd73c1a5bd64fc252535ee6950bc6ff',
 }),'exact pre-repair helper copy closure');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

function matchesCurrentReceipt(path,source,expected){
 source=beforeCurrentReplayFixes(path,beforeUiEntranceWitness(path,source));
 if(matches(source,expected))return true;
 const ui=beforeDevelopUiBackflows(path,source);
 const actions=beforeActionButtons(path,ui);
 return [beforePotionBackflow(path,source),ui,actions,beforeCombatEvents(path,actions),beforeDeckPages(path,source)]
  .some(prior=>matches(prior,expected));
}

const relicEquipReceipt={
 path:'src/lua/abyss_relic_hooks.lua',
 current:{sha256:'c03ea48ca4375b1fd08cafc4d59e64ab0c6af387c490edfddb8136703fff28e0',gitBlob:'24a61843c9f6bc4a39baa4a2a13282469d858900'},
 prior:{sha256:'19b0ba4fcd2c5ca37219623868b8cdd978787e8861e50e2e43fefb8c70be2f2f',gitBlob:'792504a367f4488fb08942e0030d5376ea4de73c'},
};

function readRelicEquipReceipt(readCurrent){
 const {path,current,prior}=relicEquipReceipt;
 const source=readCurrent(path,'utf8');
 assert(matches(source,current)&&(!source.includes('\r')||lf(source).replaceAll('\n','\r\n')===source),
  'current relic equip receipt input changed: '+path);
 // This receipt predates unrelated closeout owners. Reuse the sealed session
 // relic transition and require the same live bytes on the linked re-read.
 const archived=authenticateDevelopBackflow(path,source,owner=>{
  const live=readCurrent(owner,'utf8');
  if(owner===path)assert(live===source,'current relic equip receipt input changed during replay: '+path);
  return live;
 });
 assert(matches(archived,prior),'exact relic equip receipt predecessor: '+path);
 return lf(archived);
}

const launchComponentPath='scripts/verify-launch-content.mjs';
const launchComponentPrior={
 sha256:'f249e9c6eb152bb16e9b75401b1aa445721eebc19c128d31e330a0379da66ab6',gitBlob:'f218c47d76bca2f8036ee65c9bbc149491f0cba2',
};
function readLaunchComponentReceipt(readCurrent){
 const source=readCurrent(launchComponentPath,'utf8');
 assert(matches(source,{
  sha256:'7dca28897fadbbb2b4fef133e6317e0887cda5f368b7720547ea590240ef621c',gitBlob:'501b73728eee52536770b49e211a997c46d29c9f',
 }),'current launch component receipt input changed');
 const normalized=lf(source);
 assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed launch component receipt line endings');
 const prior=normalized.replace('augmentation_core:', 'mutagenic_strength:').replace('raven_mask:', 'cultist_mask:')
  .replaceAll('explicit_event:augmenter:', 'explicit_event:drug_dealer:').replaceAll('drug_dealer:claim_core', 'drug_dealer:mutagens');
 assert(matches(prior,launchComponentPrior),'exact launch component receipt predecessor');
 return prior;
}

const componentCurrentSources={
 'src/lua/abyss_choice_ui.lua':{sha256:'234a556082e12d50f652fe6579be263c59b485436c287907e2472ecb8ce81eed',gitBlob:'22ea49f3c3ea08a34fe0dddcb9dd72e8ec375a32'},
 'src/lua/abyss_map_ui.lua':{sha256:'645764d987cb57f2cf57db066eeb3e99de967d248b9efabbd3cf65269e7dd379',gitBlob:'12e42d8d0abe7607b8526d7b89b2e2fc80c92ced'},
 'tests/native-candidate-deployment-closure.test.mjs':{sha256:'e284262759586462477b9631c8c5e9a9284a968d8377af0f95433025ccdeb1d2',gitBlob:'1f7255918b5878460dac5324add5e134a498fd20'},
 'tests/native-candidate-scripts.test.mjs':{sha256:'3c6d8c14b8674603ca6108d955e231b00654e67dfd0c5773db058960e6717394',gitBlob:'0f82c2b421f91c2a504c7900c877935c58d42a43'},
 'tests/native-candidate.test.mjs':{sha256:'ca0f758acf0d3d053b91182eabe1e1fb5b3f5bdaeb3e5bf13ef9b5e47e224238',gitBlob:'07cb62783fe2221d7ed8df4f7634796613e5fbaa'},
};
function readComponentSourceReceipt(path,digest,readCurrent){
 if(!Object.hasOwn(componentCurrentSources,path))return;
 const receipt=componentUiCiSourceProof.files[path];
 if(receipt.afterSha256!==digest)return;
 const source=beforeReleaseClosureFixture(path,readCurrent(path,'utf8'));
 assert(matches(source,componentCurrentSources[path]),'current component receipt input changed: '+path);
 const normalized=lf(source);
 assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed component receipt line endings: '+path);
 return receipt.afterSource;
}

const goldenIdolCopierDigest='ebbad15ec6009f1f855014435ef6c4ed2716dfcd0d60d56482e4bcf963dd127b';
function readGoldenIdolCopierReceipt(readCurrent){
 const source=readCurrent(copierPath,'utf8');
 const current={sha256:selectionCopierReceipt.afterSha256,gitBlob:selectionCopierReceipt.afterBlob};
 assert(matches(source,current)&&beforeSelectionReceiptSource(copierPath,source)!==source,
  'current Golden Idol copier receipt input changed');
 return packet.receipts[copierPath].before[goldenIdolCopierDigest].source;
}

const relicCatalogTest='tests/sts1-relic-pool-catalog.test.mjs';
const relicCatalogTestPrior={
 sha256:'d592cf17514bfd0557cf6dac7083e8b833d93c6d72e395b94ab347a6c7aa742f',gitBlob:'d5b5606e24d87cab5227927e2428e8768d7563ff',
};
function readRelicCatalogTestReceipt(readCurrent){
 const current=readCurrent(relicCatalogTest,'utf8');
 assert(matches(current,{
  sha256:'8a9760ce1d02808a18ee417a3dfe8b7ac5ca19ee1b295636e617a4572e2e3406',gitBlob:'355e6655d31944c9160acede88bc1b514b3b6fd8',
 }),'current relic catalog test receipt input changed');
 const normalized=lf(current);
 assert(current===normalized||current===normalized.replaceAll('\n','\r\n'),'mixed relic catalog test line endings');
 const prior=normalized
  .replace("import {historicalTest} from './helpers/historical-baseline-inputs.mjs';","import {closeoutRead} from './helpers/closeout-ci-source.mjs';")
  .replace("historicalTest('historical project effects","test('historical project effects")
  .replace("  const path = 'data/relics.json';\n  const data = JSON.parse(preAcceptedPr323Source(path,read(path))).relics;",
   "  const data = JSON.parse(preAcceptedPr323Source('data/relics.json',closeoutRead('pr620')('data/relics.json','utf8'))).relics;");
 assert(matches(prior,relicCatalogTestPrior),'exact historical relic catalog test predecessor');
 return prior;
}

const colorlessReceiptPath='tests/helpers/colorless-catalog-source-inverse.mjs';
function beforeColorlessReceipt(source,expected){
 if(!matches(source,{
  sha256:'ca654dba3b490f2d5f857933931992d1b72b346df246165499631cca7f6f717d',gitBlob:'94c5af24ef7e9e76b53116e97fc55d25d353f482',
 }))return source;
 const normalized=lf(source);
 assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed Colorless receipt line endings');
 const prior=normalized.replace('as original,colorlessCatalogSourceProof }','as original }')
  .replace(" if(!Object.hasOwn(colorlessCatalogSourceProof.files[path]??{},'beforeSource'))return source;\n",'');
 assert(matches(prior,expected),'exact Colorless receipt predecessor');
 return prior;
}

// A frozen receipt may read a registered old blob only after checking the
// corresponding current file. Raw Full discovery and inputs use their normal readers.
function readOfficialCalibrationReceipt(path,digest,readCurrent){
 if(!Object.hasOwn(officialReceipt.files,path))return;
 const row=officialReceipt.files[path];
 if(!Object.hasOwn(row.predecessors,digest))return;
 const prior=row.predecessors[digest];
 if(row.currentPath!==path)assert.throws(()=>readCurrent(path,'utf8'),{code:'ENOENT'},'retired official receipt input reappeared: '+path);
 const live=readCurrent(row.currentPath,'utf8');
 const current=row.currentPath==='scripts/deck-ui-layout.mjs'?beforeRunHudDeckLabel(live):
  row.currentPath==='src/lua/abyss_viewport.lua'?beforeCardReadingScope(row.currentPath,live):live;
 const source=matches(current,row.current)?current:readReleaseEntrancePredecessor(row.currentPath,current,readCurrent);
 assert(matches(source,row.current),'current official receipt input changed: '+row.currentPath);
 const normalized=lf(source);
 assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed official receipt line endings: '+row.currentPath);
 const predecessor=prior.rename?normalized.replace(prior.rename.after,prior.rename.before):
  restoreExactFixtureHunks({path,beforeSha256:digest,afterSha256:row.current.sha256,hunks:prior.hunks},path,normalized);
 assert.equal(prior.sha256,digest,'requested official receipt identity: '+path);
 assert(matches(predecessor,prior),'exact official receipt predecessor: '+path);
 return predecessor;
}
export function readCalibrationReceiptInput(path,digest,read,readCurrent=readFileSync){
 // #391's Slimed UI fixture is an intermediate receipt, not the oldest Lua
 // inverse. Check the live fixture before restoring only the one #1060 hunk.
 if(path==='tests/lua/slimed_ui.lua'&&digest==='74c651bbeadec8224e4d7bbab98f947d5e9a9494f3d681b96e8648a07703f20b'){
  const source=readCurrent(path,'utf8');
  assert(matches(source,{
   sha256:'62c3e6a414d6d31e4316630326fc76a5dd779145133cf2a5875fb4e203a3f2ec',gitBlob:'00dde572f5db8b7335087379e2caf4323e333db0',
  }),'current Slimed receipt input changed: '+path);
  const normalized=lf(source);
  assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed Slimed receipt line endings');
  const prior=normalized.replace("assert(detail:find('这名敌人将要对你施加负面效果并攻击造成 8 点伤害。',1,true))",
   "assert(detail:find('8',1,true) and detail:find('将 1 张「黏滞」放入你的弃牌堆',1,true))");
  assert(matches(prior,{sha256:digest,gitBlob:'e201717bc5401441b9c71e31830b5b14ae9630bd'}),'exact #391 Slimed receipt');
  return prior;
 }
 // Restore the #391 large Spike Slime fixture for this receipt only.
 if(path==='tests/lua/spike_slime_l_ui.lua'&&digest==='a6201ab0fe3b26d01c160d5d43fbf195daf2e71b23486a8cd43fbeb374ac9e6c'){
  const source=readCurrent(path,'utf8');
  assert(matches(source,{
   sha256:'98972176b8ae21b28ee48bfe7f7a15fb2b720f152ceb9bf4847b1a59083f5c05',gitBlob:'a6de1469b516a29fd444c1e5a200565d0626d42e',
  }),'current Spike Slimed receipt input changed: '+path);
  const normalized=lf(source);
  assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed Spike Slimed receipt line endings');
  const prior=normalized.replace("assert(detail:find('这名敌人将要对你施加负面效果并攻击造成 16 点伤害。',1,true))",
   "assert(detail:find('16',1,true) and detail:find('将 2 张「黏滞」放入你的弃牌堆',1,true))")
   .replace("assert(frail:find('这名敌人将要对你施加一种负面效果。',1,true)",
    "assert(frail:find('使你获得 2 回合脆弱',1,true)")
   .replace('intent16/strategy/read-only/two-generated-cards/real-exhaust/debuff-preview',
    'intent16/detail2/read-only/two-generated-cards/real-exhaust/frail2');
  assert(matches(prior,{sha256:digest,gitBlob:'72cb15dea11aee357476e26219028202bb11fc90'}),'exact #391 Spike Slimed receipt');
  return prior;
 }
 const official=readOfficialCalibrationReceipt(path,digest,readCurrent);
 if(official!==undefined)return official;
 if(path===relicEquipReceipt.path&&digest===relicEquipReceipt.prior.sha256)return readRelicEquipReceipt(readCurrent);
 if(path===launchComponentPath&&digest===launchComponentPrior.sha256)return readLaunchComponentReceipt(readCurrent);
 if(path===copierPath&&digest===goldenIdolCopierDigest)return readGoldenIdolCopierReceipt(readCurrent);
 if(path===relicCatalogTest&&digest===relicCatalogTestPrior.sha256)return readRelicCatalogTestReceipt(readCurrent);
 const component=readComponentSourceReceipt(path,digest,readCurrent);
 if(component!==undefined)return component;
 const vocabulary=readCloseoutLuaVocabularyReceipt(path,digest,readCurrent);
 if(vocabulary!==undefined)return vocabulary;
 const closeout=readCloseoutCurrentBackflowReceipt(path,digest,readCurrent);
 if(closeout!==undefined)return closeout;
 const fallback=()=>{
  const source=read(),prior=beforeCurrentReplayFixes(path,source);
  return typeof prior==='string'&&hash(lf(prior))===digest?prior:source;
 };
 const retired=readRetiredInputTestReceipt(path,digest,readCurrent);
 if(retired!==undefined)return retired;
 if(path==='tests/lua/relic_view_controller_click.lua'){
  const row=retirement.retiredLua.find(row=>row.sha256===digest);
  if(row)return readRetiredInputLuaReceipt(path,digest,readCurrent,row);
 }
 const current=Object.hasOwn(retirement.current,path)?retirement.current[path]:null;
 const retained=Object.hasOwn(packet.receipts,path)&&Object.hasOwn(packet.receipts[path].before,digest)?packet.receipts[path].before[digest]:null;
 if(path===retiredControllerPath&&digest===stsStylePriorRuntime.files[path].sha256){
  assert(readRetiredController(p=>readCurrent(p,'utf8')).restored,'retired production controller receipt requires the current pointer owner');
  return stsStylePriorRuntime.files[path].source;
 }
 if(current){
  const extra=Object.hasOwn(retirement.extra,path)?retirement.extra[path]:null;
  const prior=Object.hasOwn(stsStylePriorRuntime.files,path)?stsStylePriorRuntime.files[path]:null;
  const witness=retained??(extra?.sha256===digest?extra:prior?.sha256===digest?prior:null);
  if(witness){
   assert(matchesCurrentReceipt(path,readCurrent(path,'utf8'),current),'current receipt input changed: '+path);
   assert(matches(witness.source,witness),path+' exact retained calibration input');
   return witness.source;
  }
 }
 if(!Object.hasOwn(packet.receipts,path))return fallback();
 const row=packet.receipts[path];
 if(!Object.hasOwn(row.before,digest))return fallback();
 if(row.current===null)assert.throws(()=>readCurrent(path,'utf8'),{code:'ENOENT'},'retired receipt input reappeared: '+path);
 else{
  const raw=beforeCurrentHistoricalStsSource(path,readCurrent(path,'utf8'));
  let current=raw;
  if(path===colorlessReceiptPath)current=beforeColorlessReceipt(raw,row.current);
  if(path==='tests/helpers/combined-epoch/source-epoch-runtime.mjs'||path==='tests/helpers/copy-integration-source-closure.mjs'||
     path==='tests/helpers/round3-catalog-source-inverse.mjs'){
   current=beforeMapRoomReplayCohort(path,raw);
   assert.notEqual(current,raw,'current receipt input changed: '+path);
  }
  assert(matchesCurrentReceipt(path,current,row.current),'current receipt input changed: '+path);
 }
 return row.before[digest].source;
}
