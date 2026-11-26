import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { arch, availableParallelism, cpus, release, totalmem } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { counters, phases, validateSample } from '../benchmark-runtime-path.mjs';
import { compareSamples, formalImageId, guardExtremeCgroup, lockfileIdentity, matchingResourceCaps, parseResources, profiles,
  productionHeapMiB, productionReportKind, productionWorkload, resourceImage as image, resourceResultStatus, selectResourceReference, summarize,
  unsupportedFormalProfile, workload, workloadIdentity } from './resource-receipt.mjs';
import { act2ProductionPhases, formalAct2SceneSlots, productionPhases } from './production-inputs.mjs';
import { gilModuleInventoryHash, gilRuntimeKind } from './gil-inputs.mjs';
import { lfsArguments, lfsEnvironment } from '../ci-reviewed-lfs.mjs';

const modes = { fast: ['baseline', 'medium'], full: Object.keys(profiles) };
const sourceInputs = ['src/lua', 'data', 'config', 'package-lock.json', ...workload];
const lfsFilters = lfsArguments.slice(0, lfsArguments.indexOf('lfs'));

const receipt = String.raw`
set -eu
printf 'RESOURCE_EXECUTION_ID %s\n' "$HOSTNAME"
cg=/sys/fs/cgroup
for key in cpu.max memory.max memory.swap.max; do
  value=$(cat "$cg/$key")
  printf 'RESOURCE %s %s\n' "$key" "$value"
done
status=0
node scripts/runtime-baseline/worker.mjs "$@" || status=$?
value=$(cat "$cg/memory.peak")
printf 'RESOURCE memory.peak %s\n' "$value"
while read -r key value; do printf 'RESOURCE cpu.%s %s\n' "$key" "$value"; done < "$cg/cpu.stat"
while read -r key value; do printf 'RESOURCE memory.events.%s %s\n' "$key" "$value"; done < "$cg/memory.events"
exit "$status"
`;
const extremeReceipt = String.raw`
set -eu
printf 'RESOURCE_EXECUTION_ID %s\n' "$HOSTNAME"
for key in cpu.max memory.max memory.swap.max; do
  value=$(cat "/sys/fs/cgroup/$key")
  printf 'RESOURCE %s %s\n' "$key" "$value"
done
exec node scripts/runtime-baseline/worker.mjs "$@"
`;

function run(command, args, cwd, env, timeout = 120_000) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 });
  assert(result.status === 0 && !result.error,
    `${command} ${args[0]} failed (${result.error?.message ?? result.status ?? result.signal}): ${result.stderr?.trim() ?? ''}\n${result.stdout?.trim().split('\n').slice(-20).join('\n') ?? ''}`);
  return result.stdout.trim();
}

function snapshot(root, production, harnessRoot) {
  const git = (...args) => run('git', [...lfsFilters, ...args], root, lfsEnvironment());
  assert.equal(realpathSync(git('rev-parse', '--show-toplevel')), root, 'use a repository worktree root');
  git('diff', '--quiet', 'HEAD', '--');
  const commit = git('rev-parse', 'HEAD');
  const inputs = production ? ['art', 'config', 'data', 'docs', 'scripts', 'src', 'tests', 'tools'] : sourceInputs;
  assert.equal(git('ls-files', '--others', '--exclude-standard', '-z', '--', ...inputs), '', 'runtime inputs have untracked files');
  const directory = production?.directory ?? resolve(root, 'build/lua');
  const generated = readdirSync(directory).filter(file => file.endsWith('.lua')).sort();
  assert(generated.includes('abyss_data.lua') && generated.includes('abyss_ui_templates.lua'), 'run build:data and build:ui first');
  const hashFiles = (from, paths) => workloadIdentity(paths, path => readFileSync(resolve(from, path)));
  const runtime = production?.runtime;
  if (runtime) {
    assert.equal(runtime.bgmSourceCommit, commit, 'BGM source differs from the measured arm');
    const modules = {};
    for (const file of generated) {
      const name = file.slice(0, -4);
      const digest = createHash('sha256').update(readFileSync(resolve(directory, file))).digest('hex');
      if (Object.hasOwn(runtime.fixtureDigests, name)) assert.equal(digest, runtime.fixtureDigests[name], 'Native Host fixture changed: ' + name);
      else Object.defineProperty(modules, name, {value:digest, enumerable:true});
    }
    assert.equal(Object.keys(modules).length, runtime.moduleCount, 'Native Lua module inventory changed');
    assert.equal(gilModuleInventoryHash(modules), runtime.moduleDigestsSha256, 'Native Lua source changed');
    assert.deepEqual(JSON.parse(readFileSync(resolve(directory, 'performance-readback.json'))), runtime, 'Native readback receipt changed');
  }
  return {
    commit,
    tree: git('rev-parse', 'HEAD^{tree}'),
    workloadSha256: production ? hashFiles(harnessRoot, productionWorkload) : hashFiles(root, workload),
    lockfile: lockfileIdentity(readFileSync(resolve(root, 'package-lock.json'))),
    ...(runtime ? {runtime, readbackLuaSha256:hashFiles(directory, generated)} : {
      generatedLuaSha256:production ? hashFiles(directory, generated) : hashFiles(root, generated.map(file => `build/lua/${file}`)),
      ...(production && {configuration:production.configuration}),
    }),
  };
}

