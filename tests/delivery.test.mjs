import {validPreflight} from '../scripts/fork-preflight.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync, renameSync } from 'node:fs';
import {spawnSync} from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyDelivery, verifyMergedDelivery, collectPrDelivery, collectMergedDelivery, checkoutReceipt, isLowRiskDocumentationChange, fullQualityJobs, currentFullQualityJobs, deliverySchemaVersion, qualityWorkflowPath } from '../scripts/verify-delivery.mjs';
import {qualityShardMatrices,qualityShardJobs} from '../scripts/ci-quality-shape.mjs';
import * as delivery from '../scripts/verify-delivery.mjs';
import { auditBacklogDelivery, auditHistory } from '../scripts/branch-hygiene-history.mjs';
import {backlogDeclaration,changedBacklogTasks,mentionedTasks,readBacklogRecords} from '../scripts/backlog-closeout.mjs';

const handoffRepo = 'FurinyaWorks/Slay-the-Heavens';
const handoffSha = '1'.repeat(40);
const releaseBranch = 'release/v2.0.0';
const historyPr = (number, options = {}) => ({ number, state: 'closed', base: { ref: 'develop' },
  head: { ref: `fix/${number}`, repo: { full_name: handoffRepo }, sha: handoffSha }, ...options });
const mergedHistory = { merged_at: '2026-11-20T00:00:00Z', merge_commit_sha: '2'.repeat(40) };
const historyFile = (filename, sha, options = {}) => ({ filename, sha, status: 'modified', ...options });
const historyInput = { repo: handoffRepo, branches: [], comments: [], tasks: [], developTree: new Map() };

test('history inventory preserves abandoned, reused and fork heads independently of branch rows', async () => {
  const prs = [historyPr(22), historyPr(23), historyPr(24, {
    head: { ref: 'fix/23', repo: { full_name: 'a-fork/Slay-the-Heavens' }, sha: handoffSha }
  }), historyPr(25, { head: { ref: 'fix/25', repo: null, sha: handoffSha } })];
  const branches = [{ name: 'fix/23', commit: { sha: '2'.repeat(40) } }];
  const rows = await auditHistory({ ...historyInput, prs, branches, loadFiles: () => assert.fail('Unlinked closeout needs no file lookup') });
  assert.deepEqual(rows.map(row => [row.pr, row.head_state]), [[25, 'repository-unavailable'],
    [24, 'fork'], [23, 'branch-moved'], [22, 'branch-absent']]);
  assert.ok(rows.every(row => row.head === handoffSha && row.review.includes('closeout-receipt-missing')));
});

test('a merged successor leaves explicit and same-file residual work in the existing Backlog handoff', async () => {
  const main = 'src/lua/card.lua', remaining = 'src/lua/drag.lua';
  const receipt = (number, sha, rest, outcome = 'SUPERSEDED', successor = '#31') =>
    `CLOSEOUT: fix/${number}@${sha} | version/base=v2/develop | outcome=${outcome} | PR=#${number} | successor=${successor} | owner=Furinya | evidence=https://example.org/run | remote=retained:review | remaining=${rest}`;
  const task = { id: 'TASK-42.2', status: 'In Progress', acCount: 4, acCompleted: 1,
    source: receipt(28, handoffSha, 'Still need right-click and drag') };
  const prs = [historyPr(28), historyPr(29, { body: receipt(29, handoffSha, 'none') }),
    historyPr(30, { body: receipt(30, '5'.repeat(40), 'none') }), historyPr(31, mergedHistory),
    historyPr(32, { state: 'open' }), historyPr(33, { body: '<!-- Supersedes #28 --> Inherits https://github.com/other/repo/pull/28' }),
    historyPr(34, { body: receipt(34, handoffSha, 'none') }),
    historyPr(37, { body: receipt(37, handoffSha, 'none', 'DELIVERED_VERIFIED', '#32') }),
    historyPr(38, { body: receipt(38, handoffSha, 'none', 'BLOCKED', 'none') })];
  const comments = [
    { issue_url: `https://api.github.com/repos/${handoffRepo}/issues/28`, author_association: 'MEMBER', body: 'Remaining candidate #32' },
    { issue_url: `https://api.github.com/repos/${handoffRepo}/issues/28`, author_association: 'NONE', body: 'Unverified successor #33' }
  ];
  const inventory = {
    28: [historyFile(main, 'card-v1'), historyFile(remaining, 'drag-v1')],
    29: [historyFile(main, 'card-v1')],
    31: [historyFile(main, 'card-v2'), historyFile('tests/input.test.mjs', 'target-test')],
    34: [historyFile(remaining, 'drag-v1')]
  };
  const requests = [];
  const rows = await auditHistory({ ...historyInput, prs, comments, tasks: [task], developTree: new Map([[main, 'card-v2']]),
    loadFiles: async number => { requests.push(number); return inventory[number]; } });
  const byNumber = new Map(rows.map(row => [row.pr, row]));
  assert.deepEqual(byNumber.get(28).backlog, [{ id: 'TASK-42.2', status: 'In Progress', remaining_ac: 3 }]);
  assert.deepEqual(byNumber.get(28).linked_develop_prs.map(row => row.pr), [31, 32]);
  assert.deepEqual(byNumber.get(28).linked_develop_paths, [main]);
  assert.deepEqual(byNumber.get(28).uncovered_paths, [remaining]);
  assert.deepEqual(byNumber.get(28).review, ['remaining-scope-recorded', 'linked-develop-pr-unmerged', 'partial-successor-paths']);
  assert.deepEqual(byNumber.get(29).review, ['successor-content-unverified']);
  assert.deepEqual(byNumber.get(30).review, ['closeout-receipt-missing']);
  assert.deepEqual(byNumber.get(34).linked_develop_paths, []);
  assert.deepEqual(byNumber.get(34).uncovered_paths, [remaining]);
  assert.deepEqual(byNumber.get(34).review, ['successor-content-unverified']);
  assert.deepEqual(byNumber.get(37).review, ['delivered-successor-unverified', 'linked-develop-pr-unmerged']);
  assert.deepEqual(byNumber.get(38).review, ['closeout-blocked']);
  assert.equal(requests.filter(number => number === 31).length, 1);
});

test('merged Release paths are compared against the develop snapshot with unavailable and moved content explicit', async () => {
  const base = { ref: releaseBranch };
  const prs = [34, 35, 36].map(number => historyPr(number, { base, ...mergedHistory }));
  const old = 'src/lua/old.lua', moved = 'src/lua/new.lua', deleted = 'src/lua/deleted.lua',
    restored = 'src/lua/restored.lua', missing = 'src/lua/missing.lua';
  const inventory = {
    34: [historyFile(missing, 'unported'), historyFile(moved, 'v2', { status: 'renamed', previous_filename: old })],
    35: [historyFile(restored, 'same-content'), historyFile(deleted, 'deleted', { status: 'removed' })]
  };
  const rows = await auditHistory({ ...historyInput, prs,
    developTree: new Map([[moved, 'v2'], [old, 'still-there'], [restored, 'same-content']]),
    loadFiles: async number => { if (!inventory[number]) throw Error('incomplete file page'); return inventory[number]; } });
  const [unavailable, exact, residual] = rows;
  assert.deepEqual(unavailable.review, ['file-comparison-unavailable']);
  assert.equal(unavailable.production_paths, null);
  assert.deepEqual(exact.different_develop_paths, []);
  assert.deepEqual(exact.review, []);
  assert.deepEqual(residual.different_develop_paths, [missing, moved]);
  assert.deepEqual(residual.review, ['release-backflow-review']);
  assert.equal(residual.release_merge, mergedHistory.merge_commit_sha);
});

