import {beforeHostedRunnerFallback} from './helpers/hosted-runner-fallback-source.mjs';
import {capacityPreflightSource} from './helpers/release-capacity-preflight-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { selectTests, selectQuickFeedback, selectQuickPlan, executeQuickFeedback } from '../scripts/test-affected.mjs';
import { historicalMonsterUiFixtures } from './helpers/historical-monster-ui-runner.mjs';
import { historicalCardInputFixtures } from './helpers/historical-card-input.mjs';
import { historicalPresentationFixtures } from './helpers/historical-presentation-runner.mjs';
import { eventCombatRouteFixtures, eventCombatRouteInput } from './helpers/event-combat-route-input.mjs';

const plan = { full: false, fast: ['tests/pure.test.mjs'], integration: ['tests/heavy.test.mjs'],
  lua: ['tests/lua/slow.lua', 'tests/lua/direct.lua', 'tests/lua/small.lua', 'tests/lua/new.lua'] };
const timings = { lua: { 'tests/lua/slow.lua': 120000, 'tests/lua/direct.lua': 60000, 'tests/lua/small.lua': 10000 } };

// Exercise the real CLI with normal dependency resolution, observing only graph
// root enumeration. Rejection makes unnecessary corpus IO a deterministic failure.
function probeGraphReads(context, args, { reject = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'abyss-quick-io-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const bootstrap = join(root, 'graph-io.mjs');
  writeFileSync(bootstrap, `
    import fs from 'node:fs';
    import { resolve } from 'node:path';
    import { syncBuiltinESMExports } from 'node:module';
    const roots = new Map(['src/lua', 'scripts', 'tests'].map(path => [resolve(path), path]));
    const reads = [], original = fs.readdirSync;
    fs.readdirSync = function(path, ...args) {
      const root = roots.get(resolve(path));
      if (root) {
        reads.push(root);
        if (${reject}) throw new Error('Unneeded graph enumeration: ' + root);
      }
      return original.call(this, path, ...args);
    };
    syncBuiltinESMExports();
    process.once('exit', () => console.error('Graph root reads: ' + JSON.stringify(reads)));
  `);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; delete env.GITHUB_STEP_SUMMARY;
  const result = spawnSync(process.execPath,
    ['--import', pathToFileURL(bootstrap).href, 'scripts/test-affected.mjs', ...args],
    { encoding: 'utf8', env, windowsHide: true, timeout: 30000 });
  assert.ifError(result.error);
  const observed = result.stderr.match(/^Graph root reads: (.*)$/m);
  assert.ok(observed, result.stderr);
  return { ...result, reads: JSON.parse(observed[1]) };
}

const graphRoots = ['src/lua', 'scripts', 'tests'];
const noInputsReason = 'No explicit change set; run the complete check';
const unmodelledReason = path => `Unmodelled or deleted input: ${path}`;

test('direct changed Lua runs before JS and remaining Lua without duplicate execution', () => {
  const calls = [];
  executeQuickFeedback({fast:['pure'],lua:['related','direct','other-direct']}, ['direct','other-direct'], {
    js: files => calls.push(['js',files]), lua: file => calls.push(['lua',file]),
  });
  assert.deepEqual(calls,[['lua','direct'],['lua','other-direct'],['js',['pure']],['lua','related']]);
});

test('an advisory failure propagates immediately and prevents later tests', () => {
  for(const failure of ['direct','js','related']) {
    const calls = [], error = new Error(failure);
    const step = name => { calls.push(name); if(name===failure) throw error; };
    assert.throws(()=>executeQuickFeedback({fast:['pure'],lua:['related','direct','later']},['direct'],{
      js:()=>step('js'),lua:step,
    }),value=>value===error);
    assert.deepEqual(calls, ['direct','js','related'].slice(0,['direct','js','related'].indexOf(failure)+1));
  }
});

test('quick feedback prioritizes a changed fixture and schedules whole related fixtures within an estimate', () => {
  const result = selectQuickFeedback(plan, ['tests/lua/direct.lua'], timings);
  assert.deepEqual(result, { fast: plan.fast, lua: ['tests/lua/direct.lua', 'tests/lua/small.lua'], estimatedLuaMs: 70000 });
  assert.deepEqual(plan.lua, ['tests/lua/slow.lua', 'tests/lua/direct.lua', 'tests/lua/small.lua', 'tests/lua/new.lua']);
});

test('unknown or unusable timings use a finite conservative scheduling estimate', () => {
  for (const weight of [undefined, -1, 0, NaN, Infinity, '1000']) {
    assert.deepEqual(selectQuickFeedback({ ...plan, lua: ['new'] }, [], { lua: { new: weight } }, 30000).lua, ['new']);
    assert.deepEqual(selectQuickFeedback({ ...plan, lua: ['new'] }, [], { lua: { new: weight } }, 29999).lua, []);
  }
});

test('full fallback does not become a partial success plan', () => {
  assert.deepEqual(selectQuickFeedback({ ...plan, full: true }, [], timings), { fast: [], lua: [], estimatedLuaMs: 0 });
});

test('event route mapping remains complete when transitive feedback exceeds the advisory estimate', () => {
  const [reducers, enemies] = eventCombatRouteFixtures;
  const sources = { [eventCombatRouteInput]: '{}', [reducers]: 'return true', [enemies]: 'return true' };
  const changed = [eventCombatRouteInput, 'tests/fixtures/unknown.json'];
  const weights = { lua: { [reducers]: 17135, [enemies]: 10000 } };
  assert.deepEqual(selectQuickFeedback(selectQuickPlan(changed, sources), changed, weights),
    { fast: [], lua: [enemies, reducers], estimatedLuaMs: 27135 });

  const related = Array.from({ length: 10 }, (_, index) => `tests/lua/related-${index}.lua`);
  for (const path of related) {
    sources[path] = `return dofile('${enemies}')`;
    weights.lua[path] = 8000;
  }
  const full = selectTests(changed, sources);
  assert.equal(full.full, true, 'unknown input still requires the complete gate');
  assert.deepEqual([full.fast, full.integration, full.lua], [[], [], []]);
  const mapped = selectQuickPlan(changed, sources, full);
  assert.deepEqual(mapped, selectTests([eventCombatRouteInput], sources));
  assert.deepEqual(mapped.lua, [reducers, enemies, ...related], 'no mapped fixture is dropped before scheduling');
  const feedback = selectQuickFeedback(mapped, changed, weights);
  assert.deepEqual(feedback, { fast: [], lua: [...related, enemies], estimatedLuaMs: 90000 });
  assert.ok(mapped.lua.includes(reducers), 'the complete route fixture remains deferred, not unmapped');
});

test('CI mapped subset remains useful beside unknown inputs while the normal selector still requires full regression', () => {
  const sources = { 'src/lua/abyss_value.lua': 'return {}', 'tests/lua/value.lua': 'return require("abyss_value")' };
  const changed = ['docs/HANDOFF.md', 'src/lua/abyss_value.lua'];
  assert.equal(selectTests(changed, sources).full, true);
  assert.deepEqual(selectQuickPlan(changed, sources).lua, ['tests/lua/value.lua']);
  assert.equal(selectQuickPlan(['docs/HANDOFF.md'], sources).full, true);
});

test('mixed advisory changes build the graph once and ignore every unmapped input', () => {
  let reads=0;
  const sources={
    get 'scripts/value.mjs'(){reads++;return 'export const value=1';},
    'scripts/unmapped.mjs':'return true',
    'src/lua/unmapped.lua':'return true',
    'tests/first.test.mjs':'import "../scripts/value.mjs"',
    'tests/second.test.mjs':'return true',
    'tests/dynamic.test.mjs':'runLua(path)',
  };
  const changed=['docs/HANDOFF.md','scripts/value.mjs','tests/second.test.mjs',
    'scripts/unmapped.mjs','src/lua/unmapped.lua','scripts/test-lua.mjs'];
  const full=selectTests(changed,sources);
  assert.equal(full.full,true);
  const quick=selectQuickPlan(changed,sources,full);
  assert.equal(reads,1,'one graph analysis for the entire mixed changeset');
  assert.deepEqual(quick.fast,['tests/first.test.mjs','tests/second.test.mjs']);
  assert.deepEqual(quick.integration,[],'an unmapped Lua input cannot expand advisory coverage');
  assert.equal(quick.full,false);
  assert.equal(full.full,true,'complete-gate fallback is unchanged');
});

test('a multi-file advisory with no statically mapped inputs remains unavailable', () => {
  const sources={'scripts/unmapped.mjs':'return true','src/lua/unmapped.lua':'return true',
    'tests/dynamic.test.mjs':'runLua(path)'};
  const plan=selectQuickPlan(['docs/HANDOFF.md','scripts/unmapped.mjs','src/lua/unmapped.lua'],sources);
  assert.equal(plan.full,true);
  assert.deepEqual([plan.fast,plan.integration,plan.lua],[[],[],[]]);
});

test('a hundred-file advisory still reads each graph source once', context => {
  let reads=0;
  const names=Array.from({length:100},(_,index)=>`tests/changed-${index}.test.mjs`);
  const sources=Object.fromEntries(names.map(path=>[path,'return true']));
  Object.defineProperty(sources,'scripts/value.mjs',{enumerable:true,get(){reads++;return 'export const value=1';}});
  const started=performance.now();
  const plan=selectQuickPlan(['docs/unknown.md',...names],sources);
  context.diagnostic(`100-file advisory planning: ${(performance.now()-started).toFixed(2)} ms`);
  assert.equal(reads,1);
  assert.equal(plan.full,false);assert.deepEqual(plan.fast,names);
});

for (const [helper, fixtures] of [
  ['historical-presentation-runner', historicalPresentationFixtures],
  ['historical-monster-ui-runner', historicalMonsterUiFixtures],
  ['historical-card-input', historicalCardInputFixtures],
]) test(`${helper} changes select every conditional fixture and exclude unrelated wrappers`, () => {
  const path = `tests/helpers/${helper}.mjs`;
  const sources = {
    [path]: 'export const setup=1',
    ...Object.fromEntries(fixtures.map(fixture => [fixture, 'return true'])),
    'scripts/test-lua.mjs': `import {setup} from '../${path}'; export function runLua(path){}`,
    'tests/lua/unrelated.lua': 'return true',
    'tests/unrelated.test.mjs': 'import {runLua} from "../scripts/test-lua.mjs"; runLua("tests/lua/unrelated.lua")',
    'tests/conditional.test.mjs': `import {runLua} from '../scripts/test-lua.mjs'; runLua('${fixtures[0]}')`,
  };
  const plan = selectTests([path], sources);
  assert.equal(plan.full, false);
  assert.deepEqual(plan.lua, fixtures);
  assert.deepEqual(plan.integration, ['tests/conditional.test.mjs']);
  if(helper==='historical-presentation-runner') {
    const archive='tests/fixtures/pr323-historical-fixtures.json.gz';
    assert.equal(fixtures.length,7,'trace, wording and all five Sapphire entries');
    assert.equal(selectTests([archive,path],sources).full,true,'archive changes still require Full');
    assert.deepEqual(selectQuickPlan([archive,path],sources).lua,fixtures,'mixed advisory retains every mapped runtime entry');
    assert.equal(selectQuickPlan([archive],sources).full,true,'archive-only advisory cannot claim a partial test pass');
  }
});

for (const flag of ['--fast', '--ci-fast']) for (const changed of [[], ['docs/HANDOFF.md']]) {
test(`${flag} ${changed.length ? 'unmapped' : 'empty'} fallback reports the full gate without graph IO or a duplicate suite`, context => {
  const result = probeGraphReads(context, [flag, '--files', ...changed], { reject: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.reads, []);
  assert.ok(result.stdout.includes(`Complete Quality required: ${changed.length ? unmodelledReason(changed[0]) : noInputsReason}.`));
  const plan = JSON.parse(result.stdout.slice(0, result.stdout.indexOf('\nFeedback timing:')));
  assert.equal(plan.full, true);
  assert.deepEqual(plan.changed, changed);
  assert.deepEqual([plan.fast, plan.integration, plan.lua], [[], [], []]);
  assert.deepEqual(plan.feedback, { fast: [], lua: [], estimatedLuaMs: 0 });
  assert.match(result.stdout, /Quick feedback unavailable. No tests run here; parallel complete Quality is required/);
  assert.match(result.stdout, /not a regression pass/);
  assert.match(result.stdout, /Feedback timing: plan \d+ ms\./);
  assert.doesNotMatch(result.stdout, /Completed|> slay-the-abyss/);
});
}

for (const changed of [[], ['docs/HANDOFF.md'], ['docs\\HANDOFF.md', 'data/cards.json', 'tests/fixtures/unknown.json']]) {
test(`related plan avoids graph IO for wholly unmodelled inputs: ${JSON.stringify(changed)}`, context => {
  const result = probeGraphReads(context, ['--plan', '--files', ...changed], { reject: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.reads, []);
  const normalized = changed.map(path => path.replaceAll('\\', '/'));
  assert.deepEqual(JSON.parse(result.stdout), { tier: 'related', changed: normalized, full: true,
    reason: changed.length ? unmodelledReason(normalized[0]) : noInputsReason, fast: [], integration: [], lua: [] });
});
}

test('mixed inputs retain mapped feedback and complete-gate fallback with real graph IO', context => {
  const input = 'tests/lua/combat.lua', args = ['--ci-fast', '--plan', '--files'];
  const alone = probeGraphReads(context, [...args, input]);
  const mixed = probeGraphReads(context, [...args, 'docs/HANDOFF.md', input, 'src/lua/deleted-preflight.lua']);
  for (const result of [alone, mixed]) {
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.reads, graphRoots);
  }
  const direct = JSON.parse(alone.stdout), plan = JSON.parse(mixed.stdout);
  assert.equal(direct.full, false);
  assert.ok(direct.lua.includes(input));
  assert.equal(plan.full, true);
  assert.equal(plan.reason, unmodelledReason('docs/HANDOFF.md'));
  assert.deepEqual([plan.fast, plan.integration, plan.lua], [[], [], []]);
  assert.ok(direct.feedback.lua.includes(input));
  assert.deepEqual(plan.feedback, direct.feedback);
});

test('special event route JSON still loads its graph and retains feedback beside unknown input', context => {
  const unknown = 'tests/fixtures/unknown.json';
  const alone = probeGraphReads(context, ['--ci-fast', '--plan', '--files', eventCombatRouteInput]);
  const result = probeGraphReads(context, ['--ci-fast', '--plan', '--files', eventCombatRouteInput, unknown]);
  for (const observed of [alone, result]) {
    assert.equal(observed.status, 0, observed.stderr);
    assert.deepEqual(observed.reads, graphRoots);
  }
  const direct = JSON.parse(alone.stdout), plan = JSON.parse(result.stdout);
  assert.equal(direct.full, false);
  // The complete mapping retains both routes. Advisory scheduling may defer
  // them when cheaper transitive fixtures fill its unchanged 90-second estimate.
  for (const fixture of eventCombatRouteFixtures) assert.ok(direct.lua.includes(fixture), fixture);
  assert.equal(plan.full, true);
  assert.equal(plan.reason, unmodelledReason(unknown));
  assert.deepEqual([plan.fast, plan.integration, plan.lua], [[], [], []]);
  assert.deepEqual(plan.feedback, direct.feedback, 'unknown input cannot remove independently mapped feedback');
  assert.ok(plan.feedback.lua.length > 0, 'the actual mapped subset remains available');
  assert.equal(new Set(plan.feedback.lua).size, plan.feedback.lua.length);
  for (const fixture of plan.feedback.lua) assert.ok(direct.lua.includes(fixture), fixture);
  const measured = JSON.parse(readFileSync('scripts/ci-test-timings.json', 'utf8'));
  const estimate = plan.feedback.lua.reduce((sum, fixture) => {
    const weight = measured.lua[fixture];
    return sum + (Number.isFinite(weight) && weight > 0 ? weight : 30000);
  }, 0);
  assert.equal(plan.feedback.estimatedLuaMs, estimate);
  assert.ok(estimate <= 90000, 'feedback keeps the original advisory estimate');
});

test('local and CI advisory plans select the same real Lua feedback', () => {
  const plans = ['--fast', '--ci-fast'].map(flag => {
    const result = spawnSync(process.execPath, ['scripts/test-affected.mjs', flag, '--plan', '--files', 'tests/lua/combat.lua'],
      { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.ok(Number.isSafeInteger(plan.planDurationMs) && plan.planDurationMs >= 0);
    return plan;
  });
  assert.deepEqual(plans[0].feedback, plans[1].feedback);
  assert.ok(plans[0].feedback.lua.includes('tests/lua/combat.lua'));
});

test('quick preflight is manual, read-only, exact-revision and cancels superseded branch work', () => {
  const workflow = readFileSync('.github/workflows/quick-feedback.yml', 'utf8').replaceAll('\r\n', '\n');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  pull_request:/m);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /group: quick-feedback-\$\{\{ github.ref \}\}\n  cancel-in-progress: true/);
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /BASE_SHA: \$\{\{ github.event.pull_request.base.sha \|\| inputs.base_sha \}\}/);
  assert.match(workflow, /git cat-file -e "\$\{BASE_SHA\}\^\{commit\}"/);
  assert.match(workflow, /timeout-minutes: 2\n        env:\n          BASE_SHA:/);
  assert.match(workflow, /GIT_TERMINAL_PROMPT: '0'/);
  assert.match(workflow, /if ! git cat-file -e "\$\{BASE_SHA\}\^\{commit\}" 2>\/dev\/null; then\n            git -c credential.helper= -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 fetch --depth=1 --no-auto-maintenance --no-tags origin "\$BASE_SHA"\n          fi\n          git cat-file -e/);
  assert.match(workflow, /node scripts\/test-affected.mjs --preflight --base "\$BASE_SHA"/);
  assert.doesNotMatch(workflow, /pull_request_target|self-hosted|needs:|continue-on-error/);
  assert.match(workflow, /npm run check:guidance && npm run verify:backlog && npm run check:syntax/);
  assert.match(workflow, /node scripts\/check-quality-ratchet.mjs/);
  assert.match(workflow, /node scripts\/write-ci-receipt.mjs/);
});

import {describe} from 'node:test';
import {validPreflight,preflightTitle,newestPreflight} from '../scripts/fork-preflight.mjs';
import {completePreflight} from '../scripts/test-affected.mjs';
describe('Fork preflight before formal tests',()=>{
const head='a'.repeat(40), base='b'.repeat(40);
const run={head_sha:head,event:'workflow_dispatch',status:'completed',conclusion:'success',
 display_title:`Preflight / ${head} / ${base}`,updated_at:'2026-11-17T04:00:00Z',path:'.github/workflows/quick-feedback.yml',run_attempt:1};
test('admission binds head, base, configuration workflow and completed outcome',()=>{
 assert.equal(preflightTitle('Preflight',head,base),run.display_title);
 assert.ok(validPreflight(run,{head,base}));
 for(const patch of [{head_sha:base},{display_title:`Preflight / ${head} / ${head}`},{event:'pull_request'},
 {status:'in_progress'},{conclusion:'cancelled'},
 {path:'.github/workflows/other.yml'}])
  assert.equal(validPreflight({...run,...patch},{head,base}),false,JSON.stringify(patch));
 assert.ok(validPreflight({...run,path:'.github/workflows/quality.yml',display_title:`Full / ${head} / ${base}`},{head,base}));
});
test('unknown preflight fails instead of silently passing or starting local Full',()=>{
 const r=spawnSync(process.execPath,['scripts/test-affected.mjs','--preflight','--files','unknown.txt'],{encoding:'utf8'});
 assert.notEqual(r.status,0); assert.match(r.stderr,/Full required/);
});
test('formal preflight reuses existing jobs and precedes costly PR work',()=>{
 const q=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 const jobs=[...q.slice(q.indexOf('\njobs:\n')).matchAll(/^  ([\w-]+):$/gm)].map(m=>m[1]);
 assert.deepEqual(jobs,['impact','fast','rules','check','presentation','engineering-posix-shards','engineering-posix']);
 assert.doesNotMatch(q,/needs: admission/);
 const impact=q.slice(q.indexOf('  impact:'),q.indexOf('  fast:'));
 const gate=impact.indexOf('run: node scripts/fork-preflight.mjs');
 assert(gate>impact.indexOf('uses: actions/setup-node@'));
 for(const command of ['publish-full-quality.mjs --pending','publish-pr-quality.mjs --pending'])assert(gate>impact.indexOf(command));
 for(const command of ['Check feature branch history','npm ci','node scripts/ci-impact.mjs'])assert(gate<impact.indexOf(command));
 assert.match(impact,/actions: read/);
 assert.doesNotMatch(impact,/continue-on-error:/);
 assert.match(q,/  presentation:\n    needs: impact\n    if: \$\{\{ !cancelled\(\) && needs\.impact\.result == 'success' \}\}/);
 assert.match(q,/merge_group:/);assert.match(q,/branches: \[develop, master\]/);
 const quick=readFileSync('.github/workflows/quick-feedback.yml','utf8').replaceAll('\r\n','\n');
 assert.match(quick,/--preflight --base/); assert.doesNotMatch(quick,/--ci-fast --base/);
});

test('preflight retains integration JS and every slow Lua without duplicated execution',()=>{
 assert.deepEqual(completePreflight({full:false, fast:['a','b'],integration:['b','heavy'],lua:['slow','slow','direct']}),
 {tests:['a','b','heavy'],fixtures:['slow','direct']});
 assert.throws(()=>completePreflight({full:false,fast:[],integration:[],lua:[]}),/Full required/);
});

test('newer failed or active dispatch invalidates older success across forks',()=>{
 const old={...run,id:1,created_at:'2026-11-17T03:00:00Z'};
 assert.equal(newestPreflight([old],{head,base}),old);
 for(const patch of [{conclusion:'failure'},{status:'in_progress',conclusion:null}])
  assert.equal(newestPreflight([old,{...old,...patch,id:2,created_at:'2026-11-17T04:00:00Z'}],{head,base}),null);
});

test('draft license gate stays in the existing inventory before media and retries on ready',()=>{
 const licenses=readFileSync('.github/workflows/licenses.yml','utf8').replaceAll('\r\n','\n');
 assert.doesNotMatch(licenses,/^  admission:|needs: admission|draft == false/m);
 assert.deepEqual([...licenses.slice(licenses.indexOf('\njobs:\n')).matchAll(/^  ([\w-]+):$/gm)].map(m=>m[1]),['inventory']);
 assert.match(licenses,/types: \[opened, synchronize, reopened, ready_for_review\]/);
 assert.match(licenses,/  inventory:\n    permissions:\n      contents: read\n      actions: read/);
 const gate=licenses.indexOf('run: node scripts/fork-preflight.mjs');
 assert(gate>licenses.indexOf('uses: actions/setup-node@'));
 for(const command of ['node scripts/ci-media-lfs.mjs','node scripts/ci-reviewed-lfs.mjs','node --test scripts/check-license.test.mjs','node scripts/check-license.mjs'])assert(gate<licenses.indexOf(command));
 assert.doesNotMatch(licenses,/continue-on-error:/);
});
test('admission implementation always requires Full even with a tiny proven mapping',async()=>{
 const {impact}=await import('../scripts/ci-impact.mjs');
 const path='scripts/fork-preflight.mjs';
 const plan=impact([path],{[path]:'export const value=1;','tests/a.test.mjs':`import '../${path}';`},
 {eventName:'pull_request',base:'develop'},{js:{win32:{},linux:{}},lua:{},unknownJsMs:1,unknownLuaMs:1});
 assert.equal(plan.mode,'full');assert.equal(plan.reason,'High risk or shared infrastructure');
});

test('native successful reruns are valid preflight without making a new commit',()=>{
 assert.ok(validPreflight({...run,run_attempt:2},{head,base}));
});

});

import {runInNewContext as evaluateJobIf} from 'node:vm';
test('inline preflight preserves required Fast and POSIX fail-closed impact consumers',()=>{
 const workflow=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 for(const [job,mode]of [['fast','fast'],['engineering-posix-shards','full']]){
  const section=workflow.slice(workflow.indexOf('  '+job+':\n')).split(/\n  [a-z][\w-]*:\n/)[0];
  const expression=section.match(/^    if: (.+)$/m)?.[1];
  assert(expression,'required consumer condition exists: '+job);
  assert.match(expression,/!cancelled\(\)/,'explicit status check removes default success(): '+job);
  const js=expression.replace(/^\$\{\{\s*|\s*\}\}$/g,'');
  const invoke=(result,cancelled=false,selected=mode)=>evaluateJobIf(js,{
   cancelled:()=>cancelled,needs:{impact:{result,outputs:{mode:selected}}}
  });
  assert.equal(invoke('success'),true,job+' runs after a successful impact');
  for(const result of ['failure','cancelled','skipped'])assert.equal(invoke(result),false,job+' rejects '+result);
  assert.equal(invoke('success',true),false,job+' rejects cancellation');
  assert.equal(invoke('success',false,mode==='full'?'fast':'full'),false,job+' respects route');
 }
});

test('inline admission runs only for organization non-master PRs and downstream rejects gate failure',()=>{
 const condition="github.event_name == 'pull_request' && github.event.pull_request.base.ref != 'master' && github.repository_id == '1429751262'";
 for(const file of ['quality','licenses']){
  const source=readFileSync('.github/workflows/'+file+'.yml','utf8').replaceAll('\r\n','\n');
  assert.equal(source.split('run: node scripts/fork-preflight.mjs').length,2);
  const block=source.match(/      - name: Require completed Fork preflight before formal test jobs\n([\s\S]*?)        run: node scripts\/fork-preflight.mjs/)[1];
  assert.equal(block.match(/^        if: (.+)$/m)[1],condition);
  assert.match(block,/GH_TOKEN: \$\{\{ github.token \}\}/);
  for(const [event,repo,base,expected]of [
   ['pull_request','1429751262','develop',true],['pull_request','1429751262','release/v2.0.0',true],
   ['pull_request','1429751262','master',false],['pull_request','1460097312','develop',false],
   ['workflow_dispatch','1429751262','develop',false],['push','1429751262','develop',false],['merge_group','1429751262','develop',false]
  ])for(const draft of [true,false])assert.equal(evaluateJobIf(condition,{github:{event_name:event,repository_id:repo,event:{pull_request:{base:{ref:base},draft}}}}),expected);
 }
 const quality=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 const impact=quality.slice(quality.indexOf('  impact:'),quality.indexOf('  fast:'));
 const impactIf=impact.match(/^    if: (.+)$/m)[1];
 assert.equal(evaluateJobIf(impactIf,{github:{event_name:'pull_request',event:{pull_request:{draft:true}}}}),false);
 assert.equal(evaluateJobIf(impactIf,{github:{event_name:'pull_request',event:{pull_request:{draft:false}}}}),true);
 const presentation=quality.slice(quality.indexOf('  presentation:'),quality.indexOf('  engineering-posix-shards:'));
 const downstream=presentation.match(/^    if: (.+)$/m)[1].replace(/^\$\{\{\s*|\s*\}\}$/g,'');
 for(const result of ['success','failure','cancelled','skipped'])for(const cancelled of [false,true])
  assert.equal(evaluateJobIf(downstream,{needs:{impact:{result}},cancelled:()=>cancelled}),result==='success'&&!cancelled);
});

import {releasePreflightUnionSource,assertReleasePreflightUnionCurrent} from './helpers/release-preflight-union-source.mjs';
import {assertFastFreezeB9UnionCurrent,fastFreezeB9Source} from './helpers/release-fast-freeze-b9-union.mjs';
import {beforeReleaseFastB9Ci} from './helpers/release-fast-b9-ci-source.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
test('current complete Quick preserves the exact Release contract step beside complete preflight and receipts',()=>{
 const path='.github/workflows/quick-feedback.yml',raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const advisory=releasePreflightUnionSource(path,raw,'advisory');assert.notEqual(advisory,raw);
 const block=source=>source.match(/      - name: Verify affected Release CI contracts explicitly\n[\s\S]*?          NODE\n/)?.[0];
 assert(block(raw));assert.equal(block(raw),block(advisory),'the current execution keeps the complete reviewed command and its error propagation');
 assert.match(raw,/run: node scripts\/test-affected.mjs --preflight --base "\$BASE_SHA"/);
 assert.doesNotMatch(raw,/--ci-fast --base/);assert.doesNotMatch(raw,/^  pull_request:/m);
 assert.match(raw,/PREFLIGHT_BASE_SHA: \$\{\{ inputs.base_sha \}\}/);
 assert.match(raw,/name: preflight-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);
 const q=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 const exact='${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha || inputs.base_sha || github.event.before }}';
 for(const variable of ['CI_COMPARISON_BASE','BASE_SHA','QUALITY_RATCHET_BASE'])assert(q.includes(variable+': '+exact),variable+' consumes the manual base');
 assert(q.includes("github.event_name == 'workflow_dispatch' && inputs.base_sha != ''"));
 assert.match(q,/      - run: node scripts\/write-ci-receipt.mjs\n        if: matrix.shard == 1\n        env:\n          PREFLIGHT_BASE_SHA: \$\{\{ inputs.base_sha \}\}/);
});
test('outer Release union retains complete named predecessors and rejects every changed source boundary',()=>{
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const packet=JSON.parse(gunzipSync(readFileSync('tests/helpers/release-preflight-union-source.json.gz')));
 assertReleasePreflightUnionCurrent();assertFastFreezeB9UnionCurrent();
 for(const [target,files]of Object.entries(packet.views))for(const [path,row]of Object.entries(files)){
  const raw=beforeHostedRunnerFallback(path,readFileSync(path,'utf8')).replaceAll('\r\n','\n');assert.equal(hash(capacityPreflightSource(path,raw,'preflight')),row.current.sha256);
  for(const eol of ['\n','\r\n']){
   const source=raw.replaceAll('\n',eol);
   assert.equal(releasePreflightUnionSource(path,source,target).replaceAll('\r\n','\n'),row.before.source);
   for(const foreign of [source+eol,source.slice(1),source.slice(0,-1),source.replaceAll(eol,'\r\r\n'),null,{},17])
    assert.strictEqual(releasePreflightUnionSource(path,foreign,target),foreign);
   for(const unknown of ['foreign/'+path,'__proto__','constructor','src/lua/abyss_ui.lua'])
    assert.strictEqual(releasePreflightUnionSource(unknown,source,target),source);
  }
  for(const mode of ['changed','missing','null','buffer'])assert.throws(()=>assertReleasePreflightUnionCurrent((p,e)=>{
   if(p!==path)return readFileSync(p,e);if(mode==='missing')throw Error('missing current source');if(mode==='null')return null;
   if(mode==='buffer')return readFileSync(p);return readFileSync(p,e)+'\n';
  }));
 }
 const path='.github/workflows/quick-feedback.yml',source=readFileSync(path,'utf8');
 assert.notEqual(releasePreflightUnionSource(path,source,'release'),releasePreflightUnionSource(path,source,'advisory'));
 assert.strictEqual(fastFreezeB9Source(path,source),source,'old union cannot gain a Quick target');
 for(const before of [{},{sha256:'0'.repeat(64)}])assert.strictEqual(beforeReleaseFastB9Ci(path,source,before),source);
 assert.strictEqual(releasePreflightUnionSource(path,source,'foreign'),source);
});
test('old union uses the supplied fresh dependency reader including its new archive',()=>{
 for(const path of ['tests/helpers/release-capacity-preflight-source.json.gz','tests/helpers/release-preflight-union-source.json.gz','tests/helpers/release-ci.cases.mjs'])
  for(const mode of ['changed','missing','null'])assert.throws(()=>assertFastFreezeB9UnionCurrent((p,e)=>{
   if(p!==path)return readFileSync(p,e);if(mode==='missing')throw Error('missing dependency');if(mode==='null')return null;
   const raw=readFileSync(p,e);return typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]);
  }));
 assertFastFreezeB9UnionCurrent();
});
