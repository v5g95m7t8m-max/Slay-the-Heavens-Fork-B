import {beforeForkPush} from './helpers/fork-preflight-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync } from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {qualityShardMatrices} from '../scripts/ci-quality-shape.mjs';
import { spawnSync } from 'node:child_process';
import { classifyQueueRisk, impact, queueChanges, replayQueue } from '../scripts/ci-impact.mjs';
const timing = { js: { win32: {}, linux: {} }, lua: {}, unknownJsMs: 1000, unknownLuaMs: 1000 };
const event = { eventName: 'pull_request', base: 'develop' };
const sources = { 'scripts/value.mjs': 'export const value=1;', 'tests/value.test.mjs': 'import {value} from "../scripts/value.mjs";' };
test('Full and prose routes do not read inputs for an unused test graph', () => {
  const read = () => assert.fail('unused source graph');
  for (const eventName of ['merge_group', 'push', 'workflow_dispatch'])
    assert.equal(impact(['scripts/value.mjs'], read, {...event, eventName}, timing).mode, 'full');
  assert.equal(impact(['scripts/ci-impact.mjs'], read, event, timing).mode, 'full');
  assert.equal(impact(['scripts/value.mjs'], read, {...event, forceFull: true}, timing).mode, 'full');
  assert.equal(impact(['docs/CI.md'], read, event, timing).mode, 'fast');
  assert.deepEqual(impact(['scripts/value.mjs'], () => sources, event, timing).js, ['tests/value.test.mjs']);
});

test('Queue replay plans isolated and combined scopes without claiming proven coverage', () => {
  const member = {forceFull: false}, changes = {paths: ['scripts/value.mjs'], unsupported: false};
  const low = classifyQueueRisk(changes, sources, [member]);
  assert.equal(low.risk, 'UNPROVEN');
  assert.equal(low.candidateTier, 'low');
  assert.deepEqual(low.js, ['tests/value.test.mjs']);
  const cross = {paths: [...changes.paths, 'scripts/other.mjs'], unsupported: false};
  const connected = {...sources, 'scripts/other.mjs': 'import "./value.mjs";',
    'tests/cross.test.mjs': 'import "../scripts/other.mjs";'};
  const medium = classifyQueueRisk(cross, connected, [member, member]);
  assert.equal(medium.risk, 'UNPROVEN');
  assert.equal(medium.candidateTier, 'medium');
  assert.deepEqual(medium.js, ['tests/cross.test.mjs', 'tests/value.test.mjs']);
  for (const path of ['src/lua/abyss_combat.lua', 'src/lua/abyss_session.lua', 'art/game.GIL',
    '.github/workflows/quality.yml', 'scripts/verify-delivery.mjs']) {
    assert.equal(classifyQueueRisk({...cross, paths: [...cross.paths, path]}, connected, [member, member]).risk, 'high', path);
  }
  assert.equal(classifyQueueRisk(cross, connected, [member, {forceFull: true}]).risk, 'high');
  assert.match(classifyQueueRisk(cross, connected, [member, {}]).reason, /member labels/);
  assert.equal(classifyQueueRisk({...changes, unsupported: true}, sources, [member]).candidateTier, undefined);
  assert.equal(classifyQueueRisk({...changes, paths: ['unmodelled']}, sources, [member]).candidateTier, undefined);
});

test('a dynamically loaded Lua dependency defeats a Queue coverage candidate', () => {
  const path = 'src/lua/abyss_page_reveal.lua';
  const input = {[path]: 'return {}', 'tests/lua/known.lua': 'require("abyss_page_reveal")',
    'tests/lua/dynamic.lua': 'local loader=require; return loader(select(1, ...))'};
  const plan = classifyQueueRisk({paths: [path], unsupported: false}, input, [{forceFull: false}]);
  assert.equal(plan.risk, 'UNPROVEN');
  assert.match(plan.reason, /Unresolved runtime dependencies/);
  assert.equal(plan.candidateTier, undefined);
  assert.deepEqual(plan.lua, ['tests/lua/dynamic.lua', 'tests/lua/known.lua']);
});

