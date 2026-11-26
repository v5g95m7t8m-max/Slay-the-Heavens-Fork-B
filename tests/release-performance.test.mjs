import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {resourceResultStatus} from '../scripts/runtime-baseline/resource-receipt.mjs';
import {verifyGilBgmSource} from '../scripts/runtime-baseline/gil-inputs.mjs';
import {resolvePublishedBaseline} from '../scripts/runtime-baseline/published-baseline.mjs';
import {frozenReleaseVersion, verifyAuditedBuild, verifyResourceReport as verifyFormalReport} from '../scripts/runtime-baseline/verify-release-performance.mjs';

import {head, tree, published, sha256, receipt, reportFixture} from './helpers/release-performance-fixture.mjs';

const verifyResourceReport = (report, sourceCommit, sourceTree, reference, build) =>
  verifyFormalReport(report, sourceCommit, sourceTree, reference, build, sha256);

test('accepts six formal paired tiers from the exact release and published builds', () => {
  assert.deepEqual(verifyResourceReport(reportFixture(), head, tree, published, receipt), {});
});

test('requires the Act II workload in both paired arms and the supported recovery', () => {
  for (const arm of ['candidate', 'baseline', 'recovery']) {
    const report = reportFixture();
    const sample = arm === 'recovery' ? report.extreme.recovery.sample : report.results.stress[arm].samples[0];
    delete sample.act2;
    assert.throws(() => verifyResourceReport(report, head, tree, published, receipt), /Missing Act II workload/);
  }
  const missingPhase = reportFixture();
  const act2 = missingPhase.results.stress.candidate.samples[0].act2;
  act2.rows = act2.rows.filter(row => row.phase !== 'act2-overlapping-effects');
  assert.throws(() => verifyResourceReport(missingPhase, head, tree, published, receipt), /missing\/reordered runtime phase/);
});

test('rejects weaker Act II proof, reuse and hidden regressions', () => {
  const wrongArm = reportFixture();
  wrongArm.results.stress.candidate.samples[0].act2.runtime = wrongArm.baseline.runtime;
  assert.throws(() => verifyResourceReport(wrongArm, head, tree, published, receipt), /did not execute its exact GIL/);
  const differentCaps = reportFixture();
  differentCaps.results.baseline.candidate.samples[0].act2.resources.cpuMax = 'max 200000';
  assert.throws(() => verifyResourceReport(differentCaps, head, tree, published, receipt), /Act II and core measured cgroup limits differ/);
  const reusedId = reportFixture();
  const sample = reusedId.results.stress.candidate.samples[0];
  sample.act2.executionId = sample.executionId;
  assert.throws(() => verifyResourceReport(reusedId, head, tree, published, receipt), /execution is missing or duplicated/);
  const missingScene = reportFixture();
  delete missingScene.extreme.recovery.sample.act2.scenario.sceneSlots;
  assert.throws(() => verifyResourceReport(missingScene, head, tree, published, receipt), /Missing measured Act II scene/);
  const cleared = reportFixture();
  for (const pair of cleared.results.stress.candidate.samples) pair.act2.rows[5].elapsedMs *= 2;
  assert.throws(() => verifyResourceReport(cleared, head, tree, published, receipt), /signals differ from samples/);
});

test('requires the approved V3 scene for the candidate and recovery, and still accepts the published shared scene', () => {
  for (const sceneSlots of [0, 1, 248, 250]) {
    for (const arm of ['candidate', 'recovery']) {
      const report = reportFixture();
      const sample = arm === 'recovery' ? report.extreme.recovery.sample : report.results.stress.candidate.samples[0];
      sample.act2.scenario.sceneSlots = sceneSlots;
      assert.throws(() => verifyResourceReport(report, head, tree, published, receipt), /scene differs from approved slot count/);
    }
  }
  const modernBaseline = reportFixture();
  for (const tier of Object.values(modernBaseline.results)) {
    for (const sample of tier.baseline.samples) sample.act2.scenario.sceneSlots = 249;
  }
  assert.deepEqual(verifyResourceReport(modernBaseline, head, tree, published, receipt), {});
});

test('rejects the wrong published source, release tree, missing tier, or changed art profile', () => {
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, commit:tree}, receipt), /published build source/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, commit:head}, receipt), /distinct previously published/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, head, published, receipt), /frozen source tree/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, {...published, tree}, receipt), /published build tree/);
  const report = reportFixture();
  delete report.results.light;
  assert.throws(() => verifyResourceReport(report, head, tree, published, receipt), /coverage is incomplete/);
  assert.throws(() => verifyResourceReport(reportFixture(), head, tree, published, {...receipt, artFeatures:{flags:{}}}), /art flags differ/);
});

