import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beforeNativeMergeQueueWorkflow} from './merge-queue-workflow.mjs';
import {beforePosixConcurrencyWorkflow} from './posix-concurrency-workflow.mjs';
import {beforeDraftQualityWorkflow} from './draft-quality-workflow.mjs';
// Invert only complete reviewed bootstrap additions. Unknown/partial blocks are
// retained for the original immutable workflow and package guards to reject.
const {edits}=JSON.parse(readFileSync(new URL('./auto-merge-workflow.json',import.meta.url),'utf8'));
// Restore only the reviewed execution slack for immutable historical guards.
// Performance targets are not current execution deadlines. Partial or unrelated
// changes remain visible to the old whole-source identities.
// The reviewed 60-minute guard restores only complete exact current, six-cap
// or uncapped workflow bytes. Original 30-minute and all foreign bytes pass through.
const posixDeadlinePredecessors=new Map([["9f0a309dffe7a8a356d895d1ed03b167499cb1f296e80c27fa87d38e357eb08b","6e951f39539296339c3ffaaee97d0bdcae4c72e97914ee33fccfb4420fd50adf"],["1b159fa2685b8bc2a36c82653710c6ab75e4f56c06ba8048b220ce7f1960eb52","34e0bc864351cb2b660c0ccb6a8278eb20fa3cfcc2808735695839f4518d1199"],["959bd6e7a31fb08170fbad592e1dfb5154f3c5cd982c0ed7673d57bf5017ea39","4f75bbb052340a40a87af0601a6652e8c9e94cae6c72a501abcda88e9f34c3fe"]]);
export function beforePosixDeadlineWorkflow(text){
 if(typeof text!=='string'||text.includes('\r\r\n'))return text;
 const lf=text.replaceAll('\r\n','\n');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const before=posixDeadlinePredecessors.get(hash(lf));
 if(!before)return text;
 const prior=lf.replace('    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n','    runs-on: ubuntu-24.04\n    timeout-minutes: 30\n');
 if(hash(prior)!==before)throw Error('Exact POSIX deadline predecessor required');
 return text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// A later measured Windows cutoff raises only the ordinary Full hard guard.
// Exact known workflow variants retain the preceding 45-minute source bytes.
const windowsDeadlinePredecessors=new Map([["c61bcf8806af9b370342c44a32077c65896fe15d8af097b99ab8342cc257158a","9f0a309dffe7a8a356d895d1ed03b167499cb1f296e80c27fa87d38e357eb08b"],["9031980631b073f06b6101840c5ab6532ca6087dc4a80c35a46eab0a944922cf","1b159fa2685b8bc2a36c82653710c6ab75e4f56c06ba8048b220ce7f1960eb52"],["81f8e9bc17d5b88f2d7123f243c530d7c664343b6ce497557644f5a9a316a0cb","959bd6e7a31fb08170fbad592e1dfb5154f3c5cd982c0ed7673d57bf5017ea39"]]);
// Complete measured hosted deadlines restore only the exact preceding 75/60-minute workflow.
const hostedDeadlinePredecessors=new Map([["58763ef02fe4ebd955198bfa47b84c5de49497c378339b931cd1ebb556bd0688","c61bcf8806af9b370342c44a32077c65896fe15d8af097b99ab8342cc257158a"],["8976dd643663ead3b1ba2eb80b416518ef637a93a5486c49208e493e7efbb9b1","9031980631b073f06b6101840c5ab6532ca6087dc4a80c35a46eab0a944922cf"],["1759564303c5a9eae393cd33756513b752fd82444ed5c740e32ba3c162a40f0c","81f8e9bc17d5b88f2d7123f243c530d7c664343b6ce497557644f5a9a316a0cb"]]);
// The measured 147.6-minute successful JS run still needs its complete Lua phase.
// Restore only complete exact 180-minute variants to the published ed150 policy.
const hostedWindows180Predecessors=new Map([["7899a7a476886cb59de684117001eba419dbfa1ba926fe5704b4549f4b422b3e","30df7954593676c8b42430a8142ada471a40da421092951d3d089d2a584cbe96"],["aad0197bba0bc4108279a42bfd600cf0ec8402167239c57c4a55c6e2d8c9114d","1279cf828ba8face9a3d067f4ba83dde59551db4c728cbaab95c9f326520de4e"],["bdf95d183565a2202392ca585d3184befaad55b2d20ecb87d4f3b65bd051ebe7","486ae73b871b34dc6cbee02326d09a3b9ec8ef03cf81b9b7a1f89b3b63aa7c90"]]);
export function beforeHostedWindows180Workflow(text){
 if(typeof text!=='string'||text.includes('\r\r\n'))return text;
 const lf=text.replaceAll('\r\n','\n'),hash=value=>createHash('sha256').update(value).digest('hex');
 const before=hostedWindows180Predecessors.get(hash(lf));
 if(!before)return text;
 const prior=lf.replace("timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 180 }}","timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 150 }}");
 if(hash(prior)!==before)throw Error('Exact hosted Windows 180-minute predecessor required');
 return text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Preserve the complete ee execution-policy predecessor after the measured 104.5-minute hosted run.
const hostedWindowsDeadlinePredecessors=new Map([["30df7954593676c8b42430a8142ada471a40da421092951d3d089d2a584cbe96","58763ef02fe4ebd955198bfa47b84c5de49497c378339b931cd1ebb556bd0688"],["1279cf828ba8face9a3d067f4ba83dde59551db4c728cbaab95c9f326520de4e","8976dd643663ead3b1ba2eb80b416518ef637a93a5486c49208e493e7efbb9b1"],["486ae73b871b34dc6cbee02326d09a3b9ec8ef03cf81b9b7a1f89b3b63aa7c90","1759564303c5a9eae393cd33756513b752fd82444ed5c740e32ba3c162a40f0c"]]);
export function beforeHostedWindowsDeadlineWorkflow(text){
 text=beforeHostedWindows180Workflow(text);
 if(typeof text!=='string'||text.includes('\r\r\n'))return text;
 const lf=text.replaceAll('\r\n','\n'),hash=value=>createHash('sha256').update(value).digest('hex');
 const before=hostedWindowsDeadlinePredecessors.get(hash(lf));
 if(!before)return text;
 const prior=lf.replace("timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 150 }}","timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 105 }}");
 if(hash(prior)!==before)throw Error('Exact hosted Windows execution deadline predecessor required');
 return text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeHostedDeadlineWorkflow(text){
 text=beforeHostedWindowsDeadlineWorkflow(text);
 if(typeof text!=='string'||text.includes('\r\r\n'))return text;
 const lf=text.replaceAll('\r\n','\n'),hash=value=>createHash('sha256').update(value).digest('hex');
 const before=hostedDeadlinePredecessors.get(hash(lf));
 if(!before)return text;
 const prior=lf.replace("timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 105 }}","timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 75 }}")
  .replace("    runs-on: ubuntu-24.04\n    timeout-minutes: 90\n","    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n");
 if(hash(prior)!==before)throw Error('Exact hosted execution deadline predecessor required');
 return text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeWindowsDeadlineWorkflow(text){
 text=beforeHostedDeadlineWorkflow(text);
 if(typeof text!=='string'||text.includes('\r\r\n'))return text;
 const lf=text.replaceAll('\r\n','\n'),hash=value=>createHash('sha256').update(value).digest('hex');
 const before=windowsDeadlinePredecessors.get(hash(lf));
 if(!before)return text;
 const prior=lf.replace("timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 75 }}","timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 45 }}");
 if(hash(prior)!==before)throw Error('Exact Windows deadline predecessor required');
 return text.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeExecutionTimeoutWorkflow(text){
 text=beforeWindowsDeadlineWorkflow(text);
 text=beforePosixDeadlineWorkflow(text);
 const original=text;
 text=beforeDraftQualityWorkflow(text);
 const eol=text.includes('\r\n')?'\r\n':'\n';
 const changes=[
  ["    timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 30 }}",
   "    # Thirty minutes is a performance target; allow host variance before killing work.\n    timeout-minutes: ${{ inputs.runner_pool == 'local-special' && 75 || 45 }}"],
  ['    # Separate hosted VMs keep generated files isolated and retain the original\n    # 20-minute budget. Weighted files execute once, serially per VM.',
   '    # Separate hosted VMs keep generated files isolated. Twenty minutes is a\n    # performance target; the hard guard allows host variance. Files execute once.'],
  ['    runs-on: ubuntu-24.04\n    timeout-minutes: 20\n','    runs-on: ubuntu-24.04\n    timeout-minutes: 30\n'],
  ['    needs: [impact, rules, fast, presentation, engineering-posix]\n    if: always()\n',
   '    needs: [impact, rules, fast, presentation, engineering-posix]\n    if: ${{ !cancelled() }}\n'],
  ['    needs: [impact, engineering-posix-shards, fast]\n    if: always()\n',
   '    needs: [impact, engineering-posix-shards, fast]\n    if: ${{ !cancelled() }}\n'],
 ].map(pair=>pair.map(value=>value.replaceAll('\n',eol)));
 if(!changes.every(([,after])=>text.split(after).length===2))return original;
 for(const [before,after]of changes)text=text.replace(after,before);
 return text;
}
export function beforeAutoMergeWorkflow(text){
 text=beforeExecutionTimeoutWorkflow(text);
 text=beforePosixConcurrencyWorkflow(text);
 if(text===null)return null;
 text=beforeNativeMergeQueueWorkflow(text);
 if(text===null)return null;
 for(const runner of ['ubuntu-slim','ubuntu-24.04']){
  const variant=edits.map(e=>({before:e.before.replaceAll('runs-on: ubuntu-slim','runs-on: '+runner),after:e.after.replaceAll('runs-on: ubuntu-slim','runs-on: '+runner)}));
  if(variant.every(e=>text.split(e.after).length===2)){
   for(const edit of variant)text=text.replace(edit.after,edit.before);
   return text;
  }
 }
 // Earlier immutable snapshots have different matrices/routing. Pass them
 // through unchanged; their own frozen hash guards retain responsibility.
 return /full-quality|Publish exact Full regression status|types: \[opened, synchronize, reopened, ready_for_review/.test(text)?null:text;
}