test('Release event and default-branch sweep report residuals against an immutable develop tree', t => {
  const cwd = mkdtempSync(join(tmpdir(), 'release-backflow-'));
  t.after(() => rmSync(cwd, {recursive: true, force: true}));
  const git = (...args) => {
    const result = spawnSync('git', args, {cwd, encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git('init', '-q');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'Develop');
  const develop = git('rev-parse', 'HEAD');
  const base = {ref: releaseBranch, repo: {full_name: handoffRepo}};
  const updatedAt = new Date().toISOString();
  const pr = historyPr(34, {...mergedHistory, base, merged_at: updatedAt, updated_at: updatedAt, merged: true});
  const successor = historyPr(35, {state: 'open', body: '回流 #34'});
  const old = {...pr, number: 36, merged_at: '2000-01-01T00:00:00Z', updated_at: '2000-01-01T00:00:00Z'};
  const prefix = '/repos/' + handoffRepo;
  const page = 'per_page=100&page=1';
  const responses = {
    '/pulls/34': pr,
    '/branches/develop': {commit: {sha: develop}},
    ['/git/trees/' + develop + '?recursive=1']: {tree: [{type: 'blob', path: 'src/lua/fix.lua', sha: 'old'}]},
    ['/pulls/34/files?' + page]: [historyFile('src/lua/fix.lua', 'fixed')],
    ['/pulls?state=open&base=develop&' + page]: [successor],
    ['/pulls?state=closed&sort=updated&direction=desc&' + page]: [pr, old],
    ['/pulls?state=closed&base=develop&sort=updated&direction=desc&' + page]: []
  };
  const fixture = join(cwd, 'fetch.mjs'), event = join(cwd, 'event.json');
  writeFileSync(fixture, `const responses = ${JSON.stringify(responses)};
globalThis.fetch = async (address, init) => {
  const {pathname, search} = new URL(address);
  const path = pathname.slice(${prefix.length}) + search;
  if (!pathname.startsWith(${JSON.stringify(prefix + '/')}) || init.method || !Object.hasOwn(responses, path)) {
    throw new Error('Unexpected audit request: ' + address);
  }
  return {ok: true, json: async () => responses[path]};
};`);
  const script = fileURLToPath(new URL('../scripts/branch-hygiene.mjs', import.meta.url));
  const run = mode => spawnSync(process.execPath, ['--import', pathToFileURL(fixture).href, script], {cwd, encoding: 'utf8',
    env: {...process.env, GITHUB_REPOSITORY: handoffRepo, GITHUB_TOKEN: 'fixture', GITHUB_EVENT_NAME: mode,
      GITHUB_EVENT_PATH: event, GITHUB_STEP_SUMMARY: ''}});
  writeFileSync(event, JSON.stringify({action: 'closed', pull_request: pr}));
  for (const mode of ['pull_request_target', 'schedule']) {
    const result = run(mode);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Merged Release PR #34/);
    const report = JSON.parse(readFileSync(join(cwd, 'build/branch-hygiene.json'), 'utf8'));
    assert.equal(report.develop_sha, develop);
    assert.equal(report.releases.length, 1);
    const [release] = report.releases;
    assert.equal(release.release_merge, pr.merge_commit_sha);
    assert.equal(Object.hasOwn(release, 'head_state'), false);
    assert.deepEqual(release.different_develop_paths, ['src/lua/fix.lua']);
    assert.deepEqual(release.linked_develop_prs.map(row => row.pr), [35]);
  }
  writeFileSync(event, JSON.stringify({action: 'closed', pull_request: {...pr, merge_commit_sha: '3'.repeat(40)}}));
  const mismatch = run('pull_request_target');
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /Release merge identity changed/);
});

test('checkout writer binds BASE to the event and ignores an empty preflight environment',t=>{
  const root=mkdtempSync(join(tmpdir(),'checkout-event-base-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');writeFileSync(join(root,'fixture'),'checkout');git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  const head=git('rev-parse','HEAD'),before='a'.repeat(40),dispatch='b'.repeat(40),foreign='c'.repeat(40);
  writeFileSync(join(root,'writer.mjs'),readFileSync(new URL('../scripts/write-ci-receipt.mjs',import.meta.url)));
  for(const [eventName,event,envBase,expected,preflight] of [
    ['push',{before},'',before],['push',{before},foreign,before],
    ['push',{before:'0'.repeat(40)},dispatch,dispatch,true],
    ['workflow_dispatch',{before},dispatch,dispatch],
    ['pull_request',{before,pull_request:{number:12,head:{sha:head},base:{sha:before}}},foreign,before],
    ['merge_group',{before,merge_group:{head_sha:head,base_sha:before}},foreign,before],
  ]){
    const eventPath=join(root,'event.json');writeFileSync(eventPath,JSON.stringify(event));
    const r=spawnSync(process.execPath,['writer.mjs',...(preflight?['--preflight']:[])],{cwd:root,encoding:'utf8',env:{...process.env,
      GITHUB_EVENT_PATH:eventPath,GITHUB_EVENT_NAME:eventName,GITHUB_SHA:head,
      GITHUB_RUN_ID:'12',GITHUB_RUN_ATTEMPT:'1',PREFLIGHT_BASE_SHA:envBase}});
    assert.equal(r.status,0,r.stderr);
    const receipt=JSON.parse(readFileSync(join(root,'build/ci-checkout.json'),'utf8'));
    assert.equal(receipt.base,expected,eventName+' exact BASE');assert.equal(receipt.head,head);
    assert.equal(receipt.tested,head);assert.equal(receipt.event,eventName);
  }
});

test('merged delivery requires an explicit, AC-safe Backlog disposition',()=>{
  assert.equal(typeof delivery.planBacklogCloseout,'function');
  const records=[{id:'TASK-1',status:'In Progress',acCount:1,acCompleted:0,labels:[],source:'',location:'tasks',dependencies:[]}];
  const input={body:'Backlog: TASK-1=done',records,mergeSha:'a'.repeat(40),prNumber:10,changedTaskIds:['TASK-1']};
  assert.match(delivery.planBacklogCloseout(input).errors.join(' '),/AC/);
  assert.equal(delivery.planBacklogCloseout({...input,body:'Backlog: TASK-1=verify'}).errors.length,0);
  assert.match(delivery.planBacklogCloseout({...input,body:'Backlog: none'}).errors.join(' '),/TASK-1/);
  assert.match(delivery.planBacklogCloseout({...input,body:''}).errors.join(' '),/Backlog/);
});
test('verification is started work, stays In Progress and cannot implicitly reopen Blocked',()=>{
  const mergeSha='a'.repeat(40),base={body:'Backlog: TASK-1=verify',mergeSha,prNumber:10};
  const task={id:'TASK-1',status:'To Do',acCount:2,acCompleted:1,labels:[],source:'',location:'tasks',dependencies:[]};
  const plan=delivery.planBacklogCloseout({...base,records:[task]});
  assert.deepEqual(plan.errors,[]);
  assert.equal(plan.commands[0][plan.commands[0].indexOf('-s')+1],'In Progress');
  assert.equal(delivery.planBacklogCloseout({...base,records:[{...task,status:'In Progress',labels:['待验','delivery-verify'],
    source:`[delivery:${mergeSha}] verify PR #10; remaining AC: 1.`}]}).commands.length,0);
  const blocked=delivery.planBacklogCloseout({...base,records:[{...task,status:'Blocked'}]});
  assert.match(blocked.errors.join(' '),/Blocked/);
  assert.equal(blocked.commands.length,0);
});
test('already recorded cleanup validates snapshots without redoing archives or changing ongoing work',()=>{
  const records=[
    {id:'TASK-1',status:'In Progress',location:'tasks',acCount:2,acCompleted:1},
    {id:'TASK-2',status:'Done',location:'completed',acCount:2,acCompleted:2},
    {id:'TASK-3',status:'To Do',location:'archive',acCount:2,acCompleted:0},
    {id:'TASK-4',status:'Blocked',location:'tasks',acCount:2,acCompleted:0},
  ];
  const input={records,body:'Backlog: TASK-1=recorded, TASK-2=recorded, TASK-3=recorded, TASK-4=recorded',
    mergeSha:'a'.repeat(40),prNumber:10,changedTaskIds:records.map(task=>task.id)};
  assert.deepEqual(delivery.planBacklogCloseout(input),{errors:[],commands:[]});
  assert.ok(delivery.planBacklogCloseout({...input,records:records.map(task=>task.id==='TASK-2'?{...task,acCompleted:1}:task)}).errors.length);
  assert.ok(delivery.planBacklogCloseout({...input,records:records.map(task=>task.id==='TASK-2'?{...task,status:'In Progress'}:task)}).errors.length);
});
test('supersession preserves a real successor, rejects cycles and does not guess from age',()=>{
  assert.equal(typeof delivery.planBacklogCloseout,'function');
  const records=[1,2].map(id=>({id:`TASK-${id}`,status:'To Do',acCount:1,acCompleted:0,labels:[],source:'',location:'tasks',dependencies:[]}));
  const input={body:'Backlog: TASK-1=superseded:TASK-2',records,mergeSha:'a'.repeat(40),prNumber:10,changedTaskIds:['TASK-1']};
  assert.equal(delivery.planBacklogCloseout(input).errors.length,0);
  for(const body of ['Backlog: TASK-1=superseded:TASK-99','Backlog: TASK-1=superseded:TASK-1',
    'Backlog: TASK-1=superseded:TASK-2, TASK-2=superseded:TASK-1'])
    assert.ok(delivery.planBacklogCloseout({...input,body}).errors.length,body);
  const plan=delivery.planBacklogCloseout({...input,body:'Backlog: TASK-1=continue'});
  assert.ok(plan.commands.every(args=>!args.includes('archive')&&!args.includes('Done')));
});
test('closeout retries only the missing move and requires the actual successor reference',()=>{
  const mergeSha='a'.repeat(40),marker=`[delivery:${mergeSha}]`;
  const done={id:'TASK-1',status:'Done',acCount:1,acCompleted:1,labels:[],source:`${marker} done`,location:'tasks',dependencies:[]};
  const base={records:[done],mergeSha,prNumber:10,body:'Backlog: TASK-1=done'};
  assert.deepEqual(delivery.planBacklogCloseout(base).commands,[['task','complete','TASK-1']]);
  const old={...done,status:'To Do',location:'archive',source:`${marker} superseded:TASK-2`,references:[]};
  const target={...done,id:'TASK-2',status:'To Do',acCompleted:0,source:'',metadataErrors:[]};
  const input={...base,body:'Backlog: TASK-1=superseded:TASK-2',records:[old,target]};
  assert.ok(delivery.planBacklogCloseout(input).errors.length,'a note is not a successor reference');
  assert.equal(delivery.planBacklogCloseout({...input,records:[{...old,references:['TASK-2']},target]}).errors.length,0);
  assert.ok(delivery.planBacklogCloseout({...input,records:[{...old,location:'tasks'},
    {...target,metadataErrors:['duplicate status']}]}).errors.length);
});
function closeoutFixture(t) {
  const root=mkdtempSync(join(tmpdir(),'backlog-closeout-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const dir of ['tasks','completed','archive/tasks'])mkdirSync(join(root,'backlog',dir),{recursive:true});
  const path=join(root,'backlog/tasks/task-1 - 交付.md');
  const source='---\nid: TASK-1\nstatus: In Progress\nlabels: []\ndependencies: []\n---\n<!-- AC:BEGIN -->\n- [ ] #1 device verification\n<!-- AC:END -->\n';
  writeFileSync(path,source);
  const git=(...args)=>{
    const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim();
  };
  git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  const mergeSha=git('rev-parse','HEAD');
  return {root,path,source,git,mergeSha,pr:{number:10,merged:true,base:{ref:'develop'},merge_commit_sha:mergeSha,body:'Backlog: TASK-1=verify'},files:[]};
}
test('recorded closeout requires a task file changed by the PR, including when its title mentions the task',t=>{
  const f=closeoutFixture(t),body='Backlog: TASK-1=recorded';
  const files=[{filename:'src/lua/unrelated.lua'}],changed=changedBacklogTasks(files);
  for(const title of ['Unrelated fix','TASK-1 unrelated fix']){
    const pr={...f.pr,body,title};
    assert.match(backlogDeclaration(body,changed,mentionedTasks(title)).errors.join(' '),/must change the task record/);
    assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,files,targetSha:f.mergeSha},
      ()=>assert.fail('an unrecorded task cannot write')),/must change the task record/);
  }
  assert.throws(()=>readFileSync(join(f.root,'build/delivery',`backlog-${f.pr.number}-${f.mergeSha}.json`)),/ENOENT/);
});
test('a committed completed task is a done receipt for closeout and audit',async t=>{
  const f=closeoutFixture(t),filename='backlog/completed/task-1 - 交付.md';
  renameSync(f.path,join(f.root,filename));
  writeFileSync(join(f.root,filename),f.source.replace('In Progress','Done').replace('- [ ]','- [x]'));
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','task completion');
  const targetSha=f.git('rev-parse','HEAD'),pr={...f.pr,state:'closed',merged_at:'2026-11-24T00:00:00Z',
    merge_commit_sha:targetSha,body:'Backlog: TASK-1=done'};
  const files=[{filename,status:'renamed',previous_filename:'backlog/tasks/task-1 - 交付.md'}];
  const tasks=readBacklogRecords(f.root);
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,files:[],targetSha},
    ()=>assert.fail('old completion cannot write')),/completed task requires a delivery receipt/);
  assert.equal(delivery.syncBacklogCloseout({...f,pr,files,targetSha},
    ()=>assert.fail('committed completion needs no CLI write')).commands,0);
  assert.deepEqual(await auditBacklogDelivery({prs:[pr],tasks,loadFiles:async()=>files}),[]);
  const [missing]=await auditBacklogDelivery({prs:[pr],tasks,loadFiles:async()=>[{...files[0],status:'removed'}]});
  assert.match(missing.drift.join(' '),/receipt missing/);
});
test('closeout refuses an old worktree and a task revised after the verified merge without writing',t=>{
  const f=closeoutFixture(t),run=()=>assert.fail('must not write an obsolete task');
  assert.throws(()=>delivery.syncBacklogCloseout({...f,targetSha:'a'.repeat(40)},run),/current develop SHA/);
  writeFileSync(f.path,f.source+'\nNewer product decision.\n');
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','new decision');
  assert.throws(()=>delivery.syncBacklogCloseout({...f,targetSha:f.git('rev-parse','HEAD')},run),/task changed since this PR/);
});
test('closeout reports CLI failure and false success/readback instead of claiming sync',t=>{
  const f=closeoutFixture(t),input={...f,targetSha:f.mergeSha};
  assert.throws(()=>delivery.syncBacklogCloseout(input,()=>{throw Error('CLI unavailable');}),/CLI unavailable/);
  assert.throws(()=>delivery.syncBacklogCloseout(input,()=>''),/readback differs/);
  assert.equal(readFileSync(f.path,'utf8'),f.source);
});
test('current task snapshots outrank same-ID legacy archives while real active duplicates still fail',t=>{
  for(const id of ['25.3','61','64']) {
    const f=closeoutFixture(t),filename=`backlog/tasks/task-${id} - 当前任务.md`,current=join(f.root,filename);
    const source=f.source.replace('TASK-1',`TASK-${id}`);
    renameSync(f.path,current);writeFileSync(current,source);
    writeFileSync(join(f.root,`backlog/archive/tasks/task-${id} - 历史同号.md`),source+'\nUnrelated legacy identity.\n');
    f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','legacy archive');
    f.pr.merge_commit_sha=f.git('rev-parse','HEAD');f.pr.body=`Backlog: TASK-${id}=recorded`;
    const input={...f,files:[{filename}],targetSha:f.pr.merge_commit_sha};
    assert.equal(delivery.syncBacklogCloseout(input,()=>assert.fail('recorded cleanup never mutates')).state,'backlog_synced',id);
    writeFileSync(join(f.root,`backlog/tasks/task-${id} - 冲突.md`),source);
    assert.throws(()=>delivery.syncBacklogCloseout(input,()=>assert.fail('duplicate must fail before writes')),/ambiguous/,id);
  }
});
test('an old delivery marker cannot authorize overwriting a later Blocked decision with unchanged AC',t=>{
  const f=closeoutFixture(t);
  writeFileSync(f.path,f.source.replace('status: In Progress','status: Blocked')+
    `\n[delivery:${f.mergeSha}] verify PR #10; remaining AC: 1.\nLater decision: wait for Owner approval.\n`);
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','block after delivery');
  assert.throws(()=>delivery.syncBacklogCloseout({...f,targetSha:f.git('rev-parse','HEAD')},
    ()=>assert.fail('old marker must not reopen a blocked task')),/task changed since this PR|Blocked/);
});
test('an interrupted closeout resumes from its exact CLI readback once without duplicate notes',t=>{
  const f=closeoutFixture(t);
  writeFileSync(f.path,f.source.replace('- [ ]','- [x]'));
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','AC evidenced');
  f.mergeSha=f.git('rev-parse','HEAD');f.pr.merge_commit_sha=f.mergeSha;f.pr.body='Backlog: TASK-1=done';
  const input={...f,targetSha:f.mergeSha},completed=join(f.root,'backlog/completed/task-1 - 交付.md');
  let failMove=true,edits=0;
  const cli=args=>{
    if(args[1]==='edit') {
      edits++;
      writeFileSync(f.path,readFileSync(f.path,'utf8').replace('status: In Progress','status: Done')+'\n'+args.at(-1)+'\n');
    } else if(failMove){failMove=false;throw Error('interrupted move');}
    else renameSync(f.path,completed);
  };
  assert.throws(()=>delivery.syncBacklogCloseout(input,cli),/interrupted move/);
  assert.equal(delivery.syncBacklogCloseout(input,cli).state,'backlog_synced');
  assert.equal(edits,1);
  assert.equal(delivery.syncBacklogCloseout(input,()=>assert.fail('already synchronized')).commands,0);
  writeFileSync(completed,readFileSync(completed,'utf8')+'Later independent edit.\n');
  assert.throws(()=>delivery.syncBacklogCloseout(input,()=>assert.fail('edited receipt must not authorize writes')),/task changed since this PR/);
});

const sha = letter => letter.repeat(40);
function mergedEvidence(schemaVersion=2) {
  const preflight={schemaVersion,repo:'owner/repo',head:sha('a'),base:sha('b'),tested:sha('c'),sourceTree:sha('d'),baseRef:'develop',runId:7,attempt:2,
    event:'pull_request',prNumber:8,parents:[sha('b'),sha('a')],
    checkout:{head:sha('a'),base:sha('b'),tested:sha('c'),runId:7,attempt:2,event:'pull_request',prNumber:8,parents:[sha('b'),sha('a')]},
    testedCommit:{sha:sha('c'),parents:[{sha:sha('b')},{sha:sha('a')}],commit:{tree:{sha:sha('d')}}},
    run:{id:7,run_attempt:2,event:'pull_request',head_sha:sha('a'),path:qualityWorkflowPath,repository:{full_name:'owner/repo'},status:'completed',conclusion:'success',pull_requests:[{number:8}]},
    jobs:(schemaVersion===3?currentFullQualityJobs.filter(name=>!['impact','fast'].includes(name)):fullQualityJobs).map((name,i)=>({id:100+i,name,status:'completed',conclusion:'success',run_attempt:2,run_id:7,head_sha:sha('a')})),
    review:{reviewedHeadSha:sha('a'),reviewedBaseSha:sha('b'),reviewId:'external-session-123',conclusion:'pass',unresolved:[]}};
  const pr={number:8,merged:true,state:'closed',head:{sha:sha('a')},base:{ref:'develop',sha:sha('f')},merge_commit_sha:sha('e')};
  if(schemaVersion===3)Object.assign(preflight,{targetBeforeSha:preflight.base,targetAfterSha:preflight.base});
  preflight.currentRun=structuredClone(preflight.run);
  const evidence={schemaVersion,repo:'owner/repo',preflight,pr,current:structuredClone(pr),commit:{sha:sha('e'),parents:[{sha:sha('b')}],commit:{tree:{sha:sha('d')}}},
    run:{id:9,run_attempt:3,event:'push',head_sha:sha('e'),head_branch:'develop',path:qualityWorkflowPath,repository:{full_name:'owner/repo'},status:'completed',conclusion:'success'},
    jobs:preflight.jobs.map(j=>({...j,run_attempt:3,run_id:9,head_sha:sha('e')})),
    checkout:{event:'push',runId:9,attempt:3,tested:sha('e'),head:sha('e'),base:sha('b'),parents:[sha('b')]}};
  for(const e of [preflight,evidence]) {
    // Real Full run 40722229360 reports one unexpanded skipped `fast` job:
    // GitHub evaluates its job-level condition before expanding the matrix.
    if(schemaVersion===3)for(const [i,name,conclusion] of [[0,'impact','success'],[1,'fast','skipped']])
      e.jobs.push({id:300+i,name,status:'completed',conclusion,run_attempt:e.run.run_attempt,run_id:e.run.id,head_sha:e.run.head_sha});
    e.checkout.schemaVersion=1;
    e.checkoutArtifact={id:200,name:`quality-${e.run.id}-${e.checkout.attempt}-check`,expired:false,
      workflow_run:{id:e.run.id,head_sha:e.run.head_sha}};
  }
  evidence.currentRun=structuredClone(evidence.run);return evidence;
}

// GitHub rerun-failed copies retained successes into the new attempt with new
// IDs, but the original execution times/steps and checkout artifact stay put.
function inheritedReceipt(proof,depth=1) {
  proof.run.run_attempt=4;proof.currentRun.run_attempt=4;
  if(proof.event==='pull_request')proof.attempt=4;
  proof.jobs.forEach(job=>job.run_attempt=4);
  const first=proof.jobs.find(job=>job.name===firstReceiptName(proof.schemaVersion));
  Object.assign(first,{run_attempt:4-depth,created_at:'2026-11-04T02:00:00Z',
    started_at:'2026-11-04T02:01:00Z',completed_at:'2026-11-04T02:02:00Z',
    runner_id:12,runner_name:'Hosted Agent',runner_group_id:0,labels:['ubuntu-24.04'],
    steps:[{number:1,name:'Set up job',status:'completed',conclusion:'success',
      started_at:'2026-11-04T02:01:00Z',completed_at:'2026-11-04T02:01:10Z'},
    {number:2,name:'Write and upload checkout receipt',status:'completed',conclusion:'success',
      started_at:'2026-11-04T02:01:10Z',completed_at:'2026-11-04T02:02:00Z'}]});
  for(let i=1;i<=depth;i++)proof.jobs.push({...structuredClone(first),id:700+i,run_attempt:first.run_attempt+i,
    created_at:`2026-11-04T02:0${2+i}:00Z`,runner_group_id:null});
  proof.checkout.attempt=first.run_attempt;
  proof.checkoutArtifact.name=`quality-${proof.run.id}-${first.run_attempt}-check`;
  return {first,copied:proof.jobs.at(-1)};
}
const firstReceiptName=version=>version===2?'rules (1/8)':qualityShardJobs[0];
const proofErrors=(e,layer)=>layer==='preflight'?verifyDelivery(e.preflight):verifyMergedDelivery(e).errors;

test('inherited first-shard copies resolve the original execution receipt without changing raw attempts',()=>{
  for(const version of [2,3])for(const layer of ['preflight','push'])for(const depth of [1,2]) {
    const e=mergedEvidence(version),proof=layer==='preflight'?e.preflight:e;
    inheritedReceipt(proof,depth);proof.jobs.reverse();
    const original=JSON.stringify(proof);
    assert.deepEqual(proofErrors(e,layer),[],`${version}/${layer}/${depth}`);
    assert.equal(JSON.stringify(proof),original,'Evidence must never be normalized or rewritten');
  }
});

test('inherited receipt resolution rejects incomplete, ambiguous or changed execution history',()=>{
  const mutations=[
    (p,a,b)=>p.jobs.splice(p.jobs.indexOf(a),1),
    (p,a,b)=>p.jobs.splice(p.jobs.indexOf(b)-1,1),
    (p,a,b)=>p.jobs.push({...a,id:900}),
    (p,a,b)=>b.id=a.id,(p,a,b)=>b.run_id++,(p,a,b)=>b.head_sha=sha('f'),
    (p,a,b)=>b.name='rules (99/99)',
    (p,a,b)=>b.started_at='invalid',(p,a,b)=>b.completed_at=null,
    (p,a,b)=>b.created_at='invalid',(p,a,b)=>b.created_at=b.completed_at,
    (p,a,b)=>a.created_at='2026-11-04T02:01:30Z',
    (p,a,b)=>b.created_at='2026-11-04T02:02:30Z',
    (p,a,b)=>b.started_at='2026-11-04T02:01:01Z',
    (p,a,b)=>b.runner_id++,(p,a,b)=>delete b.runner_name,
    (p,a,b)=>b.labels=['windows-2025'],
    (p,a,b)=>b.steps=[],(p,a,b)=>delete b.steps,
    (p,a,b)=>b.steps.reverse(),(p,a,b)=>b.steps[0].number=0,
    (p,a,b)=>b.steps[0].name='Different execution',
    (p,a,b)=>b.steps[0].status='in_progress',(p,a,b)=>b.steps[0].conclusion='failure',
    (p,a,b)=>b.steps[0].started_at='invalid',(p,a,b)=>b.steps[0].completed_at=null,
    (p,a,b)=>b.steps[0].completed_at='2026-11-04T02:01:11Z',
    (p,a,b)=>a.conclusion='failure',
    (p,a,b)=>p.jobs.find(j=>j.name===a.name&&j.run_attempt===3).steps[0].name='Intervening execution',
  ];
  for(const version of [2,3])for(const layer of ['preflight','push'])for(const mutate of mutations) {
    const e=mergedEvidence(version),proof=layer==='preflight'?e.preflight:e;
    const {first,copied}=inheritedReceipt(proof,2);mutate(proof,first,copied);
    assert(proofErrors(e,layer).length,`${version}/${layer}: ${mutate}`);
  }
});