test('rejects regenerated, swapped, altered and unexecuted GIL payloads', () => {
  const regenerated = reportFixture();
  delete regenerated.candidate.runtime;
  assert.throws(() => verifyResourceReport(regenerated, head, tree, published, receipt), /GIL readback required/);
  const swapped = reportFixture();
  swapped.baseline.runtime.gilSha256 = swapped.candidate.runtime.gilSha256;
  assert.throws(() => verifyResourceReport(swapped, head, tree, published, receipt), /GIL readback required/);
  const swappedAudio = reportFixture();
  swappedAudio.baseline.runtime.bgmSourceCommit = swappedAudio.candidate.commit;
  assert.throws(() => verifyResourceReport(swappedAudio, head, tree, published, receipt), /BGM source differs/);
  const changed = reportFixture();
  changed.candidate.runtime.moduleDigestsSha256 = sha256;
  assert.throws(() => verifyResourceReport(changed, head, tree, published, receipt), /inventory differs/);
  const missing = reportFixture();
  delete missing.results.baseline.candidate.samples[0].runtime;
  assert.throws(() => verifyResourceReport(missing, head, tree, published, receipt), /did not execute/);
  const different = reportFixture();
  different.results.baseline.baseline.samples[0].artFeatures.monsters = false;
  assert.throws(() => verifyResourceReport(different, head, tree, published, receipt), /measured art flags differ/);
});

test('rejects weaker limits and cleared performance signals', () => {
  const wrongLimit = reportFixture();
  wrongLimit.results.stress.candidate.samples[0].resources.cpuMax = 'max 100000';
  assert.throws(() => verifyResourceReport(wrongLimit, head, tree, published, receipt), /CPU quota mismatch/);
  const restricted = reportFixture();
  restricted.results.baseline.candidate.samples[0].resources.memoryMax = '1073741824';
  assert.throws(() => verifyResourceReport(restricted, head, tree, published, receipt), /unrestricted memory tier/);
  const order = reportFixture();
  order.results.stress.pairOrder[1].reverse();
  assert.throws(() => verifyResourceReport(order, head, tree, published, receipt), /execution order differs/);
  const drift = reportFixture();
  drift.results.stress.candidate.samples[0].resources.oom = 1;
  assert.throws(() => verifyResourceReport(drift, head, tree, published, receipt), /OOM during the workload/);
  const cleared = reportFixture();
  for (const sample of cleared.results.stress.candidate.samples) sample.rows[1].elapsedMs *= 2;
  assert.throws(() => verifyResourceReport(cleared, head, tree, published, receipt), /signals differ from samples/);
});

test('binds strict audio audit to the frozen receipt and downloaded bytes', () => {
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const gil = Buffer.from('fixture');
  const candidateSha256 = digest(gil);
  const buildId = '29f48ea1-fa9d-4f76-b124-2bffc83f7594';
  const candidate = Buffer.from(JSON.stringify({
    sourceCommit:head, sourceDirty:false, buildId, candidate:{sha256:candidateSha256, bytes:gil.length},
    payloadDigest:sha256, release:{notesSha256:sha256},
  }));
  const audit = {
    ok:true, sourceCommit:head, liveWriteEnabled:false, candidate:{sha256Before:candidateSha256, sha256After:candidateSha256},
    buildMarker:{buildId, candidateSha256, receiptSha256:digest(candidate)}, expectedGraphs:[{name:'_GSTS_ABYSS_BGM'}],
  };
  assert.equal(verifyAuditedBuild(gil, candidate, audit, head).gilSha256, candidateSha256);
  assert.throws(() => verifyAuditedBuild(Buffer.from('tampered'), candidate, audit, head), /GIL bytes do not match/);
  assert.throws(() => verifyAuditedBuild(gil, Buffer.concat([candidate, Buffer.from('\n')]), audit, head), /strict audio audit required/);
  assert.throws(() => verifyAuditedBuild(gil, candidate, {...audit, expectedGraphs: []}, head), /strict audio audit required/);
});

