import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const writer=resolve(process.argv[2]??'scripts/write-ci-receipt.mjs');
const source=readFileSync(writer);
assert.equal(createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex'),'e6b81e66137e441161d6953fe438db03c679aabd','pin #915 receipt writer');
const before='1'.repeat(40),upstream='2'.repeat(40);
const dir=mkdtempSync(join(tmpdir(),'fork-receipt-915-'));
try{
 const run=(program,args,env=process.env)=>{
   const r=spawnSync(program,args,{cwd:dir,encoding:'utf8',env,timeout:10000});
   assert.equal(r.status,0,r.stderr);
   return r.stdout.trim();
 };
 run('git',['init','--quiet']);run('git',['-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','--quiet','-m','synthetic exact head']);
 const head=run('git',['rev-parse','HEAD']);
 function test(event,path,variable,expected){
   const p=join(dir,'event.json');writeFileSync(p,JSON.stringify(path));
   const raw=run(process.execPath,[writer],{...process.env,GITHUB_EVENT_PATH:p,GITHUB_SHA:head,GITHUB_EVENT_NAME:event,GITHUB_RUN_ID:'1',GITHUB_RUN_ATTEMPT:'1',PREFLIGHT_BASE_SHA:variable});
   const a=JSON.parse(raw),b=JSON.parse(readFileSync(join(dir,'build/ci-checkout.json'),'utf8'));
   assert.deepEqual(a,b);assert.equal(a.tested,head);assert.equal(a.base,expected);return a.base;
 }
 const result={
  forkAPushActual:test('push',{before},upstream,before),
  manualDispatchActual:test('workflow_dispatch',{before},upstream,upstream),
  ordinaryPushActual:test('push',{before},'',before),
  pullRequestActual:test('pull_request',{before,pull_request:{number:1,head:{sha:head},base:{sha:upstream}}},'',upstream),
  expectedForkAPush:upstream
 };
 assert.notEqual(result.forkAPushActual,result.expectedForkAPush);
 console.log(JSON.stringify(result,null,2));
}finally{rmSync(dir,{recursive:true,force:true});}