test('actual first-shard reruns and newer failed jobs never borrow an inherited receipt',()=>{
  for(const version of [2,3])for(const layer of ['preflight','push']) {
    for(const name of [firstReceiptName(version),'check'])for(const conclusion of ['failure','cancelled','skipped',null]) {
      const e=mergedEvidence(version),proof=layer==='preflight'?e.preflight:e;
      inheritedReceipt(proof);proof.jobs.find(j=>j.name===name&&j.run_attempt===4).conclusion=conclusion;
      assert(proofErrors(e,layer).length,`${name}/${conclusion}`);
    }
    const e=mergedEvidence(version),proof=layer==='preflight'?e.preflight:e;
    const {copied}=inheritedReceipt(proof);
    Object.assign(copied,{created_at:'2026-11-04T03:00:00Z',started_at:'2026-11-04T03:01:00Z',completed_at:'2026-11-04T03:02:00Z'});
    assert(proofErrors(e,layer).length,'A real new execution cannot borrow the prior receipt');
    proof.checkout.attempt=4;proof.checkoutArtifact.name=`quality-${proof.run.id}-4-check`;
    assert.deepEqual(proofErrors(e,layer),[],'Its own new receipt remains valid');
  }
});

test('inherited checkout keeps artifact, exact SHA/parents and final-run identity gates',()=>{
  const mutations=[
    p=>p.checkoutArtifact.expired=true,p=>p.checkoutArtifact.workflow_run.head_sha=sha('f'),
    p=>p.checkoutArtifact.name=`quality-${p.run.id}-4-check`,p=>p.checkout.attempt=4,
    p=>p.checkout.head=sha('f'),p=>p.checkout.base=sha('f'),p=>p.checkout.tested=sha('f'),
    p=>p.checkout.parents=[sha('f')],p=>p.currentRun.run_attempt++,
  ];
  for(const version of [2,3])for(const layer of ['preflight','push'])for(const mutate of mutations) {
    const e=mergedEvidence(version),proof=layer==='preflight'?e.preflight:e;
    inheritedReceipt(proof);mutate(proof);assert(proofErrors(e,layer).length,String(mutate));
  }
});

test('receipt collector selects only a proven original execution and still rechecks artifact identity',()=>{
  for(const version of [2,3]) {
    const e=mergedEvidence(version);inheritedReceipt(e,2);
    const dir=mkdtempSync(join(tmpdir(),'inherited-checkout-')),calls=[];
    const artifact=e.checkoutArtifact;
    const query=(...args)=>{
      calls.push(args);const endpoint=args.at(-1);
      if(endpoint.includes('/artifacts?'))return JSON.stringify([{artifacts:[{...artifact,name:'quality-9-1-check'}]},{artifacts:[artifact]}]);
      if(args[0]==='run'){assert(args.includes('quality-9-2-check'));writeFileSync(join(dir,'ci-checkout.json'),JSON.stringify(e.checkout));return '';}
      if(endpoint.endsWith('/artifacts/200'))return JSON.stringify(artifact);
      throw Error(`Unexpected query ${args}`);
    };
    try {
      assert.deepEqual(checkoutReceipt(e.repo,e.run,e.jobs,dir,query,version),{checkout:e.checkout,checkoutArtifact:artifact});
      assert(calls[0].includes('--paginate'));assert.equal(calls.length,3);
      assert.throws(()=>checkoutReceipt(e.repo,e.run,e.jobs,dir,(...args)=>args.at(-1).endsWith('/artifacts/200')?JSON.stringify({...artifact,id:201}):query(...args),version),/changed/);
      e.jobs.at(-1).steps=[];
      assert.throws(()=>checkoutReceipt(e.repo,e.run,e.jobs,dir,()=>{throw Error('Must reject ambiguous origin before artifact lookup');},version),/execution|origin|attempt/i);
    }finally{rmSync(dir,{recursive:true,force:true});}
  }
});

test('current PR proof binds independent target refs even when PR, synthetic merge and CI all agree on the old base',()=>{
  for(const field of ['targetBeforeSha','targetAfterSha'])for(const value of [sha('f'),undefined,null,'invalid']) {
    const e=mergedEvidence(3).preflight;e[field]=value;
    assert(verifyDelivery(e).length,`${field}=${value}: internally consistent old PR evidence must not certify the current target`);
  }
  assert.deepEqual(verifyDelivery(mergedEvidence(3).preflight),[],'An unchanged independently observed target passes');
  assert.deepEqual(verifyDelivery(mergedEvidence(2).preflight),[],'Historical evidence is not retroactively upgraded');
});

function prCollection(targets,{review,files,declaredCount}={}) {
  const e=mergedEvidence(3).preflight,calls=[];
  const pr={number:e.prNumber,state:'open',merged:false,head:{sha:e.head},base:{ref:e.baseRef,sha:e.base},merge_commit_sha:e.tested,
    changed_files:declaredCount??files?.length};
  let refs=0;
  const query=(...args)=>{
    calls.push(args);const endpoint=args.at(-1);
    if(endpoint===`repos/${e.repo}/pulls/${e.prNumber}`)return JSON.stringify(pr);
    if(endpoint===`repos/${e.repo}/pulls/${e.prNumber}/files?per_page=100`)return JSON.stringify([files??[]]);
    if(endpoint===`repos/${e.repo}/git/ref/heads/${e.baseRef}`) {
      const value=targets[Math.min(refs++,targets.length-1)];
      if(value instanceof Error)throw value;
      return typeof value==='string'?value:JSON.stringify(value);
    }
    if(endpoint.includes('/actions/workflows/'))return JSON.stringify([{workflow_runs:[e.run]}]);
    if(endpoint.includes('/jobs?'))return JSON.stringify([{jobs:e.jobs}]);
    if(endpoint===`repos/${e.repo}/commits/${e.tested}`)return JSON.stringify(e.testedCommit);
    throw Error(`Unexpected PR query ${args}`);
  };
  const collect=()=>collectPrDelivery(e.repo,e.prNumber,review??e.review,query,()=>{
    calls.push(['receipt']);return {checkout:e.checkout,checkoutArtifact:e.checkoutArtifact};
  });
  return {collect,calls};
}
const targetRef=target=>({ref:'refs/heads/develop',object:{type:'commit',sha:target}});

test('PR collection reads independent target before artifacts and again after the final run identity check',()=>{
  const stable=prCollection([targetRef(sha('b'))]);
  const {evidence}=stable.collect();
  assert.deepEqual(verifyDelivery(evidence),[]);
  assert.equal(evidence.targetBeforeSha,sha('b'));assert.equal(evidence.targetAfterSha,sha('b'));
  const refCalls=stable.calls.map((args,i)=>args.at(-1).endsWith('/git/ref/heads/develop')?i:-1).filter(i=>i>=0);
  assert.equal(refCalls.length,2);
  assert(refCalls[0]<stable.calls.findIndex(args=>args[0]==='receipt'));
  assert.equal(refCalls[1],stable.calls.length-1,'The actual target is checked after rechecking the PR and latest Quality run');
  assert(stable.calls.filter(args=>args.at(-1).includes('/actions/workflows/')).every(args=>args.includes('--paginate')));
  assert(stable.calls.find(args=>args.at(-1).includes('/jobs?')).includes('--paginate'));
  const stale=prCollection([targetRef(sha('f'))]);
  assert.throws(stale.collect,/PR base is stale/);
  assert(!stale.calls.some(args=>args[0]==='receipt'||args.at(-1).includes('/actions/')),'Reject the old PR/merge/CI combination before collecting artifacts');
  const advancing=prCollection([targetRef(sha('b')),targetRef(sha('f'))]);
  assert(verifyDelivery(advancing.collect().evidence).some(error=>error.includes('targetAfterSha')));
});

test('PR collection fails closed on missing, malformed or unavailable independent target refs at either read',()=>{
  for(const invalid of [null,{},'{',targetRef(undefined),targetRef('invalid'),
    {ref:'refs/heads/master',object:{type:'commit',sha:sha('b')}},
    {ref:'refs/heads/develop',object:{type:'tag',sha:sha('b')}},new Error('GitHub target query failed')]) {
    assert.throws(prCollection([invalid]).collect);
    assert.throws(prCollection([targetRef(sha('b')),invalid]).collect);
  }
});

test('historical merged verification uses the recorded preflight target and actual squash parent, not the current branch tip',()=>{
  const e=mergedEvidence(3);
  e.pr.base.sha=sha('f');e.current.base.sha=sha('f');
  assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
});

test('versioned Full delivery preserves historical fifteen-job evidence and accepts the observed seventeen-job route',()=>{
  for(const version of [2,3]) {
    const e=mergedEvidence(version);
    assert.deepEqual(verifyDelivery(e.preflight),[]);
    assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
  }
  const mixed=mergedEvidence(3);mixed.preflight=mergedEvidence(2).preflight;
  assert.deepEqual(verifyMergedDelivery(mixed),{state:'merged_passed',errors:[]});
});

test('current Full evidence cannot omit orchestration jobs, borrow Fast coverage or relabel historical evidence',()=>{
  const mutations=[
    e=>e.jobs=e.jobs.filter(j=>j.name!=='impact'),
    e=>e.jobs=e.jobs.filter(j=>j.name!=='fast'),
    e=>e.jobs=e.jobs.filter(j=>!['impact','fast'].includes(j.name)),
    e=>e.jobs=e.jobs.filter(j=>!j.name.startsWith('rules (')),
    e=>e.jobs.find(j=>j.name==='fast').name='fast (ubuntu-24.04)',
    e=>e.jobs.find(j=>j.name==='fast').name='fast (windows-2025)',
    e=>e.jobs.find(j=>j.name==='fast').conclusion='success',
    e=>{
      e.jobs=e.jobs.filter(j=>!j.name.startsWith('rules (')&&!j.name.startsWith('engineering-posix ('));
      const fast=e.jobs.find(j=>j.name==='fast');fast.name='fast (ubuntu-24.04)';fast.conclusion='success';
      e.jobs.push({...fast,id:500,name:'fast (windows-2025)'});
    },
    e=>e.schemaVersion=2,e=>e.schemaVersion=4,e=>delete e.schemaVersion,
  ];
  for(const mutate of mutations)for(const layer of ['preflight','push']) {
    const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;mutate(proof);
    if(layer==='preflight')assert(verifyDelivery(proof).length,String(mutate));
    else assert.equal(verifyMergedDelivery(e).state,'merged_pending',String(mutate));
  }
  const historical=mergedEvidence(2).preflight;historical.schemaVersion=3;
  assert(verifyDelivery(historical).length,'Old evidence must not be upgraded by changing its version');
});

test('orchestration jobs retain exact identities, latest-execution semantics and expected Full conclusions',()=>{
  for(const name of ['impact','fast'])for(const layer of ['preflight','push']) {
    for(const mutate of [
  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]].map(([windows,posix])=>e=>{
   const win=e.jobs.find(j=>j.name.startsWith('rules (')),linux=e.jobs.find(j=>j.name.startsWith('engineering-posix ('));
   assert(win&&linux,'current matrices supply complete legacy-shape samples');
   e.jobs=e.jobs.filter(j=>!j.name.startsWith('rules (')&&!j.name.startsWith('engineering-posix ('));
   e.jobs.push(...Array.from({length:windows},(_,i)=>({...win,id:1000+i,name:`rules (${i+1}/${windows})`})),...Array.from({length:posix},(_,i)=>({...linux,id:2000+i,name:`engineering-posix (${i+1}/${posix})`})));
  }),
  e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)'),
  e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:3000}),
  e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').name='engineering-posix (15/14)',
      (e,j)=>j.run_id++,(e,j)=>j.head_sha=sha('f'),(e,j)=>j.run_attempt=0,
      (e,j)=>j.run_attempt=e.run.run_attempt+1,(e,j)=>delete j.id,
      (e,j)=>e.jobs.push({...j,id:500}),(e,j)=>j.status='queued',
      (e,j)=>j.name='unknown',(e,j)=>e.jobs.push({...j,id:500,run_attempt:j.run_attempt+1,conclusion:'failure'}),
    ]) {
      const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;
      mutate(proof,proof.jobs.find(j=>j.name===name));
      if(layer==='preflight')assert(verifyDelivery(proof).length,`${name}: ${mutate}`);
      else assert.equal(verifyMergedDelivery(e).state,'merged_pending',`${name}: ${mutate}`);
    }
    for(const conclusion of ['success','failure','cancelled','skipped',null]) {
      const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;
      const job=proof.jobs.find(j=>j.name===name),expected=name==='fast'?'skipped':'success';
      proof.jobs.push({...job,id:500,run_attempt:job.run_attempt-1,conclusion:'failure'});
      job.conclusion=conclusion;proof.jobs.reverse();
      if(layer==='preflight')assert.equal(verifyDelivery(proof).length===0,conclusion===expected,`${name}/${conclusion}`);
      else assert.equal(verifyMergedDelivery(e).state==='merged_passed',conclusion===expected,`${name}/${conclusion}`);
    }
  }
});

test('current Full retains every current regression requirement rather than trusting routing or aggregate green',()=>{
  for(const name of currentFullQualityJobs.filter(name=>!['impact','fast'].includes(name)))for(const conclusion of ['failure','cancelled','skipped',null])for(const layer of ['preflight','push']) {
    const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;
    proof.jobs.find(j=>j.name===name).conclusion=conclusion;
    if(layer==='preflight')assert(verifyDelivery(proof).length,`${name}/${conclusion}`);
    else assert.equal(verifyMergedDelivery(e).state,'merged_pending',`${name}/${conclusion}`);
  }
});

