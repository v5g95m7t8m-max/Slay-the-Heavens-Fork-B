import {capacityPreflightSource} from './helpers/release-capacity-preflight-source.mjs';
import {enemyFastSource} from './helpers/release-enemy-fast-source.mjs';
import {releaseFreezeCiBefore} from './helpers/release-selection-map-ci-source.mjs';
import test from 'node:test';
import {historicalTest} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileFunction } from 'node:vm';
import { originalWorkflow } from './helpers/ci-runtime-workflow.mjs';
import { beforePlatformWorkflow } from './helpers/platform-load-wiring.mjs';
import { beforeDraftQualityWorkflow, draftQualityWorkflowEdits } from './helpers/draft-quality-workflow.mjs';
import { beforeAutoMergeWorkflow, beforeExecutionTimeoutWorkflow } from './helpers/auto-merge-workflow.mjs';
import {closeoutRead,closeoutInventory} from './helpers/closeout-ci-source.mjs';
import {beforeHostedCheckoutWorkflow} from './helpers/hosted-checkout-workflow.mjs';

const rawWorkflow = readFileSync('.github/workflows/quality.yml', 'utf8').replaceAll('\r\n', '\n');
const workflow = enemyFastSource('.github/workflows/quality.yml',rawWorkflow,'release');
const job = (name,source=workflow) => source.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|(?![\\s\\S]))`, 'm'))[1];
const digest = text => createHash('sha256').update(text).digest('hex');

test('raw Release controls use standard hosted runners with only the three runner labels changed',()=>{
 let restored=rawWorkflow;
 for(const name of ['impact','check','engineering-posix']){
  const current=job(name,rawWorkflow),previous=job(name,workflow);
  assert.match(current,/^    runs-on: ubuntu-24\.04$/m);
  assert.equal((current.match(/^    runs-on:/gm)??[]).length,1,name+' single runner');
  const prior=current.replace('    runs-on: ubuntu-24.04','    runs-on: ubuntu-slim');
  assert.equal(prior,previous,name+' retains every condition, permission, dependency and timeout');
  restored=restored.replace(current,prior);
 }
 assert.equal(restored,workflow,'all other Release workflow bytes retain the exact af77 parent');
 assert.notEqual(rawWorkflow,workflow);
 assert.equal((rawWorkflow.match(/^    runs-on: ubuntu-slim$/gm)??[]).length,0);
 for(const path of ['.github/workflows/quality.yml','tests/ci-summary-runners.test.mjs']){
  const raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  for(const eol of ['\n','\r\n']){
   const source=raw.replaceAll('\n',eol),prior=enemyFastSource(path,source,'release');
   assert.equal(capacityPreflightSource(path,source,'preflight'),prior);
   for(const bad of [source+eol,source.slice(1),raw.replaceAll('\n','\r\r\n'),null,{},17,Buffer.from(source)])
    assert.strictEqual(capacityPreflightSource(path,bad,'preflight'),bad);
   for(const foreign of ['foreign/'+path,'__proto__','constructor','src/lua/abyss_run.lua'])
    assert.strictEqual(capacityPreflightSource(foreign,source,'preflight'),source);
   assert.strictEqual(capacityPreflightSource(path,source,'foreign'),source);
   for(const before of [{},{sha256:'0'.repeat(64)}])assert.strictEqual(capacityPreflightSource(path,source,'preflight',before),source);
  }
 }
});

test('only the lightweight impact planner and two required summaries use slim', () => {
  assert.equal((workflow.match(/^    runs-on: ubuntu-slim$/gm) ?? []).length, 3);
  const impact = job('impact');
  assert.match(impact, /^    runs-on: ubuntu-slim$/m);
  assert.match(impact, /^    timeout-minutes: 3$/m);
  assert.match(impact, /node-version: '24\.18\.0'/);
  assert.match(impact, /npm ci --ignore-scripts/);
  assert.match(impact, /run: npm run check:guidance/);
  assert.match(impact, /run: node scripts\/ci-impact\.mjs/);
  assert.doesNotMatch(impact, /^    needs:|continue-on-error:/m);
  assert.match(impact, /^    if: github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false$/m);
  assert.match(impact,/^    permissions:\n      contents: read\n      actions: read\n      pull-requests: read\n      statuses: write$/m);
  for (const name of ['check', 'engineering-posix']) {
    const body = job(name);
    assert.match(body, /^    runs-on: ubuntu-slim$/m);
    assert.match(body, /^    timeout-minutes: 2$/m);
    assert.match(body, /^    if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false\) \}\}$/m);
    assert.doesNotMatch(body, /continue-on-error:|^    name:/m);
    if(name==='engineering-posix')assert.doesNotMatch(body,/uses:|permissions:/m);
    else{
      assert.match(body,/^    permissions:\n      contents: read\n      actions: read\n      pull-requests: read\n      statuses: write$/m);
      assert.match(body,/persist-credentials: false/);
      assert.match(body,/node-version: '24\.18\.0'/);
      assert.match(body,/run: node scripts\/publish-full-quality\.mjs/);
    }
  }
  assert.match(job('check'), /^    needs: \[impact, rules, fast, presentation, engineering-posix\]$/m);
  assert.match(job('engineering-posix'), /^    needs: \[impact, engineering-posix-shards, fast\]$/m);
  assert.match(job('presentation'), /^    runs-on: ubuntu-24\.04$/m);
  assert.match(job('engineering-posix-shards'), /^    runs-on: ubuntu-24\.04$/m);
  assert.match(job('rules'), /\|\| 'windows-2025'/);
});

test('draft Quality is deferred, Ready and integration retain the real gates', () => {
  const types = workflow.match(/^    types: \[([^\]]+)\]/m)[1].split(',').map(value => value.trim());
  for (const type of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft', 'labeled', 'unlabeled'])
    assert.ok(types.includes(type), type);
  assert.match(workflow, /^  cancel-in-progress: true$/m);
  for (const name of ['impact', 'presentation', 'check', 'engineering-posix']) {
    const condition = job(name).match(/^    if: (.+)$/m)?.[1];
    assert.ok(condition, name + ' must explicitly gate drafts');
    const expression = condition.replace(/^\$\{\{\s*|\s*\}\}$/g, '');
    const evaluate = compileFunction('return (' + expression + ');', ['github', 'cancelled', 'needs']);
    for (const draft of [true, false]) {
      const github = {event_name: 'pull_request', event: {pull_request: {draft}}};
      const needs={impact:{result:draft?'skipped':'success'}};
      assert.equal(evaluate(github, () => false, needs), !draft, name + '/draft=' + draft);
      if (['check', 'engineering-posix', 'presentation'].includes(name))
        assert.equal(evaluate(github, () => true, needs), false, name + '/cancelled');
    }
    for (const event_name of ['merge_group', 'push', 'workflow_dispatch'])
      assert.equal(evaluate({event_name, event: {}}, () => false, {impact:{result:'success'}}), true, name + '/' + event_name);
    if(name==='presentation')for(const result of ['failure','cancelled','skipped'])
      assert.equal(evaluate({event_name:'pull_request',event:{pull_request:{draft:false}}},()=>false,{impact:{result}}),false,'presentation rejects '+result);
  }
  const fast = job('fast');
  assert.match(fast, /^        os: \[ubuntu-24\.04, windows-2025\]$/m);
  assert.match(fast, /^    timeout-minutes: \$\{\{ matrix\.os == 'windows-2025' && 45 \|\| 30 \}\}$/m);
  assert.match(job('rules'), /timeout-minutes: \$\{\{ inputs\.runner_pool == 'local-special' && 75 \|\| 45 \}\}/);
  assert.match(job('engineering-posix-shards'), /^    timeout-minutes: 30$/m);
});

test('[historical PR620 workflow] complete Draft/Fast projection restores exact develop workflow bytes with LF and CRLF', () => {
  const workflow=closeoutRead('pr620')('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
  // Git blob 2d41d729 at develop 1eb28847, independently obtained before #584.
  const expected = 'aeb022f9209eda1311f3893acefc2c55a8d75c497b3b950a276d609964ea7535';
  for (const eol of ['\n', '\r\n']) {
    const current = releaseFreezeCiBefore('.github/workflows/quality.yml', workflow).replaceAll('\n', eol);
    const old = beforeDraftQualityWorkflow(current);
    assert.notEqual(old, current);
    assert.equal(createHash('sha256').update(old.replaceAll('\r\n', '\n')).digest('hex'), expected);
    assert.equal(old.replaceAll(eol, ''), old.replaceAll(/\r?\n/g, ''), 'preserve uniform input endings');
    assert.equal(beforeDraftQualityWorkflow(old), old, 'old snapshots pass through unchanged');
    assert.equal(beforeDraftQualityWorkflow(old + '# unrelated\n'), old + '# unrelated\n');
    assert.equal(beforeExecutionTimeoutWorkflow(current), beforeExecutionTimeoutWorkflow(old));
    assert.equal(beforeAutoMergeWorkflow(current.replaceAll('\r\n', '\n')),
      beforeAutoMergeWorkflow(old.replaceAll('\r\n', '\n')));
    assert.equal(typeof beforeAutoMergeWorkflow(current.replaceAll('\r\n', '\n')), 'string');
  }
});

test('Draft/Fast projection refuses every partial migration, duplicate and changed policy block', () => {
  for (const eol of ['\n', '\r\n']) {
    const current = releaseFreezeCiBefore('.github/workflows/quality.yml', workflow).replaceAll('\n', eol);
    const edits = draftQualityWorkflowEdits.map(pair => pair.map(value => value.replaceAll('\n', eol)));
    for (let mask = 1; mask < 2 ** edits.length; mask++) {
      let partial = current;
      for (let i = 0; i < edits.length; i++) if (mask & (1 << i)) partial = partial.replace(edits[i][1], edits[i][0]);
      assert.notEqual(partial, current);
      assert.equal(beforeDraftQualityWorkflow(partial), partial, 'partial migration ' + mask);
    }
    for (const [, after] of edits) {
      const duplicate = current + after;
      assert.equal(beforeDraftQualityWorkflow(duplicate), duplicate, 'duplicate reviewed block');
      const altered = current.replace(after, after.replace(/\S/, '?'));
      assert.notEqual(altered, current);
      assert.equal(beforeDraftQualityWorkflow(altered), altered, 'edited reviewed block');
    }
    for (const altered of [
      current.replace('converted_to_draft', 'closed'),
      current.replace("matrix.os == 'windows-2025' && 45 || 30", "matrix.os == 'windows-2025' && 46 || 30"),
      current.replace('draft == false', 'draft == true'),
      current.replace('if: ${{ !cancelled() &&', 'if: ${{ always() &&'),
    ]) {
      assert.notEqual(altered, current);
      assert.equal(beforeDraftQualityWorkflow(altered), altered);
      assert.equal(beforeAutoMergeWorkflow(altered.replaceAll('\r\n', '\n')), null);
    }
  }
});

test('Draft/Fast projection preserves unrelated drift and never partially restores execution slack', () => {
  for (const eol of ['\n', '\r\n']) {
    const current = releaseFreezeCiBefore('.github/workflows/quality.yml', workflow).replaceAll('\n', eol);
    for (const [from, to] of [['contents: read', 'contents: write'], ['max-parallel: 12', 'max-parallel: 13'],
      ['npm run check:engineering', 'npm run check:missing']]) {
      const drift = current.replace(from, to), projected = beforeDraftQualityWorkflow(drift);
      assert.notEqual(drift, current);
      assert.ok(projected.includes(to), 'unrelated bytes survive projection');
      assert.notEqual(createHash('sha256').update(projected.replaceAll('\r\n', '\n')).digest('hex'),
        'aeb022f9209eda1311f3893acefc2c55a8d75c497b3b950a276d609964ea7535');
    }
    for (const [from, to] of [['75 || 45', '75 || 46'], ['timeout-minutes: 30', 'timeout-minutes: 31'],
      ['Files execute once.', 'Files execute twice.']]) {
      const drift = current.replace(from, to);
      assert.notEqual(drift, current);
      assert.equal(beforeExecutionTimeoutWorkflow(drift), drift, 'incomplete inner migration remains wholly visible');
    }
  }
});

historicalTest('reviewed summary runner inverse retains the original complete workflow contract', () => {
  const workflow=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
  const expected = 'd44ae4e29ef74a972f329ecdc8f8131c464d30196300a600387479945660d35d';
  assert.equal(digest(originalWorkflow(workflow)), expected);
  assert.equal(digest(originalWorkflow(workflow.replaceAll('\n', '\r\n').replaceAll('\r\n', '\n'))), expected);
  for (const name of ['impact', 'check', 'engineering-posix']) {
    const body = job(name,workflow);
    const timeout = name === 'impact' ? 3 : 2;
    for (const changed of [
      body.replace(`    timeout-minutes: ${timeout}`, `    timeout-minutes: ${timeout + 1}`),
      body.replace('    steps:\n', '    steps:\n      - run: echo unreviewed\n'),
      name === 'impact' ? body.replace('    outputs:', '    if: success()\n    outputs:')
        : body.replace('    if: always()', '    if: success()'),
      body.replace('    runs-on: ubuntu-slim', '    runs-on: ubuntu-24.04'),
      body.replace('    runs-on: ubuntu-slim', '    runs-on: ubuntu-slim\n    runs-on: ubuntu-slim'),
    ]) {
      const drift = workflow.replace(body, changed);
      let rejected = false;
      try { rejected = digest(originalWorkflow(drift)) !== expected; }
      catch { rejected = true; }
      assert.equal(rejected, true, `${name} must not hide unrelated summary changes`);
    }
  }
});

historicalTest('direct platform projection and layered replay share the same exact runner migration', () => {
  const workflow=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
  const historical = workflow.replaceAll('    runs-on: ubuntu-slim\n', '    runs-on: ubuntu-24.04\n');
  const expected = 'c1759c590177f4a2389fa04e700167d0948eae41b9f12e67db4b6bf48f5871ae';
  assert.equal(digest(beforePlatformWorkflow(historical)), expected, 'historical all-VM input remains accepted');
  assert.equal(beforePlatformWorkflow(workflow), beforePlatformWorkflow(historical));
  assert.equal(digest(originalWorkflow(historical)), digest(originalWorkflow(workflow)));
  for (const name of ['impact', 'check', 'engineering-posix']) {
    const body = job(name,workflow);
    for (const changed of [
      body.replace('    runs-on: ubuntu-slim\n', ''),
      body.replace('    runs-on: ubuntu-slim', '    runs-on: ubuntu-24.04'),
      body.replace('    runs-on: ubuntu-slim', '    runs-on: windows-2025'),
      body.replace('    runs-on: ubuntu-slim', '    runs-on: ubuntu-slim\n    runs-on: ubuntu-slim'),
    ]) assert.equal(beforePlatformWorkflow(workflow.replace(body, changed)), null, `${name} malformed or partial migration`);
    assert.equal(beforePlatformWorkflow(workflow.replace(`  ${name}:\n`, `  ${name}:\n${body}  ${name}:\n`)), null, `${name} duplicate job`);
    assert.equal(beforePlatformWorkflow(workflow.replace(`  ${name}:\n${body}`, '')), null, `${name} missing job`);
    const timeout = name === 'impact' ? 3 : 2;
    for (const changed of [
      body.replace(`    timeout-minutes: ${timeout}`, `    timeout-minutes: ${timeout + 1}`),
      body.replace('    steps:\n', '    steps:\n      - run: echo unreviewed\n'),
    ]) assert.notEqual(digest(beforePlatformWorkflow(workflow.replace(body, changed))), expected, `${name} unrelated bytes stay visible`);
  }
  for (const changed of [
    workflow.replace('contents: read', 'contents: write'),
    workflow.replace('    runs-on: ubuntu-24.04', '    runs-on: ubuntu-slim'),
  ]) assert.notEqual(digest(beforePlatformWorkflow(changed)), expected, 'external workflow drift remains visible');
});

import {beforeQualityRatchetWorkflow,qualityRatchetWorkflowGates} from './helpers/quality-ratchet-workflow.mjs';
test('[historical ratchet integration workflow] ratchet gates project only their exact complete placements and preserve current execution',()=>{
 const workflow=beforeHostedCheckoutWorkflow(closeoutRead('qualityRatchetIntegrated')('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n'));
 const beforeSha='28957431693a0c07dedcda5a1b8ffff031f94f93ca838203d65661343b46709d';
 for(const eol of ['\n','\r\n']){
  const live=workflow.replaceAll('\r\n','\n').replaceAll('\n',eol),prior=beforeQualityRatchetWorkflow(live);
  assert.notEqual(prior,live);
  assert.equal(createHash('sha256').update(prior.replaceAll('\r\n','\n')).digest('hex'),beforeSha);
  assert.equal(live.split('run: node scripts/check-quality-ratchet.mjs').length-1,2);
  assert(!prior.includes('run: node scripts/check-quality-ratchet.mjs'));
  assert.equal(beforeQualityRatchetWorkflow(prior),prior);
  for(const gate of qualityRatchetWorkflowGates){
   const block=gate.replaceAll('\n',eol);
   for(const drift of [live.replace(block,''),live+block,live.replace(block,block.replace('QUALITY_RATCHET_BASE','WRONG_BASE')),
    live.replace(block,block.replace('node scripts/check-quality-ratchet.mjs','echo skipped'))]){
    assert.notEqual(drift,live);assert.equal(beforeQualityRatchetWorkflow(drift),drift);
   }
   const moved=live.replace(block,'')+block;assert.notEqual(moved,live);assert.equal(beforeQualityRatchetWorkflow(moved),moved);
  }
  const altered=live.replace('contents: read','contents: write');
  assert(beforeQualityRatchetWorkflow(altered).includes('contents: write'),'unrelated drift remains visible');
  assert.notEqual(createHash('sha256').update(beforeQualityRatchetWorkflow(altered).replaceAll('\r\n','\n')).digest('hex'),beforeSha);
 }
});

test('workflow-only historical views cannot project production sources or test inventories',()=>{
 const raw=Buffer.from('current raw source\r\n'),read=closeoutRead('qualityRatchetIntegrated',()=>raw);
 for(const path of ['src/lua/abyss_game_ui.lua','config/architecture.json','data/relics.json'])assert.strictEqual(read(path),raw,path);
 assert.throws(()=>closeoutInventory(['tests/current.test.mjs'],'qualityRatchetIntegrated'),/workflow-only/);
});

// Authenticate the complete live input before using any historical test fixture.
test('Release freeze fixture continuation rejects unknown paths and all byte drift', () => {
  const predecessors = {
  "tests/ci-summary-runners.test.mjs": "c13e584a22ca96185e638ec5e9da85fc45183eed3bb15c9170508f0385058e28",
  "tests/ci-windows-shape-expansion.test.mjs": "d28a52f2e892ed88e68cbe5fd29d123dfe6a5b86de5d8053b48a6a117504c874",
  "tests/engineering-quality.test.mjs": "202561d7a39e1390441b8ff13c1dacedd29688c48fd6f00524293091d585cd1b",
  "tests/full-quality.test.mjs": "a3e104aba2134af3681eda85522b76b6886a1e040cb4f8cfb557aed6f922db51"
};
  for (const [path, expected] of Object.entries(predecessors)) {
    const live = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
    for (const eol of ['\n', '\r\n']) {
      const source = live.replaceAll('\n', eol);
      assert.equal(digest(releaseFreezeCiBefore(path, source)), expected);
      for (const foreign of [source + eol, source.slice(1), source.replaceAll(eol, '\r\r\n'), null, {}, 17])
        assert.equal(releaseFreezeCiBefore(path, foreign), foreign);
      for (const unknown of ['__proto__', 'constructor', 'foreign/' + path])
        assert.equal(releaseFreezeCiBefore(unknown, source), source);
    }
  }
  assert.match(workflow, /reopened, edited, ready_for_review/);
  assert(workflow.includes('node scripts/check-release-scope.mjs'));
  for (const bad of [workflow + '\n', workflow.replace('reopened, edited,', 'reopened,'),
    workflow.replace('node scripts/check-release-scope.mjs', 'echo bypass')])
    assert.equal(releaseFreezeCiBefore('.github/workflows/quality.yml', bad), bad);
});
