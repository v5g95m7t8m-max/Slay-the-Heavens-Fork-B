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
// Current fixtures use the visible UI and real dependencies. Historical
// inventory reads authenticate the exact current fixture before replay.
const liveLuaCalibrationFixtures=Object.freeze({
 "tests/lua/shield_gremlin_ui.lua": {
  "before": {
   "sha256": "b70df889a1535f0184c1a016297c6033b4e6490af092f9a089dad5b869cf4abf",
   "gitBlob": "81aa604399d540b2107ea2f24963b75333b232b7"
  },
  "after": {
   "sha256": "4cd16b58b71fab5624ad3dba1e60f2dc2c63462470fdb82dddb525867abb45f8",
   "gitBlob": "da6478e6f71141ffc234663675f540cd00a0c0f0"
  },
  "hunks": [
   {
    "at": 11,
    "before": "assert(detail:find('随机队友',1,true),'Protect detail must name random teammate')\nassert(detail:find('没有队友时给自己',1,true),'Protect detail must name solo fallback')\nassert(detail:find('获得 7 点格挡',1,true),'Protect detail stays fixed7')",
    "after": "assert(detail:find('守势',1,true) and detail:find('这名敌人将要在这个回合进行格挡。',1,true),'Protect shows the native DEFEND hint')\nfor _,hidden in ipairs({'随机队友','没有队友时给自己','获得 7 点格挡'}) do\n    assert(not detail:find(hidden,1,true),'the intent tip must not disclose Protect internals: '..hidden)\nend"
   }
  ]
 },
 "tests/lua/potion_event_ui.lua": {
  "before": {
   "sha256": "d6247d8b44c6e94e3c0c44d02c0369a138cfdf9410a213edac20bbbb0a0222bb",
   "gitBlob": "5e40faa4900080dc2a12d12fdb626ea9683dee51"
  },
  "after": {
   "sha256": "bf2453e82e539c8c68248d39860bd441d012be30b99e9b3f310081dbbe7287df",
   "gitBlob": "008a25ca920519d1bcd17339922dc1884819f56e"
  },
  "hunks": [
   {
    "at": 44,
    "before": " eq(get('eventView/option4').visible,false);eq(get('confirm').visible,true)",
    "after": " eq(get('eventView/option4').visible,false)\n assert(ui.mapUI.visible and ui.mapUI.navigationEnabled and not ui.nodeUI.root.visible,'claim restores a navigable map and hides the old event panel')\n assert(not get('confirm').visible,'hidden event does not expose stale confirm')"
   }
  ]
 },
 "tests/lua/ready_art_binding.lua": {
  "before": {
   "sha256": "197ffdae88d9f0e39d42de02539eca8363e1d04acdf65f21065f13adebcb2487",
   "gitBlob": "b712fe9d6e776236932731c66484fbb7d884bf09"
  },
  "after": {
   "sha256": "e6573d6638e60a307b76ee5e5ee04f13c79e5a86f7990e3bf9c86445bf28b37c",
   "gitBlob": "d26c3c13b211425f5c0a12aadab2340750f8db3b"
  },
  "hunks": [
   {
    "at": 0,
    "before": "package.path='src/lua/?.lua;'..package.path\npackage.preload.abyss_theme=function()return {} end",
    "after": "package.path='src/lua/?.lua;'..package.path"
   }
  ]
 },
 "tests/lua/spore_cloud_ui.lua": {
  "before": {
   "sha256": "4e1c75cf707b557e55245cfc02485efe67355a1f9284e240ff50da4efcc5a994",
   "gitBlob": "9743b213ef8a70365347d544e23e8464612688e1"
  },
  "after": {
   "sha256": "18c200489ee54d97d4d90f438331560e3dc647bc54c7b45fbdbb8aa6d598ddb9",
   "gitBlob": "ced636e566c1297ae389061b33b4bbd5c3c5f9ec"
  },
  "hunks": [
   {
    "at": 13,
    "before": "    assert(info.visible,'status details open')\n    if index then assert(ui.info.index==index and ui.info.id==s.enemies[index].id,'status details retain true actor ID') end",
    "after": "    assert(info.visible,'status details open')\n    if index then\n        assert(ui.info.index==index and ui.info.id==s.enemies[index].id,'status details retain true actor ID')\n        return dofile('tests/lua/support/status_detail_fixture.lua')(ui,panel)\n    end"
   }
  ]
 },
 "tests/lua/sentries_ui.lua": {
  "before": {
   "sha256": "ecb0ebeade9baea10b2a137c160fc115aec37b456e4ccfe06eccbadb77e94f28",
   "gitBlob": "108cf93083cc16d4e323268ebe1e6ecb2e742b7b"
  },
  "after": {
   "sha256": "80f1e80430f293085a4d49ded796e9bb1221e42ff8383dc11f4d1b068df6a3ce",
   "gitBlob": "5e9a751044bf1091f400f82ac59f9d7b670ed71b"
  },
  "hunks": [
   {
    "at": 49,
    "before": "expect(true)",
    "after": "expect(true)\nlocal function dazedCount(battle)\n    local total=0\n    for _,pile in ipairs({battle.hand,battle.draw,battle.discard,battle.exhaust})do\n        for _,card in ipairs(pile)do if card.cardId=='dazed' then total=total+1 end end\n    end\n    return total\nend"
   },
   {
    "at": 59,
    "before": "    click(\"enemy1\");assert(inspectDetails(ui,stage):find(\"放入你的弃牌堆\",1,true))",
    "after": "    click(\"enemy1\");assert(inspectDetails(ui,stage):find(\"这名敌人将要对你施加一种负面效果。\",1,true))"
   },
   {
    "at": 62,
    "before": "click(\"endTurn\");expect(false);assert(ui.run.combat.player.hp==71)\nclick(\"enemy2\");assert(inspectDetails(ui,stage):find(\"放入你的弃牌堆\",1,true))\nclick(\"endTurn\");expect(true);assert(ui.run.combat.player.hp==53)",
    "after": "click(\"endTurn\");expect(false);assert(ui.run.combat.player.hp==71 and dazedCount(ui.run.combat)==4)\nclick(\"enemy2\");assert(inspectDetails(ui,stage):find(\"这名敌人将要对你施加一种负面效果。\",1,true))\nclick(\"endTurn\");expect(true);assert(ui.run.combat.player.hp==53 and dazedCount(ui.run.combat)==6)"
   }
  ]
 },
 "tests/lua/curl_up_ui.lua": {
  "before": {
   "sha256": "8d797ba35324a2efb6cb397f19bb70b9ad239dfb93f4561a6c91f8db3ff6b57e",
   "gitBlob": "0dd733e19e753d8cd1f07ac603ebe8dfc4c457d4"
  },
  "after": {
   "sha256": "b0fc365dece7673b12cc7f568e52f4556930ed652f59d1331676c501b555e0ef",
   "gitBlob": "7352fd454d50346daa684dd52431c550d3ac28fc"
  },
  "hunks": [
   {
    "at": 6,
    "before": "local function details(box)\n    local hit=box:GetChild('hit')\n    for _,kind in ipairs({'down','up','click'})do if hit.listeners and hit.listeners[kind]then hit.listeners[kind]({touchId=61})end end\n    local info,lines=panel:GetChild('statusInfo'),{}\n    assert(info.visible,'status details open')\n    for i=1,H.F.Theme.layout.statusInfo.rows do\n        local name=info:GetChild('name'..i)\n        if name.visible then lines[#lines+1]=name.text end\n    end\n    info:GetChild('hit').click();assert(not info.visible,'status details close')\n    return table.concat(lines,' | ')",
    "after": "local inspect=dofile('tests/lua/support/status_detail_fixture.lua')\nlocal function details(key)\n    tap(key,61)\n    return inspect(ui,panel)"
   },
   {
    "at": 11,
    "before": "assert(details(first):find(definition.name..' '..string.format('%.0f',amount),1,true),'first Curl amount visible')\nassert(details(second):find(definition.name..' '..string.format('%.0f',other),1,true),'independent second Curl amount visible')",
    "after": "assert(details(\"enemy1\"):find(definition.name..' '..string.format('%.0f',amount),1,true),'first Curl amount visible')\nassert(details(\"enemy2\"):find(definition.name..' '..string.format('%.0f',other),1,true),'independent second Curl amount visible')"
   },
   {
    "at": 16,
    "before": "info:GetChild('hit').click();assert(not info.visible,'close details before the next deliberate card input')",
    "after": "inspect(ui,panel);assert(not info.visible,'close details before the next deliberate card input')"
   },
   {
    "at": 19,
    "before": "assert(not details(first):find(definition.name,1,true),'spent passive hidden')\nassert(details(second):find(definition.name..' '..string.format('%.0f',other),1,true),'other passive retained')",
    "after": "assert(not details(\"enemy1\"):find(definition.name,1,true),'spent passive hidden')\nassert(details(\"enemy2\"):find(definition.name..' '..string.format('%.0f',other),1,true),'other passive retained')"
   }
  ]
 },
 "tests/lua/wizard_gremlin_ui.lua": {
  "before": {
   "sha256": "af0786c79d131af2c6f7a1558dfdfc4298413308fb507b263ffd2e97c249d6bd",
   "gitBlob": "5bec51ffcdc89958459b3866f3e18eadcf163daf"
  },
  "after": {
   "sha256": "b438898333566630d69cf6ac2060b368979f7acecaebadb982eb8a87aecbdd9d",
   "gitBlob": "e29e5b8007ff38ee53b5f904a699584c769aad0d"
  },
  "hunks": [
   {
    "at": 57,
    "before": "local box = F.actorControl(stage,'enemy1')",
    "after": "local box = F.actorControl(stage,'enemy1')\nlocal inspect=dofile('tests/lua/support/status_detail_fixture.lua')"
   },
   {
    "at": 65,
    "before": "    assert(stage.children.statusInfo.visible and stage.children.statusInfo.children.text1.text:find(attack and \"25 点伤害\" or \"蓄能\",1,true), \"detail turn \" .. turn)\n    stage.children.statusInfo.children.hit.click()\n    assert(not stage.children.statusInfo.visible)",
    "after": "    local copy=inspect(ui,stage)\n    assert(copy:find(attack and \"25 点伤害\" or \"这名敌人的意图不明（但不是攻击）。\",1,true), \"detail turn \" .. turn .. \": \" .. copy)"
   }
  ]
 }
});
function readLiveLuaCalibrationFixture(path,digest,readCurrent){
 if(!Object.hasOwn(liveLuaCalibrationFixtures,path))return;
 const {before,after,hunks}=liveLuaCalibrationFixtures[path];
 if(digest!==before.sha256)return;
 const source=readCurrent(path,'utf8');
 assert(matches(source,after),'current monster reader fixture changed: '+path);
 const normalized=lf(source);
 assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed monster reader fixture line endings: '+path);
 const prior=restoreExactFixtureHunks({path,beforeSha256:digest,afterSha256:after.sha256,hunks},path,source);
 assert(matches(prior,before),'exact historical monster reader fixture: '+path);
 return prior;
}
// Preserve the exact historical vocabulary chain while the raw fixture
// runs its modern-plus-frozen card text checks on the candidate.
const phaseFourPresentationFixture={
 "path": "tests/lua/phase_four_presentation.lua",
 "current": {
  "sha256": "097c6dcaeb5b17fc6f7298f3dcf3fc0c75bbb03a6c4d71ff05d8129ce8400db4",
  "gitBlob": "9984e4dd9dbc37ce4c8bb1fbc973d475feede20f"
 },
 "previous": {
  "sha256": "89ebab4cab91df82e3c962bb74758f9eb68b1855da0bd7fe30cba73fec15be24",
  "gitBlob": "42820e77eeb5146c11ef2c12674b3af4c5dc9c87"
 },
 "hunks": [
  {
   "at": 193,
   "before": " local hash,n=0.0,0\n for id in manifest:gmatch('%S+')do\n  local c=assert(all[id]);n=n+1",
   "after": " -- These exact legacy rows were read from the unmodified #634 generator.\n -- Keep modern spelling and keyword contracts independently checked; project\n -- only the reviewed fields into the original immutable aggregate witness.\n local phase634Copy={\n  after_image={\n   upgradeText={\"每打出一张牌，获得 1 点固定格挡。先天：开局优先抽到。\",\"每打出一张牌，获得 1 点固定格挡。先天。\"},\n  },\n  backstab={\n   text={\"对目标造成 11 点伤害。先天：开局优先抽到。消耗。\",\"对目标造成 11 点伤害。先天。消耗。\"},\n   upgradeText={\"对目标造成 15 点伤害。先天：开局优先抽到。消耗。\",\"对目标造成 15 点伤害。先天。消耗。\"},\n   combatText={\"对目标造成 {effects.0.value} 点伤害。先天：开局优先抽到。消耗。\",\"对目标造成 {effects.0.value} 点伤害。先天。消耗。\"},\n   upgradeCombatText={\"对目标造成 {effects.0.value} 点伤害。先天：开局优先抽到。消耗。\",\"对目标造成 {effects.0.value} 点伤害。先天。消耗。\"},\n  },\n  boot_sequence={\n   text={\"获得 10 点格挡。先天：开局优先抽到。消耗。\",\"获得 10 点格挡。先天。消耗。\"},\n   upgradeText={\"获得 13 点格挡。先天：开局优先抽到。消耗。\",\"获得 13 点格挡。先天。消耗。\"},\n   combatText={\"获得 {effects.0.value} 点格挡。先天：开局优先抽到。消耗。\",\"获得 {effects.0.value} 点格挡。先天。消耗。\"},\n   upgradeCombatText={\"获得 {effects.0.value} 点格挡。先天：开局优先抽到。消耗。\",\"获得 {effects.0.value} 点格挡。先天。消耗。\"},\n  },\n  brutality={\n   upgradeText={\"从下回合起，每回合正常抽牌后额外抽 1 张牌，再失去等量生命。先天：开局优先抽到。\",\"从下回合起，每回合正常抽牌后额外抽 1 张牌，再失去等量生命。先天。\"},\n  },\n  devotion={\n   text={\"获得 2 层供奉：从下回合起，每回合抽牌后获得等量真言；没有真言且供奉达到 10 层时，直接进入神格。\",\"获得 2 层供奉。下回合起抽牌后获等量真言，无真言且供奉达10层时直接进入神格。\"},\n   upgradeText={\"获得 3 层供奉：从下回合起，每回合抽牌后获得等量真言；没有真言且供奉达到 10 层时，直接进入神格。\",\"获得 3 层供奉。下回合起抽牌后获等量真言，无真言且供奉达10层时直接进入神格。\"},\n  },\n  eviscerate={\n   text={\"对目标造成 7 点伤害，重复 3 次。本回合每次主动弃牌，本牌费用降低 1，最低 0；新回合恢复基础费用。\",\"对目标造成 7 点伤害，重复 3 次。本回合每主动弃 1 张牌，本牌少费 1（最低 0）。\"},\n   upgradeText={\"对目标造成 9 点伤害，重复 3 次。本回合每次主动弃牌，本牌费用降低 1，最低 0；新回合恢复基础费用。\",\"对目标造成 9 点伤害，重复 3 次。本回合每主动弃 1 张牌，本牌少费 1（最低 0）。\"},\n   combatText={\"对目标造成 {effects.0.value} 点伤害，重复 3 次。本回合每次主动弃牌，本牌费用降低 1，最低 0；新回合恢复基础费用。\",\"对目标造成 {effects.0.value} 点伤害，重复 3 次。本回合每主动弃 1 张牌，本牌少费 1（最低 0）。\"},\n   upgradeCombatText={\"对目标造成 {effects.0.value} 点伤害，重复 3 次。本回合每次主动弃牌，本牌费用降低 1，最低 0；新回合恢复基础费用。\",\"对目标造成 {effects.0.value} 点伤害，重复 3 次。本回合每主动弃 1 张牌，本牌少费 1（最低 0）。\"},\n  },\n  infinite_blades={\n   upgradeText={\"从下回合起，每回合开始生成 1 张飞刃；满手时放入弃牌堆。先天：开局优先抽到。\",\"从下回合起，每回合开始生成 1 张飞刃；满手时放入弃牌堆。先天。\"},\n  },\n  perfected_strike={\n   text={\"对目标造成 6 点伤害。手牌、抽牌堆和弃牌堆中每有一张带打击标签的牌，基础伤害增加 2。\",\"对目标造成 6 点伤害。手牌、抽牌堆和弃牌堆中每有一张『剑势』系列牌，基础伤害增加2点。\"},\n   upgradeText={\"对目标造成 6 点伤害。手牌、抽牌堆和弃牌堆中每有一张带打击标签的牌，基础伤害增加 3。\",\"对目标造成 6 点伤害。手牌、抽牌堆和弃牌堆中每有一张『剑势』系列牌，基础伤害增加3点。\"},\n   combatText={\"对目标造成 {effects.0.value} 点伤害。手牌、抽牌堆和弃牌堆中每有一张带打击标签的牌，基础伤害增加 2。\",\"对目标造成 {effects.0.value} 点伤害。手牌、抽牌堆和弃牌堆中每有一张『剑势』系列牌，基础伤害增加2点。\"},\n   upgradeCombatText={\"对目标造成 {effects.0.value} 点伤害。手牌、抽牌堆和弃牌堆中每有一张带打击标签的牌，基础伤害增加 3。\",\"对目标造成 {effects.0.value} 点伤害。手牌、抽牌堆和弃牌堆中每有一张『剑势』系列牌，基础伤害增加3点。\"},\n  },\n  storm={\n   upgradeText={\"每打出一张能力牌，生成 1 个闪电球。先天：开局优先抽到。\",\"每打出一张能力牌，生成 1 个闪电球。先天。\"},\n  },\n  void={\n   text={\"不能打出。抽到时失去 1 点能量。虚无：回合结束时仍在手中则消耗。\",\"不能打出。抽到时失去 1 点能量。虚无。\"},\n   upgradeText={\"不能打出。抽到时失去 1 点能量。虚无：回合结束时仍在手中则消耗。\",\"不能打出。抽到时失去 1 点能量。虚无。\"},\n  },\n }\n assert(all.calculated_exchange and not all.calculated_gamble,'exact contemporary Calculated Exchange identity')\n local hash,n=0.0,0\n for id in manifest:gmatch('%S+')do\n  local c=assert(all[id]);n=n+1\n  if phase634Copy[id] then\n   c=C.copy(c)\n   for key,values in pairs(phase634Copy[id])do\n    assert(c[key]==values[2],id..'.'..key..' drifted before historical projection')\n    c[key]=values[1]\n   end\n  end\n  if id=='calculated_exchange' then id='calculated_gamble' end"
  }
 ]
};
const cultistVocabularyFixture={
 "path": "tests/lua/cultist_ui.lua",
 "current": {
  "sha256": "aea1b6d3b2111ed048f7e8b8131876c523b33587e5531a1b1682c19f5f59163a",
  "gitBlob": "2bca889e0efd44a393cc80d7add5a600fc756829"
 },
 "previous": {
  "sha256": "34d83845902ed26515304ba2c1f410f9eda44ca1954aac0e3de0b6674e5f33f4",
  "gitBlob": "77f7730cf2446dfd204a0c8353c4e756fdebd4fe"
 },
 "hunks": [
  {
   "at": 55,
   "before": "-- Read a unit's statuses the way a player does: open its detail panel, then close it.\nlocal function details(stage, box)\n    box:GetChild('hit').click()\n    local info, lines = stage.children.statusInfo, {}\n    assert(info.visible)\n    for i = 1, Theme.layout.statusInfo.rows do\n        if info.children[\"name\" .. i].visible then lines[#lines + 1] = info.children[\"name\" .. i].text end\n    end\n    info.children.hit.click()\n    assert(not info.visible)\n    return table.concat(lines, \" | \")\nend\nlocal count = 0\nlocal function test(name,fn) fn(); count=count+1; print(\"ok Raven Adept UI \"..count..\" - \"..name) end\n\ntest(\"Raven Adept displays Ritual opener, persistent status and next modified attack\", function()\n    local ui, stage, click = setup()\n    local box = F.actorControl(stage,'enemy1')\n    assert(box.children.intent.text == \"\")\n    assert(box.children.intentIcon.imageId == Theme.icon.intent.buff)\n    click(\"enemy1\")\n    assert(stage.children.statusInfo.visible and stage.children.statusInfo.children.text1.text:find(\"自身获得 3 层仪式\",1,true))\n    stage.children.statusInfo.children.hit.click()\n    assert(not stage.children.statusInfo.visible)\n    click(\"endTurn\")\n    local text = details(stage, box)\n    assert(text:find(\"仪式 3\",1,true))\n    assert(not text:find(\"力量\",1,true))\n    assert(box.children.intent.text == \"6\")\n    click(\"endTurn\")\n    text = details(stage, box)",
   "after": "-- Read a unit's statuses the way a player does: open its detail panel, then close it.\nlocal readPowers=dofile('tests/lua/support/power_tip_fixture.lua')\nlocal inspect=dofile('tests/lua/support/status_detail_fixture.lua')\nlocal function details(ui,stage, box)\n    box:GetChild('hit').click()\n    local _, rows=readPowers(stage)\n    local titles={}\n    for _,row in ipairs(rows)do\n        local title=assert(row:match('^<color=#[%x]+>(.-)</color>'),'compact section title')\n        titles[#titles+1]=title\n    end\n    inspect(ui,stage)\n    return table.concat(titles,' | ')\nend\nlocal count = 0\nlocal function test(name,fn) fn(); count=count+1; print(\"ok Raven Adept UI \"..count..\" - \"..name) end\n\ntest(\"Raven Adept displays Ritual opener, persistent status and next modified attack\", function()\n    local ui, stage, click = setup()\n    local box = F.actorControl(stage,'enemy1')\n    assert(box.children.intent.text == \"\")\n    assert(box.children.intentIcon.imageId == Theme.icon.intent.buff)\n    click(\"enemy1\")\n    assert(inspect(ui,stage):find(\"这名敌人将要进行强化。\",1,true))\n    assert(not ui.run.combat.enemies[1].statuses.ritual,'forecast does not apply Ritual')\n    click(\"endTurn\")\n    assert(ui.run.combat.enemies[1].statuses.ritual==3,'turn actually grants three Ritual')\n    local text = details(ui,stage, box)\n    assert(text:find(\"仪式 3\",1,true))\n    assert(not text:find(\"力量\",1,true))\n    assert(box.children.intent.text == \"6\")\n    click(\"endTurn\")\n    text = details(ui,stage, box)"
  }
 ]
};
const uiVocabularyContinuations=Object.freeze({
 "tests/lua/explicit_target_preview.lua": {
  "path": "tests/lua/explicit_target_preview.lua",
  "current": {
   "sha256": "bbb20677d587476199ae74d8a34e5515b5364ab3893b03c4ab7e345fb5d31937",
   "gitBlob": "ad9713f888171df6018a28271d1115c03e6cebd8"
  },
  "previous": {
   "sha256": "b8194448d5a37d3ca2c4b78c9877cbcf96f2ff188bd06451647fcf3a435bd9d1",
   "gitBlob": "83799e0fffd86144e02f6d120079e95c5104c3ce"
  },
  "hunks": [
   {
    "at": 34,
    "before": "    event('enemy2','down',9);assert(value(panel)==6)\n    event('enemy1','down',10);assert(value(panel)==9)",
    "after": "    event('enemy2','down',9);assert(value(panel)==6)\n    event('enemy1','down',10);assert(value(panel)==6 and ui.cardAim.touch==9,'foreign Down must not steal a still-held surface')\n    event('enemy1','endDrag',8);assert(value(panel)==6 and ui.cardAim.touch==9,'releasing old surface must not clear the new preview')\n    event('enemy1','down',10);assert(value(panel)==9 and ui.cardAim.touch==10)"
   }
  ]
 },
 "tests/lua/character_presentation.lua": {
  "path": "tests/lua/character_presentation.lua",
  "current": {
   "sha256": "9ef22713c82aa40d9ca3881412bae26514ab053f96e83ca55039df327c02ad3e",
   "gitBlob": "4328a766afec949767b91df6a58a526168d9dae6"
  },
  "previous": {
   "sha256": "c260d50705a84e13da0018fb4b31aff4fc860077d488cf0ffecb457ba531f745",
   "gitBlob": "6f4ad0af1415124352e905a2d16556291d0a1f98"
  },
  "hunks": [
   {
    "at": 184,
    "before": " assert(w.devotion.text:find('2 层供奉',1,true) and w.devotion.upgradeText:find('3 层供奉',1,true))\n assert(w.devotion.text:find('每回合抽牌后',1,true) and not w.prostrate.text:find('首次',1,true))",
    "after": " assert(w.devotion.text:find('2 层供奉',1,true) and w.devotion.upgradeText:find('3 层供奉',1,true))\n for _,copy in ipairs({w.devotion.text,w.devotion.upgradeText}) do\n  assert(copy:find('下回合起抽牌后获等量真言',1,true),'Devotion starts next turn after the draw')\n end\n assert(not w.prostrate.text:find('首次',1,true))"
   }
  ]
 },
 "tests/lua/card_preview.lua": {
  "path": "tests/lua/card_preview.lua",
  "current": {
   "sha256": "cd50949a5b106336a3f7592f2c3145795f8109ede27d938ff5fa66b037fbe17b",
   "gitBlob": "f61f47463ade235b0e92f1f51b2510329ad92362"
  },
  "previous": {
   "sha256": "2cd5642a609984748399bafe18b70d91e08d5b7b92075ba23dba63701152967b",
   "gitBlob": "45362aeba079fd916710ed009d7c7ca23c2d4cd2"
  },
  "hunks": [
   {
    "at": 419,
    "before": "        local compact, tips = readPowers(panel)\n        assert(#tips == 1 and compact:find(row.name, 1, true) and compact:find(row.text, 1, true), id)",
    "after": "        local compact, tips = readPowers(panel)\n        assert(#tips == 1 and compact:find(row.name, 1, true), id)\n        local effect = id == \"strength\" and \"普通攻击每段伤害 +5\" or row.text\n        assert(compact:find(effect, 1, true), id..\": \"..compact)"
   }
  ]
 }
});
function readContinuingVocabularyReceipt(path,digest,readCurrent){
 const item=path===phaseFourPresentationFixture.path?phaseFourPresentationFixture:
  path===cultistVocabularyFixture.path?cultistVocabularyFixture:
  Object.hasOwn(uiVocabularyContinuations,path)?uiVocabularyContinuations[path]:null;
 if(!item)return;
 const {path:fixture,current,previous,hunks}=item;
 return readCloseoutLuaVocabularyReceipt(path,digest,(name,encoding)=>{
  const source=readCurrent(name,encoding);
  if(name!==fixture)return source;
  assert(matches(source,current),'current Lua vocabulary continuation changed: '+fixture);
  const normalized=lf(source);
  assert(source===normalized||source===normalized.replaceAll('\n','\r\n'),'mixed Lua vocabulary continuation line endings');
  const prior=restoreExactFixtureHunks({path,beforeSha256:previous.sha256,afterSha256:current.sha256,hunks},path,normalized);
  assert(matches(prior,previous),'exact pre-projection vocabulary fixture');
  return prior;
 });
}
export function readCalibrationReceiptInput(path,digest,read,readCurrent=readFileSync){
 const phaseFour=readContinuingVocabularyReceipt(path,digest,readCurrent);
 if(phaseFour!==undefined)return phaseFour;
 const liveLua=readLiveLuaCalibrationFixture(path,digest,readCurrent);
 if(liveLua!==undefined)return liveLua;
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
