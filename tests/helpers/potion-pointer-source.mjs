import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeStsUiCloseoutSource} from './sts-ui-closeout-source.mjs';
import {exactSourceContinuation} from './exact-source-continuation.mjs';
import {beforeAuthenticatedReleaseUiRestore,beforeReleaseUiRestore} from './release-ui-restore-source.mjs';
import {beforeInputRetirement} from './input-retirement-source.mjs';

const bytes=readFileSync(new URL('../fixtures/potion-pointer-source.json.gz',import.meta.url));
const sha256=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha256(bytes),'9fce9e414190da11df3d1451bd4f373a1b6ec0d227d33a2e4e8d8cc1c34ecb41','potion pointer owner witness');
const rows=Object.entries(JSON.parse(gunzipSync(bytes)));
const continuations=new Map(rows.map(([path,row])=>{
 assert.equal(row.path,path);
 assert.equal(sha256(row.before.source),row.before.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.before.source)}\0`).update(row.before.source).digest('hex'),row.before.gitBlob);
 return [path,exactSourceContinuation(row)];
}));
export const potionPointerSourcePaths=Object.freeze([...continuations.keys()]);
export function projectPotionPointerSource(path,source,binding){
 return continuations.get(path)?.project(path,source,binding)??source;
}
export function authorizePotionPointerSource(path,source,binding,samples,read){
 for(const continuation of continuations.values())continuation.authorize(path,source,binding,samples,read);
}
export function beforePotionPointerSource(path,source,read){
 const continuation=continuations.get(path);
 if(!continuation)return source;
 const current=beforeInputRetirement(path,source);
 if(current!==source){
  const live=read(path);
  assert(typeof live==='string'&&live.replaceAll('\r\n','\n')===source.replaceAll('\r\n','\n'),
   'combined linked owner identity: '+path+' during potion backflow validation');
 }
 source=beforeStsUiCloseoutSource(path,current);
 const readSts=owner=>beforeStsUiCloseoutSource(owner,beforeInputRetirement(owner,read(owner)));
 source=beforeAuthenticatedReleaseUiRestore(path,source,readSts);
 return continuation.predecessor(path,source,owner=>beforeReleaseUiRestore(owner,readSts(owner)));
}
