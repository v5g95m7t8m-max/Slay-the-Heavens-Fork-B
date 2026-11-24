import {beforePreflightSource,beforeForkPush} from './helpers/fork-preflight-source.mjs';
import test from 'node:test';
import {historicalTest} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileFunction } from 'node:vm';
import { originalWorkflow } from './helpers/ci-runtime-workflow.mjs';
import { beforePlatformWorkflow } from './helpers/platform-load-wiring.mjs';
import { beforeDraftQualityWorkflow, draftQualityWorkflowEdits } from './helpers/draft-quality-workflow.mjs';
import { beforeAutoMergeWorkflow, beforeExecutionTimeoutWorkflow, beforePosixDeadlineWorkflow, beforeWindowsDeadlineWorkflow, beforeHostedDeadlineWorkflow, beforeHostedWindowsDeadlineWorkflow, beforeHostedWindows180Workflow } from './helpers/auto-merge-workflow.mjs';
import {closeoutRead,closeoutInventory} from './helpers/closeout-ci-source.mjs';
import {beforeHostedCheckoutWorkflow} from './helpers/hosted-checkout-workflow.mjs';

const workflow = beforePreflightSource('.github/workflows/quality.yml', readFileSync('.github/workflows/quality.yml', 'utf8')).replaceAll('\r\n', '\n');
const job = (name,source=workflow) => source.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|(?![\\s\\S]))`, 'm'))[1];
const digest = text => createHash('sha256').update(text).digest('hex');

test('current control jobs use the existing standard hosted pool after slim acquisition failures', () => {
  const current = readFileSync('.github/workflows/quality.yml', 'utf8').replaceAll('\r\n', '\n');
  for (const name of ['impact', 'check', 'engineering-posix']) {
    assert.match(job(name, current), /^    runs-on: ubuntu-24\.04$/m);
    assert.match(job(name, current), new RegExp(`^    timeout-minutes: ${name === 'impact' ? 6 : 2}$`, 'm'));
  }
  assert.match(job('check', current), /^    needs: \[impact, rules, fast, presentation, engineering-posix\]$/m);
  assert.match(job('engineering-posix', current), /^    needs: \[impact, engineering-posix-shards, fast\]$/m);
  const licenses = readFileSync('.github/workflows/licenses.yml', 'utf8').replaceAll('\r\n', '\n');
  assert.match(job('cancel-obsolete-queue', licenses), /^    runs-on: ubuntu-24\.04$/m);
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
    const evaluate = compileFunction('return (' + expression + ');', ['github', 'cancelled']);
    for (const draft of [true, false]) {
      const github = {event_name: 'pull_request', event: {pull_request: {draft}}};
      assert.equal(evaluate(github, () => false), !draft, name + '/draft=' + draft);
      if (['check', 'engineering-posix'].includes(name))
        assert.equal(evaluate(github, () => true), false, name + '/cancelled');
    }
    for (const event_name of ['merge_group', 'push', 'workflow_dispatch'])
      assert.equal(evaluate({event_name, event: {}}, () => false), true, name + '/' + event_name);
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
    const current = workflow.replaceAll('\n', eol);
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
    const current = workflow.replaceAll('\n', eol);
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
    const current = workflow.replaceAll('\n', eol);
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
 const actual=closeoutRead('qualityRatchetIntegrated');
 for(const path of ['scripts/test-affected.mjs','tests/ci-summary-runners.test.mjs']){
  const raw=readFileSync(path);assert.deepEqual(actual(path),raw,'workflow-only preserves actual '+path);
  assert.equal(actual(path,'utf8'),raw.toString('utf8'));
 }
 const raw=Buffer.from('current raw source\r\n'),read=closeoutRead('qualityRatchetIntegrated',()=>raw);
 for(const path of ['src/lua/abyss_game_ui.lua','config/architecture.json','data/relics.json'])assert.strictEqual(read(path),raw,path);
 assert.throws(()=>closeoutInventory(['tests/current.test.mjs'],'qualityRatchetIntegrated'),/workflow-only/);
});

test('preflight continuation authenticates complete LF/CRLF input and rejects foreign or partial bytes',()=>{
 const path='.github/workflows/quality.yml',live=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const before=beforePreflightSource(path,live);assert.notEqual(before,live);
 for(const eol of ['\n','\r\n']){
  const input=live.replaceAll('\n',eol);
  assert.equal(beforePreflightSource(path,input),before.replaceAll('\n',eol));
  for(const drift of [input+'# foreign'+eol,input.replace('contents: read','contents: write'),
   input.replace('    needs: impact'+eol,''),input.replace('run: node scripts/ci-media-lfs.mjs','run: echo forged')])
   assert.equal(beforePreflightSource(path,drift),drift,'unbound workflow stays visible');
 }
 assert.equal(beforePreflightSource(path,live.replaceAll('\n','\r\r\n')),live.replaceAll('\n','\r\r\n'));
 const buffer=Buffer.from(live);assert.equal(beforePreflightSource(path,buffer),buffer);
 assert.equal(beforePreflightSource('foreign.yml',live),live);
 assert.equal(beforePreflightSource(path,before),before);
});

test('combined preflight selects a complete fixed Release predecessor without masking source drift',()=>{
 const path='.github/workflows/quality.yml',live=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const prior=beforePreflightSource(path,live),release=beforePreflightSource(path,live,'release-bootstrap');
 assert.notEqual(prior,release);assert.notEqual(live,release);
 assert.match(release,/release-ci.mjs verify-pr/);assert.doesNotMatch(release,/fork-preflight.mjs/);
 assert.doesNotMatch(prior,/release-ci.mjs verify-pr|fork-preflight.mjs/);
 for(const eol of ['\n','\r\n']){
  const source=live.replaceAll('\n',eol);
  assert.equal(beforePreflightSource(path,source,'release-bootstrap'),release.replaceAll('\n',eol));
  for(const changed of [source+'# foreign'+eol,source.replace('verify-pr','forged'),
   source.replace('run: node scripts/ci-media-lfs.mjs','run: echo skipped')])
   assert.equal(beforePreflightSource(path,changed,'release-bootstrap'),changed);
 }
 const bad=live.replaceAll('\n','\r\r\n');assert.equal(beforePreflightSource(path,bad,'release-bootstrap'),bad);
 for(const source of [Buffer.from(live),null,{},17])assert.equal(beforePreflightSource(path,source,'release-bootstrap'),source);
 assert.equal(beforePreflightSource('__proto__',live,'release-bootstrap'),live);
 assert.throws(()=>beforePreflightSource(path,live,'unknown'),/explicit preflight predecessor/);
});


// Deadline inverses retain the complete immutable main-repository sources.
// The separate raw checks below bind the actual Fork push workflow deadlines.
function canonicalMainDeadlineWorkflow(raw){
 const prior=beforeForkPush('.github/workflows/quality.yml',raw);
 assert.notEqual(prior,raw,'complete current Fork source must authenticate before its reviewed predecessor');
 const main=prior.replace("timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 45 }}","timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 180 }}")
  .replace('    runs-on: ubuntu-24.04\n    timeout-minutes: 30\n','    runs-on: ubuntu-24.04\n    timeout-minutes: 90\n');
 assert.equal(digest(main),'7899a7a476886cb59de684117001eba419dbfa1ba926fe5704b4549f4b422b3e','complete reviewed main deadline successor');
 return main;
}

test('reviewed POSIX sixty-minute hard guard preserves exact thirty-minute predecessors and rejects all drift',()=>{
 const actual=beforeHostedDeadlineWorkflow(canonicalMainDeadlineWorkflow(readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n')));
 const physical=beforeWindowsDeadlineWorkflow(actual);
 const body=job('engineering-posix-shards',actual);
 assert.match(body,/^    timeout-minutes: 60$/m);
 assert.match(body,/# performance target; the hard guard allows host variance. Files execute once./);
 assert.match(body,/max-parallel: 12/);
 const previous=physical.replace('    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n','    runs-on: ubuntu-24.04\n    timeout-minutes: 30\n');
 assert.equal(digest(previous),'6e951f39539296339c3ffaaee97d0bdcae4c72e97914ee33fccfb4420fd50adf','immutable physical thirty-minute predecessor');
 for(const eol of ['\n','\r\n']){
  const current=physical.replaceAll('\n',eol),old=previous.replaceAll('\n',eol);
  assert.equal(beforePosixDeadlineWorkflow(current),old);
  assert.equal(beforePosixDeadlineWorkflow(old),old);
  assert.equal(beforeExecutionTimeoutWorkflow(current),beforeExecutionTimeoutWorkflow(old));
 }
 for(const [from,to]of [['timeout-minutes: 60','timeout-minutes: 61'],['contents: read','contents: write'],
  ['max-parallel: 12','max-parallel: 13'],['npm run check:engineering','npm run check:missing'],
  ['timeout-minutes: 60','timeout-minutes: 60\n    timeout-minutes: 60']]){
  const changed=physical.replace(from,to);assert.notEqual(changed,physical);
  assert.equal(beforePosixDeadlineWorkflow(changed),changed,'unknown policy bytes must remain visible');
  assert.equal(beforeExecutionTimeoutWorkflow(changed),changed,'unknown sixty-minute source cannot inherit historical execution slack');
 }
 assert.equal(beforePosixDeadlineWorkflow(physical+'# foreign\n'),physical+'# foreign\n');
});

test('reviewed Windows seventy-five-minute hard guard retains its exact forty-five-minute predecessor and rejects drift',()=>{
 const physical=beforeHostedDeadlineWorkflow(canonicalMainDeadlineWorkflow(readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n')));
 const rules=job('rules',physical);
 const deadline="timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 75 }}";
 assert.ok(rules.includes(deadline),'ordinary and local-special Full retain explicit seventy-five-minute limits');
 assert.match(rules,/# Thirty minutes is a performance target/);
 assert.match(job('engineering-posix-shards',physical),/^    timeout-minutes: 60$/m);
 const previous=physical.replace(deadline,deadline.replace('|| 75','|| 45'));
 assert.equal(digest(previous),'9f0a309dffe7a8a356d895d1ed03b167499cb1f296e80c27fa87d38e357eb08b');
 for(const eol of ['\n','\r\n']){
  const current=physical.replaceAll('\n',eol),old=previous.replaceAll('\n',eol);
  assert.equal(beforeWindowsDeadlineWorkflow(current),old);
  assert.equal(beforeWindowsDeadlineWorkflow(old),old);
  assert.equal(beforeExecutionTimeoutWorkflow(current),beforeExecutionTimeoutWorkflow(old));
 }
 for(const [from,to]of [[deadline,deadline.replace('|| 75','|| 76')],
  [deadline,deadline.replace('&& 75','&& 74')],[deadline,deadline+'\n    '+deadline],
  ['contents: read','contents: write'],['max-parallel: 12','max-parallel: 13'],
  ['npm run check:engineering','npm run check:missing']]){
  const changed=physical.replace(from,to);assert.notEqual(changed,physical);
  assert.equal(beforeWindowsDeadlineWorkflow(changed),changed,'foreign Windows guard bytes cannot inherit the predecessor');
  assert.equal(beforeExecutionTimeoutWorkflow(changed),changed,'unreviewed full-source changes remain visible');
 }
 assert.equal(beforeWindowsDeadlineWorkflow(physical+'# foreign\n'),physical+'# foreign\n');
});


test('current hosted 105/90-minute deadlines preserve local 75 and exact complete predecessor checks',()=>{
 const physical=beforeHostedWindowsDeadlineWorkflow(canonicalMainDeadlineWorkflow(readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n')));
 const windows="timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 105 }}";
 assert.ok(job('rules',physical).includes(windows));
 assert.match(job('engineering-posix-shards',physical),/^    timeout-minutes: 90$/m);
 const previous=physical.replace(windows,"timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 75 }}").replace("    runs-on: ubuntu-24.04\n    timeout-minutes: 90\n","    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n");
 assert.equal(digest(previous),'c61bcf8806af9b370342c44a32077c65896fe15d8af097b99ab8342cc257158a');
 for(const cap of [12,6,null]){
  const variant=text=>cap===12?text:text.replace('      max-parallel: 12\n',cap===null?'':`      max-parallel: ${cap}\n`);
  for(const eol of ['\n','\r\n']){
   const current=variant(physical).replaceAll('\n',eol),old=variant(previous).replaceAll('\n',eol);
   assert.equal(beforeHostedDeadlineWorkflow(current),old);
   assert.equal(beforeHostedDeadlineWorkflow(old),old);
   assert.equal(beforeWindowsDeadlineWorkflow(current),beforeWindowsDeadlineWorkflow(old));
   assert.equal(beforeExecutionTimeoutWorkflow(current),beforeExecutionTimeoutWorkflow(old));
  }
 }
 for(const [from,to]of [[windows,windows.replace('|| 105','|| 106')],[windows,windows.replace('&& 75','&& 74')],
  [windows,"timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 75 }}"],['timeout-minutes: 90','timeout-minutes: 60'],
  [windows,windows+'\n    '+windows],['timeout-minutes: 90','timeout-minutes: 90\n    timeout-minutes: 90'],
  ['contents: read','contents: write'],['max-parallel: 12','max-parallel: 13'],['npm run check:engineering','npm run check:missing']]){
  const changed=physical.replace(from,to);assert.notEqual(changed,physical);
  assert.equal(beforeHostedDeadlineWorkflow(changed),changed);
  assert.equal(beforeExecutionTimeoutWorkflow(changed),changed,'unknown complete source must retain its actual bytes');
 }
 for(const changed of [physical+'# foreign\n',physical.replaceAll('\n','\r\r\n')])assert.equal(beforeHostedDeadlineWorkflow(changed),changed);
});


test('current hosted Windows 150-minute guard retains exact ee105, local75 and POSIX90',()=>{
 const physical=beforeHostedWindows180Workflow(canonicalMainDeadlineWorkflow(readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n'))),deadline="timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 150 }}";
 assert.ok(job('rules',physical).includes(deadline));
 assert.match(job('engineering-posix-shards',physical),/^    timeout-minutes: 90$/m);
 const previous=physical.replace(deadline,"timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 105 }}");
 assert.equal(digest(previous),'58763ef02fe4ebd955198bfa47b84c5de49497c378339b931cd1ebb556bd0688');
 for(const cap of [12,6,null]){
  const variant=s=>cap===12?s:s.replace('      max-parallel: 12\n',cap===null?'':`      max-parallel: ${cap}\n`);
  for(const eol of ['\n','\r\n']){
   const current=variant(physical).replaceAll('\n',eol),old=variant(previous).replaceAll('\n',eol);
   assert.equal(beforeHostedWindowsDeadlineWorkflow(current),old);
   assert.equal(beforeHostedWindowsDeadlineWorkflow(old),old);
   assert.equal(beforeHostedDeadlineWorkflow(current),beforeHostedDeadlineWorkflow(old));
   assert.equal(beforeExecutionTimeoutWorkflow(current),beforeExecutionTimeoutWorkflow(old));
  }
 }
 for(const [from,to]of [[deadline,deadline.replace('|| 150','|| 151')],[deadline,deadline.replace('&& 75','&& 74')],
  ['timeout-minutes: 90','timeout-minutes: 91'],[deadline,deadline+'\n    '+deadline],
  ['contents: read','contents: write'],['max-parallel: 12','max-parallel: 13'],['npm run check:engineering','npm run check:missing']]){
  const changed=physical.replace(from,to);assert.notEqual(changed,physical);
  assert.equal(beforeHostedWindowsDeadlineWorkflow(changed),changed);
  assert.equal(beforeExecutionTimeoutWorkflow(changed),changed);
 }
 for(const changed of [physical+'# foreign\n',physical.replaceAll('\n','\r\r\n')])assert.equal(beforeHostedWindowsDeadlineWorkflow(changed),changed);
});


test('current hosted Windows 180-minute guard restores exact ed150 and retains local75 and POSIX90',()=>{
 const raw=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 assert.match(job('rules',raw),/timeout-minutes: \$\{\{ inputs.runner_pool == 'local-special' && 75 \|\| 180 \}\}/);
 assert.match(job('engineering-posix-shards',raw),/^    timeout-minutes: 90$/m);
 for(const changed of [raw,raw.replace('|| 180','|| 181'),raw.replace('timeout-minutes: 90','timeout-minutes: 91')])
  assert.equal(beforeHostedWindows180Workflow(changed),changed,'Fork bytes cannot inherit main-only complete deadline evidence');
 const physical=canonicalMainDeadlineWorkflow(raw),deadline="timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 180 }}";
 assert.ok(job('rules',physical).includes(deadline));
 assert.match(job('engineering-posix-shards',physical),/^    timeout-minutes: 90$/m);
 const previous=physical.replace(deadline,"timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 150 }}");
 assert.equal(digest(previous),'30df7954593676c8b42430a8142ada471a40da421092951d3d089d2a584cbe96');
 for(const cap of [12,6,null]){
  const variant=s=>cap===12?s:s.replace('      max-parallel: 12\n',cap===null?'':`      max-parallel: ${cap}\n`);
  for(const eol of ['\n','\r\n']){
   const current=variant(physical).replaceAll('\n',eol),old=variant(previous).replaceAll('\n',eol);
   assert.equal(beforeHostedWindows180Workflow(current),old);
   assert.equal(beforeHostedWindows180Workflow(old),old);
   assert.equal(beforeHostedWindowsDeadlineWorkflow(current),beforeHostedWindowsDeadlineWorkflow(old));
   assert.equal(beforeExecutionTimeoutWorkflow(current),beforeExecutionTimeoutWorkflow(old));
  }
 }
 for(const [from,to]of [[deadline,deadline.replace('|| 180','|| 181')],[deadline,deadline.replace('&& 75','&& 74')],
  ['timeout-minutes: 90','timeout-minutes: 91'],[deadline,deadline+'\n    '+deadline],
  ['contents: read','contents: write'],['max-parallel: 12','max-parallel: 13'],['npm run check:engineering','npm run check:missing']]){
  const changed=physical.replace(from,to);assert.notEqual(changed,physical);
  assert.equal(beforeHostedWindows180Workflow(changed),changed);
  assert.equal(beforeExecutionTimeoutWorkflow(changed),changed);
 }
 for(const changed of [physical+'# foreign\n',physical.replaceAll('\n','\r\r\n')])assert.equal(beforeHostedWindows180Workflow(changed),changed);
});
