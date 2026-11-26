import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSample} from '../benchmark-runtime-path.mjs';
import {compareSamples, formalImageId, guardExtremeCgroup, matchingResourceCaps, parseResources, profiles, productionHeapMiB,
  productionReportKind, productionWorkload, resourceImage, workloadIdentity} from './resource-receipt.mjs';
import {act2ProductionPhases, formalAct2SceneSlots, productionPhases} from './production-inputs.mjs';
import {resolvePublishedBaseline} from './published-baseline.mjs';
import {gilModuleInventoryHash, gilRuntimeKind} from './gil-inputs.mjs';
import {encoderSha256, toolCommit} from '../gil-candidate-preflight.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;

export function verifyAuditedBuild(gilBytes, receiptBytes, audit, sourceCommit) {
  const receipt = JSON.parse(receiptBytes);
  const gilSha256 = sha256(gilBytes);
  assert.equal(gilSha256, receipt.candidate?.sha256, 'Final GIL bytes do not match the build receipt');
  assert.equal(gilBytes.length, receipt.candidate?.bytes, 'Final GIL size differs from the build receipt');
  assert(receipt.sourceCommit === sourceCommit && receipt.sourceDirty === false && hash.test(receipt.payloadDigest) &&
    hash.test(receipt.release?.notesSha256) && /^[a-f0-9-]{36}$/.test(receipt.buildId), 'Frozen release candidate receipt required');
  assert(audit.ok === true && audit.sourceCommit === sourceCommit && audit.liveWriteEnabled === false &&
    audit.candidate?.sha256Before === gilSha256 && audit.candidate?.sha256After === gilSha256 &&
    audit.buildMarker?.buildId === receipt.buildId && audit.buildMarker?.candidateSha256 === gilSha256 &&
    audit.buildMarker?.receiptSha256 === sha256(receiptBytes) &&
    audit.expectedGraphs?.some(graph => graph.name === '_GSTS_ABYSS_BGM'), 'Same-package strict audio audit required');
  return {receipt, gilSha256};
}

export function frozenReleaseVersion(receipt, checkoutPackage, currentPackage) {
  const {version} = JSON.parse(checkoutPackage);
  assert('v' + version === receipt.release?.version && version === JSON.parse(currentPackage).version,
    'Frozen source and release receipt versions differ');
  return version;
}

function verifySample(sample, profile, executions, runtime, artFeatures, phases = productionPhases) {
  validateSample(sample, phases);
  assert.deepEqual(sample.runtime, runtime, 'Sample did not execute its exact GIL readback');
  assert.deepEqual(sample.artFeatures, artFeatures, 'GIL and measured art flags differ');
  assert(Number.isFinite(sample.wallMs) && sample.wallMs > 0, 'Missing sample wall time');
  assert(/^[a-f0-9]{12}$/.test(sample.executionId) && !executions.has(sample.executionId), 'Sample execution is missing or duplicated');
  executions.add(sample.executionId);
  const caps = sample.resources;
  if (profile.cpus === null) assert.match(caps.cpuMax, /^max /, 'Expected the unrestricted CPU tier');
  if (profile.memoryBytes === null) assert.equal(caps.memoryMax, 'max', 'Expected the unrestricted memory tier');
  parseResources([
    ['cpu.max', caps.cpuMax], ['memory.max', caps.memoryMax], ['memory.swap.max', caps.swapMax],
    ['memory.events.oom', caps.oom], ['memory.events.oom_kill', caps.oomKill], ['memory.peak', caps.peakBytes],
    ['cpu.usage_usec', caps.cpuUsageUsec], ['cpu.nr_periods', caps.cpuPeriods],
    ['cpu.nr_throttled', caps.throttledPeriods], ['cpu.throttled_usec', caps.throttledUsec],
  ].map(([key, value]) => `RESOURCE ${key} ${value}`).join('\n'), profile);
}

function verifyCompleteSample(sample, profile, executions, runtime, artFeatures, requireChapterScene = false) {
  verifySample(sample, profile, executions, runtime, artFeatures);
  assert(sample.act2, 'Missing Act II workload in formal Host sample');
  verifySample(sample.act2, profile, executions, runtime, artFeatures, act2ProductionPhases);
  assert(matchingResourceCaps([sample], [sample.act2]), 'Act II and core measured cgroup limits differ');
  const {sceneSlots, openingTurnFrames, attackTurnFrames} = sample.act2.scenario ?? {};
  assert(Number.isSafeInteger(sceneSlots) && sceneSlots >= 0 &&
    [openingTurnFrames, attackTurnFrames].every(frames => Number.isInteger(frames) && frames > 0 && frames <= 360),
  'Missing measured Act II scene and turn evidence');
  if (requireChapterScene) assert.equal(sceneSlots, formalAct2SceneSlots,
    'Formal candidate Act II scene differs from approved slot count');
}

