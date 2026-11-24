import { assertCurrentUiEntrance, entrancePredecessor } from './ui-entrance-source.mjs';
import {assertCurrentDevelopUiSource,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {assertDevelopBackflowCurrent,authenticateDevelopBackflow,developBackflowOwns} from './develop-release-backflow-source.mjs';
import {beforeSlimeSplitReceipt,slimeSplitSourcePaths} from './slime-split-source.mjs';
import {beforeStsSelectionFade,beforeAuthenticatedStsSelectionFade} from './sts-selection-fade-source.mjs';
import {authorizeRebasedDevelop,beforeRebasedCi,rebasedDevelopOwns} from './rebased-release-source.mjs';
import {authorizeCardFeedbackOwners,beforeCardFeedbackOwner,cardFeedbackOwnerPaths} from './card-feedback-owner-source.mjs';
import {authorizeSts1MapSource,beforeSts1MapSource,sts1MapSourcePaths} from './sts1-map-source.mjs';
import {beforeReleaseGuideSource,beforeAuthenticatedReleaseGuideSource,releaseGuideSourcePaths} from './release-guide-backflow-source.mjs';
import {beforeAuthenticatedM05ShopSource,beforeM05ShopSource,m05ShopSourcePaths} from './m05-shop-source.mjs';
import {beforeAuthenticatedPc13RewardCover,beforePc13RewardCover,pc13RewardCoverSourcePaths,beforeRewardTransitionSource,rewardTransitionSourcePaths} from './pc13-reward-cover-source.mjs';
import {beforeTinyHouseUiSource,tinyHouseUiSourcePaths} from './tiny-house-ui-source.mjs';
import {beforePotionPointerSource,potionPointerSourcePaths} from './potion-pointer-source.mjs';
import {beforeV2UiHudSource,v2UiHudSourcePaths} from './v2-ui-hud-source.mjs';
import {beforeLumineSource,luminePortraitSourcePath} from './lumine-portrait-source.mjs';
import {beforeSelectorSource,selectorSourcePair} from './character-selector-source.mjs';
import {beforePotionTextSource,potionTextSourcePair} from './potion-text-source.mjs';
import {beforeFatalBgmSource,fatalBgmPair} from './fatal-bgm-source-continuation.mjs';
import {beforeEndingTerminalSource,endingTerminalSourcePath} from './ending-terminal-source.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const normalize = text => text.replaceAll('\r\n', '\n');
const digest = value => createHash('sha256').update(value).digest('hex');
const archive = readFileSync(new URL('./character-preparation-source.json.gz', import.meta.url));
assert.equal(digest(archive), 'a3d61ed1e47036e5288cc4bc673388065ee0ace71497cba74da5b669a0a16790', 'complete character preparation source continuation');
const packet = JSON.parse(gunzipSync(archive));
assert.equal(packet.characterSourceCommit, '22cb2d47cdd3a1a06eef4b10afd69fc538398fdf');
for (const row of Object.values({...packet.production, ...packet.suite})) {
  assert.match(row.after, /^[a-f0-9]{64}$/);
  assert.equal(digest(row.before), row.beforeSha);
}
export const characterPreparationOwners = Object.freeze(Object.keys(packet.production));
const readRaw = path => readFileSync(path, 'utf8');

export function assertCharacterPreparationSources(read = readRaw) {
  for (const path of characterPreparationOwners) {
    const source = read(path);
    assert(typeof source === 'string' && !source.includes('\r\r\n') &&
      digest(normalize(source)) === packet.production[path].after, 'fresh character preparation source: '+path);
  }
}

// Only authenticated current admission sources may replay earlier receipts.
const admissionSources=Object.freeze({
  "src/lua/abyss_map.lua": [
    "71f7e26cfea9410137f4df1473bcd39ceee8950fd50a878159557889b78953ad",
    "52d311bc4a863303906dfa3a29d65bc11606eda30759a560ed80266381900810"
  ],
  "src/lua/abyss_treasure_source.lua": [
    "54d0acda4504e6af9edb284fbcaa3b1d9058e1e4268b27204d4a8bbe395f8c6a",
    "44ae73c0d996c4f336d18f225a44466c73db6db85921f1eca28c00865f8601da"
  ],
  "src/lua/abyss_wheel_event.lua": [
    "c35ece2bddd6a950fd68b5b615f328f8a126d039b22fa977f57a0bab9068d4b7",
    "f775746a95c2f33eeb9a5d7c688c536b3dd0b6b3ddefeb3455fbd28468f6bc2c"
  ],
  "src/lua/abyss_winding_event.lua": [
    "687e186a65de0153769a1515a46f35cb289e8a5b6b06be91179661d696d9453c",
    "1f3a5d5f40847660638443ac9c553065b1e8cec03bb523882d235d4271daebaa"
  ]
});
let admissionBefore;
function beforeAdmissionReceipt(path,source,read){
  if(!Object.hasOwn(admissionSources,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
  const [after,before]=admissionSources[path];
  if(digest(normalize(source))!==after)return source;
  const live=read(path);
  assert(typeof live==='string'&&!live.includes('\r\r\n')&&digest(normalize(live))===after,
    'fresh admission receipt source: '+path);
  if(!admissionBefore){
    const bytes=readFileSync(new URL('../fixtures/architecture-admission-before.json.gz',import.meta.url));
    assert.equal(digest(bytes),'93c84b252594eb1362c2bdb5a46cf5c82b7c05129df6d0695dd9e7fd79f2ca42','complete historical admission receipt sources');
    const evidence=JSON.parse(gunzipSync(bytes));
    assert.equal(evidence.revision,'c2409ad750c15124b7b843c6bbfa5b222537cb75');
    admissionBefore=Object.freeze(evidence.sources);
  }
  const prior=admissionBefore[path.slice(8,-4)];
  assert.equal(digest(prior),before,'complete admission predecessor: '+path);
  return prior;
}

// The old timing/production receipts continue to replay their exact source view.
// Unknown bytes are left visible and both current owners are checked on every projection.
export function beforeCharacterPreparationSource(path, source, read = readRaw) {
  ({source,read}=entrancePredecessor(path,source,read));
  source=authenticateDevelopBackflow(path,source,read);
  const readBackflow=read;
  read=owner=>authenticateDevelopBackflow(owner,
    owner===retiredControllerPath?readRetiredController(readBackflow).source:readBackflow(owner),readBackflow);
  const rebound=beforeRebasedCi(path,source);
  if(rebound!==source)authorizeRebasedDevelop([[path,source]],read);
  source=rebound;
  const readRebased=read;
  read=owner=>beforeRebasedCi(owner,readRebased(owner));
  source=beforeAuthenticatedStsSelectionFade(path,source,read);
  const fadeRead=read;read=owner=>beforeStsSelectionFade(owner,fadeRead(owner));
  source = beforeSlimeSplitReceipt(path,source,read);
  const cardPrior = beforeCardFeedbackOwner(path,source);
  if (cardPrior !== source) authorizeCardFeedbackOwners([[path,source]],read);
  source = cardPrior;
  const readCardFeedbackCurrent=read;
  read=owner=>beforeCardFeedbackOwner(owner,readCardFeedbackCurrent(owner));
  const mapPrior = beforeSts1MapSource(path,source);
  if (mapPrior !== source) authorizeSts1MapSource([[path,source]],read);
  source = mapPrior;
  const readMapCurrent=read;
  read=owner=>beforeSts1MapSource(owner,readMapCurrent(owner));
  source = beforeAuthenticatedReleaseGuideSource(path,source,read);
  const readGuideCurrent=read;
  read=owner=>beforeReleaseGuideSource(owner,readGuideCurrent(owner));
  source = beforeAdmissionReceipt(path,source,read);
  source = beforeAuthenticatedM05ShopSource(path,source,read);
  const readM05Current=read;
  read=owner=>beforeM05ShopSource(owner,readM05Current(owner));
  source = beforeAuthenticatedPc13RewardCover(path,source,read);
  const readCurrent=read;
  read=owner=>beforePc13RewardCover(owner,readCurrent(owner));
  source = beforeTinyHouseUiSource(path, source, read);
  source = beforePotionPointerSource(path, source, read);
  source = beforeV2UiHudSource(path, source, read);
  if (!Object.hasOwn(packet.production, path)) {
    source = beforePotionTextSource(path, beforeSelectorSource(path, source, read), read);
    source = beforeLumineSource(path, source, read);
    return beforeEndingTerminalSource(path, beforeFatalBgmSource(path, source, read), read);
  }
  if (typeof source !== 'string' || source.includes('\r\r\n')) return source;
  const row = packet.production[path];
  if (digest(normalize(source)) !== row.after) return source;
  assertCharacterPreparationSources(read);
  return row.before;
}

const currentContinuationOwners = new Set([
  ...Object.keys(admissionSources), ...slimeSplitSourcePaths,
  ...characterPreparationOwners, ...v2UiHudSourcePaths, selectorSourcePair.path, potionTextSourcePair.path,
  fatalBgmPair.path, endingTerminalSourcePath, luminePortraitSourcePath, ...potionPointerSourcePaths, ...tinyHouseUiSourcePaths, ...pc13RewardCoverSourcePaths, ...m05ShopSourcePaths,
]);

export function beforeCurrentProductionSource(path, source, read = readRaw) {
  assertCurrentUiEntrance(path,source);
  const entranceInput=source;
  ({source,read}=entrancePredecessor(path,source,read));
  // The entrance owner was freshly authenticated before restoring its older view.
  // That predecessor predates the current develop cover and is not a live owner.
  if(path!=='src/lua/abyss_game_ui_view.lua'||source===entranceInput)
    assertCurrentDevelopUiSource(path,source,read);
  if(developBackflowOwns(path)){
    assertDevelopBackflowCurrent(path,source);
    return beforeCharacterPreparationSource(path,source,read);
  }
  if(rebasedDevelopOwns(path)){
    assert.notEqual(beforeRebasedCi(path,source),source,'fresh current production owner: '+path);
    return beforeCharacterPreparationSource(path,source,read);
  }
  if (cardFeedbackOwnerPaths.includes(path)) {
    assert.notEqual(beforeCardFeedbackOwner(path,source),source, 'fresh current production owner: '+path);
    return beforeCharacterPreparationSource(path,source,read);
  }
  if (sts1MapSourcePaths.includes(path)) {
    assert.notEqual(beforeSts1MapSource(path,source),source, 'fresh current production owner: '+path);
    return beforeCharacterPreparationSource(path,source,read);
  }
  if (rewardTransitionSourcePaths.includes(path)) {
    assert.notEqual(beforeRewardTransitionSource(path,source),source, 'fresh current production owner: '+path);
    return beforeCharacterPreparationSource(path,source,read);
  }
  if (releaseGuideSourcePaths.includes(path)) {
    assert.notEqual(beforeReleaseGuideSource(path,source),source, 'fresh current production owner: '+path);
    return beforeCharacterPreparationSource(path,source,read);
  }
  // A historic successor may still be recognised by an older projector; that
  // must not let it claim the latest PC13 identity at this current-only entry.
  if (pc13RewardCoverSourcePaths.includes(path)) {
    assert.notEqual(beforePc13RewardCover(path,source),source, 'fresh current production owner: '+path);
  }
  const prior = beforeCharacterPreparationSource(path, source, read);
  if (currentContinuationOwners.has(path)) {
    assert.notEqual(prior, source, 'fresh current production owner: '+path);
  }
  return prior;
}

export function beforeCharacterPreparationCiSource(path, source) {
  source=beforeStsSelectionFade(path,source);
  if (!Object.hasOwn(packet.suite, path) || typeof source !== 'string' || source.includes('\r\r\n')) return source;
  const row = packet.suite[path];
  const sha = digest(normalize(source));
  const calibration = path === 'tests/ci-complete-calibration.test.mjs' &&
    sha === '0581fa1b5e5e7735a85337a02c7ad9a5826cc59c36b56d4233da1d34924ad268';
  if (sha !== row.after && !calibration) return source;
  return source.includes('\r\n') ? row.before.replaceAll('\n','\r\n') : row.before;
}