function prepareProduction(root, harnessRoot, gil, nativeTool) {
  const parent = resolve(root, 'build');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(resolve(parent, 'production-resource-'));
  process.on('exit', () => rmSync(directory, { recursive: true, force: true }));
  if (gil) {
    const prepare = resolve(harnessRoot, 'scripts/runtime-baseline/gil-inputs.mjs');
    const runtime = JSON.parse(run(process.execPath, [prepare, directory, gil, nativeTool], root, undefined, 240_000).split('\n').at(-1));
    return {directory, runtime};
  }
  const prepare = resolve(harnessRoot, 'scripts/runtime-baseline/production-inputs.mjs');
  const configuration = JSON.parse(run(process.execPath, [prepare, directory], root).split('\n').at(-1));
  return { directory, configuration };
}

function productionWorkerArguments(root, production) {
  if (!production) return [];
  const args = [relative(root, production.directory)];
  if (production.runtime) args.push(gilRuntimeKind);
  return args;
}

function containerFlags(root, profile, production) {
  const args = ['--network', 'none', '--cgroupns', 'private', '--read-only',
    '--user', `${process.getuid()}:${process.getgid()}`,
    '--mount', `type=bind,src=${root},dst=/repo,readonly`, '--workdir', '/repo'];
  if (profile.cpus !== null) args.push('--cpus', String(profile.cpus));
  if (profile.memoryBytes !== null) args.push('--memory', String(profile.memoryBytes), '--memory-swap', String(profile.memoryBytes));
  if (production) args.push('--env', `NODE_OPTIONS=--max-old-space-size=${productionHeapMiB}`);
  return args;
}

function measure(root, profile, production, harnessRoot, act2 = false) {
  const name = `slay-resource-suite-${randomUUID()}`;
  const args = ['run', '--rm', '--name', name, ...containerFlags(root, profile, production)];
  // A/B arms use the same harness and fixtures while loading each arm's own game sources.
  if (production && root !== harnessRoot) {
    for (const path of productionWorkload) {
      args.push('--mount', `type=bind,src=${resolve(harnessRoot, path)},dst=/repo/${path},readonly`);
    }
  }
  const workerArgs = productionWorkerArguments(root, production);
  const requireChapterScene = act2 && root === harnessRoot;
  if (act2) workerArgs.push(requireChapterScene ? '--act2-candidate=' + formalAct2SceneSlots : '--act2');
  const successMarker = act2 ? 'ACT2_PRODUCTION_HOST_PASS seed=42'
    : production ? 'PRODUCTION_HOST_PASS seed=42' : 'RUNTIME_BASELINE_PASS seed=1 idleFrames=300';
  const start = performance.now();
  try {
    const output = run('docker', [...args, image, 'sh', '-c', receipt, 'resource-worker', ...workerArgs], root);
    const wallMs = performance.now() - start;
    assert(output.split('\n').includes(successMarker), 'Host did not complete the fixed workload');
    const samples = output.split('\n').filter(line => line.startsWith('RUNTIME_BASELINE_JSON '));
    assert.equal(samples.length, 1, 'expected exactly one Host measurement');
    const samplePhases = act2 ? act2ProductionPhases : production ? productionPhases : phases;
    const sample = validateSample(JSON.parse(samples[0].slice('RUNTIME_BASELINE_JSON '.length)), samplePhases);
    if (production?.runtime) assert.deepEqual(sample.runtime, production.runtime, 'Measured Host did not load its exact GIL readback');
    assert(Number.isSafeInteger(sample.maxRssKiB) && sample.maxRssKiB > 0, 'invalid process maxRSS');
    const executionId = /^RESOURCE_EXECUTION_ID ([a-f0-9]{12})$/m.exec(output)?.[1];
    assert(executionId, 'missing Docker execution identity');
    if (act2) {
      const [, sceneSlots, openingTurnFrames, attackTurnFrames] =
        /^PRODUCTION act2Enemies=3 act2Hand=10 act2OverlappingEffects=3 act2SceneSlots=(\d+) act2OpeningTurnFrames=(\d+) act2AttackTurnFrames=(\d+)$/m.exec(output) ?? [];
      assert(sceneSlots !== undefined, 'Missing measured Act II scene and turn evidence');
      if (requireChapterScene) assert.equal(Number(sceneSlots), formalAct2SceneSlots,
        'Formal candidate Act II scene differs from approved slot count');
      sample.scenario = {sceneSlots:Number(sceneSlots), openingTurnFrames:Number(openingTurnFrames), attackTurnFrames:Number(attackTurnFrames)};
    }
    return { ...sample, executionId, wallMs, resources: parseResources(output, profile) };
  } catch (error) {
    spawnSync('docker', ['rm', '-f', name], { timeout: 10_000, stdio: 'ignore' });
    return { error: error.message };
  }
}

