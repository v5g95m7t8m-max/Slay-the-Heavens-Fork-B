import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {availableParallelism} from 'node:os';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {historicalTest} from './historical-baseline-inputs.mjs';

const workerFlag='--isolated-historical-case';
const nameFilter=/(?:^|[\s"'])--test-(?:name|skip)-pattern(?=[=\s"']|$)/;

export function hasTestNameFilter(){
 return process.execArgv.some(arg=>nameFilter.test(arg))
  ||nameFilter.test(process.env.NODE_OPTIONS??'');
}

const execute=promisify(execFile);
export async function runIsolatedTest(url,args,nodeOptions=[],expected=1){
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const {stdout}=await execute(process.execPath,['--test-reporter=tap',...nodeOptions,fileURLToPath(url),...args],
  {env,maxBuffer:1024*1024,windowsHide:true})
  .catch(error=>assert.fail([error.stdout,error.stderr,error.message].filter(Boolean).join('\n')));
 const summary=field=>Number(stdout.match(new RegExp(`^# ${field} (\\d+)\\r?$`,'m'))?.[1]);
 assert.equal(summary('tests'),expected,'the isolated process ran every registered case');
 assert.equal(summary('pass'),expected,'every isolated case passed');
 return stdout;
}

export function runHistoricalCases(url,suite,cases){
 if(process.argv[2]===workerFlag){
  const selected=cases.find(([name])=>name===process.argv[3]);
  assert(selected,'registered historical replay case');
  historicalTest(...selected);
  return;
 }
 if(availableParallelism()<2||hasTestNameFilter()){
  for(const entry of cases)historicalTest(...entry);
  return;
 }
 // The historical harness changes cwd. Each worker owns its verified inputs.
 test(suite,{concurrency:2},async context=>{
  await Promise.all(cases.map(([name])=>context.test(name,()=>runIsolatedTest(url,[workerFlag,name]))));
 });
}
