import {beforeHostedRunnerFallback} from './hosted-runner-fallback-source.mjs';
import {capacityPreflightSource,assertCapacityPreflightArchive,assertCapacityPreflightCurrent} from './release-capacity-preflight-source.mjs';
// Exact outer continuation of the retained Release union and Quick receipts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>value.replaceAll('\r\n','\n');
const path='tests/helpers/release-preflight-union-source.json.gz';
const bytes=readFileSync(new URL('./release-preflight-union-source.json.gz',import.meta.url));
const sha='fe6450c752cea6f6eac13afd0e7d7cb28532151dbcdefe4baafa5a83b8c36712';
assert.equal(hash(bytes),sha,'complete Release preflight union continuation');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.parents,{release:'b6d24eed1cfab7d27c078ffdb3d2c76541065639',advisory:'8457762c7f93fc0201ac15ee9386e0d3e6e2bd58',preflight:'2089991e6cb893de3690622ecc3e52edd27658d2'});
for(const files of Object.values(packet.views))for(const row of Object.values(files))for(const side of ['current','before']){
 assert.equal(norm(row[side].source),row[side].source);
 assert.equal(hash(row[side].source),row[side].sha256,'complete Release preflight predecessor');
}
export function assertReleasePreflightUnionArchive(read=readFileSync){
 assertCapacityPreflightArchive(read);
 assert.equal(hash(read(path)),sha,'fresh immutable Release preflight union archive');
}
export function assertReleasePreflightUnionCurrent(read=readFileSync){
 assertReleasePreflightUnionArchive(read);
 assertCapacityPreflightCurrent(read);
 for(const [path,row]of Object.entries(packet.views.release)){
  const source=capacityPreflightSource(path,beforeHostedRunnerFallback(path,read(path,'utf8')),'preflight');assert.equal(typeof source,'string');assert(!source.includes('\r\r\n'));
  assert.equal(hash(norm(source)),row.current.sha256,'fresh complete Release preflight input: '+path);
 }
}
export function releasePreflightUnionSource(path,source,target){
 if(!Object.hasOwn(packet.views,target)||target==='advisory'&&!Object.hasOwn(packet.views.advisory,path))return source;
 source=capacityPreflightSource(path,beforeHostedRunnerFallback(path,source),'preflight');
 if(target==='release'&&path==='tests/release-selection-map-source.test.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(norm(source))==='803e0effb38fd39ec153b4f508b50722fac0993a5faee36ff54c42be5077908a'){
  const prior=norm(source).replace("[norm(raw),norm(raw).replaceAll('\\n','\\r\\n')]","[raw,raw.replaceAll('\\n','\\r\\n')]");
  assert.equal(hash(prior),'5726b421c7e56d56e28d5787f795df5e442c58f38f55e61ca283b1fcac189eba','exact selection-map EOL-fixture predecessor');
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(target==='release'&&path==='tests/sts-style-source-epoch.test.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(norm(source))==='8541039a7c6c15f497bc678bc29cd43e68183297b7f9ad54bc8c527b8d076164'){
  const prior=norm(source).replace("(p,e)=>{const value=readFileSync(p,e);return p===path?value+'\\n':value;}","(p,e)=>readFileSync(p,e)+(p===path?'\\n':'')");
  assert.equal(hash(prior),'eb5fa6dad1ad421aa4c565d2e700f91e04b510ae2602c4186c26c0732eb78435','exact StS mutation-reader predecessor');
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 const files=Object.hasOwn(packet.views,target)?packet.views[target]:null;
 const row=files&&Object.hasOwn(files,path)?files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.current.sha256)return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
