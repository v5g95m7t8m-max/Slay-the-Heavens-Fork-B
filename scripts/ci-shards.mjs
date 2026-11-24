import { constants, cpSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { availableParallelism, tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareReviewedAssets, prepareRuntimePreviews, needsRuntimePreviews } from './ci-reviewed-lfs.mjs';
import {prepareMediaAssets} from './ci-media-lfs.mjs';

export const timings = JSON.parse(readFileSync(new URL('./ci-test-timings.json', import.meta.url), 'utf8'));

// The larger complete per-file observation from Windows Full jobs
// 136000234494 and 136026191485 keeps the current shard forecast within budget.
// Build the key from a basename because this is placement metadata. A
// repository-relative test path literal is parsed as a dependency by test-affected.
const artFeatureInverseTest = ['tests', 'art-feature-source-inverse.test.mjs'].join('/');
const hostLifecycleTest = ['tests', 'game-ui-host-lifecycle.test.mjs'].join('/');
const hostResultTest = ['tests', 'game-ui-host-result.test.mjs'].join('/');
const windowsPresentationReplays = ['colorless-catalog-source', 'presentation-m3-integration']
  .map(name => ['tests', name + '.test.mjs'].join('/'));
timings.js.win32[artFeatureInverseTest] = Math.max(timings.js.win32[artFeatureInverseTest] ?? timings.unknownJsMs, 431203);

// Reserve the work that completed in POSIX jobs 137444936421, 137444936442,
// 137444936458, 137444936507 and 137444936550 before their 30-minute cutoff.
// Jobs 137468791737, 137468791821, 137468791838, 137468791852 and
// 137468791853 from the next attempt exposed underweighted replay files.
// Completed cases and file observations guide placement only.
const linuxReplayMinimumMs = Object.freeze({
  'act1-choice-responsibilities.test.mjs': 153000,
  'actor-lifecycle.test.mjs': 98000,
  'approved-node-ui-refactor.test.mjs': 526000,
  'approved-ui-inverse.test.mjs': 1295000,
  'architecture-composition-format.test.mjs': 420000,
  'art-feature-source-inverse.test.mjs': 412000,
  'battle-max-hp-config-inverse.test.mjs': 124000,
  'boss-ui-fixture-composition.test.mjs': 64000,
  'card-origin-source-inverse.test.mjs': 149000,
  'combat-reactions-architecture-inverse.test.mjs': 137000,
  'competition-roster.test.mjs': 505000,
  'core-architecture-inverse.test.mjs': 362000,
  'core-lifecycle-source-inverse.test.mjs': 713000,
  'defect-integration-source.test.mjs': 153000,
  'end-turn-responsibilities.test.mjs': 252000,
  'event-production-source-inverse.test.mjs': 100000,
  'final-integration-source.test.mjs': 318000,
  'game-ui-extraction-source-inverse.test.mjs': 870000,
  'game-ui-host-result.test.mjs': 188000,
  'max-hp-accepted-source-inverse.test.mjs': 677000,
  'mobile-qa-source-migration.test.mjs': 140000,
  'native-enemy-theme-inverse.test.mjs': 54000,
  'nodes-battle-max-hp-config-inverse.test.mjs': 90000,
  'player-death-inverse.test.mjs': 172000,
  'potion-callback-source.test.mjs': 238000,
  'power-shop-boundaries.test.mjs': 486000,
  'presentation-native-m3-contract.test.mjs': 1037000,
  'relic-query-source-inverse.test.mjs': 123000,
  // Job 137510449969 spent over 22 minutes in this file before cutoff.
  'task77-current-source-layers.test.mjs': 1295000,
});

// Completed replay cases in Windows jobs 137468791786, 137468791799,
// 137468791818, 137468791851, 137468791860, 137468791861, 137468791871
// and 137468791996, and complete files from 137492433757, 137492433852
// and 137492433888.
const windowsReplayMinimumMs = Object.freeze({
  'act1-choice-responsibilities.test.mjs': 195000,
  // Budget the longest completed case after isolating the three cases.
  'approved-ui-inverse.test.mjs': 1455000,
  'architecture-composition-format.test.mjs': 1190000,
  // The 1786s live-owner case in job 137510449987 now runs in two workers.
  'art-feature-source-inverse.test.mjs': 1000000,
  'battle-max-hp-config-inverse.test.mjs': 681000,
  'card-origin-source-inverse.test.mjs': 360000,
  'colorless-catalog-source.test.mjs': 566000,
  'compendium-source-inverse.test.mjs': 690000,
  'competition-roster-config-composition.test.mjs': 287000,
  'competition-roster.test.mjs': 735000,
  'core-architecture-inverse.test.mjs': 321000,
  // Job 137468791861 spent over half an hour on this file before cutoff.
  'core-lifecycle-source-inverse.test.mjs': 800000,
  'death-settlement-guard-inverse.test.mjs': 186000,
  'defect-integration-source.test.mjs': 474000,
  'formal-campaign-entry.test.mjs': 233000,
  'game-ui-extraction-source-inverse.test.mjs': 2087000,
  'living-wall-architecture-inverse.test.mjs': 1013000,
  'native-candidate-art.test.mjs': 113000,
  'official-assets-runtime.test.mjs': 216000,
  'p0-presentation-inverse.test.mjs': 713000,
  'potion-callback-source.test.mjs': 132000,
  'power-shop-boundaries.test.mjs': 1364000,
  'presentation-native-m3-contract.test.mjs': 791000,
  // Job 137510450112 completed this file before its Lua phase reached cutoff.
  'ready-art-source-inverse.test.mjs': 1166000,
  'reward-query-boundary-source.test.mjs': 1440000,
  'round3-catalog-source-inverse.test.mjs': 278000,
  'run-architecture-inverse.test.mjs': 384000,
});

export const replayPlanningMinimumMs = Object.freeze({ linux: linuxReplayMinimumMs, win32: windowsReplayMinimumMs });

// Completed per-file observations from jobs 137561143750, 137561143756,
// 137561143768 and 137593688616. Balance lanes without moving the Full inventory.
const hostedLaneMinimumMs = {
  linux: {
    'official-assets-runtime.test.mjs': 233000,
    'power-shop-boundaries.test.mjs': 525000,
    'reward-query-boundary-source.test.mjs': 1112000,
  },
  win32: {
    'actor-presence-source.test.mjs': 573000,
    'art-feature-source-inverse.test.mjs': 1537000,
    'battle-drag-click-compatibility.test.mjs': 592000,
    'colorless-catalog-source.test.mjs': 1068000,
    'defect-final-execute.test.mjs': 126000,
    'defect-plan-responsibilities.test.mjs': 53000,
    'formal-campaign-entry.test.mjs': 367000,
    'game-ui-host-lifecycle.test.mjs': 308000,
    'game-ui-host-result.test.mjs': 222000,
    'max-hp-accepted-source-inverse.test.mjs': 883000,
    'mobile-qa-source-migration.test.mjs': 143000,
    'native-monster-art.test.mjs': 77000,
    'presentation-m3-integration.test.mjs': 1488000,
    'pure-source-projection-cache.test.mjs': 463000,
    'seven-refactor-source-epoch.test.mjs': 773000,
    'task76-owner-composition.test.mjs': 105000,
    'watcher-final-execution.test.mjs': 366000,
  },
};

export function partition(files, value, weights, fallback, initial) {
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(String(value));
  const [index, count] = match ? match.slice(1).map(Number) : [];
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || index > count || count > 64) {
    throw new Error('Shard must be i/n with 1 <= i <= n <= 64');
  }
  if (new Set(files).size !== files.length || files.some(file => typeof file !== 'string' || !file)) throw new Error('Files must be unique nonempty paths');
  const weight = file => weights[file] ?? fallback;
  if (files.some(file => !Number.isFinite(weight(file)) || weight(file) <= 0)) throw new Error('Invalid scheduling weight');
  const loads = initial ?? Array(count).fill(0);
  if (loads.length !== count || loads.some(load => !Number.isFinite(load) || load < 0)) throw new Error('Invalid initial loads');
  const bins = loads.map(load => ({ load, files: [] }));
  for (const file of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b, 'en'))) {
    let target = 0;
    for (let i = 1; i < count; i++) if (bins[i].load < bins[target].load) target = i;
    bins[target].files.push(file);
    bins[target].load += weight(file);
  }
  return { files: bins[index - 1].files.sort(), loads: bins.map(bin => bin.load) };
}