test('new receipt collection requires current Full shape before any artifact lookup or download',()=>{
  const e=mergedEvidence(3),dir=mkdtempSync(join(tmpdir(),'current-delivery-')),calls=[];
  const query=(...args)=>{
    calls.push(args);
    if(args[0]==='run') {
      writeFileSync(join(dir,'ci-checkout.json'),JSON.stringify(e.checkout));return '';
    }
    if(args.at(-1).includes('/artifacts?'))return JSON.stringify([{artifacts:[e.checkoutArtifact]}]);
    if(args.at(-1).endsWith('/artifacts/200'))return JSON.stringify(e.checkoutArtifact);
    throw Error(`Unexpected query ${args}`);
  };
  try {
    assert.deepEqual(checkoutReceipt(e.repo,e.run,e.jobs,dir,query),{checkout:e.checkout,checkoutArtifact:e.checkoutArtifact});
    assert.equal(calls.length,3);
    const legacy=mergedEvidence(2);
    assert.throws(()=>checkoutReceipt(legacy.repo,legacy.run,legacy.jobs,dir,()=>{throw Error('Must reject missing orchestration before querying artifacts');}),/impact.*missing[\s\S]*fast.*missing/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('partial retries retain successful jobs and the receipt from the effective first shard',()=>{
  for(const version of [2,3]) {
    const e=mergedEvidence(version);
    for(const proof of [e.preflight,e]) {
      const attempt=proof.run.run_attempt;
      proof.jobs.forEach(job=>job.run_attempt=attempt-1);
      proof.checkout.attempt=attempt-1;
      proof.checkoutArtifact.name=`quality-${proof.run.id}-${attempt-1}-check`;
      const last=version===2?'rules (8/8)':`rules (${qualityShardMatrices.windows.length}/${qualityShardMatrices.windows.length})`;
      const old=proof.jobs.find(job=>job.name===last);old.conclusion='failure';
      proof.jobs.push({...old,id:500,run_attempt:attempt,conclusion:'success'});
    }
    assert.deepEqual(verifyDelivery(e.preflight),[]);
    assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
  }
});

test('the last execution wins for every job, regardless of history ordering',()=>{
  for(const name of fullQualityJobs)for(const conclusion of ['success','failure','cancelled','skipped',null]) {
    const e=mergedEvidence();
    for(const proof of [e.preflight,e]) {
      const job=proof.jobs.find(job=>job.name===name);
      // An older failed execution is legitimate history, never current evidence.
      proof.jobs.push({...job,id:500,run_attempt:job.run_attempt-1,conclusion:'failure'});
      job.conclusion=conclusion;
      proof.jobs.reverse();
    }
    assert.equal(verifyDelivery(e.preflight).length===0,conclusion==='success',name);
    assert.equal(verifyMergedDelivery(e).state==='merged_passed',conclusion==='success',name);
  }
});

test('retry job identity and artifact/receipt evidence fail closed in PR and push verification',()=>{
  const mutations=[
    e=>e.jobs[0].run_attempt=0,e=>e.jobs[0].run_attempt=1.5,e=>delete e.jobs[0].run_attempt,
    e=>e.jobs[0].run_attempt=e.run.run_attempt+1,e=>e.jobs.forEach(j=>j.run_attempt--),
    e=>delete e.jobs[0].id,e=>e.jobs[0].id=e.jobs[1].id,e=>e.jobs[0].status='in_progress',
    e=>e.jobs.push({...e.jobs[0],id:500}),e=>e.jobs.push({...e.jobs[0],id:500,run_attempt:1,head_sha:sha('f')}),
    e=>delete e.checkoutArtifact,e=>e.checkoutArtifact.expired=true,e=>delete e.checkoutArtifact.expired,
    e=>e.checkoutArtifact.id=0,e=>e.checkoutArtifact.name=`quality-${e.run.id}-1-check`,
    e=>e.checkoutArtifact.workflow_run.id++,e=>e.checkoutArtifact.workflow_run.head_sha=sha('f'),
    e=>delete e.checkout.schemaVersion,e=>e.checkout.attempt--,e=>e.checkout.base=sha('f'),
    e=>e.checkout.head=sha('f'),e=>e.checkout.runId++,e=>e.checkout.tested=sha('f'),
  ];
  for(const mutate of mutations) {
    const e=mergedEvidence();mutate(e.preflight);mutate(e);
    assert(verifyDelivery(e.preflight).length,String(mutate));
    // Isolate push validation from preflight rejection.
    e.preflight=mergedEvidence().preflight;
    assert.equal(verifyMergedDelivery(e).state,'merged_pending',String(mutate));
  }
});

test('receipt collection uses only the effective first shard artifact, paginates and rechecks its ID',()=>{
 for(const version of [2,3]) {
  const e=mergedEvidence(version);
  e.jobs.find(j=>j.name===(version===2?'rules (1/8)':qualityShardJobs[0])).run_attempt=2;
  e.checkout.attempt=2;e.checkoutArtifact.name='quality-9-2-check';
  const dir=mkdtempSync(join(tmpdir(),'delivery-receipt-'));
  const artifact=e.checkoutArtifact,calls=[];
  const query=(...args)=>{
    calls.push(args);
    const endpoint=args.at(-1);
    if(endpoint.includes('/artifacts?'))return JSON.stringify([{artifacts:[{...artifact,name:'quality-9-1-check'}]},{artifacts:[artifact]}]);
    if(args[0]==='run') {
      assert(args.includes('quality-9-2-check'));
      writeFileSync(join(dir,'ci-checkout.json'),JSON.stringify(e.checkout));return '';
    }
    if(endpoint.endsWith('/artifacts/200'))return JSON.stringify(artifact);
    throw Error(`Unexpected query ${args}`);
  };
  try {
    assert.deepEqual(checkoutReceipt(e.repo,e.run,e.jobs,dir,query,version),{checkout:e.checkout,checkoutArtifact:artifact});
    assert(calls[0].includes('--paginate'));assert.equal(calls.length,3);
    const aggregate=e.jobs.find(j=>j.name==='check');
    aggregate.status='in_progress';aggregate.conclusion=null;
    assert.throws(()=>checkoutReceipt(e.repo,e.run,e.jobs,dir,query,version),/check/);
    assert.deepEqual(checkoutReceipt(e.repo,e.run,e.jobs,dir,query,version,{allowRunningAggregate:true}),{checkout:e.checkout,checkoutArtifact:artifact});
    assert.equal(verifyMergedDelivery(e).state,'merged_pending');
    aggregate.status='completed';aggregate.conclusion='success';
    for(const bad of [[],[artifact,artifact],[{...artifact,expired:true}],[{...artifact,workflow_run:{id:8,head_sha:sha('e')}}]]) {
      assert.throws(()=>checkoutReceipt(e.repo,e.run,e.jobs,dir,(...args)=>{
        assert.equal(args[0],'api');assert(args.at(-1).includes('/artifacts?'));
        return JSON.stringify([{artifacts:bad}]);
      },version),/artifact/);
    }
    assert.throws(()=>checkoutReceipt(e.repo,e.run,e.jobs,dir,(...args)=>
      args.at(-1).endsWith('/artifacts/200')?JSON.stringify({...artifact,id:201}):query(...args),version),/changed/);
  } finally {rmSync(dir,{recursive:true,force:true});}
 }
});

test('normal delivery includes the current complete hosted Quality matrices',()=>{
  const source=readFileSync(qualityWorkflowPath,'utf8').replaceAll('\r\n','\n');
  // Windows checkout can use CRLF; enforce the same complete job contract for both forms.
  for(const newline of ['\n','\r\n']) {
    const workflow=source.replaceAll('\n',newline).replaceAll('\r\n','\n');
    assert.ok(workflow.includes("shard: ${{ fromJSON(inputs.runner_pool == 'local-special' && '[1]' || needs.impact.outputs.windows_shards) }}"));
    assert.ok(workflow.includes('shard: ${{ fromJSON(needs.impact.outputs.posix_shards) }}'));
    for(const platform of ['windows','posix'])assert.ok(workflow.includes(`${platform}_shards: \${{ steps.plan.outputs.${platform}_shards }}`));
    const impactSource=readFileSync('scripts/ci-impact.mjs','utf8');
    assert.ok(impactSource.includes('windows_shards=${JSON.stringify(qualityShardMatrices.windows)}'));
    assert.ok(impactSource.includes('posix_shards=${JSON.stringify(qualityShardMatrices.posix)}'));
    assert.deepEqual(qualityShardMatrices.windows,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]);
    assert.deepEqual(qualityShardMatrices.posix,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    assert.equal(qualityShardJobs.length,33,'current hosted shape is 18 Windows plus 15 POSIX shards');
    assert.deepEqual(fullQualityJobs.filter(name=>name.startsWith('engineering-posix (')),
      Array.from({length:4},(_,i)=>`engineering-posix (${i+1}/4)`));
    assert.equal(fullQualityJobs.length,15);
    assert.equal(deliverySchemaVersion,3);
    assert.deepEqual(currentFullQualityJobs,['check','presentation','engineering-posix',...qualityShardJobs,'impact','fast']);
    assert.equal(currentFullQualityJobs.length,qualityShardJobs.length+5);
    assert.deepEqual(currentFullQualityJobs.filter(name=>name.startsWith('engineering-posix (')),
      Array.from({length:15},(_,i)=>`engineering-posix (${i+1}/15)`));
    assert.match(workflow,/^  impact:\n/m);
    assert.match(workflow,/^  fast:\n[\s\S]*?if: \$\{\{ !cancelled\(\) && needs\.impact\.result == 'success' && needs\.impact\.outputs\.mode == 'fast' \}\}\n/m);
    assert.match(workflow,/os: \[ubuntu-24\.04, windows-2025\]/);
  }
});

test('fully green former four-, six- or eight-POSIX schema-three runs cannot certify the current shape',()=>{
  for(const oldCount of [4,6,8])for(const layer of ['preflight','push']){
    const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;
    const example=proof.jobs.find(job=>job.name==='engineering-posix (1/15)');
    assert(example,'actual current first POSIX shard exists');
    proof.jobs=proof.jobs.filter(job=>!job.name.startsWith('engineering-posix ('));
    proof.jobs.push(...Array.from({length:oldCount},(_,i)=>({...example,id:600+i,name:`engineering-posix (${i+1}/${oldCount})`})));
    if(layer==='preflight')assert(verifyDelivery(proof).length);
    else assert.equal(verifyMergedDelivery(e).state,'merged_pending');
  }
});

test('old fully green twenty-one-, twenty-five-, twenty-seven-, twenty-eight-, thirty-, thirty-three-, thirty-five-, thirty-six- and thirty-seven-job shapes cannot certify current delivery or supply its first-shard receipt',()=>{
  for(const [windows,posix] of [[8,8],[11,9],[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]])for(const layer of ['preflight','push']){
    const e=mergedEvidence(3),proof=layer==='preflight'?e.preflight:e;
    const example=proof.jobs[0];
    proof.jobs=['check','presentation','engineering-posix',...Array.from({length:windows},(_,i)=>`rules (${i+1}/${windows})`),
      ...Array.from({length:posix},(_,i)=>`engineering-posix (${i+1}/${posix})`),'impact','fast']
      .map((name,i)=>({...example,id:700+i,name,conclusion:name==='fast'?'skipped':'success'}));
    if(layer==='preflight')assert(verifyDelivery(proof).length);
    else assert.equal(verifyMergedDelivery(e).state,'merged_pending');
    const current=mergedEvidence(3),bound=layer==='preflight'?current.preflight:current;
    const first=bound.jobs.find(job=>job.name===qualityShardJobs[0]);first.run_attempt=1;
    bound.jobs.push({...first,id:800,name:'rules (1/8)',run_attempt:bound.run.run_attempt});
    if(layer==='preflight')assert(verifyDelivery(bound).some(error=>/receipt|Unexpected/.test(error)));
    else assert.equal(verifyMergedDelivery(current).state,'merged_pending');
  }
});

test('current PR and push delivery reject a missing eighteenth Windows or fifteenth POSIX shard, duplicates and forged job totals or source identity',()=>{
  const windows=qualityShardMatrices.windows.length,posix=qualityShardMatrices.posix.length;
  const last=`rules (${windows}/${windows})`,lastPosix=`engineering-posix (${posix}/${posix})`;
  for(const layer of ['preflight','push'])for(const mutate of [
    proof=>proof.jobs=proof.jobs.filter(job=>job.name!==last),
    proof=>proof.jobs.push({...proof.jobs.find(job=>job.name===last),id:900}),
    proof=>proof.jobs.find(job=>job.name===last).id=proof.jobs.find(job=>job.name===`rules (${windows-1}/${windows})`).id,
    proof=>proof.jobs.push({...proof.jobs.find(job=>job.name===last),id:3001,name:`rules (${windows+1}/${windows})`}),
    proof=>proof.jobs=proof.jobs.filter(job=>job.name!==lastPosix),
    proof=>proof.jobs.push({...proof.jobs.find(job=>job.name===lastPosix),id:3000}),
    proof=>proof.jobs.find(job=>job.name===lastPosix).name=`engineering-posix (${posix}/${posix-1})`,
    proof=>proof.jobs.find(job=>job.name===last).name=`rules (${windows}/${windows-1})`,
    proof=>{proof.jobs=proof.jobs.filter(job=>job.name!==last);proof.jobTotal=currentFullQualityJobs.length;proof.matrix={windows:[...qualityShardMatrices.windows],posix};},
    proof=>proof.checkout.head=sha('f'),
  ]){
    const evidence=mergedEvidence(3),proof=layer==='preflight'?evidence.preflight:evidence;
    assert.equal(proof.jobs.length,currentFullQualityJobs.length);mutate(proof);
    if(layer==='preflight')assert(verifyDelivery(proof).length,String(mutate));
    else assert.equal(verifyMergedDelivery(evidence).state,'merged_pending',String(mutate));
  }
});

test('post-merge delivery binds the actual squash commit, source tree and its own full Quality run',()=>{
  const evidence=mergedEvidence();
  assert.deepEqual(verifyDelivery(evidence.preflight),[]);
  assert.deepEqual(verifyMergedDelivery(evidence),{state:'merged_passed',errors:[]});
  // A later develop push does not rewrite the identity of this already-merged commit.
  assert.notEqual(evidence.pr.base.sha,evidence.preflight.base);
});

test('PR green alone leaves the merged commit pending verification',()=>{
  const evidence=mergedEvidence();delete evidence.run;delete evidence.checkout;evidence.jobs=[];
  const result=verifyMergedDelivery(evidence);
  assert.equal(result.state,'merged_pending');assert.match(result.errors.join('\n'),/Quality/);
  evidence.run={id:7,run_attempt:2,event:'pull_request',head_sha:sha('a'),head_branch:'feature',status:'completed',conclusion:'success'};
  evidence.jobs=evidence.preflight.jobs;evidence.checkout=evidence.preflight.checkout;
  assert.equal(verifyMergedDelivery(evidence).state,'merged_pending');
});

test('post-merge delivery rejects base advancement after preflight even if the resulting tree is unchanged',()=>{
  const evidence=mergedEvidence();evidence.commit.parents=[{sha:sha('f')}];
  evidence.checkout.base=sha('f');evidence.checkout.parents=[sha('f')];
  assert.match(verifyMergedDelivery(evidence).errors.join('\n'),/verified base/);
});

test('post-merge identity, source tree, latest attempt and every Quality job fail closed',()=>{
  const mutations=[
    ['unmerged PR',e=>e.pr.merged=false],['wrong PR',e=>e.pr.number++],
    ['wrong repository',e=>e.repo='other/repo'],['old preflight schema',e=>e.preflight.schemaVersion=1],
    ['changed head',e=>e.pr.head.sha=sha('f')],['changed target',e=>e.pr.base.ref='master'],
    ['wrong merge commit',e=>e.pr.merge_commit_sha=sha('f')],['wrong tree',e=>e.commit.commit.tree.sha=sha('f')],
    ['unbound source tree',e=>delete e.preflight.sourceTree],['multiple parents',e=>e.commit.parents.push({sha:sha('a')})],
    ['unresolved preflight review',e=>e.preflight.review.unresolved.push('finding')],
    ['unbound tested commit',e=>delete e.preflight.testedCommit],['unbound PR workflow',e=>e.preflight.run.path='.github/workflows/other.yml'],
    ['unbound merged workflow',e=>e.run.path='.github/workflows/other.yml'],['another run repository',e=>e.run.repository.full_name='other/repo'],
    ['diagnostic run',e=>e.run.event='workflow_dispatch'],
    ['old combination green',e=>e.run.head_sha=e.preflight.tested],['different branch',e=>e.run.head_branch='master'],
    ['PR run reused',e=>e.run.event='pull_request'],['incomplete run',e=>e.run.status='in_progress'],
    ['failed run',e=>e.run.conclusion='failure'],['old attempt',e=>e.run.run_attempt++],
    ['missing required job',e=>e.jobs.shift()],['duplicate required job',e=>e.jobs.push({...e.jobs[0]})],
    ['missing shard',e=>e.jobs.pop()],['preflight missing shard',e=>e.preflight.jobs.pop()],
    ['cancelled shard',e=>e.jobs.at(-1).conclusion='cancelled'],['skipped shard',e=>e.jobs.at(-1).conclusion='skipped'],
    ['future shard',e=>e.jobs.at(-1).run_attempt=4],['wrong checkout',e=>e.checkout.tested=sha('f')],
    ['stale receipt',e=>e.checkout.runId=7],['wrong receipt parent',e=>e.checkout.parents=[sha('f')]],
    ['PR changed during query',e=>e.current.merge_commit_sha=sha('f')],
    ['new attempt during query',e=>e.currentRun.run_attempt++],['new run during query',e=>e.currentRun.id++],
    ['preflight rerun during query',e=>e.preflight.currentRun.run_attempt++],
  ];
  for(const [name,mutate] of mutations){
    const evidence=mergedEvidence();mutate(evidence);
    const result=verifyMergedDelivery(evidence);
    assert.equal(result.state,'merged_pending',name);assert(result.errors.length,name);
  }
});

test('preflight also rejects unsuccessful extra Quality shards rather than trusting only aggregate names',()=>{
  const evidence=mergedEvidence().preflight;
  evidence.jobs.push({name:'rules (8/8)',status:'completed',conclusion:'skipped',run_attempt:2});
  assert(verifyDelivery(evidence).length);
});

test('PR jobs must belong to the exact run and head even when their attempt and green status match',()=>{
  for(const name of fullQualityJobs){
    for(const [field,value] of [['run_id',6],['head_sha',sha('f')],['run_id',undefined],['head_sha',undefined]]){
      const e=mergedEvidence().preflight;
      const job=e.jobs.find(job=>job.name===name);job[field]=value;
      assert(verifyDelivery(e).length,`${name}: ${field}=${value}`);
    }
  }
});

test('merged push jobs cannot borrow same-attempt green jobs from another run or commit',()=>{
  for(const name of fullQualityJobs){
    for(const [field,value] of [['run_id',8],['head_sha',sha('f')],['run_id',undefined],['head_sha',undefined]]){
      const e=mergedEvidence();
      const job=e.jobs.find(job=>job.name===name);job[field]=value;
      assert.equal(verifyMergedDelivery(e).state,'merged_pending',`${name}: ${field}=${value}`);
    }
  }
});

test('post-merge collector selects only the latest exact push run and all job history pages',()=>{
  const e=mergedEvidence(3),calls=[];
  const docFile={filename:'docs/research/overview.md',status:'modified',sha:sha('a')};
  e.pr.changed_files=1;
  e.preflight.review={disposition:'low-risk-docs',reviewedHeadSha:e.preflight.head,reviewedBaseSha:e.preflight.base};
  e.preflight.changedFileCount=1;e.preflight.changedFiles=[docFile];
  e.jobs.forEach(job=>job.run_attempt=1);
  const retried=e.jobs.find(job=>job.name===`rules (${qualityShardMatrices.windows.length}/${qualityShardMatrices.windows.length})`);retried.conclusion='failure';
  e.jobs.push({...retried,id:500,run_attempt:2},{...retried,id:501,run_attempt:3,conclusion:'success'});
  e.checkout.attempt=1;e.checkoutArtifact.name='quality-9-1-check';
  const query=(...args)=>{
    calls.push(args);
    const endpoint=args.at(-1);
    if(endpoint.endsWith('/pulls/8'))return JSON.stringify(e.pr);
    if(endpoint.endsWith('/pulls/8/files?per_page=100'))return JSON.stringify([[docFile]]);
    if(endpoint.endsWith(`/commits/${sha('e')}`))return JSON.stringify(e.commit);
    if(endpoint.includes('/actions/workflows/quality.yml/runs?'))return JSON.stringify([
      {workflow_runs:[{...e.run,id:8,run_attempt:1},{...e.run,id:10,event:'pull_request'}]},
      {workflow_runs:[{...e.run,id:11,head_sha:sha('f')},e.run]},
    ]);
    if(endpoint.endsWith('/actions/runs/9/jobs?filter=all&per_page=100'))return JSON.stringify([{jobs:e.jobs.slice(0,2)},{jobs:e.jobs.slice(2)}]);
    throw Error(`Unexpected query ${args}`);
  };
  const actual=collectMergedDelivery('owner/repo',8,e.preflight,query,run=>{
    assert.equal(run.id,9);assert.equal(run.run_attempt,3);return {checkout:e.checkout,checkoutArtifact:e.checkoutArtifact};
  });
  assert.equal(actual.schemaVersion,3,'New collection must not infer a legacy contract from returned job names');
  assert.deepEqual(verifyMergedDelivery(actual),{state:'merged_passed',errors:[]});
  assert.equal(actual.changedFiles[0].filename,docFile.filename);
  assert(calls.some(args=>args.includes('--paginate')&&args.at(-1).endsWith('/pulls/8/files?per_page=100')));
  const stale=structuredClone(actual);stale.changedFiles[0].sha=sha('f');
  assert.equal(verifyMergedDelivery(stale).state,'merged_pending');
  assert.equal(calls.filter(args=>args.at(-1).endsWith('/pulls/8')).length,2);
  assert(calls.some(args=>args.includes('--paginate')&&args.at(-1).includes('/jobs?filter=all')));
});

test('newer in-progress merged run cannot borrow an earlier successful push',()=>{
  const e=mergedEvidence();
  const query=(...args)=>{
    const path=args.at(-1);
    if(path.includes('/pulls/'))return JSON.stringify(e.pr);
    if(path.includes('/commits/'))return JSON.stringify(e.commit);
    if(path.includes('/actions/workflows/'))return JSON.stringify([{workflow_runs:[e.run,{...e.run,id:10,status:'in_progress',conclusion:null}]}]);
    throw Error('Pending run must not download a receipt or request old jobs');
  };
  const actual=collectMergedDelivery('owner/repo',8,e.preflight,query,()=>{throw Error('No receipt until completion');});
  assert.equal(actual.run.id,10);assert.equal(verifyMergedDelivery(actual).state,'merged_pending');
});

test('post-merge collection rechecks the latest attempt after reading all evidence',()=>{
  const e=mergedEvidence();let lists=0;
  const query=(...args)=>{
    const path=args.at(-1);
    if(path.includes('/pulls/'))return JSON.stringify(e.pr);
    if(path.includes('/commits/'))return JSON.stringify(e.commit);
    if(path.includes('/actions/workflows/'))return JSON.stringify([{workflow_runs:[++lists===1?e.run:{...e.run,run_attempt:4,status:'in_progress',conclusion:null}]}]);
    if(path.includes('/jobs?filter=all'))return JSON.stringify([{jobs:e.jobs}]);
    throw Error(`Unexpected query ${path}`);
  };
  const actual=collectMergedDelivery('owner/repo',8,e.preflight,query,()=>({checkout:e.checkout,checkoutArtifact:e.checkoutArtifact}));
  assert.equal(actual.run.run_attempt,3);assert.equal(actual.currentRun.run_attempt,4);
  assert.equal(verifyMergedDelivery(actual).state,'merged_pending');
});

test('absent push CI stays pending and never downloads the PR artifact',()=>{
  const e=mergedEvidence();
  const query=(...args)=>{
    const path=args.at(-1);
    if(path.includes('/pulls/'))return JSON.stringify(e.pr);
    if(path.includes('/commits/'))return JSON.stringify(e.commit);
    if(path.includes('/actions/workflows/'))return JSON.stringify([{workflow_runs:[]}]);
    throw Error(`Unexpected query ${path}`);
  };
  const actual=collectMergedDelivery('owner/repo',8,e.preflight,query,()=>{throw Error('Must not borrow any artifact');});
  assert.equal(actual.commit.sha,e.pr.merge_commit_sha);assert.equal(actual.run,undefined);
  assert.equal(verifyMergedDelivery(actual).state,'merged_pending');
});

test('malformed evidence is rejected rather than upgraded by a claimed pass status',()=>{
  for(const value of [null,undefined,{},'passed'])assert(verifyDelivery(value).length);
  const e=mergedEvidence();e.state='merged_passed';e.jobs=null;
  assert.equal(verifyMergedDelivery(e).state,'merged_pending');
  const partial=mergedEvidence();partial.jobs=[null];partial.commit.parents={};
  assert.equal(verifyMergedDelivery(partial).state,'merged_pending');
});

test('delivery accepts exact merge parents and rejects stale reviews, attempts and missing jobs',async()=>{
  const evidence=mergedEvidence().preflight;
  assert.deepEqual(verifyDelivery(evidence),[]);
  for(const mutate of [e=>e.head='d'.repeat(40),e=>e.base='d'.repeat(40),e=>e.jobs.pop(),e=>e.jobs[0].conclusion='skipped',e=>e.attempt++,e=>e.parents.reverse(),e=>e.review.unresolved=['open bug'],e=>e.checkout.tested=e.head]) {
    const bad=structuredClone(evidence);mutate(bad);assert(verifyDelivery(bad).length>0);
  }
});

test('low-risk waiver uses bounded actual GitHub files, never agent self-classification',()=>{
  const allowed=[
    {filename:'README.md',status:'modified',sha:sha('a')},
    {filename:'docs/research/guide.md',status:'added',sha:sha('b')},
    {filename:'docs/history/notes.txt',status:'modified',sha:sha('c')}];
  assert(isLowRiskDocumentationChange(allowed,3));
  const valid=prCollection([targetRef(sha('b'))],{review:{disposition:'low-risk-docs'},files:allowed});
  const {evidence}=valid.collect();
  assert.deepEqual(verifyDelivery(evidence),[]);
  assert.equal(evidence.review.reviewedHeadSha,evidence.head);
  assert.equal(evidence.review.reviewedBaseSha,evidence.base);
  assert(valid.calls.some(args=>args.includes('--paginate')&&args.at(-1).endsWith('/pulls/8/files?per_page=100')));
  for(const files of [
    [{filename:'AGENTS.md',status:'modified',sha:sha('a')}],
    [{filename:'docs/CI.md',status:'modified',sha:sha('a')}],
    [{filename:'docs/research/a.md',status:'modified',sha:sha('a')},{filename:'src/lua/abyss_run.lua',status:'modified',sha:sha('b')}],
    [{filename:'docs/research/a.md',status:'renamed',sha:sha('a')}],
    [{filename:'docs/research/a.md',status:'removed',sha:sha('a')}],
    [{filename:'docs/research/../CI.md',status:'modified',sha:sha('a')}],
    [{filename:'docs/research/a.md',status:'modified',sha:'bad'}],
    [{filename:'docs/research/a.md',status:'modified',sha:sha('a')},{filename:'docs/research/a.md',status:'modified',sha:sha('a')}],
    Array.from({length:21},(_,i)=>({filename:`docs/research/n${i}.md`,status:'added',sha:sha('a')})),
  ]) {
    assert(!isLowRiskDocumentationChange(files,files.length));
    assert.throws(prCollection([targetRef(sha('b'))],{review:{disposition:'low-risk-docs'},files}).collect,/Low-risk waiver denied/);
  }
  assert.throws(prCollection([targetRef(sha('b'))],{review:{disposition:'low-risk-docs'},files:allowed,declaredCount:4}).collect,/Low-risk waiver denied/);
  for(const mutate of [e=>e.review.reviewedHeadSha=sha('f'),e=>e.review.reviewedBaseSha=sha('f'),
    e=>e.changedFileCount=2,e=>e.changedFiles[0].filename='scripts/verify-delivery.mjs',
    e=>e.changedFiles[0].status='renamed',e=>e.schemaVersion=2,e=>e.baseRef='master']) {
    const bad=structuredClone(evidence);mutate(bad);assert(verifyDelivery(bad).length);
  }
});

test('merged delivery rejects missing or changed documentation waiver evidence',()=>{
  const e=mergedEvidence(3),file={filename:'docs/research/overview.md',status:'modified',sha:sha('a')};
  e.preflight.review={disposition:'low-risk-docs',reviewedHeadSha:e.preflight.head,reviewedBaseSha:e.preflight.base};
  e.preflight.changedFileCount=1;e.preflight.changedFiles=[file];
  e.changedFileCount=1;e.changedFiles=[structuredClone(file)];
  assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
  e.changedFiles[0].sha=sha('b');
  assert.equal(verifyMergedDelivery(e).state,'merged_pending');
  delete e.changedFiles;
  assert.equal(verifyMergedDelivery(e).state,'merged_pending');
});

test('documentation waiver rejects agent instruction entrypoints in every allowed directory and case',()=>{
 for(const filename of ['docs/research/AGENTS.md','docs/research/SKILL.md','docs/history/CLAUDE.md','docs/lore/agents.md','docs/drafts/Skill.md','docs/research/AGENTS.override.md','docs/history/CLAUDE.local.md','docs/lore/agents.OVERRIDE.md','docs/drafts/Claude.LOCAL.md']){
  assert.equal(isLowRiskDocumentationChange([{filename,status:'added',sha:'a'.repeat(40)}],1),false,filename);
 }
});

// The intent is a locator, never a fabricated replacement for PR preflight.
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {currentFastQualityJobs} from '../scripts/pr-quality-evidence.mjs';
import {validateIndependentAiReview,INDEPENDENT_AI_REVIEW_MARKER,cloudGateSourceErrors,collectCloudGateSource} from '../scripts/independent-ai-review.mjs';
import {uninstalledReviewBase} from './helpers/merge-queue-admission.mjs';
function nativeDeliveryFixture(base=sha('b')){
 const e=mergedEvidence(3),p=e.preflight,repo='FurinyaWorks/Slay-the-Heavens',repository={id:1429751262,full_name:repo};
 if(base!==p.base){p.base=base;p.targetBeforeSha=base;p.targetAfterSha=base;p.parents[0]=base;
  p.checkout.base=base;p.checkout.parents[0]=base;p.testedCommit.parents[0].sha=base;p.review.reviewedBaseSha=base;}
 p.repo=repo;p.run.repository=repository;p.currentRun.repository=repository;
 e.repo=repo;e.run.repository=repository;e.currentRun.repository=repository;
 const pr={number:p.prNumber,user:{id:337201427},state:'open',merged:false,draft:false,mergeable:true,body:'Depends-on: none',
  head:{sha:p.head,ref:'feat/native-proof',repo:repository},base:{sha:p.base,ref:'develop',repo:repository},merge_commit_sha:p.tested};
 const user={id:337201427,login:'v5g95m7t8m-max'},report={schemaVersion:1,kind:'independent-ai-review',repositoryId:repository.id,repositoryFullName:repo,
  prNumber:p.prNumber,reviewedHeadSha:p.head,reviewedBaseSha:p.base,reviewedTreeSha:p.sourceTree,conclusion:'pass',unresolved:[],
  reviewerAgent:'/root/delivery_reviewer',implementationAgents:['/root/implementer'],coordinator:{...user,verifiedActualSessions:true},
  provenance:{kind:'coordinator-verified-agent-session',reviewId:p.review.reviewId,sessionId:'fixture-delivery-session'}};
 const reviews=[{id:100,state:'COMMENTED',commit_id:p.head,user,submitted_at:'2026-11-17T10:00:00Z',
  body:INDEPENDENT_AI_REVIEW_MARKER+'\n'+JSON.stringify(report)}];
 const permissions={[user.id]:{permission:'write',role_name:'maintain',user}},sourceCommit={sha:p.tested,tree:{sha:p.sourceTree},parents:p.parents.map(sha=>({sha}))};
 const target={ref:'refs/heads/develop',object:{type:'commit',sha:p.base}},snapshot={...pr,authorId:pr.user.id};delete snapshot.user;
 const nativeReview={...validateIndependentAiReview({repository,pr,baseSha:p.base,sourceCommit,reviews,permissions,dependencies:[]}),
  observations:{prBefore:snapshot,prAfter:structuredClone(snapshot),targetBefore:target,targetAfter:structuredClone(target),sourceCommit,reviews,permissions,dependencies:[]}};
 assert.equal(nativeReview.conclusion,'pass');
 const proof={schemaVersion:1,kind:'native-ai-review-proof',mode:'publish',state:'pr_passed',repo,prNumber:p.prNumber,head:p.head,base:p.base,
  nativeReview,nativePolicy:{rules:[{type:'pull_request',parameters:{required_approving_review_count:0,dismiss_stale_reviews_on_push:false,require_code_owner_review:false}}]},preflight:p,
  gate:{runId:50,attempt:1,ref:'refs/heads/develop',bootstrap:false},policyErrors:[]};
 const intent={schemaVersion:9,kind:'native-auto-merge-intent',repo,repositoryId:repository.id,prNumber:p.prNumber,
  head:p.head,base:p.base,sourceTree:p.sourceTree,githubReviewId:100,gateRef:'refs/heads/develop',createdAt:'2026-11-17T10:01:00Z',nativeAuto:{confirmed:true,state:'waiting'}};
 const gateRun={id:50,run_attempt:1,path:'.github/workflows/licenses.yml',event:'workflow_dispatch',status:'completed',conclusion:'success',repository,head_branch:'develop',head_sha:p.base};
 const artifact={id:70,name:`independent-review-${p.prNumber}-${p.head.slice(0,12)}-50-1`,expired:false,workflow_run:{id:50,head_sha:p.base,repository_id:repository.id,head_repository_id:repository.id}};
 const status={id:90,context:'independent-review',state:'success',creator:{id:41898282,login:'github-actions[bot]'},
  description:`AI review 100 [base:${p.base}] [proof:70]`,target_url:`https://github.com/${repo}/actions/runs/50`};
 const f={e,proof,intent,repository,gateRun,artifact,status,calls:[]};
 f.zip=()=>nativeStoredZip(Buffer.from(JSON.stringify(f.proof)));
 artifact.digest='sha256:'+createHash('sha256').update(f.zip()).digest('hex');
 return f;
}
function nativeStoredZip(data,name='native-ai-review-proof.json',compressed=false){
 const filename=Buffer.from(name),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 const payload=compressed?deflateRawSync(data):data,method=compressed?8:0;
 let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^(-(crc&1)&0xedb88320);}crc=(crc^0xffffffff)>>>0;
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(payload.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);
 const first=Buffer.concat([local,filename,payload]),directory=Buffer.concat([central,filename]);
 end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(first.length,16);
 return Buffer.concat([first,directory,end]);
}
function nativeProofQuery(f,adjust=(_path,value)=>value){
 return(...args)=>{
  f.calls.push(args);
  if(args[0]==='run'){
   assert.equal(args[1],'download');writeFileSync(join(args[args.indexOf('--dir')+1],'native-ai-review-proof.json'),JSON.stringify(f.proof));return '';
  }
  const path=args.at(-1);let value;
  if(path==='repositories/1429751262')value=f.repository;
  else if(f.installation&&path.endsWith('/git/commits/'+f.intent.base))value=f.installation.commit;
  else if(f.installation&&path.endsWith('/git/trees/'+f.installation.commit.tree.sha))value=f.installation.root;
  else if(f.installation&&path.endsWith('/git/trees/'+f.installation.root.tree.find(row=>row.path==='scripts')?.sha))value=f.installation.scripts;
  else if(path.includes('/statuses?'))value=[[f.status]];
  else if(path.endsWith('/actions/artifacts/70'))value=f.artifact;
  else if(path.endsWith('/actions/runs/50'))value=f.gateRun;
  else if(path.endsWith('/actions/runs/50/artifacts?per_page=100'))value=[{artifacts:[f.artifact]}];
  else throw Error('Unexpected native proof query '+path);
  return JSON.stringify(adjust(path,structuredClone(value)));
 };
}

test('native intent resolves actual immutable downloaded proof without reconstructing the original PR observations',()=>{
 const f=nativeDeliveryFixture(),actual=delivery.resolveNativePreflight(f.intent,nativeProofQuery(f));
 assert.deepEqual(verifyDelivery(actual),[]);assert.equal(actual.schemaVersion,3);
 for(const field of ['targetBeforeSha','targetAfterSha','run','currentRun','checkout','checkoutArtifact','jobs','testedCommit'])
  assert.deepEqual(actual[field],f.proof.preflight[field],field+' remains the original pre-merge observation');
 assert.equal(actual.nativeProof.artifact.id,70);assert.equal(actual.nativeReview.githubReviewId,100);
 assert.equal(Object.hasOwn(actual.nativeReview,'nativeApprovalReviewId'),false);
 assert.equal(actual.nativeReview.observations.prBefore.authorId,actual.nativeReview.coordinator.id);
 assert(f.calls.some(args=>args[0]==='run'&&args.includes('download')));
 assert.equal(f.calls.filter(args=>args.at(-1).endsWith('/actions/artifacts/70')).length,2);
 assert(!f.calls.some(args=>args.includes('POST')||args.some(value=>String(value).includes('/rulesets/'))));
});

test('native proof ZIP adapter verifies the original API ZIP digest and rejects JSON or modified archive substitutes',()=>{
 const f=nativeDeliveryFixture();
 assert.equal(delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>f.zip()}).nativeReview.githubReviewId,100);
 const deflated=nativeDeliveryFixture(),compressed=nativeStoredZip(Buffer.from(JSON.stringify(deflated.proof)),'native-ai-review-proof.json',true);
 deflated.artifact.digest='sha256:'+createHash('sha256').update(compressed).digest('hex');
 assert.equal(delivery.resolveNativePreflight(deflated.intent,nativeProofQuery(deflated),{loadProof:()=>compressed}).nativeReview.githubReviewId,100);
 for(const data of [Buffer.from(JSON.stringify(f.proof)),Buffer.concat([f.zip(),Buffer.from('extra')]),{},f.proof])
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>data}),/ZIP|digest/);
 const bad=nativeDeliveryFixture(),bytes=nativeStoredZip(Buffer.from(JSON.stringify(bad.proof)),'foreign.json');
 bad.artifact.digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 assert.throws(()=>delivery.resolveNativePreflight(bad.intent,nativeProofQuery(bad),{loadProof:()=>bytes}),/ZIP entry/);
});