test('requires an independent extreme failure and a later supported recovery sample', () => {
  const missing = reportFixture();
  delete missing.extreme;
  assert.throws(() => verifyResourceReport(missing, head, tree, published, receipt), /extreme failure and recovery proof/);
  const unbounded = reportFixture();
  unbounded.extreme.probe.state.OOMKilled = false;
  assert.throws(() => verifyResourceReport(unbounded, head, tree, published, receipt), /bounded cgroup OOM/);
  const altered = reportFixture();
  altered.extreme.probe.stdout = altered.extreme.probe.stdout.replace('memory.swap.max 0', 'memory.swap.max max');
  assert.throws(() => verifyResourceReport(altered, head, tree, published, receipt), /raw cgroup readback/);
  const early = reportFixture();
  early.extreme.recovery.recordedAt = '2026-11-25T11:01:30Z';
  assert.throws(() => verifyResourceReport(early, head, tree, published, receipt), /follow the observed extreme failure/);
  const same = reportFixture();
  same.extreme.recovery.sample.executionId = same.extreme.probe.executionId;
  assert.throws(() => verifyResourceReport(same, head, tree, published, receipt), /execution is missing or duplicated/);
});

test('formal collection fails closed and its verifier requires the frozen version, engine and workload', () => {
  assert.equal(resourceResultStatus({release:true, pass:true, paired:false, signals:false}), 'FAIL');
  assert.equal(resourceResultStatus({release:true, pass:true, paired:true, signals:true}), 'REVIEW_REQUIRED');
  assert.equal(resourceResultStatus({release:false, pass:true, paired:false, signals:true}), 'PASS');
  const frozen = '{"version":"2.2.0"}';
  const receiptVersion = {release:{version:'v2.2.0'}};
  assert.equal(frozenReleaseVersion(receiptVersion, frozen, frozen), '2.2.0');
  assert.throws(() => frozenReleaseVersion(receiptVersion, frozen, '{"version":"2.0.0"}'), /versions differ/);
  const wrongEngine = reportFixture();
  wrongEngine.engine.productionHeapMiB = 1024;
  assert.throws(() => verifyResourceReport(wrongEngine, head, tree, published, receipt), /engine or heap differs/);
  const wrongImage = reportFixture();
  wrongImage.engine.imageId = `sha256:${sha256}`;
  assert.throws(() => verifyResourceReport(wrongImage, head, tree, published, receipt), /engine or heap differs/);
  const wrongWorkload = reportFixture();
  wrongWorkload.candidate.workloadSha256 = wrongWorkload.baseline.workloadSha256 = '7'.repeat(64);
  assert.throws(() => verifyResourceReport(wrongWorkload, head, tree, published, receipt), /workload differs from the frozen source/);
});

test('resolves historical publication source and actual annotation tree independently', async () => {
  const tagObject = '43532708d2629200ea1541b49b8a02b7dc6c30da';
  const filename = 'slay-the-heavens-v2.1.1-2026-11-25.gil';
  const receipt = Buffer.from(JSON.stringify({version:'v2.1.1', sourceDirty:false, sourceCommit:published.commit, sha256, filename}));
  const release = {
    id:458194023, draft:false, prerelease:false, tag_name:'v2.1.1', html_url:'https://github.com/example',
    target_commitish:head,
    body:[
      '正式构建源码 `' + published.commit + '`',
      'SHA-256 `' + sha256 + '`',
      'blob/3f79269e90a8f2507f6782135563ecf573b357d7/docs/evidence/v2.1.1-2026-11-25/' + filename,
    ].join('\n'),
  };
  const response = new Map([
    ['/releases?per_page=100&page=1', [release]],
    ['/contents/docs/evidence/v2.1.1-2026-11-25/build-receipt.json?ref=3f79269e90a8f2507f6782135563ecf573b357d7',
      {encoding:'base64', content:receipt.toString('base64')}],
    ['/git/ref/tags/v2.1.1', {ref:'refs/tags/v2.1.1', object:{type:'tag', sha:tagObject}}],
    ['/git/tags/' + tagObject, {sha:tagObject, tag:'v2.1.1', object:{type:'commit', sha:head}}],
    ['/git/commits/' + published.commit, {sha:published.commit, tree:{sha:published.tree}}],
    ['/git/commits/' + head, {sha:head, tree:{sha:published.tree}}],
  ]);
  const request = async path => response.get(path.replace('/repos/FurinyaWorks/Slay-the-Heavens', ''));
  assert.deepEqual(await resolvePublishedBaseline('2.2.0', request), {
    ...published, version:'2.1.1', gilSha256:sha256, source:release.html_url, releaseId:release.id,
  });
  response.set('/git/commits/' + head, {sha:head, tree:{sha:tree}});
  await assert.rejects(resolvePublishedBaseline('2.2.0', request), /actual build source trees differ/);
});

