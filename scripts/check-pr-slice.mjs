import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { backlogDeclaration, changedBacklogTasks, mentionedTasks } from './backlog-closeout.mjs';
import { checkTaskIntake, developmentRemotes } from './check-task-intake.mjs';

const production = /^(?:src|scripts|tools|experiments|config|data|schemas|\.github\/workflows)\/|^package(?:-lock)?\.json$/;
const evidence = /^(?:\.artifacts|docs\/(?:evidence|reviews)|experiments\/(?:lumine-native-fit\/evidence|archive\/emergency-20261108\/card-upgrade-recovery\/evidence))\//;
const evidenceFiles = new Set(['experiments/figma-map-native-spike/evidence-summary.json']);
// Most tests already live outside the production roots, under tests/.
const colocatedTests = new Set([
  'scripts/check-license.test.mjs',
  'scripts/art/test-card-text-height-compat.py',
  'tools/card-value-feedback/fixture.lua',
  'experiments/archive/emergency-20261108/card-upgrade-recovery/fixtures/card_upgrade_ownership_contract.lua',
  'experiments/art-tech-lab/baseline-audit/test_audit.py',
  'experiments/capacity-105/replay.test.mjs',
  'experiments/lumine-native-fit/test-placement.py',
  'experiments/native-ui-preview/battle/arrow.test.lua',
  'experiments/native-ui-preview/battle/semantic.test.lua',
  'experiments/native-ui-preview/battle/test-prefix.lua',
  'experiments/native-ui-preview/battle/test-suffix.lua',
  'experiments/native-ui-preview/menu/controller.test.lua',
  'experiments/native-ui-preview/shop/controller.test.lua',
]);
const limit = { lines: 400, files: 10 };

function isEvidence(path) {
  return evidence.test(path) || evidenceFiles.has(path);
}

export function isProduction(path) {
  return production.test(path) && !colocatedTests.has(path) &&
    !path.startsWith('experiments/figma-map-native-spike/tests/') && !isEvidence(path);
}

export function assessSlice(numstat, body = '', movedProductionPaths = new Set()) {
  const counts = { lines: 0, files: 0, productionLines: 0, productionFiles: 0, productionBinaries: 0, evidenceLines: 0, evidenceFiles: 0 };
  for (const row of numstat.split('\0').filter(Boolean)) {
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(row);
    if (!match || (match[1] === '-') !== (match[2] === '-')) throw new Error('Invalid Git numstat row');
    const [, added, deleted, path] = match;
    const binary = added === '-';
    const lines = binary ? 0 : Number(added) + Number(deleted);
    counts.lines += lines;
    counts.files++;
    if (isProduction(path) || movedProductionPaths.has(path)) {
      counts.productionLines += lines;
      counts.productionFiles++;
      if (binary) counts.productionBinaries++;
    } else if (isEvidence(path)) {
      counts.evidenceLines += lines;
      counts.evidenceFiles++;
    }
  }
  const large = counts.productionLines > limit.lines || counts.productionFiles > limit.files || counts.productionBinaries > 0;
  const visibleBody = body.replace(/<!--[^]*?(?:-->|$)/g, '');
  const exceptions = visibleBody.split(/\r?\n/).filter(line => line.startsWith('Slice-exception:'));
  const exception = exceptions.length === 1 &&
    /^Slice-exception: (?:atomic|mechanical|generated|tests) \| [^\s|][^|]* \| [^\s|][^|]*$/.test(exceptions[0]);
  return { ...counts, decision: large ? (exception ? 'REVIEW_EXCEPTION' : 'SPLIT_REQUIRED') : 'WITHIN_BUDGET' };
}

function productionMoveDestinations(base, candidate) {
  const renames = execFileSync('git', ['diff', '--name-status', '-z', '--find-renames', '--diff-filter=R',
    '--no-ext-diff', '--no-textconv', base, candidate, '--'], { encoding: 'utf8' }).split('\0');
  const destinations = new Set();
  for (let i = 0; i < renames.length - 1; i += 3) {
    if (isProduction(renames[i + 1])) destinations.add(renames[i + 2]);
  }
  return destinations;
}