export function jsPlanningWeights(files,platform=process.platform) {
  // Known platforms use their actual observations; an unknown platform falls
  // back to the conservative maximum. Local estimates never certify execution.
  const maps=Object.hasOwn(timings.js,platform)?[timings.js[platform]]:Object.values(timings.js);
  return Object.fromEntries(files.map(file=>{
    const name=file.slice('tests/'.length);
    return [file,Math.max(
      ...maps.map(weights=>weights[file]??timings.unknownJsMs),
      timings.jsPlanning?.localLowerBounds?.[file]?.durationMs??0,
      platform !== 'win32' ? linuxReplayMinimumMs[name] ?? 0 : 0,
      platform !== 'linux' ? windowsReplayMinimumMs[name] ?? 0 : 0)];
  }));
}

export function jsShard(files, value, platform = process.platform) {
  // Only shard 1 runs the platform's non-test gates. Reserve their measured
  // cost before distributing JS, and carry it into the subsequent Lua plan.
  const initial = timings.initialMs?.[platform];
  const [index, count] = String(value).split('/').map(Number);
  const loads = initial && Number.isSafeInteger(count) && count > 0 && count <= 64
    ? Array.from({length:count},(_,index)=>index===0?initial[0]:0) : undefined;
  const weights = jsPlanningWeights(files, platform);
  const plan = partition(files, value, weights, timings.unknownJsMs, loads);
  if (platform !== 'win32' || count !== 18 || !Object.hasOwn(weights, hostResultTest)) return plan;
  const first = index === 1 ? plan : partition(files, '1/18', weights, timings.unknownJsMs, loads);
  if (!first.files.includes(hostResultTest) || !windowsPresentationReplays.every(file => first.files.includes(file))) return plan;

  // Windows job 137668948404 passed both source replays, but four strict Host
  // result VMs timed out during their overlap. Job 137668948532 (shard 8)
  // completed both suites in under 24 minutes. Isolate the original Host
  // streams on that VM and carry the transferred cost into the Lua plan.
  const hostCost = weights[hostResultTest];
  plan.loads[0] -= hostCost;
  plan.loads[7] += hostCost;
  if (index === 1) plan.files = plan.files.filter(file => file !== hostResultTest);
  if (index === 8) plan.files = [...plan.files, hostResultTest].sort();
  return plan;
}