test('Queue comparison verifies the exact parent chain and retains changes reverted by a later member', () => {
  const root = mkdtempSync(join(tmpdir(), 'queue-impact-'));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    const git = (...args) => {
      const result = spawnSync('git', args, {encoding: 'utf8'});
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const commit = message => {
      git('add', '.');
      git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', message);
      return git('rev-parse', 'HEAD');
    };
    git('init', '--quiet');
    writeFileSync('native.gil', 'original\n');
    const base = commit('protected');
    writeFileSync('native.gil', 'first member\n');
    const first = {base, head: commit('first'), forceFull: false};
    writeFileSync('native.gil', 'original\n');
    writeFileSync('notes.md', 'second member\n');
    const second = {base: first.head, head: commit('second'), forceFull: false};
    assert.deepEqual(queueChanges(base, second.head, [first, second]), {paths: ['native.gil', 'notes.md'], unsupported: false});
    assert.equal(classifyQueueRisk(queueChanges(base, second.head, [first, second]), {}, [first, second]).risk, 'high');
    assert.throws(() => queueChanges(base, second.head, [second]), /exact Git parent chain/);
    rmSync('notes.md');
    const next = {base: second.head, head: commit('delete'), forceFull: false};
    assert.equal(queueChanges(second.head, next.head, [next]).unsupported, true);
    mkdirSync('scripts'); mkdirSync('tests');
    writeFileSync('scripts/value.mjs', sources['scripts/value.mjs']);
    writeFileSync('tests/value.test.mjs', sources['tests/value.test.mjs']);
    const mappedBase = commit('mapped baseline');
    writeFileSync('scripts/value.mjs', 'export const value=2;');
    const mappedHead = commit('mapped member');
    rmSync('tests/value.test.mjs');
    const replay = replayQueue({base: mappedBase, head: mappedHead,
      members: [{base: mappedBase, head: mappedHead, forceFull: false}]});
    assert.equal(replay.tree, git('rev-parse', mappedHead + '^{tree}'));
    assert.equal(replay.mode, 'full');
    assert.equal(replay.risk, 'UNPROVEN');
    assert.equal(replay.candidateTier, 'low');
    assert.deepEqual(replay.js, ['tests/value.test.mjs']);
  } finally {
    process.chdir(cwd);
    rmSync(root, {recursive: true, force: true});
  }
});
test('complete mapped set is eligible; unknown, deleted, core and release changes require full', () => {
  const plan = impact(['scripts/value.mjs'], sources, event, timing);
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.js, ['tests/value.test.mjs']);
  for (const path of ['data/cards.json', 'src/lua/abyss_combat.lua', '.github/workflows/quality.yml', 'deleted.mjs', 'docs/design/UI_DESIGN.md'])
    assert.equal(impact([path], sources, event, timing).mode, 'full', path);
  for (const ev of [{ ...event, forceFull: true }, { ...event, base: 'master' }, { ...event, eventName: 'push' }, { ...event, eventName: 'workflow_dispatch' }])
    assert.equal(impact(['scripts/value.mjs'], sources, ev, timing).mode, 'full');
  assert.equal(impact([], sources, event, timing).mode, 'full');
  assert.equal(impact(['scripts/value.mjs'], sources, event, { ...timing, unknownJsMs: 180001 }).mode, 'fast');
});
test('prose allowlist cannot hide additional unmodelled changes', () => {
  assert.equal(impact(['docs/CI.md'], sources, event, timing).mode, 'fast');
  assert.equal(impact(['docs/CI.md', 'unknown'], sources, event, timing).mode, 'full');
});

