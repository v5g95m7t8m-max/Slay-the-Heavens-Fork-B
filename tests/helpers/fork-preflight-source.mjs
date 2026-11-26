import {beforeLocalGilFixture} from './local-gil-fixture-source.mjs';
import {beforePosixDeadlineWorkflow,beforeWindowsDeadlineWorkflow} from './auto-merge-workflow.mjs';
import {beforeHotfixPublicationGate} from './release-ci-workflow.mjs';
import {assertInputRetirementLuaCurrent,beforeInputRetirementTestInventory,readRetiredInputLuaReceipt} from './input-retirement-inventory.mjs';
import {assertReleaseCandidateToolsCurrent,beforeDeckPagesSuiteSource} from './input-retirement-source.mjs';
import {beforeChapterBattleScene,beforeChapterPoolFixtureInventory,chapterBattleSceneReader,chapterSceneCurrentRead} from './chapter-battle-scene-source.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeVisualLegibility} from './visual-selection-source.mjs';
export {beforeInputRetirementTestInventory} from './input-retirement-inventory.mjs';
import {assertDevelopBackflowCurrent,authenticateDevelopBackflow,beforeDevelopBackflow,developBackflowOwns} from './develop-release-backflow-source.mjs';
import {beforeCalibrationReplay,beforeCurrentReplayCopier} from './calibration-replay-sources.mjs';
import {beforeNativeHostReplay} from './native-host-replay-source.mjs';
import {assertNativeFixturesCurrent,beforeNativeFixtureReplay} from './native-fixture-replay-source.mjs';
import {assertNativeFlowFixturesCurrent,beforeNativeFlowFixture} from './native-flow-fixture-source.mjs';
import {beforeSelectionReceiptSource,checkedSelectionReceiptRead,selectionCopierReceipt} from './ui-selection-current-source.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import {beforeOfficialBackgroundFixture} from './official-background-fixture-source.mjs';
import {assertAudioDeckBrowserCurrent,beforeMapRoomReplayCohort,beforeDevelopReplayMerge} from './develop-replay-merge-source.mjs';
import {beforeStsUiCloseoutSource} from './sts-ui-closeout-source.mjs';
import {beforeStsFadeCi} from './sts-fade-ci-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {beforeIntegratedStsInventory} from './sts-selection-fade-source.mjs';
import {beforeNativeButtonRepair,beforeRebasedCi,beforeRebasedRelease,historicalReleaseCopier} from './rebased-release-source.mjs';
import {battlePeripheryPredecessor,beforeBattlePeriphery} from './battle-periphery-source.mjs';
import {beforeTinyHouseIntegratedSource} from './tiny-house-integrated-source.mjs';
import {assertReleaseCapacityCohort,beforeReleaseCapacitySource} from './release-integration-source.mjs';
import {beforeM05BackflowInventory} from './m05-shop-ci-source.mjs';
import {beforeReleaseShopEntry,releaseUiRestoreArchive,shopEntryPriorRead} from './release-ui-restore-source.mjs';
import {beforeCombatVisualSource,combatVisualPriorRead} from './combat-visual-source.mjs';
import {beforeOfficialAssetsFocusFixture,beforeSts1MenuCiSource,officialAssetsFixture} from './sts1-menu-ci-source.mjs';
import {assertRefinedReleasePackingCurrent,assertRefinedReleaseSourcesCurrent,beforeRefinedReleaseCiSource,beforeRefinedReleaseJsInventory,refinedReleaseHistoricalInput} from './refined-release-source.mjs';
import {beforeV2UiAdmission} from './v2-ui-admission-ci-source.mjs';
import {beforeV2UiEvidence,beforeV2UiPreTinyHouseSource,beforeFieldConfirmation,beforeRelicCrystal} from './v2-p1-ci-source.mjs';
import {beforeCharacterPreparationCiSource} from './character-preparation-source.mjs';
import {beforeReviewedOfficialAssetReplay} from './reviewed-official-asset-inputs.mjs';
import {integratedCiBytes} from './integrated-ci-binding.mjs';
import {assertIntegratedLuaFixturesCurrent} from './integrated-ci-source.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';
export {exactReviewedBuildInput} from './rebased-release-source.mjs';
export {beforeM05ShopCiSource} from './m05-shop-ci-source.mjs';
export {assertDevelopBackflowCurrent,authenticateDevelopBackflow,developBackflowOwns};
// Full-source continuation for historical contracts; no partial/foreign projection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex');
const gitBlob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
const forkFirstBytes=readFileSync(new URL('./fork-bootstrap-ci-source.json.gz',import.meta.url));
assert.equal(hash(forkFirstBytes),'50efd38e0342ed1c5e543722d25e4c63cfde11384aaf6854df1ab6419590fbb6','exact Fork-First CI predecessor archive');
const forkFirst=JSON.parse(gunzipSync(forkFirstBytes));
assert.equal(forkFirst.schemaVersion,1);
assert.equal(forkFirst.baseCommit,'62943964d4ff1cd152bd28c0fbc8df98df9d054d');
for(const [path,{before,after}] of Object.entries(forkFirst.files)){
 assert.equal(hash(before.source),before.sha256,path+' complete Fork-First CI predecessor');
 assert.equal(gitBlob(before.source),before.gitBlob,path+' immutable Fork-First CI predecessor blob');
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
function beforeForkFirstCi(path,source){
 if(!Object.hasOwn(forkFirst.files,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const {before,after}=forkFirst.files[path],lf=source.replaceAll('\r\n','\n');
 if(hash(lf)!==after.sha256||gitBlob(lf)!==after.gitBlob)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}
const bytes=readFileSync(new URL('./fork-preflight-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'c6a6e34e8201b22b4c82fa554502785af7dc5f63840189e9c53da7692a55565e');
const proof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(proof.files)){
 if(row.before===null)assert.equal(row.beforeSha,null,'explicitly absent historical source');
 else assert.equal(hash(row.before),row.beforeSha);
}
assert.equal(proof.nativePredecessorCommit,'187a7db55c47b91ee0037486c1e3918f9541f11a');
assert.equal(proof.releaseBootstrapCommit,'873d4392c02fd5ac92e653e57a78fd59f6ae63c6');
for(const [path,row]of Object.entries(proof.files))if(row.releaseBootstrapBefore){
 const prior=row.releaseBootstrapBefore;
 assert.equal(hash(prior.source),prior.sha256,path+' complete Release predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(prior.source)}\0`).update(prior.source).digest('hex'),prior.gitBlob,path);
}
const currentHashes=Object.freeze({
 '.github/workflows/quality.yml':'5975715d9b983b6c586aa88be78e950358ff833c6ec7a73f1843fdf420d4cb6c',
 '.github/workflows/licenses.yml':'a27f39914855cbecebf6ee7285ff9744fa394d0a85b5fb89dfcc915e83b55d8d',
 'scripts/arm-auto-merge.mjs':'f9bb0f3615be546dec27376c8acf3ac139fe1e4d0632c5a6b8f1bb1fd4d88248',
 'scripts/ci-impact.mjs':'87dfdb1166cf6b0bab59164b472ee580a3fa3651b5d137d6b569ff0da03d57c9',
 'scripts/merge-queue-admission.mjs':'c07a727b7782e8da6211317eeb21b074eb618b4bb2757366f8f8aed0b68955c8',
 'scripts/publish-merge-group.mjs':'06ae5526a678b0b5f36863b310ac901687251cd9ac9563ce6cf72f14aadedf52',
 'scripts/publish-pr-quality.mjs':'e918f7bb12474f60a5272e72d285e22bb207765e098847ff726cb54621b277f7',
 'scripts/test-affected.mjs':'b89c6a4ba5a72640abfcc65d0ec3bd6ac60763305e5ed5fd1d5f4fb8bc8205e1',
 'tests/auto-merge.test.mjs':'f0c1597a357cbfd20f23186aa53c0670c5fa82e4b37b8d755a1e57d09a3def4c',
 'tests/ci-impact.test.mjs':'0095b9acc0c9c377704b05f3029e74302474256f8a434417dd5c0678b96caa1d',
 'tests/ci-summary-runners.test.mjs':'4d3654d6309e49bd9a2984e071243659db59223d3cd9c8fe7633665ebf38d7ca',
 'tests/merge-queue-admission.test.mjs':'f1fd68ea13b9a1fbea02431d4e10e7b6a121760c56de2b6d351aa43949d350cd',
 'tests/merge-queue.test.mjs':'083d1b134bcf73abbbd5fdbe1783358992fb99fdb5b7d87d1a33e94d22b6ccbd',
 'tests/quick-feedback.test.mjs':'ef3a2a86ebdd206ccb7bc83501465a0f3ea4a9e02ff41cb6bd406aaccd146e0c',
});
const transportBytes=readFileSync(new URL('./ci-media-transport-source.json.gz',import.meta.url));
assert.equal(hash(transportBytes),'56f69f4abc8687edd75d2087dfa890f94cf8d5f1d67fe2450338a0d2258355b2','complete CI media transport predecessor');
const transport=JSON.parse(gunzipSync(transportBytes));
assert.equal(transport.schemaVersion,1);
assert.equal(transport.base,'fe878280c74eb0461f6f1212b34e50550b80b681');
for(const [path,row] of Object.entries(transport.files)){
 assert.equal(hash(row.before),row.beforeSha,path+' complete media transport predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.before)}\0`).update(row.before).digest('hex'),row.gitBlob,path);
}
const normalize=s=>s.replaceAll('\r\n','\n');
// Exact complete successor bytes preserve the existing immutable historical CI views.
const forkPushBytes=readFileSync(new URL('../fixtures/fork-push-ci-source.json.gz',import.meta.url));
assert.equal(hash(forkPushBytes),'d8f0cb25d3884387b232a67ce8a99bf6570bdb50dcbecbba15b25ec3bcfd9d83','complete Fork push CI continuation');
const forkPushPacket=JSON.parse(gunzipSync(forkPushBytes));
assert.equal(forkPushPacket.baseCommit,'73c21489efaab409d4c0c46bee517d410d3427fc');
for(const row of Object.values(forkPushPacket.files))assert.equal(hash(row.before),row.beforeSha256);
export function beforeForkPush(path,source){
 if(path==='.github/workflows/quality.yml'&&typeof source==='string')source=beforeHotfixPublicationGate(source);
 const row=Object.hasOwn(forkPushPacket.files,path)?forkPushPacket.files[path]:undefined;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const digest=hash(normalize(source));
 if(digest!==row.afterSha256&&digest!==row.afterSuccessorSha256)return source;
 return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
}
// Receipt readers retain the actual Q1 current-source predecessor before their existing replay layers.
for(const row of Object.values(forkPushPacket.receiptSuccessors??{}))assert.equal(hash(row.before),row.beforeSha256);
export function beforeForkReceiptSource(path,source){
 if(path===cursesReceiptFixture.path){
  const prior=beforeCursesReceiptFixture(path,source);
  assert.notEqual(prior,source,'current receipt input changed: '+path);
  return beforeForkPush(path,prior);
 }
 const row=forkPushPacket.receiptSuccessors?.[path];
 if(row&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===row.afterSha256)
  return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
 return beforeForkPush(path,source);
}
const rewardScreenBytes=readFileSync(new URL('./reward-screen-ci-source.json.gz',import.meta.url));
assert.equal(hash(rewardScreenBytes),'04094f1942139397d7e267131fe819c49a5045b7027a4663157ccac985c5cd82');
const rewardScreenCi=JSON.parse(gunzipSync(rewardScreenBytes));
assert.equal(rewardScreenCi.base,'cc33beaa12bd827c1de2f2f76b5238c5d203609f');
for(const {before} of Object.values(rewardScreenCi.files)){
 assert.equal(hash(before.source),before.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before.source)}\0${before.source}`).digest('hex'),before.gitBlob);
}
function beforeRewardScreenCiSource(path,source){
 const row=Object.hasOwn(rewardScreenCi.files,path)?rewardScreenCi.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(normalize(source))!==row.after)return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
// Keep earlier CI observations bound to the Release baseline while current
// tests execute the approved default and frozen candidate paths.
const releaseUiBuildBytes=readFileSync(new URL('./release-ui-build-ci-source.json.gz',import.meta.url));
assert.equal(hash(releaseUiBuildBytes),'e7a41ad3a06b8fa264aaad151a8b12e9c399f78a35183a35d9ed3f655abae044');
const releaseUiBuild=JSON.parse(gunzipSync(releaseUiBuildBytes));
assert.equal(releaseUiBuild.base,'ff6af63d9bf93056dd772347d10dc749e7fa8d34');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0${source}`).digest('hex');
for(const {before,after} of Object.values(releaseUiBuild.files)){
 assert.equal(hash(before.source),before.sha256);
 assert.equal(blob(before.source),before.gitBlob);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
function beforeRefinedReleaseCopier(path,source){
 if(path!=="tests/helpers/copy-integration-source-closure.mjs"||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=="7aa6c9e75928548fced7107e38ef05b787e4a63c661fa4ab124dd1a8ce06314b")return source;
 const prior=lf.replace("// Refined enemy art extends only the existing historical helper closure.\nconst refinedReleaseFiles=Object.freeze({\n ...releaseUiFiles,\n 'tests/helpers/release-ui-restore-source.mjs':'26d8b8099e6b8f6fb30869479dcbcac90ff8c77ea04bc80ab4f8ad25c8bc8be3',\n 'tests/helpers/release-forge-source.json.gz':'8557c9daa0943c815ca11e0c135d081c08081f040bbef85b3cd799f7a586c564',\n 'tests/helpers/refined-release-source.mjs':'154f5464849177b48426db7d816f4ddf87d9d26abd6bfcfb543162b4f26450d9',\n 'tests/helpers/refined-release-source.json.gz':'6b9e66890ecfeac7f0b581ece462edaf41095f6d2937896cf6032e9e8ee9a9a3',\n});\n",'').replace("Object.entries(refinedReleaseFiles))","Object.entries(releaseUiFiles))");
 assert.equal(hash(prior),"810c7ddebb21d62e26730d225ba218c33aa009656fee38929ee2881821ea813b",'exact refined Release helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Restore the previous exact copy contract before its own historical projection.
function beforeShopEntryCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='42a2fae24acaca0ff0214e5e0e592b2ff4cfd7f1e506578ba36faf327d17ae87')return source;
 const prior=lf.replace(" 'tests/helpers/release-shop-entry-source.json.gz':'d3c114b39aa8affa1ae5c2b3ee54117640dcacce750efc24d78312792d8d2ff7',\n",'').replace(" 'tests/helpers/release-ui-restore-source.mjs':'37410ec175d07b09c8dd8062ac2e19d212dc8eeaebc32f38dbf99e7b32d8b7dd',"," 'tests/helpers/release-ui-restore-source.mjs':'26d8b8099e6b8f6fb30869479dcbcac90ff8c77ea04bc80ab4f8ad25c8bc8be3',");
 assert.equal(hash(prior),'6da6f0f4defe5d10ec161a626d020ecd22d6f651d0e35c2ba941907f579337a6','exact shop entry helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function shopEntryPreflightRead(read){
 const prior=shopEntryPriorRead(read);
 return (path,...args)=>beforeShopEntryCopier(path,prior(path,...args));
}
function beforeIntegratedReleaseCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='a6b953bc1a4c2dd514b6c15237d467a3e288fa101a28818848d7fe5247872362')return source;
 const prior=lf.replace(/^const integratedReleaseFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(integratedReleaseFiles))','Object.entries(refinedReleaseFiles))');
 assert.equal(hash(prior),'42a2fae24acaca0ff0214e5e0e592b2ff4cfd7f1e506578ba36faf327d17ae87','exact frozen Release copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopMapRenderCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 const digest=hash(lf);
 const combined=digest==='5248e173fe16d34ff5cd10780616f300fc09977759c94b0a6be72b8806a80764';
 if(!combined&&digest!=='b7b55d5f7456195f80c84b8afbcfd624d0b12bfd7da4f91357d7fab86f3937ea')return source;
 const prior=lf.replace(/^const developMapRenderFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developMapRenderFiles))',combined?'Object.entries(eventProjectionFiles))':'Object.entries(developBackflowFiles))');
 assert.equal(hash(prior),combined?'232a614e663999eb858d1f351dffee89ac821ce75e47c60c33122e42972c3ee4':'287ddbb54bfec7eadf72bceea09c77c8029410c8ef03465d88a0fba6b023413b','exact Develop map render copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopCardDisplayCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='59f327a993b6c55a04fe03df4be341bed7b7cd19c629f85da91542d9d7bf2861')return source;
 const prior=lf.replace(/^const developCardDisplayFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developCardDisplayFiles))','Object.entries(developMapRenderFiles))');
 assert.equal(hash(prior),'5248e173fe16d34ff5cd10780616f300fc09977759c94b0a6be72b8806a80764','exact Develop cardDisplay copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopPortraitLifecycleCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='b56f2396efb198ba05a6b28e404f47a303d8ef0f4f2e76c436ff206257ef5076')return source;
 const prior=lf.replace(/^const developPortraitLifecycleFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developPortraitLifecycleFiles))','Object.entries(developCardDisplayFiles))');
 assert.equal(hash(prior),'59f327a993b6c55a04fe03df4be341bed7b7cd19c629f85da91542d9d7bf2861','exact Develop portraitLifecycle copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopRewardUiCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='73b067067041e839e431863fa6af053da07e53caa2d36eaa86fefbdaeb8fb149')return source;
 const prior=lf.replace(/^const developRewardUiFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developRewardUiFiles))','Object.entries(developPortraitLifecycleFiles))');
 assert.equal(hash(prior),'b56f2396efb198ba05a6b28e404f47a303d8ef0f4f2e76c436ff206257ef5076','exact Develop reward UI copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopBattleFeedbackCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='202a6beb3429f4aa83c1d40d55a69c63e4d3ba38ec8817140bd3c35e6edce846')return source;
 const prior=lf.replace(/^const developBattleFeedbackFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developBattleFeedbackFiles))','Object.entries(developRewardUiFiles))');
 assert.equal(hash(prior),'73b067067041e839e431863fa6af053da07e53caa2d36eaa86fefbdaeb8fb149','exact Develop battle feedback copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopStasisUpgradeCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='a943bd62f8ef5232548a9e415724e7aaf9518bf365686ec3d09e79d83fd54754')return source;
 const prior=lf.replace(/^const developStasisUpgradeFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developStasisUpgradeFiles))','Object.entries(developBattleFeedbackFiles))');
 assert.equal(hash(prior),'202a6beb3429f4aa83c1d40d55a69c63e4d3ba38ec8817140bd3c35e6edce846','exact Develop stasisUpgrade copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopActorFocusCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='6d3bf93a3d1e020b69673d7864fe574ca8ed858945a02772cd662eb4b042a6ed')return source;
 const prior=lf.replace(/^const developActorFocusFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developActorFocusFiles))','Object.entries(developStasisUpgradeFiles))');
 assert.equal(hash(prior),'a943bd62f8ef5232548a9e415724e7aaf9518bf365686ec3d09e79d83fd54754','exact Develop actorFocus copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopSessionRelicCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 let lf=normalize(source);
 const sessionRelicSha='5130bc86b8e09a85aa7981393335cecec6d76a1b38f2ab2a80ac4810b22fa2d9';
 if(hash(lf)==='e663e8a932fe1ec63fc25905ad114d09d5405afcf4081a4fdcc4db0e42e14604'){
  const prior=lf.replace(/^const actionButtonFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(actionButtonFiles))','Object.entries(inputRetirementFiles))');
  assert.equal(hash(prior),'fc97fced179f8f70f9d9b7969f6df780f5f73a1bbe04aca865d0ced3ef75e610','exact pointer-only copier predecessor');
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(hash(lf)==='768c396aeaac6ee13d554699f1877d5ede1df175365ba0c7374fe59f34d465c0'){
  lf=lf.replace(/^const actionButtonFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(actionButtonFiles))','Object.entries(relicDetailFiles))');
  assert.equal(hash(lf),'8f750c5899d830865b07c6802e292041388e1bf15d7a706b00d18da8a6903f32','exact action button copier predecessor');
 }
 if(hash(lf)==='8f750c5899d830865b07c6802e292041388e1bf15d7a706b00d18da8a6903f32'){
  lf=lf.replace(/^const relicDetailFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(relicDetailFiles))','Object.entries(developSessionRelicFiles))');
  assert.equal(hash(lf),sessionRelicSha,'exact relic detail copier predecessor');
 }
 if(hash(lf)!==sessionRelicSha)return source;
 const prior=lf.replace(/^const developSessionRelicFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(developSessionRelicFiles))','Object.entries(developActorFocusFiles))');
 assert.equal(hash(prior),'6d3bf93a3d1e020b69673d7864fe574ca8ed858945a02772cd662eb4b042a6ed','exact Develop sessionRelic copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeDevelopBackflowCopier(path,source){
 source=beforeCurrentReplayCopier(path,source);
 source=beforeDevelopReplayMerge(path,source);
 source=beforeReplayFingerprintSource(path,source);
 if(path==='tests/helpers/copy-integration-source-closure.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')){
  const lf=normalize(source);
  if(hash(lf)==='abc997d3fc2634171522a086ec687de62ffd6390021e264bb28dd6a03d56e831'&&blob(lf)==='e609e937efa62af330b8d0c57192e2be5f9dc83a'){
   const prior=lf.replace(/^const developSourceEpochReplayFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
    .replace('Object.entries(developSourceEpochReplayFiles))','Object.entries(developIntegrationReplayFiles))');
   assert.equal(hash(prior),'0a378223063056063e2903ec3d36c323a55e25b8a1f5ad6ccba71c9e5b70d30a','exact Develop source epoch replay copier predecessor');
   assert.equal(blob(prior),'fd462c9e87c8563efb8b343405cc8550e52c0f47');
   source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
  }
 }
 if(path==='tests/helpers/copy-integration-source-closure.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')){
  const lf=normalize(source);
  if(hash(lf)==='0a378223063056063e2903ec3d36c323a55e25b8a1f5ad6ccba71c9e5b70d30a'&&blob(lf)==='fd462c9e87c8563efb8b343405cc8550e52c0f47'){
   const prior=lf.replace(/^const developIntegrationReplayFiles=Object\.freeze\(\{\n[\s\S]*?^\}\);\n/m,'')
    .replace('Object.entries(developIntegrationReplayFiles))','Object.entries(developSessionRelicFiles))');
   assert.equal(hash(prior),'5130bc86b8e09a85aa7981393335cecec6d76a1b38f2ab2a80ac4810b22fa2d9','exact integration replay copier predecessor');
   source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
  }
 }
 if(path==='tests/helpers/copy-integration-source-closure.mjs'&&typeof source==='string'
  &&hash(normalize(source))==='dbb15c5ae00750913e1c44c41c670181ab87bb7ee5cecade9fb2592c65c5556b'
  &&(!source.includes('\r')||!/[\r\n]/.test(source.replaceAll('\r\n','')))){
  const prior=normalize(source).replace(/^const mapRoomEntryFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(mapRoomEntryFiles))','Object.entries(relicDetailFiles))');
  assert.equal(hash(prior),'8f750c5899d830865b07c6802e292041388e1bf15d7a706b00d18da8a6903f32','exact map-room copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 source=beforeDevelopSessionRelicCopier(path,source);
 source=beforeDevelopActorFocusCopier(path,source);
 source=beforeDevelopStasisUpgradeCopier(path,source);
 source=beforeDevelopBattleFeedbackCopier(path,source);
 source=beforeDevelopRewardUiCopier(path,source);
 source=beforeDevelopPortraitLifecycleCopier(path,source);
 source=beforeDevelopCardDisplayCopier(path,source);
 source=beforeDevelopMapRenderCopier(path,source);
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 let lf=normalize(source);
 if(hash(lf)==='232a614e663999eb858d1f351dffee89ac821ce75e47c60c33122e42972c3ee4'){
  lf=lf.replace(/^const eventProjectionFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(eventProjectionFiles))','Object.entries(developBackflowFiles))');
  assert.equal(hash(lf),'287ddbb54bfec7eadf72bceea09c77c8029410c8ef03465d88a0fba6b023413b','exact event projection copier predecessor');
 }
 if(hash(lf)!=='287ddbb54bfec7eadf72bceea09c77c8029410c8ef03465d88a0fba6b023413b')return source;
 const prior=lf.replace(/const developBackflowFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(developBackflowFiles))','Object.entries(stsCloseoutFiles))');
 assert.equal(hash(prior),'e519059be59df7fefda9b852a0b02aac9b03b819406a08e0a7a11c4aca4d2fbc','exact Develop backflow copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeNativeButtonRepairCopier(path,source){
 source=beforeDevelopBackflowCopier(path,source);
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='e519059be59df7fefda9b852a0b02aac9b03b819406a08e0a7a11c4aca4d2fbc')return source;
 const prior=lf.replace('506d813c01143602af3f5169e3abb5945590a09bd2d7477b7d26ce2234160691','6b0f6e0a135800e22e9d7acf6fa9a2ad8307f152bbe7accb9fc5936f7990ee0e');
 assert.equal(hash(prior),'0d7325144169030f64ec5675be9c9e82cc9f8d4bd2a5dbcbaadbf667dd6bb6d9','exact native button repair copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeRebasedCopier(path,source){
 source=beforeNativeButtonRepairCopier(path,source);
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='0d7325144169030f64ec5675be9c9e82cc9f8d4bd2a5dbcbaadbf667dd6bb6d9')return source;
 const limit=lf.indexOf('const releaseUiFiles='),end=lf.indexOf('const inside=',limit);
 assert(limit>=0&&end>limit,'exact reconciled copy closure');
 const prior=(lf.slice(0,limit)+lf.slice(end)).replace('Object.entries(stsCloseoutFiles))','Object.entries(powerMembershipFiles))');
 assert.equal(hash(prior),'fbc236306831104020bf6d83133ab8b978ad9ffd5d6dae1bde13ee12176651e2','exact final develop copier predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeReleaseUiBuildSource(path,source,read=readFileSync){
 source=beforeIntegratedReleaseCopier(path,source);
 source=beforeShopEntryCopier(path,beforeReleaseShopEntry(path,source));
 source=beforeCombatVisualSource(path,source,shopEntryPreflightRead(owner=>beforeIntegratedReleaseCopier(owner,read(owner,'utf8'))));
 source=beforeSts1MenuCiSource(path,source);
 source=beforeRefinedReleaseCiSource(path,beforeRefinedReleaseCopier(path,beforeReleaseCapacitySource(path,source)),owner=>read(owner,'utf8'));
 if(!Object.hasOwn(releaseUiBuild.files,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const text=normalize(source),{before,after}=releaseUiBuild.files[path];
 if(hash(text)!==after.sha256||blob(text)!==after.gitBlob)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}
function releaseHistoricalInput(path,source){
 source=beforeCurrentReplayCopier(path,beforeActorAlphaBuildInput(path,source));
 return beforeRebasedCopier(path,source)!==source?historicalReleaseCopier(source):beforeRebasedRelease(path,source);
}
export function beforeReleaseTinyHouseSource(path,source,read=readFileSync){
 const releaseRead=(owner,encoding)=>releaseHistoricalInput(owner,read(owner,encoding));
 return beforeV2UiPreTinyHouseSource(path,beforeReleaseUiBuildSource(path,releaseHistoricalInput(path,source),releaseRead));
}
export function historicalReleaseBuildInput(path,read){
 const releaseRead=(owner,encoding)=>releaseHistoricalInput(owner,read(owner,encoding));
 if(!Object.hasOwn(releaseUiBuild.files,path))return refinedReleaseHistoricalInput(path,(owner,encoding)=>beforeReleaseCapacitySource(owner,releaseRead(owner,encoding)));
 const source=releaseRead(path,'utf8'),prior=beforeReleaseUiBuildSource(path,source,releaseRead);
 assert.notEqual(prior,source,'fresh approved build source: '+path);
 return prior;
}
const coopLabCiBytes=readFileSync(new URL('./coop-lab-ci-predecessors.json.gz',import.meta.url));
assert.equal(hash(coopLabCiBytes),'e55c26c3dbc7cde22ae4e47de876f205b47bdbfc30dc469830fe0ae9255285dc','complete co-op lab CI predecessors');
const coopLabCi=JSON.parse(gunzipSync(coopLabCiBytes));
assert.equal(coopLabCi.base,'ecf54a29a54228e058238fbbc8716a665a3021d6');
for(const row of Object.values(coopLabCi.files))assert.equal(hash(row.before),row.beforeSha);
// Map integration changes the live layout and helper closure without changing recorded receipts.
const mapCiBytes=readFileSync(new URL('./sts1-map-ci-predecessors.json.gz',import.meta.url));
assert.equal(hash(mapCiBytes),'aeef5cc99787581d2d99bc26dfe4100073a569bd1ca13cf14d7d120c84f861fb','exact STS1 map CI predecessors');
const mapCi=JSON.parse(gunzipSync(mapCiBytes));
assert.equal(mapCi.base,'cd454bd8dbd9241a119603fcd67439492c121ead');
for(const row of Object.values(mapCi.files))assert.equal(hash(row.before),row.beforeSha);
function beforeMapCiSource(path,source){
 const row=Object.hasOwn(mapCi.files,path)?mapCi.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(normalize(source))!==row.afterSha)return source;
 return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
}
// Preserve the exact helper sources required by older CI contracts.
const powerMembershipHelpers=Object.freeze({
 "tests/helpers/closeout-source-epoch.mjs": {
  "after": "564a22d425038c24b65fed7d5b1a6c6cc847b71b6f32702d3ed257c3ee18d0d6",
  "before": "4d3e6c160de2c6b69e661d5c57229c7b6e0c3f76d1c8eff30df51b23ef305650"
 },
 "tests/helpers/copy-integration-source-closure.mjs": {
  "after": "fbc236306831104020bf6d83133ab8b978ad9ffd5d6dae1bde13ee12176651e2",
  "before": "03d22319354b6a19c6ac462cb9c25c3bd69ff94a65ece1bce458da857b1966dc"
 }
});
function beforePowerMembershipHelper(path,source){
 const row=Object.hasOwn(powerMembershipHelpers,path)?powerMembershipHelpers[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!==row.after)return source;
 let prior;
 if(path.endsWith('closeout-source-epoch.mjs')){
  prior=lf.replace("import {extendPowerMembershipEpoch} from './power-membership-source.mjs';\n",'')
   .replace('export const prePowerMembershipEpoch=extendV2RunMenuEpoch(sessionMenuSourceEpoch);\nexport const sourceEpoch=extendPowerMembershipEpoch(prePowerMembershipEpoch);',
    'export const sourceEpoch=extendV2RunMenuEpoch(sessionMenuSourceEpoch);');
 }else{
  prior=lf.replace(/^const powerMembershipFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(powerMembershipFiles))','Object.entries(mapFiles))');
 }
 assert.equal(hash(prior),row.before,'exact Power membership helper predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeTinyHouseCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='d94b9d90c3801579637517844efb21c168c678c751f2cb37962f9f39cbee8c07')return source;
 const start=lf.indexOf('const tinyHouseFiles='),end=lf.indexOf('const inside=',start);
 assert(start>=0&&end>start,'exact Tiny House copy block');
 const prior=(lf.slice(0,start)+lf.slice(end)).replace('Object.entries(tinyHouseFiles)','Object.entries(releaseGuideFiles)');
 assert.equal(hash(prior),'a6bab3346445c43728ecbc21a3519090028eada17303a513363687c773833b0c','exact Tiny House copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Preserve the reviewed copier bytes when replaying older CI observations.
export function beforeLoadingRecoveryCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 source=beforeRewardScreenCiSource(path,beforeMapCiSource(path,beforePowerMembershipHelper(path,beforeRebasedCopier(path,source))));
 source=beforeTinyHouseIntegratedSource(path,beforeTinyHouseCopier(path,source));
 const lf=normalize(source);
 if(hash(lf)!=='e597f60ccc438815137de26a0ca6526952c713e3ba52b05db81b0bf5b1eb2288')return source;
 const prior=lf.replace("const loadingRecoveryFiles=Object.freeze({\n ...m05Files,\n 'tests/helpers/pc13-reward-cover-source.mjs':'669622dc54b057ad81579c872ae45231e51e906c3163c513af57a6ce3ce8a6ea',\n 'tests/helpers/loading-recovery-source.mjs':'873915500ae2b1a02abebb78a932a8cdfa5e56044ad5dcb34a4d51fd1fc02f5f',\n});\n",'').replace('Object.entries(loadingRecoveryFiles))','Object.entries(m05Files))');
 assert.equal(hash(prior),'1b708b758eb4f6af2f6ede84e9f38099a0aabc348d86d0873733eed28cf7ce51','exact loading recovery helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Preserve the exact #807 source predecessor for existing CI receipts only.
// Ordinary build/test entry points still consume the compacted live payload.
const capacityBuildSource=Object.freeze({
 "scripts/build-native-candidate.mjs":{"before":"f74f1c5b59c5529e25e7d28566d642bf8b5deef99943de647853cbd788a23d9a","after":"b109a73cbdd3f56c293c149af72296684ae554d1d9aae6ac936eef9232c456bf","hunks":[["import {monsterSourceInputs,prepareMonsterArt,monsterActorTemplate,monsterPowerTemplateName,monsterActorTemplateName,monsterActorBindingModule,bindMonsterActorTemplates,monsterActorInventory,monsterArtPayloadSource} from './monster-art.mjs';\n","import {monsterSourceInputs,prepareMonsterArt,monsterActorTemplate,monsterPowerTemplateName,monsterActorTemplateName,monsterActorBindingModule,bindMonsterActorTemplates,monsterActorInventory} from './monster-art.mjs';\n"],["      const expected=monsterArtPayloadSource(monster);\n","      const expected=`-- Generated from the bounded native monster registry.\\nreturn ${toLua(monster??{})}\\n`;\n"]]},
 "scripts/build-ui.mjs":{"before":"76fbf00c577458f1211f5c78a08698de4dc6f51a019074a8c00e55887691f907","after":"3084d2610113682b46dfe768c61b416ee85b650a09fee258c1eba9269866bc5f","hunks":[["import {prepareMonsterArt,attachMonsterArt,monsterActorTemplate,writeMonsterActorBinding,monsterArtPayloadSource} from './monster-art.mjs';\n","import {prepareMonsterArt,attachMonsterArt,monsterActorTemplate,writeMonsterActorBinding} from './monster-art.mjs';\n"],["  writeFileSync(join(outputDirectory,'abyss_monster_art_data.lua'),monsterArtPayloadSource(monsterArt));\n","  writeFileSync(join(outputDirectory,'abyss_monster_art_data.lua'),`-- Generated from the bounded native monster registry.\\nreturn ${toLua(monsterArt??{})}\\n`);\n"]]},
 "scripts/official-portraits.mjs":{"before":"03d4ea596257e87e4d3ea3f22fc1f1e938f516b8d20c4e9983aceeb51d5b5186","after":"b7b84c7cb8a10b84fe2459329ff6b1f538301c62472de59289d6a5151f34a308","hunks":[[" const data=portraitSources(root,{selectionAvatar,battlePortrait:battlePortrait&&!officialAssets}).map(a=>{\n"," const data=portraitSources(root,{selectionAvatar,battlePortrait}).map(a=>{\n"],[" if(officialAssets&&battlePortrait)data.push('battlePortraitEnabled=true',`battleApprovedNative=${toLua(approvedBattleNative(root))}`);\n"," if(officialAssets&&battlePortrait)data.push(`battleApprovedNative=${toLua(approvedBattleNative(root))}`);\n"],[" const flags={selectionAvatar:/\\bavatar96=/.test(source),battlePortrait:/\\b(?:battle133|battleApprovedNative)=|^battlePortraitEnabled=true,?$/m.test(source)};\n"," const flags={selectionAvatar:/\\bavatar96=/.test(source),battlePortrait:/\\bbattle133=/.test(source)};\n"]]},
 "tests/official-portraits-build.test.mjs":{"before":"06280b8717f0c0194479cab956e3fea53d00b7d26c06f3fbb37b1152224e4a63","after":"3516de013895e0d8eb050e82c402b6cba779d23a4ce659551a07e29ff643f893","hunks":[["import './capacity-payload.cases.mjs';\n",""]]},
});
const exactCapacityBuild=(source,sha)=>typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===sha;
function assertDevelopCapacityCohort(read){
 const inputs=Object.entries(capacityBuildSource).map(([path,row])=>[path,row.after,beforeRewardScreenCiSource(path,read(path,'utf8'))]);
 if(inputs.some(([,sha,source])=>exactCapacityBuild(source,sha))){
  for(const [path,sha,source]of inputs)assert(exactCapacityBuild(source,sha),'fresh complete integration source: '+path);
 }
}
export function beforeDevelopCapacityBuildSource(path,source){
 const row=Object.hasOwn(capacityBuildSource,path)?capacityBuildSource[path]:null;
 if(row)source=beforeRewardScreenCiSource(path,beforeMapCiSource(path,beforePowerMembershipHelper(path,beforeRebasedCopier(path,source))));
 if(!row||!exactCapacityBuild(source,row.after))return source;
 let lf=normalize(source);
 for(const [current,prior]of row.hunks){
  assert.equal(lf.split(current).length,2,'exact #807 source hunk: '+path);
  lf=lf.replace(current,()=>prior);
 }
 assert.equal(hash(lf),row.before,'exact #807 source predecessor: '+path);
 return source.includes('\r\n')?lf.replaceAll('\n','\r\n'):lf;
}
// The live animation assertions stay in Full. Older CI receipts read their exact predecessor.
const cardFeedbackBytes=readFileSync(new URL('./card-feedback-ci-predecessors.json.gz',import.meta.url));
assert.equal(hash(cardFeedbackBytes),'2319177212c8afd636a76db8d2e79f4ff1e6774b0609d1fbfd651a9505cbf54e','exact card feedback CI prerequisites');
const cardFeedback=JSON.parse(gunzipSync(cardFeedbackBytes));
assert.equal(cardFeedback.base,'b8eece34d93da2069c991c6f00bece49bce07aaf');
for(const row of Object.values(cardFeedback.files))assert.equal(hash(row.before),row.beforeSha);
function beforeCardFeedbackCiSource(path,source){
 const row=Object.hasOwn(cardFeedback.files,path)?cardFeedback.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(normalize(source))!==row.afterSha)return source;
 return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
}
function beforePowerMembershipConfig(path,source){
 if(path!=='config/architecture.json'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='a76b6562ebae6be09aa67356be7bf9c5a4c8e0a8f11f0458acf1025a069b6e0e')return source;
 const prior=lf.replace("    \"abyss_power_membership\": \"core\",\n",'').replace("        \"abyss_power_membership\",\n",'').replace("    {\n      \"id\": \"power-membership-independence\",\n      \"from\": [\"abyss_power_membership\"],\n      \"forbiddenTargets\": [\"abyss_power_order\", \"abyss_power_schedule\"],\n      \"reason\": \"Display membership owns list edits. Its callers own application and hook dispatch.\"\n    },\n    {\n      \"id\": \"power-schedule-independence\",\n      \"from\": [\"abyss_power_schedule\"],\n      \"forbiddenTargets\": [\"abyss_power_order\"],\n      \"reason\": \"Hook removal uses the shared display membership operations without loading their coordinator.\"\n    },\n",'')
  .replace("    {\n      \"from\": \"abyss_focus\"","    {\n      \"from\": \"abyss_power_schedule\",\n      \"to\": \"abyss_power_order\",\n      \"reason\": \"Original monster Power list bookkeeping runs only inside initialized constructor/action/removal calls; no module-load execution.\"\n    },\n"+"    {\n      \"from\": \"abyss_focus\"");
 assert.equal(hash(prior),'7d0b25ebcbd323e633fad7bcf8e618966450c60dde9671185226f1e6cef8fbd1','exact Power membership architecture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Authenticate the live Lua inventory test before restoring its complete prior source.
const luaInventoryTest="tests/sts-style-source-epoch.test.mjs";
const luaInventoryTestSha='5b02801e4b9837497fa8f9f20388cff207afa78e7f2a7f358b9ac9332e7b1774';
const luaInventoryTestBlob='b43000381568f9b167c528e5f96f870c9f144d7a';
function beforeInputRetirementInventoryTest(source){
 if(hash(source)!=='3b28f64febf618d28d413c7ffb063053a46f048068aa291d9901d216f10e7a99'||
    blob(source)!=='e561cbe4364a9dc107408ffac4d61b7715b11638')return source;
 const prior=source.replace('assertCurrentJsInventory,beforeInputRetirementTestInventory,beforeShopEntryInventory',
  'assertCurrentJsInventory,beforeShopEntryInventory')
  .replace("  paths=beforeInputRetirementTestInventory(paths,'lua',read,{required:true});\n",'');
 assert.equal(hash(prior),'54d5d3c02c45616cb282fad68678cd034de2f91fe8d478a1512139504ab7e860','exact live input retirement inventory test predecessor');
 assert.equal(blob(prior),'97df72579410fd9691412e49ddd14dc86a7f93be');
 return prior;
}
function beforeHistoricalProductionInventoryTest(source){
 if(hash(source)!=='54d5d3c02c45616cb282fad68678cd034de2f91fe8d478a1512139504ab7e860'||blob(source)!=='97df72579410fd9691412e49ddd14dc86a7f93be')return source;
 const rewrites=[
  ["import {actorFocusAdded,assertActorFocusInventory,stasisUpgradeAddedPaths} from './helpers/develop-release-backflow-source.mjs';\n", ""],
  ["releaseSourceEpoch,prePowerMembershipEpoch}=await", "releaseSourceEpoch}=await"],
  [" assert.equal(Object.keys(prePowerMembershipEpoch.proof.current).length,352); // Final menu adds navigation and navigation view.\n assert.deepEqual(Object.keys(p.current).sort(),[...Object.keys(prePowerMembershipEpoch.proof.current),'src/lua/abyss_power_membership.lua'].sort());", " assert.equal(Object.keys(p.current).length,352); // Final menu adds navigation and navigation view."],
  [" assert.deepEqual([...Object.keys(p.current),...stasisUpgradeAddedPaths,...actorFocusAdded].sort(),actual);\n assertActorFocusInventory(actual.filter(path=>path!=='config/architecture.json'),read);", " assert.deepEqual(Object.keys(p.current).sort(),actual);"],
  ["for(const path of Object.keys(p.current))assert.equal(beforeCharacterPreparationSource", "for(const path of actual)assert.equal(beforeCharacterPreparationSource"]
 ];
 let prior=source;
 for(const [current,before]of rewrites){
  assert.equal(prior.split(current).length,2,'exact live production inventory test boundary');
  prior=prior.replace(current,()=>before);
 }
 assert.equal(hash(prior),luaInventoryTestSha,'exact live production inventory test predecessor');
 assert.equal(blob(prior),luaInventoryTestBlob,'exact live production inventory test predecessor blob');
 return prior;
}
function beforeLuaInventoryTest(path,source){
 if(path!==luaInventoryTest||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=beforeHistoricalProductionInventoryTest(beforeInputRetirementInventoryTest(normalize(source)));
 if(hash(current)!==luaInventoryTestSha||blob(current)!==luaInventoryTestBlob)return source;
 const start=" assertCurrentJsInventory(rawJs,integratedCiProof.inventory);\n // These five tests remain in current Full discovery.",end=" const newTest=";
 assert.equal(current.split(start).length,2,'exact live Lua test boundary');
 assert.equal(current.split(end).length,2,'exact live Lua test boundary');
 const opening=current.indexOf(start),closing=current.indexOf(end);
 assert(closing>opening,'ordered live Lua test boundary');
 const oldCheck=' assertCurrentJsInventory(rawJs,integratedCiProof.inventory);assert.deepEqual(rawLua,integratedCiProof.luaInventory);\n';
 const prior=(current.slice(0,opening)+oldCheck+current.slice(closing))
  .replace('assertCurrentJsInventory,beforeShopEntryInventory','assertCurrentJsInventory')
  .replace("['lua',currentLua]","['lua',rawLua]");
 assert.equal(hash(prior),'77c59b6dc0d91f8fe1becd5a5df83efa6bcf0b5967e5eb3d95caebd51706d187','exact Lua inventory test predecessor');
 assert.equal(blob(prior),'dfc38c230b942012183773414d04d5e89ca37315','exact Lua inventory test predecessor blob');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeCoopCiSource(path,source,read){
 source=beforeLuaInventoryTest(path,source);
 source=beforeStsFadeCi(path,source);
 source=beforeReleaseUiBuildSource(path,beforeRebasedCi(path,beforeRebasedCopier(path,source)),read);
 source=beforePowerMembershipConfig(path,beforePowerMembershipHelper(path,source));
 source=beforeFieldConfirmation(path,beforeRewardScreenCiSource(path,beforeCardFeedbackCiSource(path,beforeRelicCrystal(path,beforeMapCiSource(path,source)))));
 source=beforeDevelopCapacityBuildSource(path,beforeTinyHouseIntegratedSource(path,source));
 source=beforeV2UiEvidence(path,beforeLoadingRecoveryCopier(path,source),read&&((owner,encoding='utf8')=>read(owner,encoding)));
 const row=Object.hasOwn(coopLabCi.files,path)?coopLabCi.files[path]:null;
 if(!row || typeof source!=='string' || source.includes('\r\r\n') || hash(normalize(source))!==row.afterSha)return source;
 return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
}
const coopLabTest='tests/coop-primitive-lab.test.mjs';
const coopLabTestSha='93a22f446fec66df1339fc135071c929a3cc07d0c2473424510842af689d18dc';
function assertCoopJsInventory(paths,preceding,read){
 const current=[...preceding,coopLabTest].sort();
 assert.deepEqual([...paths].sort(),current,'complete current raw discovery inventory');
 const testSource=read(coopLabTest,'utf8');
 assert(typeof testSource==='string'&&!testSource.includes('\r\r\n')&&
  hash(normalize(testSource))===coopLabTestSha,'fresh added inventory source: '+coopLabTest);
}
const shopEntryTests={
 js:['tests/shop-entry.test.mjs','3b687d1afb6ee83dc7103bc4c074e990a748a96ef55c4cba326498a5ed2d1919'],
 lua:['tests/lua/shop_entry.lua','85547fda98f035ff78a0cebdf56e91ba43899f0579d706c4cb045e13a55f6259',
  'e2b0e5297f87eb64525710b871ba23bd9bbcf81e942623c316759e9991dcebeb'],
};
const currentReleaseTests=Object.freeze({
 'tests/battle-ui-publication.test.mjs':'a2d4d911de18b48f4b01cbaf52384b4d133b77a8e646c15d2149185052fb7759',
 'tests/check-release-text.test.mjs':'1b3d0db323d89b0e6035f504b8c84ac1c564df528cca917ba2c89db29567993a',
 'tests/event-readability.test.mjs':'95e888cc87e48e8d6a161eaea9da54a410444c9966cafe1b263cffc66882dbb0',
 'tests/formal-startup-budget.test.mjs':'8a3d66d9b7c963cd3592c92750d6b41cecba2fed3cde933a81f34aee048df2ef',
 'tests/gil-candidate-preflight.test.mjs':'7ec29cdbeaf1572fa9713d37fdc17003e4f7843479c5af5ebe3c3c8787b93068',
 'tests/gil-candidate.test.mjs':'e8a08db32ea8a237575f428566093ab18cc60fd0d0ce4acb0b5e2d7e30b364de',
 'tests/production-performance.test.mjs':'102893c9285fc52693ee9a7d1bae36d8cefef418ecf8da5d40e53b4eb98b2947',
 'tests/release-metadata.test.mjs':'eceb8ab92f616084fdcdac875e69e761cf2c9674a804be9f0295e89213453cb8',
 'tests/release-performance-artifacts.test.mjs':'c1d0d51314ab0dffac68236a3f722a4a4cdb8a0ebbfc292d1ca36cd0b2b2a941',
 'tests/release-performance-verification.test.mjs':'81aad82bba133bcf372158c5163cb328438a7b4027065436105c2dbaea243fbf',
 'tests/release-performance.test.mjs':'95c9fae47f63841957292b11f0c576c2703af9a2e5d7f0cf102d14be064f655b',
});
// The live alpha entry point and portable preview extend the exact #996 inputs.
// Only historical CI readers receive the preceding bytes.
const actorAlphaBuildInputs=Object.freeze({
 'package.json':{
  current:['d91d720bcde425c27f93e34f41619c9c4ee7120fd5c922dc5099163c46c7b55c','057a6efe7a97fa4530087d69f31c2c6b874fd82d'],
  before:['ba29a08fc203195bba8c9acd047274167f2de046f8a29e54a681f72faa314e77','8b3f35c25c42aa7276a5ab334ae7112fe9dbe01b'],
  undo:source=>source.replace('    "verify:actor-alpha": "node scripts/art/check-actor-alpha.mjs",\n',''),
 },
 'scripts/native-candidate-preview.mjs':{
  current:['d64df368f17f626e8949ac6abae9177307914c3211ce8d91047022f78841e5ec','29e9563e4500302c5c080d0e62589addd58e4f76'],
  before:['dc3534fa5a2eb34fb1e7c5b30873893ae663e42d331ba9dfe926e5600845f56d','cdc9acd403d8ab0d01bdcfe34f91d21e88a3a400'],
  undo:source=>source.replace("import {hostedCandidatePath} from './hosted-gil-receipt.mjs';\n",'')
   .replace('const gil=hostedCandidatePath(candidatePath,candidate)??candidate.mapPath;',
    'const gil=candidate.candidate.path??candidate.mapPath;'),
 },
});
function exactCheckoutSource(source,binding){
 if(!exactSourceBinding(source,binding))return false;
 const lf=normalize(source);
 return source===lf||source===lf.replaceAll('\n','\r\n');
}
const formalAct2ReleaseTest='tests/release-performance.test.mjs';
const formalAct2ReleaseTestBefore=[currentReleaseTests[formalAct2ReleaseTest],'1d63817e885fd314045193f48e2bd9aa16760009'];
const formalAct2ReleaseTestCurrent=['0fef6761800e815ef402e807163b8da69731dcb342f1e0b6aef72ae639ff1791',
 '97d582db5f715a20a804b3a91b83154defbd2b9d'];
function beforeFormalAct2ReleaseTest(path,source){
 if(path!==formalAct2ReleaseTest||exactCheckoutSource(source,formalAct2ReleaseTestBefore))return source;
 assert(exactCheckoutSource(source,formalAct2ReleaseTestCurrent),'fresh added inventory source: '+path);
 const current=normalize(source);
 const start="test('requires the Act II workload in both paired arms and the supported recovery'";
 const end="test('rejects the wrong published source, release tree, missing tier, or changed art profile'";
 assert.equal(current.split(start).length,2,'exact Act II test insertion start');
 assert.equal(current.split(end).length,2,'exact Act II test insertion end');
 const opening=current.indexOf(start),closing=current.indexOf(end);
 assert(closing>opening,'ordered Act II test insertion');
 const prior=current.slice(0,opening)+current.slice(closing);
 assert(exactCheckoutSource(prior,formalAct2ReleaseTestBefore),'exact Act II performance test predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeActorAlphaBuildInput(path,source){
 if(!Object.hasOwn(actorAlphaBuildInputs,path))return source;
 const {current,before,undo}=actorAlphaBuildInputs[path];
 if(!exactCheckoutSource(source,current))return source;
 const prior=undo(normalize(source));
 assert(exactSourceBinding(prior,before),'exact alpha build predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function checkedActorAlphaBuildPredecessor(path,source){
 assert(Object.hasOwn(actorAlphaBuildInputs,path)&&exactCheckoutSource(source,actorAlphaBuildInputs[path].current),
  'fresh alpha build input: '+path);
 return beforeActorAlphaBuildInput(path,source);
}
function actorAlphaCurrentRead(read){
 function current(path,...args){
  const raw=read(path,...args);
  if(Object.hasOwn(actorAlphaBuildInputs,path))
   checkedActorAlphaBuildPredecessor(path,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);
  return raw;
 }
 for(const path of Object.keys(actorAlphaBuildInputs))current(path,'utf8');
 return current;
}
const newerTests={
 js:{
  ...currentReleaseTests,
  'tests/detail-latency.test.mjs':'310f906435fbbfa45899b30a5344ca83f9de32860d09394b9824de95ee9cffee',
  'tests/potion-sts-structure.test.mjs':'56b91c313e26d1129a39b7678a39df7df38a71a2252deb060351c5cc115e6118'
 },
 lua:{
  'tests/lua/detail_latency.lua':'8cd646c8d369ffdf1a59d08ee59c336acf2d064757b27c0c658e08c182caf4a0',
  'tests/lua/potion_management_visual.lua':'4732441f834fa47346ac567392bb4c68758b580b091ef2ce54ab05591d89c5f4',
  'tests/lua/traveler_power_tooltip.lua':'eacaefc663ef5800d114a4118546a170ee7c93be09800df02108a223285afda0'
 },
};
// These live Lua fixtures retain #981's additional checks and #951's approved
// runtime IDs. Historical inventories still use the same original paths.
const currentReleaseLuaFixtures=Object.freeze({
 'tests/lua/detail_latency.lua':['0d886fb386da8f6c7b938138bd8dafc935f96abf9a48f608ad89f6f810709654','7b2a025c5005a90919de2d1239e38187dcc14565'],
 'tests/lua/traveler_power_tooltip.lua':['7d2684b7c627301cb435af6c2d45040be039a9624cc85e121a7fded90aa006af','1e381500795ccc639100192dd8b513f4dc90edf2'],
});
const additionalReleaseLuaFixtures=Object.freeze({
 'tests/lua/battle_ui_publication.lua':['73a3d97356202f4943152acaa32fd14bf8e257c5b3229374d76e9a936973a6e2','6aa2a4c9a8c1195a7fda5d118ac0d5d66cfba0c4'],
 'tests/lua/card_body_catalog.lua':['9ec720cb8c67c95338f497094a36e894bcefe6c2171954271ba8c73e49f6706b','933398a096b075b6739a2c811318e4d7e0a16033'],
 'tests/lua/card_body_focus.lua':['bb5683abf45cb5427fbbd9e40841d54d966f722b2879f84b0dedfebb6a8f9937','5889006b9cc8e4217a098c60dbb21eb431f0f029'],
 'tests/lua/traveling_merchant_event_content.lua':['19872217244484f650323e9332ab7bbb3903540dd9ae718e5b28192759a03b60','2e287211403fdb4f0923f387161565389df3fa40'],
});
function exactSourceBinding(source,binding){
 if(!binding||typeof source!=='string'||source.includes('\r\r\n'))return false;
 const normalized=normalize(source);
 return hash(normalized)===binding[0]&&gitBlob(normalized)===binding[1];
}
function exactCurrentReleaseLuaFixture(path,source){
 return exactSourceBinding(source,currentReleaseLuaFixtures[path]);
}
function assertCurrentReleaseLuaFixtureSources(read){
 for(const path of Object.keys(currentReleaseLuaFixtures))
  assert(exactCurrentReleaseLuaFixture(path,read(path,'utf8')),'fresh current Release Lua fixture source: '+path);
}
// #940 and #962 added three cases, and #951 renamed the Act 2 event case.
function beforeCurrentReleaseLuaNames(paths,read,{required=false}={}){
 const currentPaths=Object.keys(additionalReleaseLuaFixtures);
 if(!required&&!currentPaths.some(path=>paths.includes(path)))return paths;
 const names=new Set(paths);
 assert.equal(names.size,paths.length,'unique live Release Lua inventory');
 for(const path of currentPaths){
  const found=names.delete(path);
  if(required)assert(found,'missing live Release Lua inventory source: '+path);
  if(found)assert(exactSourceBinding(read(path,'utf8'),additionalReleaseLuaFixtures[path]),'fresh added inventory source: '+path);
 }
 if(paths.includes('tests/lua/traveling_merchant_event_content.lua')){
  const retired='tests/lua/addict_event_content.lua';
  assert(!names.has(retired),'retired event fixture must be absent from live Lua inventory');
  assert.throws(()=>read(retired,'utf8'),{code:'ENOENT'},'retired event fixture must be absent');
  names.add(retired);
 }
 return [...names].sort();
}
export function beforeReleaseAdditionalInventory(paths,kind,read=readFileSync){
 paths=beforeM05BackflowInventory(paths,kind,(path,encoding)=>beforeCurrentReplayFixes(path,beforeUiEntranceWitness(path,read(path,encoding))));
 for(const [path,sha] of Object.entries(newerTests[kind])){
  const count=paths.filter(candidate=>candidate===path).length;
  if(!count)continue;
  assert.equal(count,1,'single added Release test: '+path);
  const live=read(path,'utf8');
  if(kind==='lua'&&exactCurrentReleaseLuaFixture(path,live))continue;
  const source=beforeLocalGilFixture(path,beforeFormalAct2ReleaseTest(path,beforeDevelopBackflow(path,live)));
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===sha,'fresh added inventory source: '+path);
 }
 return paths.filter(path=>!Object.hasOwn(newerTests[kind],path));
}
export function beforeShopEntryInventory(paths,kind,read=readFileSync){
 if(kind==='lua')paths=beforeChapterPoolFixtureInventory(paths,read);
 paths=beforeInputRetirementTestInventory(paths,kind,read);
 if(kind==='js')paths=beforeIntegratedStsInventory(paths,(path,encoding)=>beforeNativeFlowFixture(path,read(path,encoding)));
 else paths=beforeCurrentReleaseLuaNames(paths,read);
 paths=beforeReleaseAdditionalInventory(paths,kind,read);
 const [path,...authenticated]=shopEntryTests[kind];
 const position=paths.indexOf(path);
 if(position===-1)return paths;
 assert.equal(paths.lastIndexOf(path),position,'duplicate inventory source: '+path);
 const source=beforeUiEntranceWitness(path,read(path,'utf8'));
 assert(typeof source==='string'&&!source.includes('\r\r\n')&&authenticated.includes(hash(normalize(source))),'fresh added inventory source: '+path);
 return paths.filter(test=>test!==path);
}
export function assertCurrentJsInventory(paths,preceding,read=readFileSync){
 // These tests remain mandatory in live Full. Only exact authenticated
 // successor paths can be omitted from the older replay inventory.
 for(const path of Object.keys(currentReleaseTests))
  assert.equal(paths.filter(candidate=>candidate===path).length,1,'complete current raw discovery inventory: '+path);
 const readCurrent=read;
 read=(path,...args)=>{
  const source=readCurrent(path,...args);
  if(path===formalAct2ReleaseTest)
   assert(exactCheckoutSource(source,formalAct2ReleaseTestCurrent),'fresh current Release performance test source: '+path);
  return source;
 };
 paths=beforeInputRetirementTestInventory(paths,'js',read,{required:true});
 paths=beforeRefinedReleaseJsInventory(beforeShopEntryInventory(paths,'js',read),[...preceding,coopLabTest],read,true);
 assertCoopJsInventory(paths,preceding,read);
}
export function assertCurrentLuaInventory(paths,preceding,read=readFileSync){
 paths=beforeChapterPoolFixtureInventory(paths,read,true);
 paths=beforeInputRetirementTestInventory(paths,'lua',read,{required:true,requireLive:true});
 assertCurrentReleaseLuaFixtureSources(read);
 assertIntegratedLuaFixturesCurrent(read);
 paths=beforeCurrentReleaseLuaNames(paths,read,{required:true});
 const additions=[...Object.keys(newerTests.lua),shopEntryTests.lua[0],'tests/lua/shop_dismiss.lua'];
 assert.deepEqual([...paths].sort(),[...preceding,...additions].sort(),'complete current raw discovery inventory (Lua)');
 const prior=beforeShopEntryInventory(paths,'lua',(path,encoding)=>{
  const source=beforeForkFirstCi(path,beforeUiEntranceWitness(path,read(path,encoding)));
  if(developBackflowOwns(path)&&!exactCurrentReleaseLuaFixture(path,source))assertDevelopBackflowCurrent(path,source);
  return source;
 });
 assert.deepEqual([...prior].sort(),preceding,'complete Release bootstrap raw discovery inventory');
}
export function beforeCoopJsInventory(paths,preceding,read=readFileSync){
 paths=beforeRefinedReleaseJsInventory(beforeShopEntryInventory(paths,'js',read),[...preceding,coopLabTest],read);
 if(!paths.includes(coopLabTest))return paths;
 assertCoopJsInventory(paths,preceding,read);
 return paths.filter(path=>path!==coopLabTest);
}
const closeoutSuccessors=Object.freeze({
 'scripts/ci-shards.mjs':'6becba66be6048f090cd0036c2e5292f180d9010bbe24aef181977dca18fdeb3',
 'tests/defect-integration-source.test.mjs':'e20ed02229b4e316bce92decaec45037eeceb8116f31216b8970c7964674f1c0',
 'tests/defect-utility-planning.test.mjs':'b93215b0cece7151a1929d0535c40595f7a3d9586f237ba0a3966f52687142c1',
 'tests/art-feature-source-inverse.test.mjs':'6627174ae56ab48b831a69e947fa30fb355879095d35f5cdd92b4ae641d1d1dd',
 'scripts/check-architecture.mjs':'328658e71bcb57a2fcf1455e8daa6b31ad15ca1ae1078158ac91bd5b6931befa',
 'scripts/check-quality-ratchet.mjs':'a8d2d90d5767a499c80d44214375400983611c4f9aad3739bada901b59f0b9ce',
 'tests/architecture.test.mjs':'31db85476a8c725950c5e58926edd7cfcfedd493469a56531ecef840d64e547d',
});

// Reuse the existing immutable archive for historical inputs while authenticating
// exact live source successors, including their current tests.
const sourceSuccessors=Object.freeze({
 'docs/legal/assets.json':'1092785bd84163abd9ba779f6447807513c3ddf1bb8c0787584a93b1fb468b70',
 'scripts/official-portraits.mjs':'03d4ea596257e87e4d3ea3f22fc1f1e938f516b8d20c4e9983aceeb51d5b5186',
 'tests/lumine-idle.test.mjs':'183cc0be21ca7a757e3cde25529064a62d5315915e88c3427412786e9ad69e09',
 'tests/official-assets.test.mjs':'455ab9407e88aa5be83ec0900ee6f60321acbbad859fc2bdf59b11183b868f8c',
 'tests/official-portraits-build.test.mjs':'06280b8717f0c0194479cab956e3fea53d00b7d26c06f3fbb37b1152224e4a63',
 'tests/build-ui-input-protection.test.mjs':'ee2171a48378827f623bed2795c7924c5cf1c2548fecc1dfce016cb4e9620318',
 'tests/v25-portrait-profile.test.mjs':'def7e70b4e64fbb5a901407ade2a379af647220afc900de2b4f550ee7c214403',
 'data/presentation/narrative.zh-CN.json':'5db5e77f3789a98e49335bb2443e44f8703ebe349e9e1cd524cfb64a0a3006aa',
 'tests/lore-v2.test.mjs':'2aee46188d476f8ee24b0a736da4d2dcfb214c9f2fe54d5593f1c937a7d67d9f',
 'tests/lua/merchant_dialogue_lifecycle.lua':'25393fa6499858dbbf9551b416aca5930d93426b366c6f6c5123ee611bf3cb06',
 'scripts/check-task-intake.mjs':'972cbe675515a1fd4f7866170c37bd7568b94c6dbeca1e7bf340e46742e42029',
 'tests/sprint-intake.test.mjs':'b5063ae4b367f236111e7c583413a5e819e70a389407a91bc17e16c71c981758',
 'scripts/backlog-metadata.mjs':'082c419cbd0e20eae4ec4cb36f93541af3149f686dd064f06f5a12c983e27933',
 'scripts/backlog-closeout.mjs':'f732936568466ee86ddfd9735e318a9f03284caa2f45abffd66b319cca58d8b5',
 'scripts/verify-backlog-roadmap.mjs':'1d535b694c4d6a6d62cef7c973105fe02d48c55dc3e109e5f3eab0ebcdd3affb',
 'tests/backlog-roadmap.test.mjs':'b4a523a6a7763e825804404a270da6a401a17b59b9855b701a82cb8571f3b17d',
 'tests/delivery.test.mjs':'f74b528375f1f487985a4c108687cd62b61fccb2a23070bb5810205fb69cfc2a',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'c875f2290f59590c6b06e851b627dcac3d684a4e288f6ae88ff839cb3b79c017',
 'tests/helpers/closeout-source-epoch.mjs':'5c47cf4cfa424551010f1e12f39fc84363ad77c93733c4f3d3e8932e00e1c4c9',
 'tests/helpers/copy-integration-source-closure.mjs':'c0a43b2cfca0c01bc6608fbd4f8bcd279c4d91c3d839d92654daf0513bc6d2f3',
 'tests/ci-complete-calibration.test.mjs':'0581fa1b5e5e7735a85337a02c7ad9a5826cc59c36b56d4233da1d34924ad268',
 'tests/integration-source-epoch.test.mjs':'f64f203f4c7c6a3054475390069f7c70e39b3a9e64477bc8f4bc726e6de7fc48',
 'tests/defect-actor-boundary.test.mjs':'bd3deb3006a06adb5b8cb5f1bbda90a354882b015d5a57bd1c1623df35dfb039',
 'tests/defect-final-source-epoch.test.mjs':'c5d27da04e6430a3bb4da253075cf0b7fe5baf5599c86dad8d9b922eafb72651',
 'tests/encounter-formation-source-epoch.test.mjs':'1a624e24e88927828d3d09012145046bcc0317c99757c6aa2d8b30e4ff55e399',
 'tests/room-ui-source-epoch.test.mjs':'230214c3b5f21e8f440c21178afd5636fc1219b528bfb2fffe446150e15e1d20',
 'tests/watcher-actor-boundary.test.mjs':'fe851ca7cd8db5ec5980fb7fbd97efbd162482aa69be379817c27f286f9c56f2',
 'tests/helpers/replay-reviewed-selection.mjs':'47ba348e9a26348b1ed0255cd16bb9099cf5767986a70a28f2f132c39f4c278d',
 ...closeoutSuccessors,
});
const archiveFiles=JSON.parse(gunzipSync(integratedCiBytes)).files;
let closeoutPredecessors;
function closeoutPredecessor(path){
 assert(Object.hasOwn(closeoutSuccessors,path),'registered closeout CI successor: '+path);
 if(!closeoutPredecessors){
  const archive=readFileSync(new URL('./closeout-ci-source.json.gz',import.meta.url));
  assert.equal(hash(archive),'cfc72306af30d0d4b0b61398e3ed0eea36767d6e005c146eb215897fc431a8f8','immutable closeout CI sources');
  const {current,records}=JSON.parse(gunzipSync(archive));
  closeoutPredecessors=new Map(Object.keys(closeoutSuccessors).map(file=>{
   const sha256=current[file];
   assert.match(sha256??'',/^[a-f0-9]{64}$/,'archived closeout predecessor: '+file);
   return [file,{sha256,source:records[sha256]}];
  }));
 }
 return closeoutPredecessors.get(path);
}
const integratedFixture='tests/helpers/integrated-ci-source.mjs';
const officialLegibilityFixture='tests/official-assets-legibility.test.mjs';
const reviewedSelectionFixture='tests/helpers/replay-reviewed-selection.mjs';
const visualIntegratedPredecessor=['35c66b01602d1b6f956cda4863768f9c1fd7ecdd3f8965ffee6ebc597811b882','d5bc70a847df670c100c9fd0809537fdcee725e1'];
const calibrationReplayPaths=Object.freeze([
 integratedFixture,
 'tests/helpers/copy-integration-source-closure.mjs',
 'data/presentation/narrative.zh-CN.json',
 'tests/lore-v2.test.mjs',
 'tests/watcher-actor-boundary.test.mjs',
 'tests/sts-style-source-epoch.test.mjs',
 'tests/integrated-ci-source.cases.mjs',
 'tests/helpers/reward-query-boundary-source-inverse.mjs',
 'tests/helpers/m7-core-final-source-inverse.mjs',
 'tests/helpers/relic-query-source-inverse.mjs',
 officialLegibilityFixture,
 reviewedSelectionFixture,
]);
let calibrationReplayPredecessor;
// Keep this exact copier input here. The copier pins the chapter helper itself.
const battleSceneCopyClosure={
 "path": "tests/helpers/copy-integration-source-closure.mjs",
 "beforeSha256": "234548d4a91abc189059c5e83171e0118054b1f1b7e8844e47a7295b9c05d08a",
 "afterSha256": "2d0d3635870a2d3bbb1bd5b72ad280beedf46d60c21ded39c36a46f3a732c9b3",
 "beforeBlob": "52177644878b5cc24a36e4fe5ec0fecc65c34fd5",
 "afterBlob": "966cd18195af3b65e854ca000536c8360796bcda",
 "hunks": [
  {
   "at": 346,
   "before": "const entranceFiles=Object.freeze({\n ...currentReplayFiles,\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',\n 'tests/helpers/m7-core-final-source-inverse.mjs':'8e0d432cd1ecf668bad14a614a61772e495e13cce67ab0168babcaac5bfda1e6',\n 'tests/helpers/release-ui-restore-source.mjs':'846781b9a6b31c7b85dfca9cdca0447d1880f9a220d1488c18278c4189d6ad48',\n 'tests/helpers/current-replay-fix-sources.mjs':'bfef80da2fc30501c3b2e82cd14bdb8130e4a089f2db231ff2587804fa83a08b',\n 'tests/helpers/character-preparation-source.mjs':'ae3b89b99224cf8bb86b8e569e6488db68ac2d30bf1233ed6652c90808df1984',\n 'tests/helpers/develop-release-backflow-source.mjs':'4ac2a7c073d78f0029d85e9834f6063a4a797f215a529e349bdfc4f19ab5484c',\n 'tests/helpers/refined-release-source.mjs':'cdc740ca1ab04e423eef6462d2c61f68161a9431955d17b098749e6d473ae303',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',\n 'tests/helpers/native-flow-fixture-source.mjs':'8ad7157fd4f3973ffba4f17f9eba440731ddf952e859fee53970d6c3879968e3',\n 'tests/helpers/ui-entrance-source.mjs':'55bbaca21af744a48dff1c5b445160b993bcf0862f813ce328a630408247e315',\n 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',\n 'tests/fixtures/ui-entrance-source.json.gz':'7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9',\n 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',\n [runtime]: 'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',\n [closeout]: '4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',\n 'tests/helpers/input-retirement-source.mjs':'0ca50356e7e2cb5a0755e7a7b203a8d2168ab59d542fb5eeb3729a3984b5e9b8',\n 'tests/fixtures/event-readability-source.json.gz':'1ccc3098014ebf726a776928f5d0b41c29b6a2a1cff21f096ee42a53b0da9cd5',\n});",
   "after": "const entranceFiles=Object.freeze({\n ...currentReplayFiles,\n 'tests/helpers/v2-p1-ci-source.mjs':'add40fc31930e44b7b5d62a21aa30f9aa476b818c924c791682df7dd8ccadf46',\n 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'3600f5fcafa161bb74c2f57574b3a3e78c8041b784ca531168b606620974da9d',\n 'tests/helpers/chapter-battle-scene-source.mjs':'ed071afd55c485c280c17232441692bf922b811dca60db93debef595da7e7445',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',\n 'tests/helpers/m7-core-final-source-inverse.mjs':'8e0d432cd1ecf668bad14a614a61772e495e13cce67ab0168babcaac5bfda1e6',\n 'tests/helpers/release-ui-restore-source.mjs':'2ec5855476f1b4c8cf762ca1a7ee366028322841b07996a518af96fdd87259b9',\n 'tests/helpers/current-replay-fix-sources.mjs':'bfef80da2fc30501c3b2e82cd14bdb8130e4a089f2db231ff2587804fa83a08b',\n 'tests/helpers/character-preparation-source.mjs':'30f20a242e7b9e6f86570e58c0dfb6ba72776599d6428a263062c5b074be88ce',\n 'tests/helpers/develop-release-backflow-source.mjs':'2834679eef440cf54e64cfb2c144c2fc6dbb5dc7ed048c3767435c250827337f',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',\n 'tests/helpers/native-flow-fixture-source.mjs':'8ad7157fd4f3973ffba4f17f9eba440731ddf952e859fee53970d6c3879968e3',\n 'tests/helpers/ui-entrance-source.mjs':'55bbaca21af744a48dff1c5b445160b993bcf0862f813ce328a630408247e315',\n 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',\n 'tests/fixtures/ui-entrance-source.json.gz':'7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9',\n 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',\n [runtime]: 'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',\n [closeout]: '4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',\n 'tests/helpers/input-retirement-source.mjs':'886cc9b65d51c5e5507691f516439d3475f44a3fdfba5dcf96cfb2dde1c5cf2e',\n 'tests/fixtures/event-readability-source.json.gz':'1ccc3098014ebf726a776928f5d0b41c29b6a2a1cff21f096ee42a53b0da9cd5',\n});"
  }
 ]
};
const responsiveHandCopyClosure = {
  "path": "tests/helpers/copy-integration-source-closure.mjs",
  "beforeSha256": "2d0d3635870a2d3bbb1bd5b72ad280beedf46d60c21ded39c36a46f3a732c9b3",
  "afterSha256": "7d8f5d98d92a93dabb956c38d83f37add5fe3ee99a46be26dcb8aae4fe557906",
  "beforeBlob": "966cd18195af3b65e854ca000536c8360796bcda",
  "afterBlob": "47112793d7f7c1af74444be8861f36060c4b19e1",
  "hunks": [
    {
      "at": 349,
      "before": " 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'3600f5fcafa161bb74c2f57574b3a3e78c8041b784ca531168b606620974da9d',\n 'tests/helpers/chapter-battle-scene-source.mjs':'ed071afd55c485c280c17232441692bf922b811dca60db93debef595da7e7445',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',",
      "after": " 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'838a99fe6edf863da9adde709cc46b9979c24089a3d3f2b189482c47d61b7ee5',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',"
    }
  ]
};
// The joined copy owner first restores the exact reward/CRLF-side copier.
const rewardHandCopyClosure={
 "path": "tests/helpers/copy-integration-source-closure.mjs",
 "beforeSha256": "73a38d069953b7bd095a7cfb33b04ab58a2b4623cf86b219876061188f450e7c",
 "afterSha256": "6c80e63686ce2cf2fa469acdaa27a0e061dc0fa0158042af684c188fda90c289",
 "beforeBlob": "5cf5de877fa6472f87d778e1686e1f8a046312ca",
 "afterBlob": "676355849e4d5fb6e336fb8b0a8c01be5d80abae",
 "hunks": [
  {
   "at": 347,
   "before": " ...currentReplayFiles,\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',",
   "after": " ...currentReplayFiles,\n 'tests/helpers/v2-p1-ci-source.mjs':'add40fc31930e44b7b5d62a21aa30f9aa476b818c924c791682df7dd8ccadf46',\n 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'838a99fe6edf863da9adde709cc46b9979c24089a3d3f2b189482c47d61b7ee5',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',"
  },
  {
   "at": 355,
   "before": " 'tests/helpers/m7-core-final-source-inverse.mjs':'c9d98969785466649e0e915df0d912f81b774d8b937b4fb63e74eed731635133',\n 'tests/helpers/release-ui-restore-source.mjs':'846781b9a6b31c7b85dfca9cdca0447d1880f9a220d1488c18278c4189d6ad48',\n 'tests/helpers/current-replay-fix-sources.mjs':'bfef80da2fc30501c3b2e82cd14bdb8130e4a089f2db231ff2587804fa83a08b',\n 'tests/helpers/character-preparation-source.mjs':'ae3b89b99224cf8bb86b8e569e6488db68ac2d30bf1233ed6652c90808df1984',\n 'tests/helpers/develop-release-backflow-source.mjs':'4ac2a7c073d78f0029d85e9834f6063a4a797f215a529e349bdfc4f19ab5484c',\n 'tests/helpers/refined-release-source.mjs':'cdc740ca1ab04e423eef6462d2c61f68161a9431955d17b098749e6d473ae303',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',",
   "after": " 'tests/helpers/m7-core-final-source-inverse.mjs':'c9d98969785466649e0e915df0d912f81b774d8b937b4fb63e74eed731635133',\n 'tests/helpers/release-ui-restore-source.mjs':'2ec5855476f1b4c8cf762ca1a7ee366028322841b07996a518af96fdd87259b9',\n 'tests/helpers/current-replay-fix-sources.mjs':'bfef80da2fc30501c3b2e82cd14bdb8130e4a089f2db231ff2587804fa83a08b',\n 'tests/helpers/character-preparation-source.mjs':'30f20a242e7b9e6f86570e58c0dfb6ba72776599d6428a263062c5b074be88ce',\n 'tests/helpers/develop-release-backflow-source.mjs':'2834679eef440cf54e64cfb2c144c2fc6dbb5dc7ed048c3767435c250827337f',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',"
  },
  {
   "at": 367,
   "before": " [closeout]: '4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',\n 'tests/helpers/input-retirement-source.mjs':'0ca50356e7e2cb5a0755e7a7b203a8d2168ab59d542fb5eeb3729a3984b5e9b8',\n 'tests/fixtures/event-readability-source.json.gz':'1ccc3098014ebf726a776928f5d0b41c29b6a2a1cff21f096ee42a53b0da9cd5',",
   "after": " [closeout]: '4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',\n 'tests/helpers/input-retirement-source.mjs':'886cc9b65d51c5e5507691f516439d3475f44a3fdfba5dcf96cfb2dde1c5cf2e',\n 'tests/fixtures/event-readability-source.json.gz':'1ccc3098014ebf726a776928f5d0b41c29b6a2a1cff21f096ee42a53b0da9cd5',"
  },
  {
   "at": 371,
   "before": " 'tests/helpers/relic-query-source-inverse.mjs':'41b4cddcba283db2cbcdc4d9c19fdd8bb14321378bd1151fc76a74b7ec9b1120',\n 'tests/helpers/reward-current-source.mjs':'32beb13dbdd789feb8f79b583e6fabc91a1dc5aedcf21d6484f48c4db90a2d0c',\n 'tests/helpers/reward-current-source.json.gz':'a68d10abe6e6f3bd33a69f85326d34dce1250b34b6892543cb5c1314c01f3b9f',",
   "after": " 'tests/helpers/relic-query-source-inverse.mjs':'41b4cddcba283db2cbcdc4d9c19fdd8bb14321378bd1151fc76a74b7ec9b1120',\n 'tests/helpers/reward-current-source.mjs':'3ef0c1268abbd8758655d4898b3d62edba8c877eab76fff2ad7e5406e4613dfd',\n 'tests/helpers/reward-current-source.json.gz':'a68d10abe6e6f3bd33a69f85326d34dce1250b34b6892543cb5c1314c01f3b9f',"
  }
 ]
};
// Bind the latest contact helper without changing either historical copier witness.
const groundedContactCopyClosure={
 "path": "tests/helpers/copy-integration-source-closure.mjs",
 "beforeSha256": "6c80e63686ce2cf2fa469acdaa27a0e061dc0fa0158042af684c188fda90c289",
 "afterSha256": "5d05c36db6fdbee600cc2f7150f85a2e548701c6a1baefeb5909a6de15d4f391",
 "beforeBlob": "676355849e4d5fb6e336fb8b0a8c01be5d80abae",
 "afterBlob": "32d777fb09b1bfbf60f06aab7d91e53b26d71dda",
 "hunks": [
  {
   "at": 350,
   "before": " 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'838a99fe6edf863da9adde709cc46b9979c24089a3d3f2b189482c47d61b7ee5',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',",
   "after": " 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'2c281a2dba02dce5fd8c9e40a43dc971c8428d19844125311f5ca58afa7a33af',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',"
  }
 ]
};
// Bind the current refined Byrd pool helper without changing the older copier witnesses.
const refinedByrdPoolCopyClosure={
 "path": "tests/helpers/copy-integration-source-closure.mjs",
 "beforeSha256": "5d05c36db6fdbee600cc2f7150f85a2e548701c6a1baefeb5909a6de15d4f391",
 "afterSha256": "94a17264d5283f4e57edec8dd99d116e3b7ffd94543f1bc96e587cd8131d8157",
 "beforeBlob": "32d777fb09b1bfbf60f06aab7d91e53b26d71dda",
 "afterBlob": "3418cf344390eb729c5b5f012d76512a190750c2",
 "hunks": [
  {
   "at": 350,
   "before": " 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'2c281a2dba02dce5fd8c9e40a43dc971c8428d19844125311f5ca58afa7a33af',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',",
   "after": " 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'1270c293d79c04ac4a5b15483dd4cc8f9c4279362e2f5c551f6e98c20c9ad293',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',\n 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',"
  }
 ]
};
function beforeBattleSceneCopyClosure(path,source){
 if(path!==battleSceneCopyClosure.path||typeof source!=='string')return source;
 const lf=normalize(source);
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const byrd=refinedByrdPoolCopyClosure;
 const contactSource=exactCheckoutSource(lf,[byrd.afterSha256,byrd.afterBlob])
  ?restoreExactFixtureHunks(byrd,path,lf):lf;
 const contact=groundedContactCopyClosure;
 const joined=exactCheckoutSource(contactSource,[contact.afterSha256,contact.afterBlob])
  ?restoreExactFixtureHunks(contact,path,contactSource):contactSource;
 const combined=rewardHandCopyClosure;
 if(exactCheckoutSource(joined,[combined.afterSha256,combined.afterBlob])){
  const previous=restoreExactFixtureHunks(combined,path,joined);
  assert.equal(blob(previous),combined.beforeBlob,'exact reward copier predecessor blob');
  return source===lf?previous:previous.replaceAll('\n','\r\n');
 }
 const hand=responsiveHandCopyClosure;
 const previousHand=blob(lf)===hand.afterBlob&&hash(lf)===hand.afterSha256
  ?restoreExactFixtureHunks(hand,path,lf):lf;
 if(blob(previousHand)!==battleSceneCopyClosure.afterBlob||hash(previousHand)!==battleSceneCopyClosure.afterSha256)return source;
 const previous=restoreExactFixtureHunks(battleSceneCopyClosure,path,previousHand);
 assert.equal(blob(previous),battleSceneCopyClosure.beforeBlob,'exact previous battle scene copier blob');
 return source===lf?previous:previous.replaceAll('\n','\r\n');
}
const relicCloseoutIntegratedSuccessor={
 "path": "tests/helpers/integrated-ci-source.mjs",
 "afterSha256": "3050fb4626b7417c3a98392d82f770657d6769cc34674a5d05baf90884438bdc",
 "beforeSha256": "9c0f0d77c30692b4220fc3bf38f84c221c9409ca73e21567cd1ec6565ce09aa6",
 "hunks": [
  {
   "at": 57,
   "before": "});",
   "after": "});\nconst relicCloseoutOwner='tests/helpers/closeout-ci-source.mjs';"
  },
  {
   "at": 59,
   "before": "const integratedEvidenceSuccessors=Object.freeze({",
   "after": "const integratedEvidenceSuccessors=Object.freeze({\n // #1010 changes the live relic inventory reader; the sealed integration view remains byte-exact.\n [relicCloseoutOwner]:{\n  sha256:'34c1a1ae32357055166de58dc68676d9adb9a99a88c7ac97ab3b1f649ef3cbff',\n  gitBlob:'ce89dff7d6ee40d504cb4ab7d0fc5cbf7310229d',\n },"
  },
  {
   "at": 130,
   "before": "}",
   "after": "}\nfunction matchesIntegratedEvidence(path,source,binding){\n if(!exactSourceMatches(source,binding))return false;\n if(path!==relicCloseoutOwner)return true;\n const lf=norm(source);\n return source===lf||source===lf.replaceAll('\\n','\\r\\n');\n}"
  },
  {
   "at": 140,
   "before": " if(!binding||!exactSourceMatches(source,binding))return source;",
   "after": " if(!binding||!matchesIntegratedEvidence(path,source,binding))return source;"
  },
  {
   "at": 185,
   "before": "  if(binding)assert(exactSourceMatches(source,binding),'fresh complete integration source: '+path);",
   "after": "  if(binding)assert(matchesIntegratedEvidence(path,source,binding),'fresh complete integration source: '+path);"
  }
 ]
};
const relicCloseoutIntegratedIdentity=["3050fb4626b7417c3a98392d82f770657d6769cc34674a5d05baf90884438bdc", "cb755c920a43e60b93d41a29f97e8888dabfabfc"];
function beforeRelicCloseoutIntegratedFixture(path,source){
 if(path!==integratedFixture||!exactCheckoutSource(source,relicCloseoutIntegratedIdentity))return source;
 const prior=restoreExactFixtureHunks(relicCloseoutIntegratedSuccessor,path,source);
 assert.equal(blob(prior),'2f628ab1013c999dc38c55b87537d573c4bbcd40','exact #1010 integration fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
const reviewedStsFeedbackFixture={
 "path": "tests/sts-style-source-epoch.test.mjs",
 "beforeSha256": "d5dab6191c676a0520ecf6052ce7ffe6b8f60318a8b31c6022e84df191a59d45",
 "afterSha256": "1b937677280a1e5f72063528e7188773d3493207166582bf0805dfe43a1e2669",
 "hunks": [
  {
   "at": 2,
   "before": "import {beforeCharacterPreparationSource} from './helpers/character-preparation-source.mjs';",
   "after": "import {beforeCharacterPreparationSource,beforeCurrentProductionSource} from './helpers/character-preparation-source.mjs';\nimport {reviewedSelectionRead} from './helpers/reviewed-selection-current-source.mjs';"
  },
  {
   "at": 248,
   "before": " for(const [path,row]of Object.entries(p.current))assert.equal(beforeCharacterPreparationSource(path,readProductionHistory(path)).replaceAll('\\r\\n','\\n'),row.source,path);\n const anchor=feedbackProductionPaths[0],raw=readProduction;",
   "after": " const raw=reviewedSelectionRead();\n for(const [path,row]of Object.entries(p.current)){\n  const source=path===retiredControllerPath\n   ?beforeCharacterPreparationSource(path,readRetiredController(raw).source,raw)\n   :beforeCurrentProductionSource(path,raw(path),raw);\n  assert.equal(source.replaceAll('\\r\\n','\\n'),row.source,path);\n }\n const anchor=feedbackProductionPaths[0];"
  }
 ]
};
const reviewedStsFeedbackIdentity=['1b937677280a1e5f72063528e7188773d3493207166582bf0805dfe43a1e2669','bf1dd5f099f9c8536bf1b1bb5a73b0f37725d815'];
const selectionStsFeedbackFixture={
 "path": "tests/sts-style-source-epoch.test.mjs",
 "beforeSha256": "1b937677280a1e5f72063528e7188773d3493207166582bf0805dfe43a1e2669",
 "afterSha256": "dbd8dabc63cafcbaa8404fa76d309c8241dbee8aabecae3e46c2be8120d0ac90",
 "hunks": [
  {
   "at": 4,
   "before": "import {entranceInventory} from './helpers/ui-entrance-source.mjs';\nimport {assertCurrentJsInventory,assertCurrentLuaInventory,beforeShopEntryInventory} from './helpers/fork-preflight-source.mjs';",
   "after": "import {entranceInventory,uiEntranceOwns} from './helpers/ui-entrance-source.mjs';\nimport {assertCurrentJsInventory,assertCurrentLuaInventory,beforeShopEntryInventory,chapterEvidenceCurrentRead} from './helpers/fork-preflight-source.mjs';\nimport {checkedSelectionEntranceRead} from './helpers/ui-selection-current-source.mjs';\nimport {beforeChapterBattleScene} from './helpers/chapter-battle-scene-source.mjs';\nimport {beforeBattlePeriphery} from './helpers/battle-periphery-source.mjs';"
  },
  {
   "at": 251,
   "before": " const raw=reviewedSelectionRead();\n for(const [path,row]of Object.entries(p.current)){\n  const source=path===retiredControllerPath\n   ?beforeCharacterPreparationSource(path,readRetiredController(raw).source,raw)\n   :beforeCurrentProductionSource(path,raw(path),raw);\n  assert.equal(source.replaceAll('\\r\\n','\\n'),row.source,path);\n }\n const anchor=feedbackProductionPaths[0];\n assert.equal(sourceEpoch.preCombinedSource(anchor,raw(anchor),{target:'stsFeedbackPrior',readSource:raw}),stsStyleEpoch.proof.current[anchor].source);\n for(const path of feedbackProductionPaths){\n  assert(p.owners.includes(path),'current owner must guard every changed feedback source: '+path);\n  for(const missing of [null,raw(path)+'\\n'])assert.throws(()=>sourceEpoch.preCombinedSource(anchor,raw(anchor),\n   {target:'stsFeedbackPrior',readSource:p=>p===path?missing:raw(p)}),/linked owner identity/,path);\n }",
   "after": " const readOwner=reviewedSelectionRead();\n const readEntrance=chapterEvidenceCurrentRead(checkedSelectionEntranceRead(readFileSync));\n const current=path=>uiEntranceOwns(path)?readEntrance(path,'utf8'):readOwner(path);\n for(const [path,row]of Object.entries(p.current)){\n  const source=path===retiredControllerPath\n   ?beforeCharacterPreparationSource(path,readRetiredController(readOwner).source,current)\n   :beforeCurrentProductionSource(path,current(path),current);\n  assert.equal(source.replaceAll('\\r\\n','\\n'),row.source,path);\n }\n // The old StS projector sees these owners after the chapter and battle layout stages.\n const history=path=>{\n  const source=current(path);\n  return uiEntranceOwns(path)?beforeBattlePeriphery(path,beforeChapterBattleScene(path,source)):source;\n };\n const anchor=feedbackProductionPaths[0];\n assert.equal(sourceEpoch.preCombinedSource(anchor,history(anchor),{target:'stsFeedbackPrior',readSource:history}),stsStyleEpoch.proof.current[anchor].source);\n for(const path of feedbackProductionPaths){\n  assert(p.owners.includes(path),'current owner must guard every changed feedback source: '+path);\n  for(const missing of [null,history(path)+'\\n'])assert.throws(()=>sourceEpoch.preCombinedSource(anchor,history(anchor),\n   {target:'stsFeedbackPrior',readSource:p=>p===path?missing:history(p)}),/linked owner identity/,path);\n }"
  }
 ]
};
const selectionStsFeedbackIdentity=['dbd8dabc63cafcbaa8404fa76d309c8241dbee8aabecae3e46c2be8120d0ac90','3142acba314fe40251c9b46231a5db27dcf04986'];
function beforeReviewedStsFeedbackFixture(path,source){
 if(path!==luaInventoryTest)return source;
 if(exactCheckoutSource(source,selectionStsFeedbackIdentity)){
  const composed=restoreExactFixtureHunks(selectionStsFeedbackFixture,path,source);
  assert(exactCheckoutSource(composed,reviewedStsFeedbackIdentity),'exact #1020 StS feedback fixture');
  source=source.includes('\r\n')?composed.replaceAll('\n','\r\n'):composed;
 }
 if(!exactCheckoutSource(source,reviewedStsFeedbackIdentity))return source;
 const prior=restoreExactFixtureHunks(reviewedStsFeedbackFixture,path,source);
 assert.equal(blob(prior),'72e15c6ebec71499025aea8bd80a91e0c418f7e7','exact StS feedback fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeCalibrationReplayOwner(path,source){
 source=beforeReviewedStsFeedbackFixture(path,source);
 source=beforeReviewedOfficialAssetReplay(path,beforeSelectionReceiptSource(path,source));
 source=beforeBattleSceneCopyClosure(path,source);
 if(path===integratedFixture)source=beforeChapterBattleScene(path,beforeRelicCloseoutIntegratedFixture(path,source));
 source=beforeVisualLegibility(path,source);
 if(!calibrationReplayPaths.includes(path))return source;
 if(!calibrationReplayPredecessor){
  calibrationReplayPredecessor=releaseUiRestoreArchive(
   readFileSync(new URL('./calibration-v220-replay-owners.json.gz',import.meta.url)),
   '180009ee25a276c4c1ed3a9f1b7d07a9323582e72296ffc066f898e890355ae3','8b4172d59779ad9fa21b4ba91ef750ab22fcdaf1');
  assert.deepEqual(Object.keys(calibrationReplayPredecessor.files),calibrationReplayPaths,'ordered v2.2 calibration replay owners');
 }
 if(path===battleSceneCopyClosure.path&&exactCheckoutSource(source,[battleSceneCopyClosure.beforeSha256,battleSceneCopyClosure.beforeBlob])){
  const {before}=calibrationReplayPredecessor.files[path];
  assert.equal(before.sha256,'9c0b358a3b75b59ebe7218f988297661b71a42b47d20e34a3b9734a2c0a71a10','shared exact standalone copier predecessor');
  assert.equal(before.gitBlob,'143ce2350c049fa4fe641e86dc34b18d094a8c73');
  return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
 }
 if(path===integratedFixture&&exactCheckoutSource(source,visualIntegratedPredecessor)){
  const {before}=calibrationReplayPredecessor.files[path];
  assert.equal(before.gitBlob,'a191206e710368b4a5ad5adc68c704462a246405','shared exact integrated predecessor');
  return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
 }
 return calibrationReplayPredecessor.project(path,source);
}
function beforeIntegrationReplayTests(path,source){
 if(path!=='tests/integration-source-epoch.test.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=normalize(source);
 if(hash(current)!=='54554c11d6514f5bf8b164fb30fe9b5538e39f550e9a22587514461ad9442587'||
  blob(current)!=='bf77a954913587402aea8992f734cf891d9891bd')return source;
 const archive=readFileSync(new URL('./integration-replay-test-source.json.gz',import.meta.url));
 assert.equal(hash(archive),'8b1b39e9d26df59754f64d3771dce43974554c4c9acb67a7fa9f9e921232d3f6','immutable integration replay test predecessor archive');
 const proof=JSON.parse(gunzipSync(archive));
 assert.equal(proof.schemaVersion,1);
 assert.equal(proof.base,'469e80240c5b7c60f75ff434bebac62d73c0bd0c');
 assert.equal(proof.path,path);
 assert.equal(proof.after.sha256,hash(current));assert.equal(proof.after.gitBlob,blob(current));
 const prior=proof.before;
 assert.equal(prior.sha256,sourceSuccessors[path]);assert.equal(hash(prior.source),prior.sha256);
 assert.equal(blob(prior.source),prior.gitBlob);
 return source.includes('\r\n')?prior.source.replaceAll('\n','\r\n'):prior.source;
}
const epochReplayRuntimePath='tests/helpers/combined-epoch/source-epoch-runtime.mjs';
const fingerprintReplayPaths=new Set([epochReplayRuntimePath,'tests/helpers/copy-integration-source-closure.mjs',
 'tests/helpers/develop-release-backflow-source.mjs','tests/helpers/rebased-release-source.mjs','tests/helpers/round3-catalog-source-inverse.mjs']);
let fingerprintReplay;
function beforeReplayFingerprintSource(path,source){
 if(!fingerprintReplayPaths.has(path))return source;
 fingerprintReplay??=releaseUiRestoreArchive(readFileSync(new URL('./replay-fingerprint-predecessor.json.gz',import.meta.url)),
  '805b120d44180797e8583edf7375a7b1d78250bfd8e9b59284aed534f36ae994','baaf67f273aa99f9d7b69812f7c5b2edd6815ab8');
 return fingerprintReplay.project(path,source);
}
const epochReplayPaths=[epochReplayRuntimePath,'tests/helpers/character-preparation-source.mjs'];
let epochReplaySources;
function beforeDevelopEpochReplayRuntime(path,source){
 if(!epochReplayPaths.includes(path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 if(!epochReplaySources){
  const bytes=readFileSync(new URL('./epoch-replay-runtime-source.json.gz',import.meta.url));
  assert.equal(hash(bytes),'cf8ad18c6099407d326129c39df4ca6ec33f1ab2559a4f5eae62eff5c9403e94','immutable Develop replay runtime predecessor archive');
  const proof=JSON.parse(gunzipSync(bytes));
  assert.equal(proof.schemaVersion,1);
  assert.equal(proof.base,'796ed39e176f162170b2e19230a39fdb83013b00');
  assert.deepEqual(Object.keys(proof.files),epochReplayPaths);
  for(const {before,after} of Object.values(proof.files)){
   assert.equal(hash(before.source),before.sha256);assert.equal(blob(before.source),before.gitBlob);
   assert.match(after.sha256,/^[a-f0-9]{64}$/);assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
  }
  epochReplaySources=proof.files;
 }
 const {before,after}=epochReplaySources[path];
 const current=normalize(source);
 if(hash(current)!==after.sha256||blob(current)!==after.gitBlob)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}
const replayAssetLedger='docs/legal/assets.json';
const referenceAssetLedger=['6e618cdf519fbe4c252dcc1a33b42eac4e737e89641ad215d93fcf50fecab8c3','69d938af08e70e12466cb44b5375b669993fab33'];
const preReferenceAssetLedger=['3c4b140e7d432bb1de89289e516723dafa14daecd414b1ffe94b4f39d267f5c2','94e5b7f8a05e190d59e603b7b0760fc968d2a600'];
function currentAssetLedgerRead(read){
 return (path,...args)=>{
  const raw=read(path,...args);
  if(path===replayAssetLedger)assert(exactCheckoutSource(Buffer.isBuffer(raw)?raw.toString('utf8'):raw,referenceAssetLedger),
   'fresh complete integration source: '+path);
  return raw;
 };
}
const replayStorageSources=Object.freeze({
 '.gitattributes':['0b385940b40b3e3c37337ce283b8772bb800333d6654675ff3107fd70cca7cf5','11d5e5b797cff39ed75bc0614fb9d02975fbcc24'],
 'config/ci-media-lfs.json':['80e6bae0a63426858864d5d13d50b86e7fa2369a4b89715b2f0d264b8068092e','04ad2de599ff5e2a702764f0d07d5bbea41a2d77'],
 [replayAssetLedger]:['3177b5d318db49ae78255bbcf6deae7413024d0f6c2781b31e633c549e173cc0','2d5d723f3a76e0563dda2e28d9f2dccedadf5b42'],
 'scripts/ci-media-lfs.mjs':['a4ca309a0e8257fbdbc135b8272acecca74c846db4c56b48a9fa727c00c56458','22fea391946d3d0438fefd054f5e32e5ceb122ec'],
 'tests/ci-reviewed-lfs.test.mjs':['05f1824d4c92aed4a8199f2c5b1d62b73c323c752add998376e75e1d11f519f8','fe0cbb9f737f58051ff2154170bd434e85d463cd'],
});
function withoutArchiveRecords(current,first,after){
 const start=current.indexOf(first),end=current.indexOf(after);
 assert(start>=0&&end>start,'complete replay archive records');
 return current.slice(0,start)+current.slice(end);
}
function beforeDeckBrowserAssetLedger(source){
 if(typeof source!=='string'||source.includes('\r\r\n'))return source;
 let current=normalize(source);
 if(source!==current&&source!==current.replaceAll('\n','\r\n'))return source;
 // #1017 registers six reviewed design and simulator evidence files.
 if(exactCheckoutSource(source,referenceAssetLedger)){
  current=withoutArchiveRecords(current,'    "docs/design/reference-assets/v2.2.0/battle-scene/act1-geometry.svg": {\n',
   '    "data/presentation/event-native-controls.json": {\n');
  assert(exactSourceBinding(current,preReferenceAssetLedger),'exact pre-#1017 asset ledger');
 }
 // #951 updates the native event manifest hash after its approved text edits.
 if(exactSourceBinding(current,preReferenceAssetLedger)){
  current=current.replace('eac9cfc53f1203d635ba1ed77acee1bfd6d12073be53fcb7b4d0af56262bb1b5',
   'db7a1393c4fae90fc9d7cc30b2ee762394a8ab041b19a6a9aa33973a263eeb13');
  assert.equal(hash(current),'5ec27c5274a512ccdf2dfb183f65bd15321c87883e3e4e633e6502f726429353','exact pre-#951 asset ledger');
  assert.equal(blob(current),'dcd99bd13cf06653847b5ca8eb76748c229f17a4');
 }
 if(hash(current)==='5ec27c5274a512ccdf2dfb183f65bd15321c87883e3e4e633e6502f726429353'&&
    blob(current)==='dcd99bd13cf06653847b5ca8eb76748c229f17a4'){
  current=withoutArchiveRecords(current,'    "native-event-illustrations": {\n','    "deck-browser-host-evidence": {\n');
  current=withoutArchiveRecords(current,'    "data/presentation/event-native-controls.json": {\n',
   '    "docs/evidence/deck-pages-20261122/visual/develop-first-open.png": {\n');
 }
 if(hash(current)!=='1d33f53a8ae76990456e0829980be613201a8bde6502593013bb928768a9627c'||
    blob(current)!=='23e19be19acbca290bdad08d71f2e111b1143f1e')return source;
 const categories=withoutArchiveRecords(current,'    "deck-browser-host-evidence": {\n','    "opening-statue-simulator-evidence": {\n');
 const prior=withoutArchiveRecords(categories,'    "docs/evidence/deck-pages-20261122/visual/develop-first-open.png": {\n',
  '    "docs/evidence/neow-geo-statue-preview.png": {\n');
 const [sha,id]=replayStorageSources[replayAssetLedger];
 assert.equal(hash(prior),sha,'immutable deck-browser asset ledger predecessor');
 assert.equal(blob(prior),id);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Historical checks still use the exact media script from before runtime previews
// joined the hosted bundle. The live bundle path has its own transport tests.
function beforeRuntimePreviewBundle(source){
 if(typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=normalize(source);
 if(hash(current)!=='e608fc9d33f97f5446c64e5897f852c3fd5bad6a50900aec41bd4f719989b9f7'
   ||blob(current)!=='537d4fd28b1cbb730f7d5f95afbdd35b79f7243e')return source;
 const prior=current
  .replace(',prepareRuntimePreviews,runtimePreviewPaths,runtimePreviewObjects','')
  .replace(' const runtimePreviews=prepareRuntimePreviews({root,needed:true,env});\n','')
  .replace(` const pathsByOid=new Map(mediaFiles.map(row=>[row.sha256,row.path]));
 for(const [index,path] of runtimePreviewPaths.entries()){
  const [oid]=runtimePreviewObjects[index];
  pathsByOid.set(oid,path);
 }
 for(const [oid,path] of pathsByOid)copyFileSync(mediaPath(root,{path}),resolve(directory,oid));
 return {...result,runtimePreviews};`,` const pathsByOid=new Map(mediaFiles.map(row=>[row.sha256,row]));
 for(const [oid,row] of pathsByOid)copyFileSync(mediaPath(root,row),resolve(directory,oid));
 return result;`);
 const [sha,id]=replayStorageSources['scripts/ci-media-lfs.mjs'];
 assert.equal(hash(prior),sha,'immutable runtime preview bundle predecessor');
 assert.equal(blob(prior),id);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeReplayArchiveStorage(path,source){
 if(!Object.hasOwn(replayStorageSources,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 if(path==='scripts/ci-media-lfs.mjs')source=beforeRuntimePreviewBundle(source);
 const current=normalize(source);
 const [sha,id]=replayStorageSources[path];
 if(hash(current)!==sha||blob(current)!==id)return source;
 let prior,priorSha,priorId;
 switch(path){
  case '.gitattributes':
   prior=withoutArchiveRecords(current,'tests/fixtures/integration-ci-epochs.json.gz filter=lfs','\n# Original bytes of the v2 P1 screenshots');
   priorSha='f0b3ef1846d96a102b82bdc023fd2e88e39e9f93c679be5134df1f8b095b7ac0';priorId='62cc3f1be7620666b1ee3a8205c9c5674b8007dd';
   break;
  case 'config/ci-media-lfs.json': {
   const {replayArchiveExtension,...manifest}=JSON.parse(current);
   assert(replayArchiveExtension,'complete replay archive manifest extension');
   prior=JSON.stringify(manifest,null,2)+'\n';
   priorSha='a744f84701e638657569cf3211443adbace935c28435b2742ebc28b2a666e89d';priorId='ebb146be32e84e6b6161f1b558056900383ffd6c';
   break;
  }
  case replayAssetLedger:
   prior=withoutArchiveRecords(current,'    "tests/fixtures/integration-ci-epochs.json.gz": {\n','    "docs/evidence/sts-selection-fade-20261121/after-selection.png": {\n');
   priorSha='28c8b76109df44c218fc25b226dfec494870b591d56c53fd66cb0b6eb06d0a3c';priorId='719804fae3a3b3ddac4d41b6ee020f7fba03319c';
   break;
  default:
   ({before:prior,beforeSha:priorSha,gitBlob:priorId}=transport.files[path]);
 }
 assert.equal(hash(prior),priorSha,'immutable replay archive storage predecessor: '+path);
 assert.equal(blob(prior),priorId,path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// #951 renamed the Reptomancer handler in the live static gate. Only the
// exact complete gate can recover the existing #934 historical source.
function beforeReleaseScriptStaticGate(path,source){
 if(path!=='scripts/check-lua-static.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=normalize(source);
 if(hash(current)!=='71be0618a4f6909a684bacf738674fa8250e6624832f2333394dc8ce295337a0'||
  blob(current)!=='c82d0af862f5652ed624dd28a446927ebdd23904')return source;
 const handler="'giantHeadSlow','timeEater','reptomancerDismissal'";
 assert.equal(current.split(handler).length,2,'one reviewed Reptomancer handler name');
 const prior=current.replace(handler,"'giantHeadSlow','timeEater','reptomancerSuicide'");
 assert.equal(hash(prior),'1af54cf42e38fd561ceff37827d12e7293061ed863172b6fa59bc824b71b2dfe','exact static gate predecessor');
 assert.equal(blob(prior),'1ed655df7fb2d57f5098c48508b8ce1606c192a5',path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeReviewedBuildInput(path,source,read){
 source=beforeForkPush(path,source);
 const reviewed=(owner,raw)=>{
  if(owner.startsWith('src/')||owner==='config/architecture.json')return raw;
  const input=beforeActorAlphaBuildInput(owner,raw);
  return beforeCurrentReplayFixes(owner,beforeUiEntranceWitness(owner,beforeCurrentReplayCopier(owner,beforeForkPush(owner,input))));
 };
 const live=owner=>reviewed(owner,read(owner,'utf8'));
 const production=authenticateDevelopBackflow(path,reviewed(path,source),live);
 const deck=beforeDeckPagesSuiteSource(path,production);
 const merged=beforeDevelopReplayMerge(path,beforeCurrentReplayFixes(path,deck));
 return beforeForkFirstCi(path,beforeReplayArchiveStorage(path,merged));
}
function beforeIntegrationSuccessor(path,source){
 source=beforeIntegrationReplayTests(path,source);
 if(!Object.hasOwn(sourceSuccessors,path)||typeof source!=='string'||source.includes('\r\r\n')
   ||hash(normalize(source))!==sourceSuccessors[path])return source;
 const prior=archiveFiles[path]?.current??closeoutPredecessor(path);
 assert.equal(hash(prior.source),prior.sha256,'immutable integration predecessor: '+path);
 return source.includes('\r\n')?prior.source.replaceAll('\n','\r\n'):prior.source;
}
// The current gate uses these two replay modules to verify the composed hand and scene owners.
const responsiveReplayHelpers=Object.freeze({
 [integratedFixture]:relicCloseoutIntegratedIdentity,
 'tests/helpers/chapter-battle-scene-source.mjs':['1270c293d79c04ac4a5b15483dd4cc8f9c4279362e2f5c551f6e98c20c9ad293','5306929645881d562b4d4322c5b3fa2ecb91edbd'],
 'tests/helpers/rebased-release-source.mjs':['b1e42ded7f05f580fb25ab0417ccd8db45832f5e9e50db83a38d6aaa2767dc20','4b22a3e61459334c6d85b247ea188976313d549e'],
});
function responsiveReplayCurrentRead(read){
 return (path,...args)=>{
  const raw=read(path,...args);
  if(Object.hasOwn(responsiveReplayHelpers,path)){
   const source=Buffer.isBuffer(raw)?raw.toString('utf8'):raw;
   const error=path===integratedFixture?'fresh complete integration source: ':'fresh responsive replay helper: ';
   assert(exactCheckoutSource(source,responsiveReplayHelpers[path]),error+path);
  }
  return raw;
 };
}
export function chapterEvidenceCurrentRead(read,copier){
 const currentRead=responsiveReplayCurrentRead(read);
 const chapterRead=chapterSceneCurrentRead((path,encoding)=>{
  const raw=currentRead(path,encoding);
  if(path!==integratedFixture)return raw;
  const source=Buffer.isBuffer(raw)?raw.toString('utf8'):raw;
  const prior=beforeRelicCloseoutIntegratedFixture(path,source);
  return Buffer.isBuffer(raw)?Buffer.from(prior):prior;
 },copier);
 return (path,...args)=>(path===integratedFixture?currentRead:chapterRead)(path,...args);
}
export function currentReviewedSelectionRead(read){
 return (path,encoding)=>{
  const source=read(path,encoding);
  if(path!==reviewedSelectionFixture&&path!==officialLegibilityFixture&&path!==officialAssetsFixture&&path!==luaInventoryTest)return source;
  const raw=Buffer.isBuffer(source)?source.toString('utf8'):source;
  if(path===luaInventoryTest){
   assert(exactCheckoutSource(raw,selectionStsFeedbackIdentity),'fresh complete integration source: '+path);
  }else if(path===reviewedSelectionFixture){
   const reviewed=beforeSelectionReceiptSource(path,raw);
   assert.notEqual(beforeReviewedOfficialAssetReplay(path,reviewed),reviewed,'fresh current reviewed Selection replay fixture: '+path);
   assert.notEqual(beforeCalibrationReplayOwner(path,raw),raw,'fresh current reviewed Selection replay fixture: '+path);
  }else if(path===officialAssetsFixture){
   const intermediate=beforeSelectionReceiptSource(path,raw);
   assert.notEqual(beforeOfficialAssetsFocusFixture(path,intermediate),intermediate,'fresh current official card focus fixture: '+path);
  }else{
   assert.notEqual(beforeVisualLegibility(path,raw),raw,'fresh current official legibility fixture: '+path);
  }
  return source;
 };
}
// Keep the original calibration fixture available to its sealed source views.
const cursesReceiptFixture={
 "path": "tests/ci-complete-calibration.test.mjs",
 "afterSha256": "27c89e80fa88fddb6c7f0c2efaf270d7292e1279307d4e2cec521cfb4ce3b93a",
 "beforeSha256": "116e479ab202d2012dc4910de98ace5a8f5f5ab544ad6116abe35ec08aeb03fc",
 "hunks": [
  {
   "at": 8,
   "before": "import {cursesPlanningFloors,cursesGateProof,preCursesGateSource} from './helpers/curses-ci-planning.mjs';",
   "after": "import {cursesPlanningFloors,cursesGateProof,preCursesGateSource} from './helpers/curses-ci-planning.mjs';\nimport {historicalCursesReceiptReader} from './helpers/curses-historical-custody.mjs';"
  },
  {
   "at": 1469,
   "before": "  assert.deepEqual(receipt.inputHashes,receipt.afterInputHashes);",
   "after": "  assert.deepEqual(receipt.inputHashes,receipt.afterInputHashes);\n  const readReceiptInput=historicalCursesReceiptReader(file,bytes,rawBootstrapReadFileSync);"
  },
  {
   "at": 1472,
   "before": "   assert.equal(replayHash(path,sha,()=>{const raw=diskReadFileSync(path);return path.endsWith('.gz')?raw:beforeCharacterPreparationSource(path,receiptToolingSource(path,raw.toString('utf8'),'curses')).replaceAll('\\r\\n','\\n');}),sha,path);",
   "after": "   assert.equal(hash(readReceiptInput(path,sha)),sha,path);"
  }
 ]
};
const cursesReceiptSources=Object.freeze({
 [cursesReceiptFixture.path]:["27c89e80fa88fddb6c7f0c2efaf270d7292e1279307d4e2cec521cfb4ce3b93a", "a69967b62ef5a2df1a36d3589901d75b4fe75634"],
 'tests/helpers/curses-historical-custody.mjs':["a068636ba187c353f69d8ec19d432cb052ea99f455a58feb2f6973bd63e60aaa", "2ac231d4d269e8138cd1c0e6bf3fe77db576f4f0"],
});
function beforeCursesReceiptFixture(path,source){
 if(path!==cursesReceiptFixture.path||!exactCheckoutSource(source,cursesReceiptSources[path]))return source;
 const prior=restoreExactFixtureHunks(cursesReceiptFixture,path,source);
 assert.equal(blob(prior),'5a8992502b7c5d1ebee37dd6d8eb26c439968695','exact Curses receipt fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function cursesReceiptCurrentRead(read){
 return (path,...args)=>{
  const raw=read(path,...args);
  if(Object.hasOwn(cursesReceiptSources,path)){
   const source=Buffer.isBuffer(raw)?raw.toString('utf8'):raw;
   assert(exactCheckoutSource(source,cursesReceiptSources[path]),'fresh current Curses receipt source: '+path);
  }
  return raw;
 };
}
export function assertIntegrationSuccessorsCurrent(read=readFileSync){
 const replayRead=cursesReceiptCurrentRead(responsiveReplayCurrentRead(currentAssetLedgerRead(currentReviewedSelectionRead(checkedSelectionReceiptRead(read)))));
 for(const path of Object.keys(cursesReceiptSources))replayRead(path,'utf8');
 for(const path of Object.keys(responsiveReplayHelpers))replayRead(path,'utf8');
 // The chapter guard consumes its exact reviewed predecessor. Current
 // consumers still read and authenticate the new fixture at every read.
 const rawRead=actorAlphaCurrentRead(chapterEvidenceCurrentRead(replayRead,selectionCopierReceipt));
 rawRead(officialLegibilityFixture,'utf8');
 rawRead(reviewedSelectionFixture,'utf8');
 rawRead(officialAssetsFixture,'utf8');
 const liveRead=(path,encoding)=>{
  const alpha=Object.hasOwn(actorAlphaBuildInputs,path);
  const raw=rawRead(path,alpha?'utf8':encoding);
  const input=alpha?beforeActorAlphaBuildInput(path,raw):raw;
  return beforeForkPush(path,beforeCalibrationReplayOwner(path,beforeOfficialAssetsFocusFixture(path,beforeCursesReceiptFixture(path,beforeSelectionReceiptSource(path,input)))));
 };
 assertReleaseCandidateToolsCurrent(rawRead);
 assertAudioDeckBrowserCurrent(rawRead);
 assertRefinedReleasePackingCurrent(rawRead);
 assertInputRetirementLuaCurrent(rawRead);
 assertCurrentReleaseLuaFixtureSources(rawRead);
 assertIntegratedLuaFixturesCurrent(rawRead);
 assertNativeFixturesCurrent(liveRead);
 assertNativeFlowFixturesCurrent(liveRead);
 read=(path,encoding)=>{
  const raw=liveRead(path,encoding);
  // Raw production owners reach their own fresh admission guard unchanged.
  // Only CI and helper receipts need the pure historical source projections.
  if(path.startsWith('src/')||path==='config/architecture.json')return raw;
  const historical=beforeBattlePeriphery(path,beforeChapterBattleScene(path,raw));
  return beforeCalibrationReplay(path,beforeCurrentReplayFixes(path,beforeUiEntranceWitness(path,beforeCurrentReplayCopier(path,historical))));
 };
 const readCurrent=(path,encoding)=>{
  const live=read(path,encoding);
  let raw=beforeNativeFlowFixture(path,live);
  if(path===replayAssetLedger){
   const ledger=beforeDeckBrowserAssetLedger(live);
   assert.notEqual(live,ledger,'fresh complete integration source: '+path);
   raw=beforeReplayArchiveStorage(path,ledger);
   assert.notEqual(ledger,raw,'fresh complete integration source: '+path);
  }
  const priorMerge=beforeDevelopReplayMerge(path,raw);
  if(path==='tests/helpers/copy-integration-source-closure.mjs'||path===epochReplayRuntimePath)
   assert.notEqual(raw,beforeMapRoomReplayCohort(path,raw),'fresh complete integration source: '+path);
  const priorFingerprint=beforeReplayFingerprintSource(path,priorMerge);
  const prior=beforeDevelopEpochReplayRuntime(path,priorFingerprint);
  if(path===epochReplayRuntimePath)assert(raw!==priorFingerprint&&prior!==priorFingerprint,'fresh complete integration source: '+path);
  return beforeIntegrationReplayTests(path,beforeForkFirstCi(path,prior));
 };
 const readBackflow=(path,encoding)=>{
  const source=readCurrent(path,encoding);
  // The merged runtime helper was checked before its exact replay projection.
  if(path===epochReplayRuntimePath)return beforeDevelopBackflow(path,source);
  const production=!path.startsWith('tests/')&&developBackflowOwns(path);
  if(production)assertDevelopBackflowCurrent(path,source);
  const requireCurrent=path.startsWith('scripts/')||(path!==replayAssetLedger&&Object.hasOwn(sourceSuccessors,path));
  const input=production?source:beforeDeckPagesSuiteSource(path,source,{requireCurrent});
  const backflow=authenticateDevelopBackflow(path,input,owner=>readCurrent(owner,'utf8'));
  const deck=production?beforeDeckPagesSuiteSource(path,backflow):backflow;
  return beforeNativeFixtureReplay(path,beforeNativeHostReplay(path,deck));
 };
 const releaseRead=(path,encoding)=>beforeRebasedRelease(path,readBackflow(path,encoding));
 assertReleaseCapacityCohort(releaseRead);
 assertRefinedReleaseSourcesCurrent((path,encoding)=>beforeReleaseCapacitySource(path,shopEntryPreflightRead(releaseRead)(path,encoding)));
 for(const [path,row] of Object.entries(coopLabCi.files)){
  const raw=readBackflow(path,'utf8'),projected=beforeLuaInventoryTest(path,raw);
  if(path===luaInventoryTest)assert.notEqual(projected,raw,'fresh complete integration source: '+path);
  const input=beforeRelicCrystal(path,beforeMapCiSource(path,beforeReleaseUiBuildSource(path,beforeRebasedCi(path,projected))));
  const source=beforeV2UiEvidence(path,beforeTinyHouseIntegratedSource(path,beforeFieldConfirmation(path,beforeRewardScreenCiSource(path,beforeCardFeedbackCiSource(path,input)))));
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===row.afterSha,'fresh complete integration source: '+path);
 }
 for(const [path,sha] of Object.entries(sourceSuccessors)){
  const current=beforeNativeButtonRepairCopier(path,beforeNativeButtonRepair(path,readBackflow(path,'utf8')));
  const source=beforeV2UiAdmission(path,beforeCoopCiSource(path,beforeStsUiCloseoutSource(path,current)));
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===sha,'fresh complete integration source: '+path);
 }
 for(const path of Object.keys(responsiveReplayHelpers))rawRead(path,'utf8');
 return rawRead;
}
// The live planner reads its measured Linux map directly. Historical CI views
// restore each exact predecessor in reverse observation order.
const v220HostedTimingEpochs = [
 ['71c31f96f9578bf8812a802597cd48db5fbbd0aea05999b15ded2f738b41163b','c38fc2ce439ca855b0ea05b795b8e6463b17b001',
  '6756697bac41f5e9081c49a95618f909628aba4ce31e300ae7e0006d16a5eeef','e7e9d43b598b8d91f70fe6b00843874b7702e1cb'],
 ['6756697bac41f5e9081c49a95618f909628aba4ce31e300ae7e0006d16a5eeef','e7e9d43b598b8d91f70fe6b00843874b7702e1cb',
  '8f5644822f365b925cba048ee71a6a1e62a4b1e635074fd05397c792a5d8b961','6b6db60d5e502286e2d0ff670b953c4af1d7d913'],
];
function beforeV220HostedTiming(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const raw=normalize(source);
 let current=raw;
 for(const [sourceSha,sourceBlob,priorSha,priorBlob] of v220HostedTimingEpochs){
  if(hash(current)!==sourceSha||blob(current)!==sourceBlob)continue;
  const value=JSON.parse(current),update=value.jsCalibrationUpdates.pop();
  for(const file of Object.keys(update.weightsMs))delete value.js.linux[file];
  const prior=JSON.stringify(value,null,2)+'\n';
  assert.equal(hash(prior),priorSha,'exact Hosted timing table predecessor');
  assert.equal(blob(prior),priorBlob,path);
  current=prior;
 }
 if(current===raw)return source;
 return source.includes('\r\n')?current.replaceAll('\n','\r\n'):current;
}
export function beforePreflightSource(path,source,view='prior',read=readFileSync){
 source=beforeLocalGilFixture(path,source);
 if(path===replayAssetLedger&&typeof source==='string'){
  const lf=normalize(source);
  if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 }
 source=beforeCursesReceiptFixture(path,source);
 const integratedPrior=beforeRelicCloseoutIntegratedFixture(path,source);
 if(integratedPrior!==source){
  source=integratedPrior;
  const liveRead=read;
  read=(owner,encoding)=>{
   const raw=liveRead(owner,encoding);
   if(owner===integratedFixture)assert(exactCheckoutSource(raw,relicCloseoutIntegratedIdentity),
    'fresh complete integration source: '+owner);
   return beforeRelicCloseoutIntegratedFixture(owner,raw);
  };
 }
 source=beforeV220HostedTiming(path,source);
 const before=beforeBattlePeriphery(path,beforeChapterBattleScene(path,source));
 if(before!==source){
  const liveRead=read;
  const readRaw=(owner,encoding='utf8')=>liveRead(owner,encoding);
  const chapter=chapterBattleSceneReader(path,source,readRaw);
  ({source,read}=battlePeripheryPredecessor(path,chapter.source,chapter.read));
 }
 source=beforeSelectionReceiptSource(path,source);
 source=beforeForkPush(path,beforeCalibrationReplayOwner(path,beforeActorAlphaBuildInput(path,source)));
 if(path==='.github/workflows/quality.yml')source=beforePosixDeadlineWorkflow(beforeWindowsDeadlineWorkflow(source));
 source=beforeUiEntranceWitness(path,beforeCurrentReplayCopier(path,source));
 source=beforeCurrentReplayFixes(path,source);
 source=beforeNativeFlowFixture(path,beforeOfficialAssetsFocusFixture(path,source));
 source=beforeOfficialBackgroundFixture(path,source);
 source=beforeReleaseScriptStaticGate(path,source);
 if(path===replayAssetLedger)source=beforeDeckBrowserAssetLedger(source);
 source=beforeReplayArchiveStorage(path,source);
 source=beforeCalibrationReplay(path,source);
 source=beforeForkFirstCi(path,source);
 source=beforeDevelopReplayMerge(path,source);
 source=beforeReplayFingerprintSource(path,source);
 source=beforeDevelopEpochReplayRuntime(path,source);
 source=beforeDevelopBackflow(path,beforeDeckPagesSuiteSource(path,source));
 source=beforeNativeHostReplay(path,source);
 source=beforeNativeFixtureReplay(path,source);
 source=beforeNativeButtonRepairCopier(path,beforeNativeButtonRepair(path,source));
 source=beforeStsUiCloseoutSource(path,source);
 source=beforeCharacterPreparationCiSource(path,beforeV2UiAdmission(path,beforeCoopCiSource(path,source,read)));
 source=beforeIntegrationSuccessor(path,source);
 // Only the exact flag-registry successor enters the earlier Release witness.
 if(view==='release-bootstrap'&&path==='scripts/ui-profile.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')
  &&hash(normalize(source))==='b45c87c321573e91d3c8e838e837e3db839d79d2758459a67543b763df8c1734'){
  const prior=stsStylePriorRuntime.files[path];
  assert.equal(prior.sha256,'2df6c3fd8f16f41a36db51bd76bdd53f2e805ee92a35ca0d03e91f50d93dfdd3','archived candidate policy predecessor');
  return prior.source;
 }
 const transportRow=Object.hasOwn(transport.files,path)?transport.files[path]:null;
 if(transportRow&&['prior','release-bootstrap'].includes(view)&&typeof source==='string'&&
  !source.includes('\r\r\n')&&hash(normalize(source))===transportRow.currentSha)
  source=source.includes('\r\n')?transportRow.before.replaceAll('\n','\r\n'):transportRow.before;
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(normalize(source))!==(Object.hasOwn(currentHashes,path)?currentHashes[path]:row.currentSha))return source;
 assert(['prior','release-bootstrap'].includes(view),'explicit preflight predecessor view');
 const prior=view==='release-bootstrap'?row.releaseBootstrapBefore?.source:row.before;
 // Newly introduced gates have no historical implementation to invent or hide.
 if(prior===undefined||prior===null)return source;
 const eol=source.includes('\r\n')?'\r\n':'\n';return prior.replaceAll('\n',eol);
}
export function readHistoricalPreflightInput(path,encoding,read=readFileSync){
 try{return read(path,encoding);}catch(error){
  if(error.code!=='ENOENT'||!Object.hasOwn(archiveFiles,path))throw error;
  const row=archiveFiles[path].current,source=readRetiredInputLuaReceipt(path,row?.sha256,read,row);
  if(source===undefined)throw error;
  return encoding?source:Buffer.from(source);
 }
}
export function preflightPriorRead(read=readFileSync,view='prior'){return(path,encoding)=>{
 const raw=readHistoricalPreflightInput(path,encoding,read);
 if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8'),prior=beforePreflightSource(path,text,view,read);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