function measureArm(root, profile, production, harnessRoot) {
  const sample = measure(root, profile, production, harnessRoot);
  if (sample.error || !production?.runtime) return sample;
  // Fresh VMs keep the fixed heap limit and each workload's resource receipt.
  const act2 = measure(root, profile, production, harnessRoot, true);
  const error = act2.error ? 'Act II: ' + act2.error
    : !matchingResourceCaps([sample], [act2]) ? 'Act II and core measured cgroup limits differ' : null;
  return {...sample, act2, ...(error && {error})};
}

function measureExtreme(root, production, candidate) {
  const name = `slay-resource-suite-extreme-${randomUUID()}`;
  let probe;
  try {
    const caps = containerFlags(root, unsupportedFormalProfile, production);
    const id = run('docker', ['create', '--name', name, ...caps, image, 'sh', '-c', extremeReceipt,
      'resource-extreme', ...productionWorkerArguments(root, production)], root);
    const result = spawnSync('docker', ['start', '-a', id], {cwd: root, encoding: 'utf8', timeout: 45_000, maxBuffer: 4 * 1024 * 1024});
    const state = JSON.parse(run('docker', ['inspect', '--format', '{{json .State}}', id], root));
    const report = Object.fromEntries([...result.stdout.matchAll(/^RESOURCE (\S+) (.+)$/gm)].map(match => match.slice(1)));
    const resources = {cpuMax: report['cpu.max'], memoryMax: report['memory.max'], swapMax: report['memory.swap.max']};
    const executionId = /^RESOURCE_EXECUTION_ID ([a-f0-9]{12})$/m.exec(result.stdout)?.[1];
    probe = {containerId: id, executionId, resources, state, stdout: result.stdout, stderr: result.stderr};
    assert(!result.error, 'Extreme workload did not complete within the probe bound');
    assert(executionId && id.startsWith(executionId), 'Extreme receipt does not identify the Docker execution');
    guardExtremeCgroup(resources, state);
  } catch (error) {
    return {status: 'FAIL', candidate, probe, error: error.message};
  } finally {
    spawnSync('docker', ['rm', '-f', name], {timeout: 10_000, stdio: 'ignore'});
  }
  const recovery = measureArm(root, profiles.stress, production, root);
  const reused = [recovery.executionId, recovery.act2?.executionId].includes(probe.executionId);
  return {status: recovery.error || reused ? 'FAIL' : 'PASS', candidate, probe,
    recovery: {recordedAt: new Date().toISOString(), sample: recovery}};
}

function deterministicCounts(sample) {
  return sample.rows.map(row => [counters.map(key => row[key]), row.nativeMethods, row.propertyNames]);
}