function verifyExtreme(extreme, candidate, executions, artFeatures) {
  assert(extreme?.status === 'PASS' && extreme.probe && extreme.recovery, 'Independent extreme failure and recovery proof required');
  assert.deepEqual(extreme.candidate, candidate, 'Extreme probe and formal source/configuration differ');
  const {containerId, executionId, resources, state, stdout} = extreme.probe;
  assert(/^[a-f0-9]{64}$/.test(containerId) && containerId.slice(0, 12) === executionId &&
    stdout.split('\n').filter(line => line === 'RESOURCE_EXECUTION_ID ' + executionId).length === 1 &&
    !executions.has(executionId), 'Extreme Docker execution identity missing or duplicated');
  executions.add(executionId);
  guardExtremeCgroup(resources, state);
  for (const [key, value] of [['cpu.max', resources.cpuMax], ['memory.max', resources.memoryMax], ['memory.swap.max', resources.swapMax]]) {
    const lines = stdout.split('\n').filter(line => line.startsWith('RESOURCE ' + key + ' '));
    assert.deepEqual(lines, ['RESOURCE ' + key + ' ' + value], 'Extreme raw cgroup readback differs');
  }
  assert(Date.parse(extreme.recovery.recordedAt) >= Date.parse(state.FinishedAt), 'Recovery must follow the observed extreme failure');
  verifyCompleteSample(extreme.recovery.sample, profiles.stress, executions, candidate.runtime, artFeatures, true);
}

function verifyRuntime(runtime, gilSha256, sourceCommit) {
  assert(runtime?.kind === gilRuntimeKind && hash.test(gilSha256) && runtime.gilSha256 === gilSha256,
    'Exact audited and published GIL readback required for both arms');
  assert.equal(runtime.bgmSourceCommit, sourceCommit, 'BGM source differs from the measured arm');
  assert(runtime.readerCommit === toolCommit && runtime.encoderSha256 === encoderSha256 &&
    Number.isSafeInteger(runtime.moduleCount) && runtime.moduleCount > 0 && hash.test(runtime.moduleDigestsSha256) &&
    Number.isSafeInteger(runtime.templateCount) && runtime.templateCount > 0 && runtime.nativeBgmEnabled === true &&
    Object.keys(runtime.fixtureDigests ?? {}).length === 3 &&
    ['abyss_ui_layout','abyss_ui_templates','performance_templates'].every(name => hash.test(runtime.fixtureDigests[name])),
  'Native script, UI, template or audio readback identity is incomplete');
}