export function checkSlice(base, candidate = 'HEAD', body = '') {
  if (!/^[0-9a-f]{40}$/.test(base ?? '') || !/^(?:HEAD|[0-9a-f]{40})$/.test(candidate)) {
    throw new Error('Usage: node scripts/check-pr-slice.mjs <exact base SHA> [candidate SHA or HEAD] [PR body file]');
  }
  const stat = execFileSync('git', ['diff', '--numstat', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', base, candidate, '--'], { encoding: 'utf8' });
  // Keep full additions and deletions, and count the destination of a detected production move.
  const result = assessSlice(stat, body, productionMoveDestinations(base, candidate));
  console.log(JSON.stringify(result));
  if (result.decision === 'SPLIT_REQUIRED') {
    throw new Error('Split the production change or record a reviewable Slice-exception in the PR body.');
  }
}

export function checkHostedSlice(env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'pull_request') return;
  const pr = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')).pull_request;
  if (!pr) throw new Error('Missing pull request event payload');
  if (pr.base.ref !== 'develop' && !pr.base.ref.startsWith('release/')) return;
  const [candidate, base, head] = execFileSync('git', ['rev-parse', 'HEAD', 'HEAD^1', 'HEAD^2'], { encoding: 'utf8' }).trim().split('\n');
  if (candidate !== env.GITHUB_SHA || base !== pr.base.sha || head !== pr.head.sha) {
    throw new Error('PR slice checkout differs from the event HEAD/BASE');
  }
  checkSlice(base, candidate, pr.body ?? '');
  if (pr.base.ref === 'develop') {
    const files = execFileSync('git', ['diff', '--name-only', '-z', '--no-renames', base, candidate, '--'],
      { encoding: 'utf8' }).split('\0').filter(Boolean).map(filename => ({filename}));
    const { errors } = backlogDeclaration(pr.body, changedBacklogTasks(files), mentionedTasks(pr.title));
    if (errors.length) throw Error(errors.join('\n'));
  }
}

const forkRequired = new Set(['feature', 'feat', 'refactor', 'experiment', 'spike']);
const gitRead = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function verifyDevelopmentRemote(remote, { push = false } = {}) {
  const expected = developmentRemotes[remote];
  const side = push ? 'push' : 'fetch';
  let urls;
  try {
    urls = gitRead('remote', 'get-url', '--all', ...(push ? ['--push'] : []), remote).split(/\r?\n/);
  } catch {
    throw new Error(`Configure ${remote} to use ${expected} before starting the slice.`);
  }
  const repository = urls[0].match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i)?.[1];
  if (urls.length !== 1 || repository?.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${remote} must have exactly one ${side} URL for ${expected}.`);
  }
}

function developmentPlan(args) {
  const { values } = parseArgs({
    args,
    options: {
      slice: { type: 'string' }, verify: { type: 'string' }, branch: { type: 'string' },
      remote: { type: 'string', default: 'fork-a' }, 'main-reason': { type: 'string' },
    },
  });
  const { slice, verify, branch, remote, 'main-reason': mainReason } = values;
  if (!slice?.trim() || !verify?.trim() || !/^[a-z]+\/.+/i.test(branch ?? '')) {
    throw new Error('Supply --slice "<scope>" --verify "<command>" --branch "<type>/<topic>".');
  }
  try {
    gitRead('check-ref-format', `refs/heads/${branch}`);
  } catch {
    throw new Error('Supply a valid Git branch name.');
  }
  if (!Object.hasOwn(developmentRemotes, remote)) throw new Error('Choose fork-a, fork-b or origin.');
  const type = branch.split('/')[0].toLowerCase();
  if (type === 'hotfix') throw new Error('Use the existing emergency Release Hotfix procedure for hotfix/*.');
  if (remote === 'origin' && forkRequired.has(type)) throw new Error(`${type}/* development must start on a Fork.`);
  if (remote === 'origin' && (!mainReason?.trim() || /[\r\n]/.test(mainReason))) {
    throw new Error('Supply a specific single-line --main-reason for direct main-repository development.');
  }
  if (remote !== 'origin' && mainReason !== undefined) throw new Error('--main-reason only applies to origin.');
  verifyDevelopmentRemote('origin');
  if (remote !== 'origin') verifyDevelopmentRemote(remote);
  verifyDevelopmentRemote(remote, { push: true });
  let base;
  try {
    base = gitRead('rev-parse', '--verify', 'refs/remotes/origin/develop^{commit}');
  } catch {
    throw new Error('Fetch origin/develop before starting development.');
  }
  return { branch, remote, base, mainReason: mainReason?.trim() };
}

function startSlice([id = '', ...args]) {
  const live = args.includes('--live');
  args = args.filter(arg => arg !== '--live');
  const result = checkTaskIntake(id);
  let plan;
  if (result.decision === 'ALLOW') {
    try {
      plan = developmentPlan(args);
    } catch (error) {
      result.decision = 'HOLD';
      result.reasons.push(error.message);
    }
  }
  const claim = live && plan ? checkTaskIntake(id, '.', {live:true}) : result;
  console.log(claim.decision + ' ' + id);
  if (claim.reasons.length) throw new Error(claim.reasons.join('\n'));
  console.log(`Development branch: ${plan.remote}/${plan.branch}\nDevelop base: ${plan.base}`);
  if (plan.mainReason) console.log(`Record Fork-First-Exception: ${plan.mainReason} in the task and PR for independent review.`);
  console.log('Before claiming, record the branch, base, slice and verification in the task. Check approvals, open PRs, claims and file ownership. Finish or hand off your current slice before claiming another.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [base, candidate, bodyFile] = process.argv.slice(2);
    if (base === '--start') startSlice(process.argv.slice(3));
    else checkSlice(base, candidate, bodyFile ? readFileSync(bodyFile, 'utf8') : '');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
