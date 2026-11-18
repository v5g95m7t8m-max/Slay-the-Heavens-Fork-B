// Immutable CI views of the independently reviewed release heads.
// This leaf must not import any test, historical consumer, or runtime projector.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {assertEnemyCapacityCurrent,enemyCapacitySource,enemyCapacityRead} from './release-enemy-capacity-join.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const textHash=text=>typeof text==='string'&&!text.includes('\r\r\n')?hash(text.replaceAll('\r\n','\n')):null;
const bytes=readFileSync(new URL('./release-enemy-art-join.json.gz',import.meta.url));
assert.equal(hash(bytes),'57d7ec5c4c106ef6829c33970f944200d2d4d3754736bbe8c1c8a3303b1e977c','exact enemy art release join packet');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.heads,{release:'b9bca884ed9b9831965b409885d78f719b9a567a',enemy:'8025fc9f585f2ca98bfa05c5e5c68de1593005d1'});
export function enemyJoinSource(path,source,side,{read=readFileSync}={}){
 assert(Object.hasOwn(packet.heads,side),'known enemy join CI view');
 source=enemyCapacitySource(path,source,'enemy',{read});
 if(path.startsWith('src/')||path==='config/architecture.json'||!Object.hasOwn(packet.files,path))return source;
 const row=packet.files[path];
 return textHash(source)===row.current?row[side]??source:source;
}
export function enemyJoinRead(side,read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding);
 if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8'),prior=enemyJoinSource(path,text,side,{read});
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function assertEnemyJoinCurrent(read=readFileSync){
 assertEnemyCapacityCurrent(read);
 read=enemyCapacityRead('enemy',read);
 for(const [path,row]of Object.entries(packet.files))
  assert.equal(textHash(read(path,'utf8')),row.current,'fresh complete integration source: enemy art join '+path);
 for(const [path,digest]of Object.entries(packet.archives))
  assert.equal(path.endsWith('.gz')?hash(read(path)):textHash(read(path,'utf8')),digest,'immutable Release join predecessor: '+path);
}