function summarizeSamples(samples, count, samplePhases) {
  if (samples.length !== count || samples.some(sample => sample.error)) return { samples, pass: false };
  // The lightweight worker has fixed-length updates. The production path waits on
  // the real scheduler and may do a different number of updates before a page settles.
  if (samplePhases === phases) {
    for (const sample of samples) assert.deepEqual(deterministicCounts(sample), deterministicCounts(samples[0]), 'nondeterministic Host call counts');
  }
  return {
    samples, pass: true,
    wallMs: summarize(samples.map(sample => sample.wallMs)),
    peakBytes: summarize(samples.map(sample => sample.resources.peakBytes)),
    phases: Object.fromEntries(samplePhases.map((phase, i) => [phase, summarize(samples.map(sample => sample.rows[i].elapsedMs))])),
  };
}

function suite(values) {
  assert.equal(process.platform, 'linux', 'use a Linux Docker host');
  assert(Object.hasOwn(modes, values.mode), `unknown mode: ${values.mode}`);
  assert(!values.extreme || values.production, 'Extreme probe requires the formal configuration');
  const selected = values.profile ?? modes[values.mode];
  assert(selected.every(profile => Object.hasOwn(profiles, profile)) && new Set(selected).size === selected.length, 'unknown or duplicate profile');
  const repetitions = Number(values.samples ?? (values.mode === 'fast' ? 1 : 3));
  assert(Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 100, 'samples must be an integer from 1 to 100');
  const alertPercent = Number(values['alert-percent']);
  assert(Number.isFinite(alertPercent) && alertPercent > 0, 'alert-percent must be positive');
  if (values.release) {
    assert(values.mode === 'full' && values.production && values.extreme && values.baseline && !values['baseline-if-compatible'] &&
      !values.profile && repetitions >= 3 && alertPercent === 20, 'Release resource gate requires all six fixed paired tiers and independent extreme recovery');
    assert(values['candidate-gil'] && values['baseline-gil'] && values['native-reader'], 'Release resource gate requires both exact GILs and the pinned native reader');
  } else {
    assert(!values['candidate-gil'] && !values['baseline-gil'] && !values['native-reader'], 'GIL readback is reserved for formal release workloads');
  }
  const candidatePath = realpathSync('.');
  const baselinePath = values.baseline ? realpathSync(values.baseline) : null;
  assert.notEqual(candidatePath, baselinePath, 'prepare the reference in a separate worktree');
  const nativeTool = values.release ? realpathSync(values['native-reader']) : undefined;
  const candidateProduction = values.production ? prepareProduction(candidatePath, candidatePath,
    values.release ? realpathSync(values['candidate-gil']) : undefined, nativeTool) : null;
  const baselineProduction = values.production && baselinePath ? prepareProduction(baselinePath, candidatePath,
    values.release ? realpathSync(values['baseline-gil']) : undefined, nativeTool) : null;
  const snapshotCandidate = () => snapshot(candidatePath, candidateProduction, candidatePath);
  const snapshotBaseline = () => snapshot(baselinePath, baselineProduction, candidatePath);
  const candidate = snapshotCandidate();
  const reference = baselinePath ? snapshotBaseline() : null;
  if (candidateProduction && reference && !values.release) {
    assert.deepEqual(candidate.configuration, reference.configuration, 'Production generation profiles differ');
  }
  if (values.release) assert.notEqual(candidate.runtime.gilSha256, reference.runtime.gilSha256, 'A distinct published GIL is required');
  const {baseline, unpairedReference} = selectResourceReference(candidate, reference, values['baseline-if-compatible']);
  if (unpairedReference) console.log(unpairedReference.reason + ': ' + unpairedReference.commit);
  const docker = run('docker', ['info', '--format', '{{.ServerVersion}} {{.CgroupVersion}} {{.OSType}} {{.Architecture}}'], candidatePath);
  assert.match(docker, /^\S+ 2 linux \S+$/, 'a Linux Docker daemon using cgroup v2 is required');
  if (spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore', timeout: 10_000 }).status !== 0) {
    run('docker', ['pull', image], candidatePath);
  }
  const imageId = run('docker', ['image', 'inspect', '--format', '{{.Id}}', image], candidatePath);
  if (values.release) {
    assert(arch() === 'x64' && imageId === formalImageId, 'The approved amd64 formal Host image is required');
  }
  const results = {};
  const samplePhases = values.production ? productionPhases : phases;
  for (const key of selected) {
    const profile = profiles[key];
    const before = [];
    const after = [];
    const pairOrder = [];
    for (let i = 0; i < repetitions; i++) {
      const candidateArm = [candidatePath, after, 'candidate', candidateProduction];
      const pair = baseline ? [[baselinePath, before, 'baseline', baselineProduction], candidateArm] : [candidateArm];
      if (i % 2) pair.reverse();
      pairOrder.push(pair.map(([, , label]) => label));
      for (const [path, samples, label, production] of pair) {
        const record = measureArm(path, profile, production, candidatePath);
        samples.push(record);
        console.log(`${key} ${label} ${i + 1}/${repetitions}: ${record.error ?? 'workload passed'}`);
      }
    }
    const candidateResult = summarizeSamples(after, repetitions, samplePhases);
    const baselineResult = baseline ? summarizeSamples(before, repetitions, samplePhases) : null;
    const bothPassed = baselineResult?.pass && candidateResult.pass;
    const beforeAct2 = values.release ? before.map(sample => sample.act2) : null;
    const afterAct2 = values.release ? after.map(sample => sample.act2) : null;
    const paired = bothPassed && matchingResourceCaps(before, after) &&
      (!values.release || matchingResourceCaps(beforeAct2, afterAct2));
    const signals = paired ? compareSamples(before, after, alertPercent) : [];
    if (paired && values.release) signals.push(...compareSamples(beforeAct2, afterAct2, alertPercent));
    results[key] = {
      profile, pairOrder, candidate: candidateResult, baseline: baselineResult,
      comparisonStatus: paired ? 'PAIRED' : 'UNPAIRED',
      ...(bothPassed && !paired && {comparisonReason: 'Measured cgroup limits differ'}),
      signals,
    };
  }
  const extreme = values.extreme ? measureExtreme(candidatePath, candidateProduction, candidate) : null;
  assert.deepEqual(snapshotCandidate(), candidate, 'candidate inputs changed while measuring');
  if (baseline) assert.deepEqual(snapshotBaseline(), baseline, 'baseline inputs changed while measuring');
  const pass = (!extreme || extreme.status === 'PASS') &&
    Object.values(results).every(result => result.candidate.pass && (result.baseline?.pass ?? true));
  const paired = Object.values(results).every(result => result.comparisonStatus === 'PAIRED');
  const signals = Object.values(results).some(result => result.signals.length > 0);
  return {
    schemaVersion: 1, timeUtc: new Date().toISOString(),
    status: resourceResultStatus({release: values.release, pass, paired, signals}), mode: values.mode, repetitions,
    ...(values.release && { release: true }),
    ...(values.production ? { seed: 42, officialClient: 'UNVERIFIED' } : { seed: 1, idleFrames: 300 }),
    engine: { image, imageId, docker, kernel: release(), arch: arch(), cpuModel: cpus()[0]?.model, availableCpus: availableParallelism(), hostMemoryBytes: totalmem(),
      ...(values.production && { productionHeapMiB }) },
    alertPercent, candidate, baseline, comparisonStatus: paired ? 'PAIRED' : 'UNPAIRED',
    ...(unpairedReference && { unpairedReference }), ...(extreme && {extreme}), results,
  };
}