test('native proof never accepts shadow artifacts, false CI, untrusted or non-independent reports or stale exact identities',()=>{
 for(const mutate of [
  f=>f.intent.nativeAuto.confirmed=false,f=>f.intent.sourceTree=sha('f'),f=>f.intent.githubReviewId=101,
  f=>f.status.creator.id=1,f=>f.status.creator.login='other',f=>f.status.state='failure',
  f=>f.status.description=f.status.description.replace(f.intent.base,sha('f')),f=>f.status.description=f.status.description.replace('100 [','101 ['),
  f=>f.artifact.expired=true,f=>f.artifact.id=71,f=>f.artifact.name='shadow-proof',
  f=>f.artifact.workflow_run.id=51,f=>f.artifact.workflow_run.repository_id=1,
  f=>f.gateRun.repository.id=1,f=>f.gateRun.head_repository={id:1,full_name:f.intent.repo},
  f=>f.gateRun.event='pull_request',f=>f.gateRun.path='.github/workflows/quality.yml',
  f=>f.gateRun.run_attempt=2,f=>f.gateRun.head_sha=sha('f'),f=>f.gateRun.conclusion='failure',
  f=>f.proof.mode='shadow',f=>f.proof.state='shadow_verified',f=>f.proof.head=sha('f'),f=>f.proof.base=sha('f'),
  f=>f.proof.gate.ref='refs/heads/foreign',f=>f.proof.policyErrors=['native gate disabled'],
  f=>f.proof.preflight.jobs.pop(),f=>f.proof.preflight.currentRun.conclusion='failure',
  f=>f.proof.preflight.targetBeforeSha=sha('f'),f=>f.proof.preflight.sourceTree=sha('f'),
  f=>f.proof.nativeReview.report.coordinator.verifiedActualSessions=false,
  f=>f.proof.nativeReview.observations.reviews[0].user.id=999,
  f=>f.proof.nativeReview.observations.reviews[0].state='PENDING',
  f=>f.proof.nativeReview.observations.reviews[0].state='DISMISSED',
 ]){
  const f=nativeDeliveryFixture();mutate(f);
  const zip=f.zip();f.artifact.digest='sha256:'+createHash('sha256').update(zip).digest('hex');
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>zip}),undefined,String(mutate));
 }
});

