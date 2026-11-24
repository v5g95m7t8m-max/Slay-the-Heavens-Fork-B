import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const archive=readFileSync(new URL('../fixtures/develop-card-reading-source.json.gz',import.meta.url));
assert.equal(hash(archive),'6c38683d9136988724d3d666b38c4ef182b7f32ec0ee43e47935fe62d00d0d75','exact card reading backflow archive');
const {schemaVersion,base,head,files,added,configTokensSha256}=JSON.parse(gunzipSync(archive));
assert.equal(schemaVersion,1);
assert.equal(base,'559980dd45bc5310c449417a7a48a99a8e6562d2');
assert.equal(head,'a111076f1afa0093fbc8e916f5cbd2ee68c7a79b');
const bindings=new Map(files.map(row=>[row.path,row]));
assert.equal(bindings.size,files.length,'unique card reading backflow paths');
const projections=new Map();

export const cardReadingOwns=path=>bindings.has(path);
export function matchesCardReadingPredecessor(path,source){
 const row=bindings.get(path);
 return Boolean(row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.beforeSha256);
}
export function beforeCardReadingBackflow(path,source){
 const row=bindings.get(path);
 if(!row||typeof source!=='string')return source;
 const cached=projections.get(path);
 if(cached?.source===source)return cached.before;
 if(source.replaceAll('\r\n','\n').length!==row.afterLength)return source;
 const prior=restoreExactFixtureHunks(row,path,source);
 if(prior===source)return source;
 const before=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 projections.set(path,{source,before});
 return before;
}

export function currentCardReadingConfigLayout(source){
 if(typeof source!=='string')return false;
 try{JSON.parse(source);}catch{return false;}
 const tokens=source.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,token=>token.startsWith('"')?token:'');
 return hash(tokens)===configTokensSha256;
}

export function beforeCardReadingProductionInventory(paths,read){
 const addedModules=Object.keys(added).filter(path=>path.startsWith('src/lua/'));
 for(const module of addedModules){
  assert.equal(paths.filter(path=>path===module).length,1,'complete card reading module inventory: '+module);
  assert(exactSourceMatches(read(module),added[module]),'fresh card reading module: '+module);
 }
 return paths.filter(path=>!addedModules.includes(path));
}
