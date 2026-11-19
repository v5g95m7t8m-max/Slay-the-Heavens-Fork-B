import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { assessSlice } from '../scripts/check-pr-slice.mjs';
import { auditGuidance } from '../scripts/check-agent-guidance.mjs';
import { preRetirementSource } from './helpers/presentation-announcement-retirement.mjs';

function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'agent-guidance-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'package.json': JSON.stringify({ scripts: { check: 'node check.mjs' } }),
    'AGENTS.md': '# Project\n[Guide](docs/guide.md)\n`npm run check`\n',
    'docs/guide.md': '# Guide\n',
    'CLAUDE.md': '[Rules](AGENTS.md)\n',
    '.cursor/rules/miliastra.mdc': '[Rules](../../AGENTS.md)\n',
    ...overrides,
  };
  for (const [file, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return auditGuidance(root);
}

test('repository entry points fit their budgets and reference existing commands and files', () => {
  assert.deepEqual(auditGuidance().errors, []);
});
test('local full check and the common CI impact job enforce guidance before routing', () => {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  assert.match(scripts['check:rules'], /(?:^| && )npm run check:guidance(?: && |$)/);
  assert.match(scripts.check, /(?:^| && )npm run check:rules(?: && |$)/);
  const workflow = readFileSync('.github/workflows/quality.yml', 'utf8').replaceAll('\r\n', '\n');
  const impact = workflow.match(/^  impact:\n([\s\S]*?)(?=^  fast:)/m)?.[1];
  assert.ok(impact);
  assert.equal(impact.split('run: npm run check:guidance\n').length, 2);
  assert.ok(impact.indexOf('run: npm run check:guidance\n') < impact.indexOf('      - id: plan\n'));
});
test('historical package replay accepts only the exact guidance additions', () => {
  // Replay the complete package that owned this historical contract. The live
  // package/commands remain checked independently by the two tests above.
  const archived = JSON.parse(readFileSync('tests/fixtures/guidance-package-1057.json', 'utf8'));
  assert.equal(archived.sourceCommit, '1057b009fbb9f3748a69ffe68a2cf8a3410fa30a');
  assert.equal(archived.path, 'package.json');
  assert.equal(archived.blobSha, 'd300a838ddfae396438ca323ca92b0a3adbd2ab4');
  assert.equal(archived.sha256, '9736ee15b4d42e9703663ec92a7c1cf4a53001e2e24df951022cc5940e57e378');
  const current = archived.source;
  assert.equal(createHash('sha256').update(current).digest('hex'), archived.sha256);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(current)}\0`).update(current).digest('hex'), archived.blobSha);
  assert.doesNotThrow(() => preRetirementSource('package.json', current));
  for (const changed of [
    current.replace('node scripts/check-agent-guidance.mjs', 'node scripts/other.mjs'),
    current.replace('npm run check:guidance && ', 'npm run unknown && '),
    current.replace('npm run check:syntax', 'npm run unknown'),
    current.replace('"version": "0.11.0"', '"version": "1.0.0"'),
  ]) {
    assert.notEqual(changed, current);
    assert.throws(() => preRetirementSource('package.json', changed), /drift/);
  }
});
test('small adapters resolve links relative to their own directory', t => {
  assert.deepEqual(fixture(t).errors, []);
});
test('both line and Unicode character budgets fail closed', t => {
  assert.match(fixture(t, { 'AGENTS.md': '# Rules\n'.repeat(81) }).errors.join('\n'), /budget exceeded/);
  assert.match(fixture(t, { 'AGENTS.md': '规'.repeat(5001) }).errors.join('\n'), /budget exceeded/);
  assert.match(fixture(t, { 'CLAUDE.md': '[Rules](AGENTS.md)\n' + 'a'.repeat(1000) }).errors.join('\n'), /budget exceeded/);
});
test('missing files, broken links and paths outside the repo are rejected', t => {
  const result = fixture(t, {
    'CLAUDE.md': null,
    'AGENTS.md': '[missing](docs/missing.md)\n[outside](../package.json)\n[directory](docs)\n[drive](C:/outside.md)\n[file](file:///outside)\n',
  });
  assert.equal(result.errors.length, 6);
  assert.match(result.errors.join('\n'), /missing guidance/);
  assert.equal(result.errors.filter(e => e.includes('invalid local link')).length, 5);
});
test('unknown commands and policy copies in adapters are rejected', t => {
  const result = fixture(t, {
    'AGENTS.md': '`npm run nonexistent`\n',
    'CLAUDE.md': '[Guide](docs/guide.md)\n## Duplicate rules\n',
  });
  assert.equal(result.errors.length, 3);
  assert.match(result.errors.join('\n'), /unknown npm script/);
  assert.match(result.errors.join('\n'), /adapter must link/);
  assert.match(result.errors.join('\n'), /must not add policy/);
});

test('counts additions and deletions in production separately from tests and evidence', () => {
  const input = '200\t200\tsrc/a.lua\0' + '450\t0\ttests/a.test.mjs\0' + '-\t-\tdocs/evidence/log.gz\0';
  assert.deepEqual(assessSlice(input), {
    lines: 850, files: 3, productionLines: 400, productionFiles: 1, productionBinaries: 0, evidenceLines: 0, evidenceFiles: 1, decision: 'WITHIN_BUDGET',
  });
  assert.equal(assessSlice(input + '0\t1\tconfig/x.json\0').decision, 'SPLIT_REQUIRED');
});

test('requires a reason and verification for an oversized slice', () => {
  const rows = Array.from({ length: 11 }, (_, i) => `1\t0\tdata/${i}.json\0`).join('');
  assert.equal(assessSlice(rows, 'Slice-exception: atomic | interface migration |').decision, 'SPLIT_REQUIRED');
  assert.equal(assessSlice(rows, 'Slice-exception: atomic | interface migration | npm run test:related').decision, 'REVIEW_EXCEPTION');
  assert.equal(assessSlice(rows, '<!--\nSlice-exception: atomic | placeholder | placeholder\n-->').decision, 'SPLIT_REQUIRED');
  assert.equal(assessSlice('-\t-\tsrc/asset.bin\0').decision, 'SPLIT_REQUIRED');
});

test('large tests, fixtures, snapshots and verification evidence do not consume the production budget', () => {
  const paths = [
    ...Array.from({ length: 11 }, (_, i) => `tests/fixtures/${i}.json`),
    ...Array.from({ length: 11 }, (_, i) => `docs/evidence/${i}.log`),
    'tests/necessary.test.mjs', 'tests/snapshots/expected.snap',
    'scripts/check-license.test.mjs', 'tools/card-value-feedback/fixture.lua',
    'experiments/figma-map-native-spike/tests/curve.lua',
    'experiments/lumine-native-fit/evidence/validation.json',
  ];
  const exempt = paths.map(path => `401\t0\t${path}\0`).join('');
  const small = '200\t200\tsrc/a.lua\0';
  const result = assessSlice(small + exempt + '-\t-\t.artifacts/run.log.gz\0');
  assert.equal(result.decision, 'WITHIN_BUDGET');
  assert.equal(result.productionLines, 400);
  assert.equal(result.productionFiles, 1);
  assert.equal(result.evidenceLines, 12 * 401);
  assert.equal(result.evidenceFiles, 13);
});

test('production scripts, config and build files still count regardless of names', () => {
  for (const path of [
    'scripts/test-affected.mjs', 'scripts/unregistered.test.mjs', 'scripts/build-ui.mjs',
    'src/generated/snapshot.lua', 'src/tests/runtime.lua', 'config/validation.log',
    'tools/card-value-feedback/build-fixture.mjs', 'package-lock.json', '.github/workflows/quality.yml',
  ]) {
    assert.equal(assessSlice(`401\t0\t${path}\0`).decision, 'SPLIT_REQUIRED', path);
  }
});

test('hosted size check binds both exact PR parents and consumes the visible exception', t => {
  const root = mkdtempSync(join(tmpdir(), 'pr-slice-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '--initial-branch=develop', '--quiet');
  git('config', 'user.name', 'Integration fixture');
  git('config', 'user.email', 'integration@example.invalid');
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'runtime.lua'), 'local runtime\n'.repeat(250));
  git('add', 'src');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD');
  function candidate(branch, change) {
    git('checkout', '-qb', branch, base);
    change();
    git('add', '-A');
    git('commit', '-qm', branch);
    const head = git('rev-parse', 'HEAD');
    git('checkout', '--detach', '-q', base);
    git('merge', '--no-ff', '-qm', 'candidate', head);
    return { head, merge: git('rev-parse', 'HEAD') };
  }

  const event = join(root, 'event.json');
  function run({ head, merge }, ref, sha, body = '') {
    git('checkout', '--detach', '-q', merge);
    writeFileSync(event, JSON.stringify({ pull_request: { base: { ref, sha }, head: { sha: head }, body } }));
    return spawnSync(process.execPath, ['--input-type=module', '-e',
      `import { checkHostedSlice } from ${JSON.stringify(new URL('../scripts/check-pr-slice.mjs', import.meta.url).href)}; checkHostedSlice();`],
      { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_EVENT_PATH: event, GITHUB_SHA: merge } });
  }
  const small = candidate('small', () => writeFileSync(join(root, 'src', 'small.lua'), 'return 1\n'));
  const large = candidate('large', () => writeFileSync(join(root, 'src', 'large.lua'), 'local row\n'.repeat(401)));
  const moved = candidate('moved', () => {
    mkdirSync(join(root, 'tests'));
    git('mv', 'src/runtime.lua', 'tests/runtime.test.lua');
  });
  const exception = 'Slice-exception: atomic | compatibility migration | npm run test:related';
  for (const ref of ['develop', 'release/v2.0.0']) {
    const withinBudget = run(small, ref, base);
    assert.equal(withinBudget.status, 0, withinBudget.stderr);
    assert.match(withinBudget.stdout, /WITHIN_BUDGET/, ref);
    const wrongBase = run(large, ref, large.head);
    assert.notEqual(wrongBase.status, 0, ref);
    assert.match(wrongBase.stderr, /differs from the event HEAD\/BASE/, ref);
    const oversized = run(large, ref, base);
    assert.notEqual(oversized.status, 0, ref);
    assert.match(oversized.stderr, /Split the production change/, ref);
    const reviewed = run(large, ref, base, exception);
    assert.equal(reviewed.status, 0, reviewed.stderr);
    assert.match(reviewed.stdout, /REVIEW_EXCEPTION/, ref);
    const movedProduction = run(moved, ref, base);
    assert.notEqual(movedProduction.status, 0, ref);
    assert.match(movedProduction.stdout, /"productionLines":500,"productionFiles":2/, ref);
    assert.match(movedProduction.stderr, /Split the production change/, ref);
  }
  assert.equal(run(large, 'master', base).stdout, '');

});