test('native proof retains the original schema7 dual-platform Fast receipt and plan',()=>{
 const f=nativeDeliveryFixture(),p=f.proof.preflight;
 Object.assign(p,{schemaVersion:7,kind:'pr-fast',number:p.prNumber,target:p.base,commit:p.testedCommit,
  latestRun:p.currentRun,pr:{...f.proof.nativeReview.observations.prBefore,labels:[]},
  plan:{mode:'fast',sha:p.tested,head:p.head,base:p.base,runId:p.runId,attempt:p.attempt,
   changed:['scripts/value.mjs'],js:['tests/value.test.mjs'],lua:[],reason:'Complete affected set'}});
 p.jobs=currentFastQualityJobs.map((name,i)=>({id:100+i,name,run_id:p.runId,run_attempt:p.attempt,head_sha:p.head,
  status:'completed',conclusion:name.startsWith('needs.')?'skipped':'success'}));
 p.checkoutArtifact.name=`quality-${p.runId}-${p.attempt}-fast`;
 const zip=f.zip();f.artifact.digest='sha256:'+createHash('sha256').update(zip).digest('hex');
 const actual=delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>zip});
 assert.equal(actual.schemaVersion,7);assert.deepEqual(actual.plan,p.plan);assert.deepEqual(verifyDelivery(actual),[]);
 f.proof.preflight.jobs.find(job=>job.name==='fast (windows-2025)').conclusion='failure';
 const failed=f.zip();f.artifact.digest='sha256:'+createHash('sha256').update(failed).digest('hex');
 assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>failed}),/delivery\/review verification/);
});

test('native proof refuses immutable ID/digest replacement and superseding status or gate attempts during download',()=>{
 for(const mutate of [f=>f.artifact.id=71,f=>f.artifact.digest='sha256:'+'0'.repeat(64),
  f=>f.gateRun.run_attempt++,f=>{f.status.id=91;f.status.state='failure';}]){
  const f=nativeDeliveryFixture(),zip=f.zip();
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f),{loadProof:()=>{mutate(f);return zip;}}));
 }
 const f=nativeDeliveryFixture();
 assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f,(path,value)=>
  path.endsWith('/artifacts?per_page=100')?[{artifacts:[f.artifact,{...f.artifact,id:71}]}]:value)),/ambiguous|replaced/);
});

function bootstrapDeliveryFixture(base=sha('b')){
 const f=nativeDeliveryFixture(base);f.intent.gateRef='refs/heads/feat/native-proof';
 f.installation=uninstalledReviewBase(base);f.proof.nativeReview.report.installBaseSha=base;
 f.proof.nativeReview.observations.reviews[0].body=INDEPENDENT_AI_REVIEW_MARKER+'\n'+JSON.stringify(f.proof.nativeReview.report);
 f.proof.gate.ref=f.intent.gateRef;f.proof.gate.bootstrap=true;f.gateRun.head_branch='feat/native-proof';f.gateRun.head_sha=f.intent.head;
 f.artifact.workflow_run.head_sha=f.intent.head;
 f.gateRun.actor={id:f.proof.nativeReview.coordinator.id};f.gateRun.triggering_actor={id:f.proof.nativeReview.coordinator.id};
 return f;
}
test('native bootstrap proof permits an explicitly reviewed uninstalled BASE and actual coordinator-dispatched source',()=>{
 const f=bootstrapDeliveryFixture();assert.equal(delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)).head,f.intent.head);
 const advanced=bootstrapDeliveryFixture(sha('f'));
 assert.equal(delivery.resolveNativePreflight(advanced.intent,nativeProofQuery(advanced)).base,sha('f'));
 for(const mutate of [
  f=>delete f.gateRun.actor,f=>delete f.gateRun.triggering_actor,
  f=>f.gateRun.actor.id=111138384,f=>f.gateRun.triggering_actor.id=111138384,
  f=>f.gateRun.event='workflow_run',f=>f.gateRun.head_sha=f.intent.base,
  f=>{f.intent.gateRef=f.proof.gate.ref='refs/heads/foreign';f.gateRun.head_branch='foreign';}
 ]){const bad=bootstrapDeliveryFixture();mutate(bad);assert.throws(()=>delivery.resolveNativePreflight(bad.intent,nativeProofQuery(bad)),/Bootstrap cloud review|gate run.*mismatched/);}
});
test('bootstrap proof rechecks actual gate dispatcher identity after the immutable download',()=>{
 for(const actor of ['actor','triggering_actor']){
  const f=bootstrapDeliveryFixture();let reads=0;
  const query=nativeProofQuery(f,(path,value)=>{
   if(path.endsWith('/actions/runs/50')&&++reads===2)value[actor]={id:111138384};return value;
  });
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,query),/changed during download/);
 }
});
test('shared cloud gate source validation allows a running producer but authenticates its full source identity',()=>{
 const f=nativeDeliveryFixture(),context={repo:f.intent.repo,head:f.intent.head,base:f.intent.base,ref:f.intent.gateRef,
  bootstrap:false,coordinator:f.proof.nativeReview.coordinator,reviewedBranch:'feat/native-proof'};
 assert.deepEqual(cloudGateSourceErrors({...f.gateRun,status:'in_progress',conclusion:null},context),[]);
 for(const mutate of [x=>x.run.head_sha=x.context.head,x=>x.run.repository.id=1,x=>x.run.path='.github/workflows/quality.yml',
  x=>x.run.head_branch='foreign',x=>x.run.event='pull_request',x=>delete x.context.bootstrap]){
  const x={run:structuredClone(f.gateRun),context:structuredClone(context)};mutate(x);assert(cloudGateSourceErrors(x.run,x.context).length);
 }
});

function nativeQueueEvidence(preflight,mergedSha){
 const repo=preflight.repo,branch=`gh-readonly-queue/develop/pr-${preflight.prNumber}-${preflight.base}`;
 const run={id:21,run_attempt:1,event:'merge_group',head_sha:mergedSha,head_branch:branch,path:qualityWorkflowPath,
  status:'completed',conclusion:'success',repository:{full_name:repo}};
 const jobs=currentFullQualityJobs.map((name,i)=>({id:500+i,name,run_id:21,run_attempt:1,head_sha:mergedSha,status:'completed',conclusion:name==='fast'?'skipped':'success'}));
 const licenseRun={id:22,run_attempt:1,event:'merge_group',head_sha:mergedSha,path:'.github/workflows/licenses.yml',status:'completed',conclusion:'success',repository:{full_name:repo}};
 return {schemaVersion:8,kind:'native-queue-full',commit:{sha:mergedSha,parents:[{sha:preflight.base}],commit:{tree:{sha:preflight.sourceTree}}},
  reviewBaseAncestry:{before:preflight.base,after:preflight.base,comparison:{status:'identical',base_commit:{sha:preflight.base},merge_base_commit:{sha:preflight.base}}},run,jobs,currentRun:structuredClone(run),
  checkout:{schemaVersion:1,event:'merge_group',runId:21,attempt:1,tested:mergedSha,head:mergedSha,base:preflight.base,parents:[preflight.base]},
  checkoutArtifact:{id:210,name:'quality-21-1-check',expired:false,workflow_run:{id:21,head_sha:mergedSha}},
  statuses:['full-quality','pr-quality','independent-review'].map((context,i)=>({id:600+i,context,state:'success',creator:{id:41898282,login:'github-actions[bot]'},target_url:`https://github.com/${repo}/actions/runs/21`})),
  licenses:{run:licenseRun,currentRun:structuredClone(licenseRun),jobs:[
   {id:700,name:'inventory',run_id:22,run_attempt:1,head_sha:mergedSha,status:'completed',conclusion:'success'},
   {id:701,name:'independent-ai-review',run_id:22,run_attempt:1,head_sha:mergedSha,status:'completed',conclusion:'skipped'}]}};
}
function nativeMergedFixture(){
 const f=nativeDeliveryFixture(),e=f.e;e.preflight={...f.proof.preflight,nativeReview:f.proof.nativeReview};
 e.queueFull=nativeQueueEvidence(e.preflight,e.pr.merge_commit_sha);return e;
}
test('native Full PR delivery requires actual queue Full and real inventory as well as independent push Full',()=>{
 const e=nativeMergedFixture();assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
 for(const mutate of [x=>delete x.queueFull,x=>x.queueFull.kind='fast-queue-full',x=>x.queueFull.jobs.pop(),
  x=>x.queueFull.currentRun.run_attempt++,x=>x.queueFull.checkout.base=sha('f'),
  x=>x.queueFull.statuses[0].creator.id=1,x=>x.queueFull.licenses.jobs[0].conclusion='skipped',
  x=>x.queueFull.licenses.jobs[1].name='inventory',x=>x.queueFull.licenses.jobs[1].id=700,
  x=>x.queueFull.licenses.jobs[1].conclusion='success',x=>x.queueFull.licenses.jobs=null,
  x=>x.run.conclusion='failure',x=>x.commit.parents=[{sha:sha('f')}],x=>x.commit.commit.tree.sha=sha('f')]){
  const x=structuredClone(e);mutate(x);assert.equal(verifyMergedDelivery(x).state,'merged_pending',String(mutate));
 }
 const legacy={...e.queueFull,kind:'fast-queue-full',licenses:{...e.queueFull.licenses,jobs:e.queueFull.licenses.jobs.slice(0,1)}};
 assert.deepEqual(delivery.verifyFastQueueFull(legacy,e.preflight,e.pr.merge_commit_sha),[],'original schema8 Fast contract remains supported');
});