test('chooses the latest confirmed prior engineering Release and authenticates its asset digest', async () => {
  const tagObject = 'a'.repeat(40);
  const comparison = {
    id:22, draft:false, prerelease:false, tag_name:'engine-v2.2.0', html_url:'https://github.com/confirmed',
    assets:[{state:'uploaded', name:'candidate.gil', digest:'sha256:' + sha256}],
    body:['<!-- release-metadata:v1 -->', '```json', JSON.stringify({
      version:'2.2.0', platform_version:'2.03', release_type:'minor', commit:published.commit,
      platform_evidence:'https://example.com/published', artifact:{name:'candidate.gil', sha256},
    }), '```'].join('\n'),
  };
  const unconfirmed = {
    ...comparison, id:23, tag_name:'engine-v2.2.1',
    body:comparison.body.replace('"2.2.0"', '"2.2.1"').replace('"2.03"', 'null').replace('"minor"', '"patch"'),
  };
  const response = new Map([
    ['/releases?per_page=100&page=1', [unconfirmed, comparison]],
    ['/git/ref/tags/engine-v2.2.0', {ref:'refs/tags/engine-v2.2.0', object:{type:'tag', sha:tagObject}}],
    ['/git/tags/' + tagObject, {sha:tagObject, tag:'engine-v2.2.0', object:{type:'commit', sha:published.commit}}],
    ['/git/commits/' + published.commit, {sha:published.commit, tree:{sha:published.tree}}],
  ]);
  const request = async path => response.get(path.replace('/repos/FurinyaWorks/Slay-the-Heavens', ''));
  assert.equal((await resolvePublishedBaseline('2.3.0', request)).releaseId, 22);
  comparison.assets[0].digest = 'sha256:' + '1'.repeat(64);
  await assert.rejects(resolvePublishedBaseline('2.3.0', request), /asset digest does not match/);
});

const oldCues = {map:10040, battle:10044, elite:10071, boss:10140, victory:10152, defeat:10179};
const withMenu = {menu:10041, ...oldCues};
const oldSha256 = 'a'.repeat(64);
const newSha256 = 'b'.repeat(64);
const signals = cues => [...Object.keys(cues), 'stop'].map(cue => `ABYSS_BGM_${cue.toUpperCase()}`);
const embedded = cues => 'return {' + signals(cues).map(signal => JSON.stringify(signal)).join(',') + '}';
const inspection = (cues, sha256) => ({
  sha256, graphs:[{name:'_GSTS_ABYSS_BGM', nodeCount:1}], signals:signals(cues).map(name => ({name})),
});

test('use each measured arm’s committed BGM inventory and require all of its bundled signals', t => {
  const directory = mkdtempSync(join(tmpdir(), 'resource-bgm-arms-'));
  t.after(() => rmSync(directory, {recursive:true, force:true}));
  const candidate = join(directory, 'candidate');
  const baseline = join(directory, 'baseline');
  const config = 'data/presentation/native_bgm.json';
  mkdirSync(join(candidate, 'data/presentation'), {recursive:true});
  const git = (...args) => execFileSync('git', [...args], {cwd:candidate, encoding:'utf8', timeout:10_000}).trim();
  const writeCueFile = cues => writeFileSync(join(candidate, config), JSON.stringify({
    cues:Object.fromEntries(Object.entries(cues).map(([name, id]) => [name, {id}])),
  }));
  const commit = cues => {
    writeCueFile(cues);
    git('add', config);
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.org', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'audio inventory');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q');
  const oldHead = commit(oldCues);
  const newHead = commit(withMenu);
  git('worktree', 'add', '-q', '--detach', baseline, oldHead);

  assert.equal(verifyGilBgmSource(baseline, embedded(oldCues), inspection(oldCues, oldSha256), oldSha256), oldHead);
  assert.equal(verifyGilBgmSource(candidate, embedded(withMenu), inspection(withMenu, newSha256), newSha256), newHead);
  assert.throws(() => verifyGilBgmSource(candidate, embedded(withMenu), inspection(oldCues, newSha256), newSha256), /full audio graph and cue signals/);
  assert.throws(() => verifyGilBgmSource(candidate, embedded(oldCues), inspection(oldCues, oldSha256), oldSha256), /Embedded BGM cue inventory differs/);
  assert.throws(() => verifyGilBgmSource(baseline, embedded(withMenu), inspection(withMenu, newSha256), newSha256), /Embedded BGM cue inventory differs/);
  assert.throws(() => verifyGilBgmSource(baseline, embedded(oldCues), inspection(oldCues, newSha256), oldSha256), /full audio graph and cue signals/);
  writeCueFile(oldCues);
  assert.throws(() => verifyGilBgmSource(candidate, embedded(withMenu), inspection(oldCues, newSha256), newSha256), /full audio graph and cue signals/);
  assert.throws(() => verifyGilBgmSource(join(baseline, 'data'), embedded(oldCues), inspection(oldCues, oldSha256), oldSha256), /measured arm worktree root/);
});
