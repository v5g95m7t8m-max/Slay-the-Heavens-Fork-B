// Exact CI-only join: formal #677 plus the reviewed operator-tool increment.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),norm=source=>source.replaceAll('\r\n','\n');
const path='tests/helpers/release-delivery-677-source.json.gz',sha='14fd351beaba9628704be3232ce3a278e43064f57c5e9e54f7f99da40e5bce7c';
const bytes=readFileSync(new URL('./release-delivery-677-source.json.gz',import.meta.url));
assert.equal(hash(bytes),sha,'complete Release delivery 677 join');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.sources,{formal677:'873d4392c02fd5ac92e653e57a78fd59f6ae63c6',operator:'5332e5460604fc1f02af4e576c7a7635f0fab093',unlanded712:'7d163cbb7e1c6a50c41328309eb257232c907d3f',pendingOperator:'3c943142d7f0eb35b8bb3a992bb6a68512925603'});
assert.deepEqual(packet.unlanded712,{included:false,required:false});
for(const row of Object.values(packet.files)){assert.equal(norm(row.before.source),row.before.source);assert.equal(hash(row.before.source),row.before.sha256);}
for(const row of [...Object.values(packet.operatorFiles),...Object.values(packet.pendingOperatorFiles)])assert.equal(hash(row.source),row.sha256);
export function releaseDelivery677Source(path,source,before){
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row||before&&before.sha256!==row.before.sha256||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!==row.currentSha256)return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
export function assertReleaseDelivery677Current(read=readFileSync){
 assert.equal(hash(read(path)),sha,'fresh Release delivery 677 archive');
 for(const [p,row]of Object.entries(packet.files)){
  const source=read(p,'utf8');assert.equal(typeof source,'string');assert(!source.includes('\r\r\n'));
  assert.equal(hash(norm(source)),row.currentSha256,'fresh complete integration source: delivery677 '+p);
 }
}
