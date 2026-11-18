import {assertEnemyFastCurrent,enemyFastRead,enemyFastSource} from './release-enemy-fast-source.mjs';
// Exact CI-only composition of the saved enemy repair and actual Release squash.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const normalized=s=>typeof s==='string'&&!s.includes('\r\r\n')?s.replaceAll('\r\n','\n'):null;
const packetPath='tests/helpers/release-enemy-capacity-join.json.gz';
const bytes=readFileSync(new URL('./release-enemy-capacity-join.json.gz',import.meta.url));
assert.equal(hash(bytes),'50efd38e755b823866d75b873ae9b74aceb265bf59301d7ed678c79e48485847','complete enemy capacity join packet');
const packet=JSON.parse(gunzipSync(bytes));
assert.deepEqual(packet.parents,{enemy:'2f5335443338cf46e045e47ff9fada215fdef391',release:'00ab3fe6d386f55aecfb063e59aeca2cf5065807'});
for(const [path,row]of Object.entries(packet.files))for(const source of Object.values(row.before).filter(v=>v!==null))
 assert.equal(normalized(source),source,'complete LF predecessor '+path);
export function assertEnemyCapacityCurrent(read=readFileSync){
 assertEnemyFastCurrent(read);
 read=enemyFastRead('enemy',read);
 assert.equal(hash(read(packetPath)),hash(bytes),'fresh complete integration source: '+packetPath);
 for(const [path,row]of Object.entries(packet.files)){
  const source=normalized(read(path,'utf8'));
  assert(source!==null&&hash(source)===row.current,'fresh complete integration source: enemy capacity '+path);
 }
 for(const [path,digest]of Object.entries(packet.archives))
  assert.equal(hash(path.endsWith('.gz')?read(path):normalized(read(path,'utf8'))),digest,'immutable Release join predecessor: '+path);
}
export function enemyCapacitySource(path,source,side,{read=readFileSync}={}){
 assert(Object.hasOwn(packet.parents,side),'known enemy capacity parent');
 // This is a CI source view, never a production-owner authorization reader.
 if(typeof path!=='string'||path.startsWith('src/')||path.startsWith('data/')||path.startsWith('config/'))return source;
 if(!Object.hasOwn(packet.files,path))return source;
 source=enemyFastSource(path,source,'enemy');
 const row=packet.files[path],text=normalized(source);
 if(!row||row.before[side]===null||text===null||hash(text)!==row.current||text===row.before[side])return source;
 assertEnemyCapacityCurrent(read);
 return row.before[side];
}
export function enemyCapacityRead(side,read=readFileSync){
 assert(Object.hasOwn(packet.parents,side),'known enemy capacity parent');
 return(path,encoding)=>{
  const raw=read(path,encoding);
  if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
  const source=typeof raw==='string'?raw:raw.toString('utf8');
  const prior=enemyCapacitySource(path,source,side,{read});
  return typeof raw==='string'?prior:prior===source?raw:Buffer.from(prior);
 };
}