export function discoverJs(root = '.') {
  const files = readdirSync(resolve(root, 'tests')).filter(file => file.endsWith('.test.mjs')).map(file => `tests/${file}`);
  if (!files.length) throw new Error('No JavaScript test files discovered');
  return files;
}

const timingReport = 'build/ci-js-timings.jsonl';
const nodeTestArgs = files => ['--test', '--test-concurrency=1', '--test-reporter=spec',
  '--test-reporter=./scripts/ci-timing-reporter.mjs', '--test-reporter-destination=stdout',
  `--test-reporter-destination=${timingReport}`, ...files];

function runInCheckout(files, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeTestArgs(files), {
      cwd, env: { ...env, GITHUB_WORKSPACE: cwd }, stdio: 'inherit', windowsHide: true,
    });
    child.once('error', reject);
    child.once('close', status => resolve(status ?? 1));
  });
}

async function runHostedShard(files, root, env) {
  if (!lstatSync(join(root, '.git'), { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('Hosted execution requires physical checkout metadata');
  }
  // The two art workers overlapped the strict native Host VM timeouts in
  // Windows job 137561143877. Keep those files in the same serial checkout.
  const serial = [artFeatureInverseTest, hostLifecycleTest];
  const together = process.platform === 'win32' && serial.every(file => files.includes(file));
  if (together && files.length === serial.length) return runInCheckout(files, root, env);
  const snapshot = realpathSync.native(mkdtempSync(join(env.RUNNER_TEMP || tmpdir(), 'slay-ci-shard-')));
  try {
    const location = relative(root, snapshot);
    if (!location || !isAbsolute(location) && location !== '..' && !location.startsWith(`..${sep}`)) {
      throw new Error('Hosted snapshot must be outside the checkout');
    }
    // Each test process still runs serially in its own checkout. Copy before
    // starting either process to isolate Git metadata, build outputs and fixtures.
    cpSync(root, snapshot, { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
    const weights = jsPlanningWeights(files);
    const laneMinimum = hostedLaneMinimumMs[process.platform];
    for (const file of files) {
      const name = file.slice('tests/'.length);
      weights[file] = Math.max(weights[file], laneMinimum[name] ?? 0);
    }
    const remaining = together ? files.filter(file => !serial.includes(file)) : files;
    const reserved = together ? [weights[serial[0]] + weights[serial[1]], 0] : undefined;
    const original = partition(remaining, '1/2', weights, timings.unknownJsMs, reserved).files;
    const copy = partition(remaining, '2/2', weights, timings.unknownJsMs, reserved).files;
    if (together) {
      original.push(...serial);
      original.sort();
    }
    const results = await Promise.allSettled([
      runInCheckout(original, root, env), runInCheckout(copy, snapshot, env),
    ]);
    const copyReport = join(snapshot, timingReport);
    const originalReport = join(root, timingReport);
    const status = results.find(result => result.status === 'rejected');
    if (!status) {
      writeFileSync(originalReport, readFileSync(copyReport), { flag: 'a' });
    }
    if (status) throw status.reason;
    return results.find(result => result.value !== 0)?.value ?? 0;
  } finally {
    rmSync(snapshot, { recursive: true, force: true, maxRetries: 2 });
  }
}

export function main(args) {
  if (args.length !== 1 || !/^--(shard|prepare)=/.test(args[0])) throw new Error('Usage: ci-shards.mjs --shard=i/n | --prepare=i/n');
  const shard = args[0].split('=')[1], plan = jsShard(discoverJs(), shard);
  console.log(JSON.stringify({ shard, platform: process.platform, ...plan }));
  if (args[0].startsWith('--prepare=')) {
    console.log(JSON.stringify(prepareMediaAssets()));
    console.log(JSON.stringify(plan.files.includes('tests/reviewed-traveler-geo-assets.test.mjs')
      ? prepareReviewedAssets() : { status: 'not-needed', shard }));
    console.log(JSON.stringify(prepareRuntimePreviews({ needed: needsRuntimePreviews(plan.files) })));
    return;
  }
  if (!plan.files.length) return;
  // Keep a fresh node:test process for each file, serial execution and native
  // failure/timeout handling. No NODE_TEST_CONTEXT may disable this child CLI.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const root = realpathSync.native('.'), hostedOS = { linux: 'Linux', win32: 'Windows' }[process.platform];
  if (hostedOS && env.GITHUB_ACTIONS === 'true' && env.RUNNER_OS === hostedOS
      && env.RUNNER_ENVIRONMENT === 'github-hosted' && env.GITHUB_WORKSPACE
      && realpathSync.native(env.GITHUB_WORKSPACE) === root && availableParallelism() >= 2 && plan.files.length >= 2) {
    return runHostedShard(plan.files, root, env).then(status => { process.exitCode = status; });
  }
  const result = spawnSync(process.execPath, nodeTestArgs(plan.files), { stdio: 'inherit', env, windowsHide: true });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