test('admission control changes require Full even with proven tiny affected tests',()=>{
 for(const name of ['independent-ai-review','arm-auto-merge','verify-delivery','pr-quality-evidence','publish-pr-quality',
  'publish-full-quality','publish-merge-group','merge-queue-admission','merge-queue-policy',
  'ci-impact','ci-fast','ci-timeout-policy','write-ci-receipt','repository-identity']){
  const path=`scripts/${name}.mjs`,input={[path]:'export const value=1;',
   'tests/value.test.mjs':`import {value} from "../${path}";`};
  const selected=impact([path],input,event,timing);
  assert.equal(selected.mode,'full',path);assert.equal(selected.reason,'High risk or shared infrastructure');
 }
});

test('registered UI responsibilities share eligibility with their parent; unknown modules stay full', () => {
  const module = 'src/lua/abyss_battle_render_actors.lua';
  const input = { [module]: 'return {}', 'tests/lua/view.lua': 'require("abyss_battle_render_actors")' };
  const plan = impact([module], input, event, timing);
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.lua, ['tests/lua/view.lua']);
  for (const path of ['src/lua/abyss_new_unclassified.lua', 'src/lua/abyss_combat.lua', 'config/architecture.json'])
    assert.equal(impact([path], { ...input, [path]: 'return {}' }, event, timing).mode, 'full');
});
test('the feedback target and a lone slow file retain the complete affected set', () => {
  const input = {
    'scripts/value.mjs': 'export const value=1;',
    'tests/a.test.mjs': 'import "../scripts/value.mjs";',
    'tests/b.test.mjs': 'import "../scripts/value.mjs";',
    'tests/lua/check.lua': 'return true',
  };
  const weights = { ...timing, js: {
    win32: { 'tests/a.test.mjs': 120000, 'tests/b.test.mjs': 10000 },
    linux: { 'tests/a.test.mjs': 10000, 'tests/b.test.mjs': 120000 },
  }, lua: { 'tests/lua/check.lua': 50000 } };
  const changed = ['scripts/value.mjs', 'tests/lua/check.lua'];
  const plan = impact(changed, input, event, weights);
  assert.equal(plan.mode, 'fast', 'cross-platform slow files do not execute serially on one VM');
  assert.deepEqual(plan.js, ['tests/a.test.mjs', 'tests/b.test.mjs']);
  assert.deepEqual(plan.lua, ['tests/lua/check.lua']);
  assert.equal(plan.estimateMs, 180000);
  assert.equal(plan.exceedsFastTarget, false);
  assert.deepEqual(plan.estimateByPlatformMs, { win32: 180000, linux: 180000 });
  for (const platform of ['win32', 'linux']) {
    const over = structuredClone(weights);
    over.js[platform]['tests/a.test.mjs']++;
    const affected = impact(changed, input, event, over);
    assert.equal(affected.mode, 'fast', `${platform} cost cannot expand test scope`);
    assert.deepEqual(affected.js, plan.js);
    assert.deepEqual(affected.lua, plan.lua);
    assert.equal(affected.exceedsFastTarget, true);
    assert.equal(affected.estimateByPlatformMs[platform], 180001);
    assert.equal(affected.estimateMs, 180001);
  }
  for (const cost of [480001, 1200001, 2700001]) {
    const slower = structuredClone(weights);
    slower.lua['tests/lua/check.lua'] = cost;
    const affected = impact(changed, input, event, slower);
    assert.equal(affected.mode, 'fast');
    assert.deepEqual(affected.js, plan.js);
    assert.deepEqual(affected.lua, plan.lua);
    assert.equal(affected.exceedsFastTarget, true);
  }
  assert.equal(impact([...changed, 'unknown'], input, event, weights).mode, 'full');
  assert.equal(impact([...changed, 'src/lua/abyss_combat.lua'], input, event, weights).mode, 'full');
});