test('merged collector obtains queue Full for native-reviewed Full PRs without changing legacy preflight observations',()=>{
 const e=nativeMergedFixture(),seen=[];
 const query=(...args)=>{
  const path=args.at(-1);
  if(path.endsWith('/pulls/8'))return JSON.stringify(e.pr);
  if(path.endsWith('/commits/'+e.pr.merge_commit_sha))return JSON.stringify(e.commit);
  if(path.includes('/statuses?'))return JSON.stringify([e.queueFull.statuses]);
  if(path.includes('/actions/workflows/quality.yml/'))return JSON.stringify([{workflow_runs:[path.includes('event=push')?e.run:e.queueFull.run]}]);
  if(path.includes('/actions/workflows/licenses.yml/'))return JSON.stringify([{workflow_runs:[e.queueFull.licenses.run]}]);
  const id=Number(path.match(/actions\/runs\/(\d+)\/jobs/)?.[1]);
  if(id)return JSON.stringify([{jobs:id===9?e.jobs:id===21?e.queueFull.jobs:e.queueFull.licenses.jobs}]);
  if(path.includes('/compare/'))return JSON.stringify(e.queueFull.reviewBaseAncestry.comparison);
  throw Error('Unexpected native merged query '+path);
 };
 const actual=collectMergedDelivery(e.repo,8,e.preflight,query,run=>{
  seen.push(run.id);return run.id===9?{checkout:e.checkout,checkoutArtifact:e.checkoutArtifact}:
   {checkout:e.queueFull.checkout,checkoutArtifact:e.queueFull.checkoutArtifact};
 });
 assert.deepEqual(seen,[9,21]);assert.equal(actual.queueFull.kind,'native-queue-full');
 assert.deepEqual(actual.preflight,e.preflight);assert.deepEqual(verifyMergedDelivery(actual),{state:'merged_passed',errors:[]});
});


test('native intent needs no human approval policy and accepts an old review-ID alias only when it matches the signed report',()=>{
 const f=nativeDeliveryFixture();
 assert.equal(f.proof.nativeReview.observations.reviews[0].state,'COMMENTED');
 assert.equal(f.proof.nativePolicy.rules[0].parameters.required_approving_review_count,0);
 assert.equal(delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)).nativeReview.githubReviewId,100);
 f.intent.nativeApprovalReviewId=100;f.proof.nativeReview.nativeApprovalReviewId=100;
 assert.equal(delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)).nativeReview.githubReviewId,100);
 f.intent.nativeApprovalReviewId=101;
 assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)),/intent locator/);
 f.intent.nativeApprovalReviewId=100;f.proof.nativeReview.nativeApprovalReviewId=101;
 assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)),/different exact preflight/);
});

test('explicit install authorization and complete immutable Git trees are required; an installed module of any type blocks bootstrap',()=>{
 const mutations=[
  f=>delete f.proof.nativeReview.report.installBaseSha,f=>f.proof.nativeReview.report.installBaseSha=sha('f'),
  f=>f.proof.nativeReview.report.installBaseSha='invalid',
  f=>f.installation.commit.sha=sha('f'),f=>f.installation.root.sha=sha('f'),f=>f.installation.scripts.sha=sha('f'),
  f=>f.installation.root.truncated=true,f=>f.installation.scripts.truncated=true,
  f=>delete f.installation.root.truncated,f=>delete f.installation.scripts.tree,
  f=>f.installation.root.tree.push({...f.installation.root.tree[0]}),
  f=>{f.installation.root.tree[0].mode='120000';f.installation.root.tree[0].type='blob';},
  f=>delete f.installation.scripts.tree[0].sha
 ];
 for(const [mode,type]of [['100644','blob'],['100755','blob'],['120000','blob'],['160000','commit'],['040000','tree']])
  mutations.push(f=>f.installation.scripts.tree.push({path:'independent-ai-review.mjs',mode,type,sha:sha('9')}));
 for(const mutate of mutations){
  const f=bootstrapDeliveryFixture();mutate(f);
  f.proof.nativeReview.observations.reviews[0].body=INDEPENDENT_AI_REVIEW_MARKER+'\n'+JSON.stringify(f.proof.nativeReview.report);
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,nativeProofQuery(f)),undefined,String(mutate));
 }
 for(const suffix of ['/git/commits/','/git/trees/']){
  const f=bootstrapDeliveryFixture(),normal=nativeProofQuery(f);
  assert.throws(()=>delivery.resolveNativePreflight(f.intent,(...args)=>{
   if(args.at(-1).includes(suffix))throw Error('HTTP 403 Git metadata unavailable');return normal(...args);
  }),/403/);
 }
 const normal=nativeDeliveryFixture();delivery.resolveNativePreflight(normal.intent,nativeProofQuery(normal));
 assert(!normal.calls.some(args=>args.at(-1).includes('/git/')),'normal mode does not add Git object reads');
});
test('shared source collector proves absence from authenticated immutable objects and fails closed on API errors',()=>{
 const f=bootstrapDeliveryFixture(),calls=[],objects=f.installation;
 const api=path=>{calls.push(path);if(path.endsWith('/git/commits/'+f.intent.base))return objects.commit;
  if(path.endsWith('/git/trees/'+objects.commit.tree.sha))return objects.root;
  if(path.endsWith('/git/trees/'+objects.root.tree[0].sha))return objects.scripts;throw Error('Unexpected Git read');};
 const context={run:f.gateRun,repo:f.intent.repo,head:f.intent.head,base:f.intent.base,ref:f.intent.gateRef,bootstrap:true,
  coordinator:f.proof.nativeReview.coordinator,reviewedBranch:'feat/native-proof',installBaseSha:f.intent.base};
 const result=collectCloudGateSource({api,...context});assert.deepEqual(result.errors,[]);assert.equal(calls.length,3);
 assert.deepEqual(result.observations.installation,objects);
 assert(collectCloudGateSource({...context,api:()=>{throw Error('HTTP403');}}).errors.length);
 assert(collectCloudGateSource({...context,api:async()=>objects.commit}).errors.length);
});

function secondNativeMergedFixture(){
 const e=nativeMergedFixture(),q=sha('4'),tree=sha('6');
 e.commit.parents=[{sha:q}];e.commit.commit.tree.sha=tree;
 e.queueFull.commit=structuredClone(e.commit);
 e.queueFull.reviewBaseAncestry={before:e.preflight.base,after:q,
  comparison:{status:'ahead',base_commit:{sha:e.preflight.base},merge_base_commit:{sha:e.preflight.base}}};
 e.queueFull.run.head_branch=e.queueFull.currentRun.head_branch=`gh-readonly-queue/develop/pr-${e.preflight.prNumber}-${q}`;
 for(const receipt of [e.checkout,e.queueFull.checkout]){receipt.base=q;receipt.parents=[q];}
 return e;
}
test('native post-merge delivery verifies the actual second-group Q/G/tree without rewriting original B0/T0 preflight',()=>{
 const e=secondNativeMergedFixture(),original=JSON.stringify(e.preflight);
 assert.notEqual(e.queueFull.checkout.base,e.preflight.base);assert.notEqual(e.commit.commit.tree.sha,e.preflight.sourceTree);
 assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});assert.equal(JSON.stringify(e.preflight),original);
 const legacy=structuredClone(e);delete legacy.preflight.nativeReview;
 assert.equal(verifyMergedDelivery(legacy).state,'merged_pending','old schema3 merged contract is not loosened');
 for(const mutate of [
  x=>delete x.queueFull.commit,x=>x.queueFull.commit.sha=sha('f'),x=>x.queueFull.commit.commit.tree.sha=sha('f'),
  x=>x.queueFull.commit.parents.push({sha:x.preflight.base}),x=>x.queueFull.checkout.base=x.preflight.base,
  x=>x.queueFull.checkout.parents=[x.preflight.base],x=>x.checkout.base=x.preflight.base,
  x=>x.checkout.parents=[x.preflight.base],x=>x.queueFull.reviewBaseAncestry.before=sha('f'),
  x=>x.queueFull.reviewBaseAncestry.after=x.preflight.base,x=>x.queueFull.reviewBaseAncestry.comparison.status='diverged',
  x=>x.queueFull.reviewBaseAncestry.comparison.merge_base_commit.sha=sha('f'),
  x=>x.queueFull.run.head_branch=`gh-readonly-queue/develop/pr-${x.preflight.prNumber}-${x.preflight.base}`,
  x=>x.preflight.base=x.queueFull.checkout.base,x=>x.preflight.sourceTree=x.commit.commit.tree.sha,
  x=>x.queueFull.currentRun.run_attempt++,x=>x.queueFull.jobs.pop(),x=>x.currentRun.conclusion='failure'
 ]){const bad=structuredClone(e);mutate(bad);assert.equal(verifyMergedDelivery(bad).state,'merged_pending',String(mutate));}
});
test('native merged collector obtains actual Q/G/tree and immutable B0 ancestry from the API',()=>{
 const e=secondNativeMergedFixture(),original=JSON.stringify(e.preflight),calls=[];
 const query=(...args)=>{
  const path=args.at(-1);calls.push(path);
  if(path.endsWith('/pulls/8'))return JSON.stringify(e.pr);
  if(path.endsWith('/commits/'+e.pr.merge_commit_sha))return JSON.stringify(e.commit);
  if(path.includes('/compare/'))return JSON.stringify(e.queueFull.reviewBaseAncestry.comparison);
  if(path.includes('/statuses?'))return JSON.stringify([e.queueFull.statuses]);
  if(path.includes('/actions/workflows/quality.yml/'))return JSON.stringify([{workflow_runs:[path.includes('event=push')?e.run:e.queueFull.run]}]);
  if(path.includes('/actions/workflows/licenses.yml/'))return JSON.stringify([{workflow_runs:[e.queueFull.licenses.run]}]);
  const id=Number(path.match(/actions\/runs\/(\d+)\/jobs/)?.[1]);
  if(id)return JSON.stringify([{jobs:id===9?e.jobs:id===21?e.queueFull.jobs:e.queueFull.licenses.jobs}]);
  throw Error('Unexpected second native merged query '+path);
 };
 const actual=collectMergedDelivery(e.repo,8,e.preflight,query,run=>run.id===9?
  {checkout:e.checkout,checkoutArtifact:e.checkoutArtifact}:{checkout:e.queueFull.checkout,checkoutArtifact:e.queueFull.checkoutArtifact});
 assert.equal(actual.queueFull.commit.commit.tree.sha,e.commit.commit.tree.sha);
 assert.equal(actual.queueFull.reviewBaseAncestry.after,e.queueFull.checkout.base);
 assert(calls.some(path=>path.endsWith(`/compare/${e.preflight.base}...${e.queueFull.checkout.base}`)));
 assert.deepEqual(verifyMergedDelivery(actual),{state:'merged_passed',errors:[]});assert.equal(JSON.stringify(e.preflight),original);
});
test('native queue Licenses permits only the exact skipped review and cleanup auxiliaries with unique execution identities',()=>{
 const e=secondNativeMergedFixture(),jobs=e.queueFull.licenses.jobs;
 jobs.push({...jobs[1],id:702,name:'cancel-obsolete-queue'});
 assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
 for(const mutate of [x=>x[2].name='unknown',x=>x[2].name=x[1].name,x=>x[2].id=x[1].id,
  x=>x[2].run_id++,x=>x[2].run_attempt++,x=>x[2].head_sha=sha('f'),
  x=>x[2].conclusion='success',x=>x[2].status='in_progress',x=>x.push({...x[2],id:703})]){
  const bad=structuredClone(e);mutate(bad.queueFull.licenses.jobs);assert.equal(verifyMergedDelivery(bad).state,'merged_pending',String(mutate));
 }
 const old=nativeMergedFixture();old.queueFull.kind='fast-queue-full';old.queueFull.licenses.jobs.push({...old.queueFull.licenses.jobs[1],id:702,name:'cancel-obsolete-queue'});
 assert(delivery.verifyFastQueueFull(old.queueFull,old.preflight,old.pr.merge_commit_sha).length,'old Fast auxiliary contract stays strict');
});

test('the authentic obsolete PR682 receipt binds Q to the preceding native squash while incomplete Full still stays rejected',()=>{
 // Original artifact14339846699, run44091042622/1; ZIP SHA256
 // 9a7f1aeffddb5b7a44dc0f6cf164c93a76c92afd350e7583a60d3e788cc4891a.
 const g='d5b0f25ee403c78030c38f7c3d56f125d58075aa',q='b85fe9f3c13e30f93ffeaab58d6b1d75b0dfbc8b',b0='c2409ad750c15124b7b843c6bbfa5b222537cb75';
 const checkout={schemaVersion:1,event:'merge_group',runId:44091042622,attempt:1,tested:g,head:g,base:q,parents:[q]};
 const evidence={schemaVersion:8,kind:'native-queue-full',checkout,
  commit:{sha:g,parents:[{sha:q}],commit:{tree:{sha:'ddb9546d5e957438ff22db277f4817d1a03b6b1a'}}},
  reviewBaseAncestry:{before:b0,after:q,comparison:{status:'ahead',base_commit:{sha:b0},merge_base_commit:{sha:b0}}},
  run:{id:44091042622,run_attempt:1,event:'merge_group',head_sha:g,head_branch:`gh-readonly-queue/develop/pr-682-${q}`}};
 const errors=delivery.verifyNativeQueueFull(evidence,{repo:'FurinyaWorks/Slay-the-Heavens',prNumber:682,base:b0},g);
 assert(errors.length>0,'an authentic receipt alone is not a successful Full or native admission');
 assert(!errors.some(error=>/actual native queue commit|Original reviewed BASE|authorized PR\/actual queue parent|checkout differs|checkout must/i.test(error)),errors.join('; '));
});

test('native merged collection rechecks latest push Full and PR identity after downloading queue evidence',()=>{
 for(const mutate of [e=>e.run.run_attempt++,e=>e.run.conclusion='cancelled',e=>e.pr.head.sha=sha('f')]){
  const e=secondNativeMergedFixture(),paths=[];
  const query=(...args)=>{
   const path=args.at(-1);paths.push(path);
   if(path.endsWith('/pulls/8'))return JSON.stringify(e.pr);
   if(path.endsWith('/commits/'+e.pr.merge_commit_sha))return JSON.stringify(e.commit);
   if(path.includes('/compare/'))return JSON.stringify(e.queueFull.reviewBaseAncestry.comparison);
   if(path.includes('/statuses?'))return JSON.stringify([e.queueFull.statuses]);
   if(path.includes('/actions/workflows/quality.yml/'))return JSON.stringify([{workflow_runs:[path.includes('event=push')?e.run:e.queueFull.run]}]);
   if(path.includes('/actions/workflows/licenses.yml/'))return JSON.stringify([{workflow_runs:[e.queueFull.licenses.run]}]);
   const id=Number(path.match(/actions\/runs\/(\d+)\/jobs/)?.[1]);
   if(id)return JSON.stringify([{jobs:id===9?e.jobs:id===21?e.queueFull.jobs:e.queueFull.licenses.jobs}]);
   throw Error('Unexpected native freshness query '+path);
  };
  const actual=collectMergedDelivery(e.repo,8,e.preflight,query,run=>{
   if(run.id===9)return {checkout:e.checkout,checkoutArtifact:e.checkoutArtifact};
   mutate(e);return {checkout:e.queueFull.checkout,checkoutArtifact:e.queueFull.checkoutArtifact};
  });
  assert.equal(verifyMergedDelivery(actual).state,'merged_pending',String(mutate));
  const lastLicense=paths.findLastIndex(path=>path.includes('/actions/workflows/licenses.yml/'));
  assert(paths.findLastIndex(path=>path.endsWith('/pulls/8'))>lastLicense);
  assert(paths.findLastIndex(path=>path.includes('event=push'))>lastLicense);
 }
});

test('native queue Licenses folds authenticated filter-all history without rewriting attempts or borrowing older green rows',()=>{
 const e=secondNativeMergedFixture(),licenses=e.queueFull.licenses,old=structuredClone(licenses.jobs);
 licenses.run.run_attempt=licenses.currentRun.run_attempt=2;
 licenses.jobs.push(...old.map(job=>({...job,id:job.id+100,run_attempt:2})));
 const raw=JSON.stringify(licenses.jobs);assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
 assert.equal(JSON.stringify(licenses.jobs),raw,'original historical execution attempts remain unchanged');
 const previousFailure=structuredClone(e);previousFailure.queueFull.licenses.jobs[0].conclusion='failure';
 assert.equal(verifyMergedDelivery(previousFailure).state,'merged_passed','a genuine new successful execution resolves old failure');
 for(const mutate of [
  x=>x.jobs.find(job=>job.name==='inventory'&&job.run_attempt===2).conclusion='failure',
  x=>x.jobs=x.jobs.filter(job=>!(job.name==='inventory'&&job.run_attempt===2)),
  x=>x.jobs.find(job=>job.name==='independent-ai-review'&&job.run_attempt===2).conclusion='success',
  x=>x.jobs[0].id=x.jobs[1].id,x=>x.jobs.push({...x.jobs[0],id:999}),x=>x.jobs[0].name='unknown',
  x=>x.jobs[0].run_attempt=3,x=>x.jobs[0].run_attempt=0,x=>x.jobs[0].run_id++,x=>x.jobs[0].head_sha=sha('f'),
  x=>x.currentRun.run_attempt=3
 ]){
  const bad=structuredClone(e);mutate(bad.queueFull.licenses);assert.equal(verifyMergedDelivery(bad).state,'merged_pending',String(mutate));
 }
 const legacy=structuredClone(e.queueFull);legacy.kind='fast-queue-full';
 assert(delivery.verifyFastQueueFull(legacy,e.preflight,e.pr.merge_commit_sha).length,'the historical Fast contract is not relaxed');
});