function publish(destination, report) {
  const temporary = `${destination}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n');
  renameSync(temporary, destination);
}

function main() {
  const { values } = parseArgs({ options: {
    mode: { type: 'string', default: 'fast' }, profile: { type: 'string', multiple: true },
    samples: { type: 'string' }, baseline: { type: 'string' }, 'baseline-if-compatible': { type: 'boolean' },
    production: { type: 'boolean' }, extreme: { type: 'boolean' }, release: { type: 'boolean' },
    'candidate-gil':{type:'string'}, 'baseline-gil':{type:'string'}, 'native-reader':{type:'string'},
    output: { type: 'string', default: 'build/performance-regression/report.json' },
    'alert-percent': { type: 'string', default: '20' },
  } });
  const destination = resolve(values.output);
  mkdirSync(dirname(destination), { recursive: true });
  const kind = values.production ? productionReportKind : 'offline-host-resource-pressure';
  const initial = { schemaVersion: 1, kind, timeUtc: new Date().toISOString() };
  publish(destination, { ...initial, status: 'RUNNING' });
  try {
    const report = { kind, ...suite(values) };
    publish(destination, report);
    console.log(`Performance report ${report.status}: ${destination}`);
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    publish(destination, { ...initial, status: 'FAIL', error: error.message });
    console.error(`Performance report FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
