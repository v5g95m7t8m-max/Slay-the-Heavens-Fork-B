import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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

function isProduction(path) {
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [base, candidate, bodyFile] = process.argv.slice(2);
    checkSlice(base, candidate, bodyFile ? readFileSync(bodyFile, 'utf8') : '');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
