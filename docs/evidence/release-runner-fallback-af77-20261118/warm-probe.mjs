import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root='/workspace/work/release-runner-fallback/';process.chdir(root);
const {beforeHostedRunnerFallback,assertHostedRunnerFallbackCurrent}=await import(root+'tests/helpers/hosted-runner-fallback-source.mjs');
const {capacityPreflightSource,assertCapacityPreflightCurrent}=await import(root+'tests/helpers/release-capacity-preflight-source.mjs');
const {releasePreflightUnionSource,assertReleasePreflightUnionCurrent}=await import(root+'tests/helpers/release-preflight-union-source.mjs');
const packet=JSON.parse(gunzipSync(readFileSync('tests/helpers/hosted-runner-fallback-source.json.gz')));
const hash=s=>createHash('sha256').update(s).digest('hex');
let negatives=0;
for(const [path,row]of Object.entries(packet.files)){
 const current=readFileSync(path,'utf8');
 assert.equal(hash(beforeHostedRunnerFallback(path,current)),row.before.sha256);
 assert.equal(beforeHostedRunnerFallback(path,current+'\n'),current+'\n');
 for(const entry of [assertHostedRunnerFallbackCurrent,assertCapacityPreflightCurrent,assertReleasePreflightUnionCurrent]){
  entry();
  for(const mode of ['drift','missing','null']){
   const read=(p,e)=>{if(p===path){if(mode==='missing')throw new Error('missing '+p);if(mode==='null')return null;return readFileSync(p,e)+'\n';}return readFileSync(p,e);};
   assert.throws(()=>entry(read),path+'/'+mode);negatives++;
  }
 }
 assert.equal(releasePreflightUnionSource(path,current,'unknown'),current);
 assert.equal(capacityPreflightSource(path,current,'unknown'),current);
 assert.equal(capacityPreflightSource(path,current,'capacity',{sha256:'0'.repeat(64)}),current);
}
for(const path of ['tests/helpers/hosted-runner-fallback-source.json.gz','tests/helpers/release-capacity-preflight-source.json.gz','tests/helpers/release-preflight-union-source.json.gz']){
 const entry=path.includes('preflight-union')?assertReleasePreflightUnionCurrent:assertCapacityPreflightCurrent;
 assert.throws(()=>entry((p,e)=>p===path?Buffer.from('changed old archive'):readFileSync(p,e)));negatives++;
}
console.log(JSON.stringify({result:'PASS',completeCurrentSources:Object.keys(packet.files).length,exactAf77Predecessors:Object.keys(packet.files).length,warmMissingNullDriftAndArchiveNegatives:negatives,unknownViewsAndWrongBefore:'PASS'}));