test('distributed measured work beyond a develop Fast job uses the existing Full matrix', () => {
  const input = {
    'scripts/value.mjs': 'export const value=1;',
    'tests/a.test.mjs': 'import "../scripts/value.mjs";',
    'tests/b.test.mjs': 'import "../scripts/value.mjs";',
    'tests/lua/check.lua': 'return true',
  };
  const changed = ['scripts/value.mjs', 'tests/lua/check.lua'];
  const weights = {
    js: {
      win32: { 'tests/a.test.mjs': 1_200_000, 'tests/b.test.mjs': 1_200_000 },
      linux: { 'tests/a.test.mjs': 900_001, 'tests/b.test.mjs': 900_000 },
    },
    lua: { 'tests/lua/check.lua': 900_001 },
    unknownJsMs: 1000,
    unknownLuaMs: 1000,
  };
  const plan = impact(changed, input, event, weights);
  assert.equal(plan.mode, 'full');
  assert.match(plan.reason, /serial Fast job/);
  assert.deepEqual(plan.affectedCounts, { js: 2, lua: 1 });
  assert.deepEqual(plan.measuredRemainderMs, { win32: 2_100_001, linux: 1_800_001 });
  assert.deepEqual(plan.js, []);
  assert.deepEqual(plan.lua, []);

  for (const file of Object.keys(weights.js.linux)) weights.js.linux[file] = 900_000;
  assert.equal(impact(changed, input, event, weights).mode, 'fast', 'equality does not trigger overflow');

  delete weights.js.linux['tests/a.test.mjs'];
  weights.unknownJsMs = 5_400_000;
  assert.equal(impact(changed, input, event, weights).mode, 'fast', 'unmeasured files cannot force Full');

  weights.js.win32['tests/b.test.mjs'] = 1_800_000;
  weights.js.win32['tests/a.test.mjs'] = 1_800_000;
  assert.equal(impact(changed, input, event, weights).mode, 'full', 'Windows alone can exceed its job ceiling');
  assert.equal(impact(changed, input, { ...event, base: 'release/v2.0.0' }, weights).mode, 'fast');

  const workflow = beforeForkPush('.github/workflows/quality.yml',readFileSync('.github/workflows/quality.yml', 'utf8')).replaceAll('\r\n', '\n');
  const fastJob = workflow.split('\n  fast:\n')[1].split('\n  rules:\n')[0];
  assert.match(fastJob, /timeout-minutes: \$\{\{ matrix\.os == 'windows-2025' && 45 \|\| 30 \}\}/);
});

test('actual required gate commands reject every missing, failed, cancelled or skipped selected execution', () => {
  const workflow = beforeForkPush('.github/workflows/quality.yml',readFileSync('.github/workflows/quality.yml', 'utf8')).replaceAll('\r\n', '\n');
  const shell = process.platform === 'win32' ? `${process.env.ProgramFiles}/Git/bin/bash.exe` : '/bin/bash';
  for (const job of ['check', 'engineering-posix']) {
    const body = (workflow + '\n  end:\n').match(new RegExp(`^  ${job}:\\n([\\s\\S]*?)(?=^  [\\w-]+:)`, 'm'))[1];
    const command = body.match(/^        run: \|\n((?:^          .*\n|^\n)*)/m)[1].trim().replaceAll('${{ needs.impact.result }}', '$PLAN').replaceAll('${{ needs.impact.outputs.mode }}', '$MODE').replaceAll('${{ needs.fast.result }}', '$FAST');
    for (const mode of ['full', 'fast', '']) for (const result of ['success', 'failure', 'cancelled', 'skipped', '']) {
      const r = spawnSync(shell, ['-e', '-c', command], { env: { ...process.env, PLAN: 'success', MODE: mode, FAST: result, RULES_RESULT: result, ENGINEERING_RESULT: result }, encoding: 'utf8' });
      assert.ifError(r.error);
      assert.equal(r.status === 0, mode !== '' && result === 'success', `${job}/${mode}/${result}: ${r.stderr}`);
    }
    for (const status of ['failure', 'cancelled', 'skipped', '']) for (const mode of ['fast', 'full']) {
      const r = spawnSync(shell, ['-e', '-c', command], { env: { ...process.env, PLAN: status, MODE: mode, FAST: 'success', RULES_RESULT: 'success', ENGINEERING_RESULT: 'success' }, encoding: 'utf8' });
      assert.ifError(r.error);
      assert.notEqual(r.status, 0, `${job}/${mode} cannot accept ${status || 'missing'} plan`);
    }
    // A status function still runs the gate on failed/skipped dependencies;
    // cancellation must release obsolete runs instead of queuing a summary.
    assert.match(body, /^    if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false\) \}\}$/m);
  }
});

