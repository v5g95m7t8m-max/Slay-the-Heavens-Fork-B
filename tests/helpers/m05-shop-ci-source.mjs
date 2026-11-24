import {beforeStsFadeCi} from './sts-fade-ci-source.mjs';
import {beforeStsSelectionFade} from './sts-selection-fade-source.mjs';
import {beforeTooltipLuaInventory} from './tiny-house-integrated-source.mjs';
// Authenticated CI-only continuation; raw scheduler discovery stays unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const hash=(s,alg='sha256')=>createHash(alg).update(s).digest('hex');
const blob=s=>hash(`blob ${Buffer.byteLength(s)}\0${s}`,'sha1');
const archive=readFileSync(new URL('../fixtures/m05-shop-ci-source.json.gz',import.meta.url));
assert.equal(hash(archive),'9dd0b49c2d5c2eb084ac798a91b6a38b4a8f36269677bb730b863b8d53727e8d','exact M05 CI archive');
const {base,files,inventories}=JSON.parse(gunzipSync(archive));
assert.equal(base,'ff6af63d9bf93056dd772347d10dc749e7fa8d34');
const additions=Object.freeze({js:'tests/shop-dismiss.test.mjs',lua:'tests/lua/shop_dismiss.lua'});
for(const [kind,path]of Object.entries(additions)){
 const prior=inventories[kind];
 assert.deepEqual(prior,[...new Set(prior)].sort(),'complete M05 predecessor '+kind+' inventory');
 assert(!prior.includes(path));assert.equal(files[path].before,null);
}
for(const {before,after} of Object.values(files)){
 if(before){assert.equal(hash(before.source),before.sha256);assert.equal(blob(before.source),before.gitBlob);}
 assert.match(after.sha256,/^[a-f0-9]{64}$/);assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
const matches=(source,binding)=>{
 if(typeof source!=='string'||source.includes('\r\r\n'))return false;
 const text=source.replaceAll('\r\n','\n');
 return hash(text)===binding.sha256&&blob(text)===binding.gitBlob;
};
export function beforeM05ShopCiSource(path,source){
 source=beforeStsFadeCi(path,source);
 source=beforeStsSelectionFade(path,source);
 if(!Object.hasOwn(files,path)||!files[path].before||!matches(source,files[path].after))return source;
 const prior=files[path].before.source;
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function m05CurrentDiscovery(paths,kind,read=readFileSync){
 assert(Object.hasOwn(additions,kind),'known M05 inventory kind');
 if(kind==='lua')paths=beforeTooltipLuaInventory(paths,read);
 const path=additions[kind],prior=inventories[kind];
 assert.deepEqual([...paths].sort(),[...prior,path].sort(),'complete M05 raw '+(kind==='lua'?'Lua':'JS')+' discovery inventory');
 assert(matches(read(path,'utf8'),files[path].after),'fresh M05 added '+kind+' source: '+path);
 return paths.filter(candidate=>candidate!==path);
}
export function m05HistoricalDiscovery(paths,kind,read=readFileSync){
 assert(Object.hasOwn(additions,kind),'known M05 inventory kind');
 // Genuine older callers retain their existing contracts; only live M05 mode
 // may remove the exact newly discovered entry after hashing it.
 return paths.includes(additions[kind])?m05CurrentDiscovery(paths,kind,read):paths;
}

// The Release integration retains #776's extra tests. Historical Release
// receipts remove only those exact test bytes before checking their inventory.
const backflowTestHashes={
 js:'207c98d6243b318cac7bfccb2fe0822107e9ae57b3aa013c7fa10f87e3e5d43f',
 lua:'b7290fd614807fa585a8041b0cc2848a172188726308dbd812a7fa8212058d8b',
};
const pointerShopDismiss={
 sha256:'0d992f850751d137a2d23817ccc1dd79852fea9469938c593fd583cefd5f6947',
 gitBlob:'68f0ef3985931dc4cfd1b2ff40cf5d1b60fb2e3a',
};
// #859 adjusted only the dismissal layer's current adjacency assertions.
const shopDismissLayoutSuccessor={
 sha256:'db23a1f592c395e4ffad5cffbfb0770ef1e84674545dbd9cbabbd85e9630a82c',
 gitBlob:'e2039aefbdf11e0a444100a8df07a8a869cae38b',
};
function beforeShopDismissLayout(source){
 if(!matches(source,shopDismissLayoutSuccessor))return source;
 const after="  assert.ok(panel.children.findIndex(c=>c.name==='backdrop')<index);\n"+
  "  assert.equal(panel.children[index-1].name,'shopRoom');";
 const before="  assert.equal(panel.children[index-1].name,'backdrop');";
 const text=source.replaceAll('\r\n','\n');
 assert.equal(text.split(after).length,2,'single exact shop dismissal layout transition');
 const prior=text.replace(after,before);
 assert(matches(prior,files[additions.js].after),'exact archived M05 shop dismissal predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeM05BackflowInventory(paths,kind,read=readFileSync){
 assert(Object.hasOwn(additions,kind),'known M05 inventory kind');
 const path=additions[kind],entries=paths.filter(candidate=>candidate===path);
 if(!entries.length)return paths;
 assert.equal(entries.length,1,'single M05 backflow '+kind+' test');
 const raw=read(path,'utf8');
 const source=kind==='js'?beforeShopDismissLayout(raw):raw;
 const prior=typeof source==='string'&&!source.includes('\r\r\n')&&hash(source.replaceAll('\r\n','\n'))===backflowTestHashes[kind];
 assert(prior||kind==='lua'&&matches(source,pointerShopDismiss),'fresh M05 backflow '+kind+' test: '+path);
 return paths.filter(candidate=>candidate!==path);
}
export function m05FrozenInventory(kind){
 assert(Object.hasOwn(additions,kind),'known M05 inventory kind');
 return [...inventories[kind],additions[kind]].sort();
}