export function verifyResourceReport(report, sourceCommit, sourceTree, published, receipt, expectedWorkload) {
  assert(report.schemaVersion === 1 && report.release === true && report.kind === productionReportKind,
    'Formal production release resource report required');
  assert.equal(report.status, 'PASS', 'Resource workload failed');
  assert.equal(report.mode, 'full', 'All six tiers required');
  assert.equal(report.comparisonStatus, 'PAIRED', 'Same-workload cgroup pairs required');
  assert(report.seed === 42 && report.alertPercent === 20 && Number.isInteger(report.repetitions) &&
    report.repetitions >= 3, 'Unexpected workload, threshold or sample count');
  assert(Number.isFinite(Date.parse(report.timeUtc)) && report.engine?.cpuModel && report.engine?.kernel &&
    report.engine?.arch === 'x64' && /^\S+ 2 linux (amd64|x86_64)$/.test(report.engine?.docker),
    'Missing raw run environment');
  assert(report.engine.image === resourceImage && report.engine.imageId === formalImageId &&
    report.engine.productionHeapMiB === productionHeapMiB, 'Formal Host engine or heap differs');
  assert.equal(report.candidate?.commit, sourceCommit, 'Report and frozen source differ');
  assert.equal(report.candidate?.tree, sourceTree, 'Report and frozen source tree differ');
  assert.notEqual(published.commit, sourceCommit, 'Use a distinct previously published reference');
  assert.equal(report.baseline?.commit, published.commit, 'Comparison is not the published build source');
  assert.equal(report.baseline?.tree, published.tree, 'Comparison is not the published build tree');
  for (const arm of [report.candidate, report.baseline]) {
    assert(commit.test(arm.tree) && hash.test(arm.workloadSha256) && hash.test(arm.readbackLuaSha256) &&
      hash.test(arm.lockfile?.dependencies), 'Incomplete source, workload or dependency evidence');
  }
  assert.equal(report.candidate.workloadSha256, report.baseline.workloadSha256, 'Host workloads differ');
  assert.equal(report.candidate.workloadSha256, expectedWorkload, 'Host workload differs from the frozen source');
  assert.equal(report.candidate.lockfile.dependencies, report.baseline.lockfile.dependencies, 'Dependency graphs differ');
  const candidateGil = receipt.candidate?.sha256 ?? receipt.gil?.gilSha256;
  assert.notEqual(candidateGil, published.gilSha256, 'Use a distinct previously published GIL');
  verifyRuntime(report.candidate.runtime, candidateGil, sourceCommit);
  verifyRuntime(report.baseline.runtime, published.gilSha256, published.commit);
  assert.equal(report.candidate.runtime.moduleDigestsSha256,
    receipt.moduleDigests ? gilModuleInventoryHash(receipt.moduleDigests) : receipt.moduleDigestsSha256,
    'Measured packed Lua module inventory differs from the audited GIL receipt');
  const artFeatures = receipt.artFeatures?.flags;
  assert(artFeatures?.selectionAvatar === true && artFeatures.battlePortrait === true && artFeatures.monsters === true,
    'GIL and resource art flags differ from the formal native production profile');

  assert.deepEqual(Object.keys(report.results).sort(), Object.keys(profiles).sort(), 'Six-tier coverage is incomplete');
  const signals = {};
  const executions = new Set();
  const pairOrder = Array.from({length:report.repetitions}, (_, index) =>
    index % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']);
  for (const [name, profile] of Object.entries(profiles)) {
    const result = report.results[name];
    assert.deepEqual(result.profile, profile, 'Resource profile changed: ' + name);
    assert.deepEqual(result.pairOrder, pairOrder, 'Resource execution order differs: ' + name);
    assert(result.candidate?.pass && result.baseline?.pass && result.comparisonStatus === 'PAIRED',
      'Resource profile failed or was not paired: ' + name);
    const before = result.baseline.samples;
    const after = result.candidate.samples;
    assert.equal(before.length, report.repetitions, 'Incomplete reference samples: ' + name);
    assert.equal(after.length, report.repetitions, 'Incomplete candidate samples: ' + name);
    for (const sample of before) verifyCompleteSample(sample, profile, executions, report.baseline.runtime, artFeatures);
    for (const sample of after) verifyCompleteSample(sample, profile, executions, report.candidate.runtime, artFeatures, true);
    assert(matchingResourceCaps(before, after), 'Measured cgroup limits differ: ' + name);
    const beforeAct2 = before.map(sample => sample.act2);
    const afterAct2 = after.map(sample => sample.act2);
    assert(matchingResourceCaps(beforeAct2, afterAct2), 'Measured Act II cgroup limits differ: ' + name);
    const observed = [
      ...compareSamples(before, after, report.alertPercent),
      ...compareSamples(beforeAct2, afterAct2, report.alertPercent),
    ];
    assert.deepEqual(result.signals, observed, 'Source evidence signals differ from samples: ' + name);
    if (observed.length) signals[name] = observed;
  }
  verifyExtreme(report.extreme, report.candidate, executions, artFeatures);
  return signals;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const destination = 'build/release-performance-evidence.json';
  const write = result => {
    mkdirSync('build', {recursive: true});
    writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  };
  try {
    mkdirSync('build', {recursive: true});
    writeFileSync(destination, JSON.stringify({status: 'RUNNING'}) + '\n');
    const [gil, candidate, auditPath, evidence, ...extra] = process.argv.slice(2);
    assert(gil && candidate && auditPath && evidence && !extra.length,
      'Use verify-release-performance.mjs <final.gil> <candidate.json> <audit.json> <report.json>');
    const head = ref => execFileSync('git', ['rev-parse', ref], {encoding: 'utf8'}).trim();
    const sourceCommit = head('HEAD');
    const sourceTree = head('HEAD^{tree}');
    const auditBytes = readFileSync(auditPath);
    const {receipt, gilSha256} = verifyAuditedBuild(readFileSync(gil), readFileSync(candidate), JSON.parse(auditBytes), sourceCommit);
    const bytes = readFileSync(evidence);
    const raw = JSON.parse(bytes);
    const fromHead = path => execFileSync('git', ['show', sourceCommit + ':' + path], {maxBuffer: 4 * 1024 * 1024});
    const version = frozenReleaseVersion(receipt, fromHead('package.json'), readFileSync('package.json'));
    const published = await resolvePublishedBaseline(version);
    const expectedWorkload = workloadIdentity(productionWorkload, fromHead);
    const signals = verifyResourceReport(raw, sourceCommit, sourceTree, published, receipt, expectedWorkload);
    const status = Object.keys(signals).length ? 'REVIEW_REQUIRED' : 'OFFLINE_RESOURCE_VERIFIED';
    write({status, sourceCommit, sourceTree, gilSha256, buildId: receipt.buildId, payloadDigest: receipt.payloadDigest,
      published, runtime:raw.candidate.runtime, environment: raw.engine,
      strictAudioAuditSha256: sha256(auditBytes), rawReportSha256: sha256(bytes), signals});
    if (status === 'REVIEW_REQUIRED') process.exitCode = 1;
  } catch (error) {
    write({status: 'BLOCKED', error: error.message});
    process.exitCode = 1;
  }
}