test('actual impact CLI routes Full Fast unknown and merge-group through the complete current matrices',()=>{
 const root=mkdtempSync(join(tmpdir(),'impact-posix15-')),cli=resolve('scripts/ci-impact.mjs');
 const git=(...args)=>{const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.ifError(result.error);assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
 try{
  for(const dir of ['src/lua','scripts','tests','docs'])mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'scripts/ci-test-timings.json'),JSON.stringify(timing));
  writeFileSync(join(root,'docs/CI.md'),'initial\n');
  git('init','--quiet');git('add','.');git('-c','user.name=CI Fixture','-c','user.email=ci@example.invalid','commit','--quiet','-m','initial');
  const base=git('rev-parse','HEAD'),head='a'.repeat(40),ref='refs/heads/gh-readonly-queue/develop/pr-1-fixture';
  for(const scenario of [
   {name:'fast',file:'docs/CI.md',mode:'fast'},
   {name:'full',file:'scripts/ci-quality-shape.mjs',mode:'full'},
   {name:'unknown',file:'unmapped-input',mode:'full'},
   {name:'merge-group',mode:'full',eventName:'merge_group'},
  ]){
   git('reset','--hard',base);git('clean','-fd');
   if(scenario.file){writeFileSync(join(root,scenario.file),'changed\n');git('add','.');git('-c','user.name=CI Fixture','-c','user.email=ci@example.invalid','commit','--quiet','-m',scenario.name);}
   // git does not retain empty directories. The real CLI still scans its three source roots.
   for(const dir of ['src/lua','scripts','tests'])mkdirSync(join(root,dir),{recursive:true});
   const eventPath=join(root,'event.json'),output=join(root,'output'),summary=join(root,'summary');
   const event=scenario.eventName?{action:'checks_requested',merge_group:{head_sha:head,base_sha:base,head_ref:ref,base_ref:'refs/heads/develop'}}:{pull_request:{base:{sha:base,ref:'develop'},head:{sha:head},labels:[]}};
   writeFileSync(eventPath,JSON.stringify(event));
   const env={...process.env,GITHUB_EVENT_PATH:eventPath,GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary,GITHUB_EVENT_NAME:scenario.eventName??'pull_request',GITHUB_SHA:head,GITHUB_REF:ref,GITHUB_RUN_ID:'7',GITHUB_RUN_ATTEMPT:'1'};
   const actual=spawnSync(process.execPath,[cli],{cwd:root,env,encoding:'utf8'});assert.ifError(actual.error);assert.equal(actual.status,0,scenario.name+': '+actual.stderr);
   const plan=JSON.parse(readFileSync(join(root,'ci-impact.json'),'utf8'));assert.equal(plan.mode,scenario.mode);assert.equal(plan.sha,head);
   const emitted=Object.fromEntries(readFileSync(output,'utf8').trim().split('\n').map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
   assert.equal(emitted.mode,scenario.mode);assert.deepEqual(JSON.parse(emitted.windows_shards),qualityShardMatrices.windows);assert.deepEqual(JSON.parse(emitted.posix_shards),qualityShardMatrices.posix);
   assert.equal(JSON.parse(emitted.windows_shards).length,18);assert.equal(JSON.parse(emitted.posix_shards).length,15);
   if(scenario.eventName){
    writeFileSync(eventPath,JSON.stringify({...event,merge_group:{...event.merge_group,head_sha:'b'.repeat(40)}}));
    const denied=spawnSync(process.execPath,[cli],{cwd:root,env,encoding:'utf8'});assert.ifError(denied.error);assert.notEqual(denied.status,0);assert.match(denied.stderr,/Invalid native merge group identity/);
   }
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
import './helpers/release-ci.cases.mjs';