test('a partial native Licenses rerun inherits actual old auxiliary skips while inventory must pass in the current attempt',()=>{
 const e=secondNativeMergedFixture(),licenses=e.queueFull.licenses;
 licenses.jobs.push({...licenses.jobs[1],id:702,name:'cancel-obsolete-queue'});
 licenses.run.run_attempt=licenses.currentRun.run_attempt=2;
 licenses.jobs.push({...licenses.jobs[0],id:800,run_attempt:2});
 const raw=JSON.stringify(licenses.jobs);
 assert.deepEqual(verifyMergedDelivery(e),{state:'merged_passed',errors:[]});
 assert.equal(JSON.stringify(licenses.jobs),raw,'old skipped rows stay actual attempt1, not fabricated attempt2');
 for(const mutate of [
  x=>x.jobs=x.jobs.filter(job=>job.run_attempt!==2),
  x=>x.jobs[1].conclusion='success',x=>x.jobs[2].conclusion='failure',
  x=>x.jobs.push({...x.jobs[1],id:801,run_attempt:2,conclusion:'failure'}),
  x=>x.jobs.push({...x.jobs[2],id:802,run_attempt:2,conclusion:'success'}),
  x=>x.jobs[1].run_attempt=3,x=>x.jobs[2].head_sha=sha('f')
 ]){const bad=structuredClone(e);mutate(bad.queueFull.licenses);assert.equal(verifyMergedDelivery(bad).state,'merged_pending',String(mutate));}
});

test('current closeout rejects unsupported none and task references omitted from disposition',t=>{
  const f=closeoutFixture(t);
  for(const body of ['Backlog: none','Backlog: none\nBacklog-none-reason: docs only\nTracks TASK-1.']) {
    assert.throws(()=>delivery.syncBacklogCloseout({...f,pr:{...f.pr,body},targetSha:f.mergeSha},
      ()=>assert.fail('invalid declaration must not write')),/Backlog-none-reason|TASK-1/);
  }
});

test('a later command cannot overwrite a different task edited during a CLI step',t=>{
  const f=closeoutFixture(t),second=join(f.root,'backlog/tasks/task-2 - 下一项.md');
  writeFileSync(second,f.source.replace('TASK-1','TASK-2'));
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','two tasks');
  const targetSha=f.git('rev-parse','HEAD'),pr={...f.pr,merge_commit_sha:targetSha,body:'Backlog: TASK-1=continue, TASK-2=continue'};
  let edits=0;
  const run=args=>{
    edits++;
    assert.equal(args[2],'TASK-1');
    writeFileSync(f.path,f.source+args.at(-1)+'\n');
    writeFileSync(second,readFileSync(second,'utf8')+'Concurrent edit.\n');
  };
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,targetSha},run),/changed during CLI/);
  assert.equal(edits,1);
});

test('incremental delivery drift binds task receipts to the actual merged develop SHA',async()=>{
  const actual='a'.repeat(40), old='b'.repeat(40);
  const merged={number:10,state:'closed',merged_at:'2026-11-23T00:00:00Z',
    base:{ref:'develop'},merge_commit_sha:actual,body:'Backlog: TASK-1=verify'};
  const tasks=[{id:'TASK-1',status:'In Progress',acCount:1,acCompleted:0,
    source:`[delivery:${old}] verify PR #10; remaining AC: 1.`}];
  const unmerged={...merged,number:11,merged_at:null};
  const input={prs:[merged,unmerged],tasks,loadFiles:async()=>[]};
  const [drift]=await auditBacklogDelivery(input);
  assert.deepEqual([drift.pr,drift.merge_sha,drift.task_ids,drift.tasks[0].remaining_ac],[10,actual,['TASK-1'],1]);
  assert.match(drift.drift.join(' '),/receipt missing/);
  tasks[0].source=tasks[0].source.replace(old,actual);
  assert.deepEqual(await auditBacklogDelivery(input),[]);
});

test('an open or closed-unmerged PR with a synthetic merge SHA cannot write a receipt',t=>{
  const f=closeoutFixture(t);
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr:{...f.pr,merged:false},targetSha:f.mergeSha},
    ()=>assert.fail('unmerged PR must not invoke CLI')),/requires a verified merged/);
});

test('closeout stops before writing when the remote develop SHA advances',t=>{
  const f=closeoutFixture(t);
  assert.throws(()=>delivery.syncBacklogCloseout({...f,targetSha:f.mergeSha,readTargetSha:()=> 'a'.repeat(40)},
    ()=>assert.fail('remote advance must stop CLI writes')),/remote develop advanced/);
});

test('recorded-only closeout rejects a stale remote without writing a receipt',t=>{
  const f=closeoutFixture(t),pr={...f.pr,body:'Backlog: TASK-1=recorded'};
  const files=[{filename:'backlog/tasks/task-1 - 交付.md'}];
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,files,targetSha:f.mergeSha,readTargetSha:()=> 'a'.repeat(40)},
    ()=>assert.fail('recorded-only must not invoke the CLI')),/remote develop advanced/);
  assert.throws(()=>readFileSync(join(f.root,'build/delivery',`backlog-${pr.number}-${f.mergeSha}.json`)),/ENOENT/);
});

test('closeout rejects a remote advance during the final CLI write',t=>{
  const f=closeoutFixture(t),pr={...f.pr,body:'Backlog: TASK-1=continue'};
  let remote=f.mergeSha;
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,targetSha:f.mergeSha,readTargetSha:()=>remote},args=>{
    writeFileSync(f.path,f.source+args.at(-1)+'\n');
    remote='b'.repeat(40);
  }),/remote develop advanced/);
});

test('closeout will not archive a task that acquires a new active dependent',t=>{
  const f=closeoutFixture(t);
  const successor=join(f.root,'backlog/tasks/task-2 - 承接.md');
  const dependent=join(f.root,'backlog/tasks/task-3 - 新依赖.md');
  writeFileSync(successor,f.source.replace('TASK-1','TASK-2'));
  writeFileSync(dependent,f.source.replace('TASK-1','TASK-3'));
  f.git('add','.');f.git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','initial scope');
  const targetSha=f.git('rev-parse','HEAD');
  const pr={...f.pr,merge_commit_sha:targetSha,body:'Backlog: TASK-1=superseded:TASK-2'};
  const calls=[];
  assert.throws(()=>delivery.syncBacklogCloseout({...f,pr,targetSha},args=>{
    calls.push(args[1]);
    if(args[1]!=='edit')assert.fail('new active dependent must prevent archive');
    writeFileSync(f.path,f.source.replace('dependencies: []','dependencies: []\nreferences: [TASK-2]')+args.at(-1)+'\n');
    writeFileSync(dependent,f.source.replace('TASK-1','TASK-3').replace('dependencies: []','dependencies: [TASK-1]'));
  }),/migrate active dependencies/);
  assert.deepEqual(calls,['edit']);
});

test('Fork push routing skips every Quality runner outside Fork B Full and preserves formal events',()=>{
  const quality=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
  const quick=readFileSync(new URL('../.github/workflows/quick-feedback.yml',import.meta.url),'utf8');
  const condition=(text,job)=>text.match(new RegExp('^  '+job+':[\\s\\S]*?^    if: \\$\\{\\{ (.*?) \\}\\}', 'm'))[1];
  const evaluate=(expression,github)=>Function('github','cancelled','startsWith','return '+expression)(github,()=>false,(s,p)=>s.startsWith(p));
  for(const repositoryId of [1429751262,1460097312,1460133275])for(const ref of ['refs/heads/ci/full/probe','refs/heads/fix/probe','refs/heads/develop','refs/heads/master']){
    const github={event_name:'push',ref,event:{repository:{id:repositoryId}}};
    const full=['refs/heads/develop','refs/heads/master'].includes(ref)||(repositoryId===1460133275&&ref==='refs/heads/ci/full/probe');
    for(const job of ['impact','check','engineering-posix'])assert.equal(evaluate(condition(quality,job),github),full,job+' '+repositoryId+' '+ref);
    assert.equal(evaluate(condition(quick,'related'),github),repositoryId===1460097312&&!ref.startsWith('refs/heads/ci/full/'));
  }
  for(const eventName of ['pull_request','merge_group','workflow_dispatch']){
    const github={event_name:eventName,ref:'refs/pull/1/merge',event:{pull_request:{draft:false},repository:{id:1429751262}}};
    for(const job of ['impact','check','engineering-posix'])assert.equal(evaluate(condition(quality,job),github),true,job+' '+eventName);
  }
});

test('first Fork B Full push uses its pinned upstream base in real quality ratchet execution',t=>{
 const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
 const expressions=[...workflow.matchAll(/^          (CI_COMPARISON_BASE|BASE_SHA|QUALITY_RATCHET_BASE): \$\{\{ (.+github.event.before.*?) \}\}$/gm)];
 assert.equal(expressions.length,3,'retain all three existing comparison consumers');
 const root=mkdtempSync(join(tmpdir(),'fork-full-first-push-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');writeFileSync(join(root,'fixture'),'base');git('add','.');
 git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','base');
 const base=git('rev-parse','HEAD'),zero='0'.repeat(40),formal='a'.repeat(40);
 writeFileSync(join(root,'fixture'),'head');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','head');
 const context={event:{pull_request:{base:{sha:''}},merge_group:{base_sha:''},before:zero}};
 const evaluate=(expression,github,inputs,needs)=>Function('github','inputs','needs','return '+expression)(github,inputs,needs);
 const needs={impact:{outputs:{fork_base_sha:base}}};
 const ratchet=expressions.find(row=>row[1]==='QUALITY_RATCHET_BASE')[2];
 const resolved=evaluate(ratchet,context,{base_sha:''},needs);
 const command=fileURLToPath(new URL('../scripts/check-quality-ratchet.mjs',import.meta.url));
 const checkout=join(root,'checkout');
 const clone=spawnSync('git',['clone','--quiet','--depth=1',pathToFileURL(root).href,checkout],{encoding:'utf8'});
 assert.equal(clone.status,0,clone.stderr);
 const run=qualityBase=>spawnSync(process.execPath,[command],{cwd:checkout,encoding:'utf8',env:{...process.env,CI:'false',QUALITY_RATCHET_BASE:qualityBase}});
 assert.notEqual(run(resolved).status,0,'a base object in impact is absent from a separate shallow rules checkout');
 const fetchStep=workflow.match(/      - name: Fetch exact upstream base for Fork B Full ratchet\n([\s\S]*?)(?=      - name:)/)[1];
 const fetchScript=fetchStep.match(/        run: \|\n([\s\S]*)/)[1].replace(/^          /gm,'')
  .replace('https://github.com/FurinyaWorks/Slay-the-Heavens.git',pathToFileURL(root).href);
 const shell=process.platform==='win32'?`${process.env.ProgramFiles}/Git/bin/bash.exe`:'/bin/bash';
 const fetch=spawnSync(shell,['-e','-c',fetchScript],{cwd:checkout,encoding:'utf8',env:{...process.env,FORK_BASE_SHA:base}});
 assert.equal(fetch.status,0,fetch.stdout+fetch.stderr);
 const result=run(resolved);assert.equal(result.status,0,result.stdout+result.stderr);
 assert.equal(JSON.parse(readFileSync(join(checkout,'build/quality-ratchet.json'),'utf8')).base,base);
 assert.notEqual(run(zero).status,0,'an all-zero base remains fail-closed, never a bypass');
 assert.match(workflow,/^      fork_base_sha: \$\{\{ steps.forkbase.outputs.base_sha \}\}$/m);
 assert.match(fetchStep,/if: matrix.shard == 1 && needs.impact.outputs.fork_base_sha != ''/);
 assert.match(fetchStep,/\[\[ "\$FORK_BASE_SHA" =~ \^\[a-f0-9\]\{40\}\$ \]\]/);
 assert.match(fetchStep,/fetch --depth=1 --filter=blob:none --no-auto-maintenance --no-tags https:\/\/github.com\/FurinyaWorks\/Slay-the-Heavens.git "\$FORK_BASE_SHA"/);
 assert.match(fetchStep,/git cat-file -e "\$\{FORK_BASE_SHA\}\^\{commit\}"/);
 for(const [,name,expression]of expressions){
  assert.equal(evaluate(expression,context,{base_sha:''},needs),name==='QUALITY_RATCHET_BASE'?base:zero,name+' first push');
  const noPin={impact:{outputs:{fork_base_sha:''}}};
  assert.equal(evaluate(expression,{event:{...context.event,before:formal}},{base_sha:''},noPin),formal,name+' protected push');
  assert.equal(evaluate(expression,{event:{...context.event,pull_request:{base:{sha:formal}}}},{base_sha:''},needs),formal,name+' PR');
  assert.equal(evaluate(expression,{event:{...context.event,merge_group:{base_sha:formal}}},{base_sha:''},needs),formal,name+' queue');
  assert.equal(evaluate(expression,context,{base_sha:formal},needs),formal,name+' dispatch');
 }
});

test('automatic Fork A Quick is bounded advisory without a complete certificate while manual preflight stays complete',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/quick-feedback.yml',import.meta.url),'utf8');
 const expression=value=>value.replace(/^\$\{\{ /,'').replace(/ \}\}$/,'');
 const evaluate=(value,event)=>Function('github','return '+expression(value))({event_name:event});
 const field=name=>workflow.match(new RegExp('^    '+name+': (.+)$','m'))[1];
 assert.match(field('name'),/^\$\{\{ /,'automatic and manual checks must identify their different coverage');
 const steps=workflow.split(/^      - /m).slice(1);
 const enabled=(step,event)=>{const guard=step.match(/^(?:        )?if: (.+)$/m)?.[1];return !guard||evaluate(guard,event);};
 for(const event of ['push','workflow_dispatch']){
  const selected=steps.filter(step=>enabled(step,event)).join('\n');
  assert.equal(evaluate(field('name'),event),event==='push'?'Advisory Quick feedback':'Complete affected preflight');
  assert.equal(evaluate(field('timeout-minutes'),event),event==='push'?10:30);
  if(event==='push'){
   assert.match(selected,/node scripts\/test-affected\.mjs --ci-fast --base "\$BASE_SHA"/);
   assert.doesNotMatch(selected,/--preflight|write-ci-receipt|actions\/upload-artifact|build\/ci-checkout\.json/);
   assert.match(selected,/90s Lua scheduling estimate/);
   assert.match(selected,/10-minute automatic job guard/);
   assert.match(selected,/integration and deferred Lua require formal Quality/);
   assert.match(selected,/not a complete preflight certificate/);
  }else{
   assert.match(selected,/run: node scripts\/test-affected\.mjs --preflight --base "\$BASE_SHA"/);
   assert.match(selected,/run: node scripts\/write-ci-receipt\.mjs --preflight/);
   assert.match(selected,/PREFLIGHT_BASE_SHA: \$\{\{ steps\.comparison\.outputs\.sha \}\}/);
   assert.match(selected,/name: preflight-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
   assert.match(selected,/path: build\/ci-checkout\.json/);
   assert.doesNotMatch(selected,/--ci-fast/);
  }
 }
 assert.match(workflow,/^run-name: \$\{\{ github\.event_name == 'push' && 'Advisory Quick' \|\| 'Preflight' \}\} \/ /m);
 assert.match(workflow,/^permissions:\n  contents: read$/m);
 assert.match(workflow,/https:\/\/github.com\/FurinyaWorks\/Slay-the-Heavens.git refs\/heads\/develop/);
 const head='a'.repeat(40),base='b'.repeat(40);
 const run={path:'.github/workflows/quick-feedback.yml',head_sha:head,status:'completed',conclusion:'success',event:'workflow_dispatch',display_title:`Preflight / ${head} / ${base}`};
 assert.equal(validPreflight(run,{head,base}),true,'manual complete contract remains reusable as before');
 for(const display_title of [`Advisory Quick / ${head} / ${base}`,run.display_title])
  assert.equal(validPreflight({...run,event:'push',display_title},{head,base}),false,'an automatic advisory success cannot be reused as a complete preflight');
});
