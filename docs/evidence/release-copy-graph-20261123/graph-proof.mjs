import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root=pathToFileURL(process.cwd()+'/');
const { runPotion }=await import(new URL('tests/helpers/potion-callback-vm.mjs',root));
const { runRelicLifecycle }=await import(new URL('tests/helpers/relic-lifecycle-baseline.mjs',root));
const { verifyLifecycleTrace }=await import(new URL('tests/helpers/relic-lifecycle-reference.mjs',root));

const labels = new Map([['bite',['噬咬','迅袭']], ['jax',['激素','元素增幅']]]);
const sha = value => createHash('sha256').update(value).digest('hex');
const stringField = (entries,key) => entries.find(([k])=>k[0] === 'string' && k[1] === key)?.[1];
function verifyExact(frozenRaw, liveRaw) {
  assert(frozenRaw.endsWith('\n') && liveRaw.endsWith('\n'), 'complete graph streams');
  const frozenLines=frozenRaw.slice(0,-1).split('\n'),liveLines=liveRaw.slice(0,-1).split('\n');
  assert.equal(liveLines.length,frozenLines.length,'every checkpoint remains');
  const counts={bite:0,jax:0}; let changed=0;
  for(let i=0;i<frozenLines.length;i++){
    const frozen=JSON.parse(frozenLines[i]),live=JSON.parse(liveLines[i]);
    assert.equal(JSON.stringify(live),liveLines[i],'live serializer bytes are canonical');
    assert.equal(live.label,frozen.label);
    assert.equal(live.graph.definitions.length,frozen.graph.definitions.length);
    for(let j=0;j<live.graph.definitions.length;j++){
      const a=live.graph.definitions[j], b=frozen.graph.definitions[j];
      if(a[0]!=='table'||b[0]!=='table'||a[1]!==b[1])continue;
      const aId=stringField(a[2],'id'), bId=stringField(b[2],'id');
      if(aId?.[0]!=='string'||bId?.[0]!=='string'||bId[1]!==aId[1]||!labels.has(aId[1]))continue;
      const [before,after]=labels.get(aId[1]), name=stringField(a[2],'name'), prior=stringField(b[2],'name');
      if (prior?.[0]==='string'&&prior[1]===before){
        assert(name?.[0]==='string'&&name[1]===after,'complete frozen body comparison: expected live approved name for '+aId[1]);
        name[1]=before;counts[aId[1]]++;
      }
    }
    assert.equal(JSON.stringify(live),frozenLines[i],'complete frozen body comparison at '+live.label);
    if(frozenLines[i]!==liveLines[i])changed++;
  }
  return {records:liveLines.length, changed, counts};
}
function prove(lane,frozen,live){
  const outcome=verifyExact(frozen,live);
  assert(outcome.counts.bite>0&&outcome.counts.jax>0,'must observe both actual approved names');
  const raw=live.split('\n');
  let first,bite,checkpoint;
  for(let i=0;i<raw.length-1&&!bite;i++){
    const entry=JSON.parse(raw[i]);
    const card=entry.graph.definitions.find(([kind,,body])=>kind==='table'&&stringField(body,'id')?.[1]==='bite'&&stringField(body,'name')?.[1]==='迅袭');
    if(card){first=entry;bite=card;checkpoint=i;}
  }
  assert(bite,'an observed checkpoint includes a real bite card');
  function reject(change){
    const original=structuredClone(first); const card=original.graph.definitions.find(x=>x[1]===bite[1]);
    change(card);
    const mutated=[...raw.slice(0,checkpoint),JSON.stringify(original),...raw.slice(checkpoint+1)].join('\n');
    assert.throws(()=>verifyExact(frozen,mutated),/complete frozen body comparison/);
  }
  reject(card=>{stringField(card[2],'name')[1]='wrong-copy';});
  reject(card=>{stringField(card[2],'name')[1]='噬咬';});
  reject(card=>{stringField(card[2],'id')[1]='other-id';});
  reject(card=>{stringField(card[2],'cost')[1]='87';});
  reject(card=>{card[2].reverse();});
  console.log(JSON.stringify({lane,...outcome,negativeControls:5,liveSHA256:sha(live),frozenSHA256:sha(frozen)}));
}
const lane=process.argv[2];
if(lane==='potion'){
  const path='tests/lua/potion_callback_contract.lua';
  const before=runPotion('before',path), after=runPotion('after',path);
  assert.equal(before.status,0,before.error);assert.equal(after.status,0,after.error);
  assert.deepEqual(after.logs,before.logs);assert.deepEqual(after.generated,before.generated);
  prove(lane,readFileSync(before.traceFile,'utf8'),readFileSync(after.traceFile,'utf8'));
}else{
  assert.equal(lane,'relic-hp');
  const before=runRelicLifecycle('hp',{frozen:true}),after=runRelicLifecycle('hp');
  verifyLifecycleTrace(before,'hp');verifyLifecycleTrace(after,'hp');
  assert.equal(after.manifest.preloadedSources,0);
  assert.deepEqual(after.manifest.generatedBindings,before.manifest.generatedBindings);
  for(const k of ['coverage','registeredCases','executedCases','checkpoints'])assert.deepEqual(after.manifest[k],before.manifest[k]);
  assert.equal(after.stdout,before.stdout);assert.equal(after.stderr,before.stderr);
  prove(lane,before.graph,after.graph);
}
