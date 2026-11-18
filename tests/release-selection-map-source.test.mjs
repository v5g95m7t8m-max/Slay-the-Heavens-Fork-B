import {releaseEnemyArtCiPacket,releaseEnemyArtCiSource,assertReleaseEnemyArtCiCurrent} from './helpers/release-enemy-art-ci-source.mjs';
import {enemyJoinRead} from './helpers/release-enemy-art-join.mjs';
import {enemyCapacityRead} from './helpers/release-enemy-capacity-join.mjs';
import {preReleaseEnemyArtSource,releaseEnemyArtSourcePacket,extendReleaseEnemyArtSource} from './helpers/release-enemy-art-source.mjs';
import {capacityPreflightSource,assertCapacityPreflightCurrent} from './helpers/release-capacity-preflight-source.mjs';
import {fastFreezeB9Source,assertFastFreezeB9UnionCurrent} from './helpers/release-fast-freeze-b9-union.mjs';
import {assertSettingsReleaseCurrent,settingsReleaseRead} from './helpers/settings-release-source.mjs';
import {enemyFastRead} from './helpers/release-enemy-fast-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as rawReadFileSync,readdirSync as rawReaddirSync,mkdtempSync,mkdirSync,rmSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {beforeCapacityB9Ci,capacityB9CiBindings,capacityB9CiRead} from './helpers/release-capacity-b9-ci-source.mjs';
import {discoverJs as rawDiscoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch as jointSourceEpoch,releaseSelectionMapSourceEpoch as sourceEpoch,preReleaseSelectionMapSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {integrationProductionRead,integrationPriorInventory,integrationCapacityCiRead} from './helpers/release-card-contact-integration.mjs';
import {releaseSelectionMapSourcePacket,extendReleaseSelectionMapSource} from './helpers/release-selection-map-source.mjs';
import {historicalSource,releaseFreezeCiBefore,capacityReleaseCiBefore,releaseSelectionMapCiPacket,releaseSelectionMapCiSource,releaseSelectionMapPriorInventory,assertReleaseSelectionMapRawInventory,assertReleaseSelectionMapCiCurrent,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
// Preserve the full #697 standalone contract in its authenticated exact view.
const readFileSync=integrationProductionRead('selection',rawReadFileSync);
const discoverJs=()=>integrationPriorInventory(rawDiscoverJs(),'selection');
const readdirSync=path=>path==='tests/lua'?integrationPriorInventory(rawReaddirSync(path).filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p),'selection','lua').map(p=>p.slice(10)):rawReaddirSync(path);

test('B9 capacity CI join binds both exact predecessors and refuses drift foreign paths wrong before and malformed inputs',()=>{
 for(const [path,row]of Object.entries(capacityB9CiBindings)){
  const raw=enemyFastRead('release')(path,'utf8'),lf=norm(raw);
  assertCapacityPreflightCurrent();
  assert.equal(hash(capacityPreflightSource(path,lf,'capacity')),row.currentSha256,path+' complete named capacity source');
  for(const view of ['b9','capacity']){
   for(const input of [raw,lf,lf.replaceAll('\n','\r\n')]){
    assert.equal(hash(norm(beforeCapacityB9Ci(path,input,view,{sha256:row[view]}))),row[view]);
    assert.strictEqual(beforeCapacityB9Ci(path,input,view,{sha256:'0'.repeat(64)}),input);
   }
   for(const bad of [raw+'\n',raw.slice(1),lf.replaceAll('\n','\r\r\n'),Buffer.from(raw),null,{},17])assert.strictEqual(beforeCapacityB9Ci(path,bad,view),bad);
   for(const foreign of ['foreign/'+path,'src/lua/'+path,'__proto__'])assert.strictEqual(beforeCapacityB9Ci(foreign,raw,view),raw);
   const buffer=Buffer.from(raw),prior=capacityB9CiRead(()=>buffer,view)(path);
   assert(Buffer.isBuffer(prior));assert.equal(hash(norm(prior.toString())),row[view]);
   const badBuffer=Buffer.concat([buffer,Buffer.from('\n')]);assert.strictEqual(capacityB9CiRead(()=>badBuffer,view)(path),badBuffer);
  }
  assert.strictEqual(releaseSelectionMapCiSource(path,raw,{sha256:'0'.repeat(64)}),raw);
 }
});

test('actual merged Release authenticates every unchanged Lua and architecture predecessor without advancing the product epoch',()=>{
 const bytes=readFileSync('tests/helpers/release-selection-map-base-source.json.gz');
 assert.equal(hash(bytes),'4678cdb4036cab5217a359657ae15735c7a2af47936ec58067018dd2d53c9dfa');
 const proof=JSON.parse(gunzipSync(bytes)),prior=preReleaseSelectionMapSourceEpoch.proof;
 assert.equal(proof.baseCommit,'1cc5479b713edab6fd26db4e20f8eb22b7401cb2');
 assert.deepEqual(proof.baseParents,['36b9b157ee6f05b65eb9f1da7e2978647d36c210']);
 assert.equal(proof.equivalentCommit,releaseSelectionMapSourcePacket.baseCommit);
 assert.equal(proof.sourceCount,352);assert.equal(proof.ownerCount,116);
 assert.deepEqual(Object.keys(proof.files).sort(),Object.keys(prior.current).filter(path=>prior.current[path]!==null).sort());
 for(const [path,row]of Object.entries(proof.files)){
  assert.equal(row.gitBlob,row.oldGitBlob,path+' unchanged exact Git blob');
  assert.equal(hash(row.source),row.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob,path);
  assert.equal(row.source,prior.current[path].source,path+' complete authenticated prior source');
 }
 assert.equal(releaseSelectionMapSourcePacket.currentCommit,'74a598a52a0b846bc1bec1ef57083b2fdb1bbc39');
});

test('release selection map production preserves every complete prior target and freshly authenticates the committed source tree',()=>{
 const p=sourceEpoch.proof,prior=preReleaseSelectionMapSourceEpoch.proof;
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 assert.deepEqual(p.targets.releaseSelectionMapPrior.files,prior.current);
 assert.equal(p.currentTreeCommitted,true);assert.equal(p.currentCommit,releaseSelectionMapSourcePacket.currentCommit);
 const files=['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
 assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path);
 for(const [path,before]of Object.entries(releaseSelectionMapSourcePacket.before))assert.deepEqual(before,prior.current[path]);
 assert.throws(()=>extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch,{...releaseSelectionMapSourcePacket,current:{}}),/only the approved selection map owners advance/);
});

test('release selection map CI validates complete live bindings while unknown or changed bytes stay visible',()=>{
 assertReleaseSelectionMapCiCurrent(integrationCapacityCiRead(rawReadFileSync));
 for(const [path,row]of Object.entries(releaseSelectionMapCiPacket.files)){
  const source=norm(readFileSync(path,'utf8'));assert.equal(hash(historicalSource(path,source)),row.current.sha256,path);
  const production=path.startsWith('src/')||path==='config/architecture.json';
  assert.equal(releaseSelectionMapCiSource(path,source),production?source:row.before?.source??historicalSource(path,source),path);
  for(const foreign of [source+'\n',source.slice(1),null,{},17])assert.equal(releaseSelectionMapCiSource(path,foreign),foreign,path);
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(releaseSelectionMapCiSource(foreignPath,source),source);
  assert.throws(()=>assertReleaseSelectionMapCiCurrent(integrationCapacityCiRead((p,encoding)=>{
   const raw=rawReadFileSync(p,encoding);return p===path?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;
  })),/fresh complete integration source/);
 }
 for(const path of Object.keys(releaseSelectionMapSourcePacket.current))assert.equal(releaseSelectionMapCiSource(path,sourceEpoch.proof.current[path].source),sourceEpoch.proof.current[path].source,'CI does not intercept production authorization');
});

test('capacity and latest Release CI views compose without accepting stale or foreign current owners',async()=>{
 const adapter=await import('./helpers/release-selection-map-ci-source.mjs');
 const integration=adapter.capacityReleaseCiPacket;
 assert(integration,'complete exact merge continuation required');
 assert.equal(integration.releaseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
 assert.equal(integration.capacityCommit,'bf74c0c391a0700740fee9b7cb8695bff615366a');
 assert.deepEqual(Object.keys(integration.files),['tests/helpers/release-bootstrap-ci-source.mjs','tests/release-selection-map-source.test.mjs']);
 assertReleaseSelectionMapCiCurrent(integrationCapacityCiRead(rawReadFileSync));
 const {assertIntegratedCurrent}=await import('./helpers/integrated-ci-source.mjs');
 assertIntegratedCurrent();
 for(const [path,row]of Object.entries(integration.files)){
  assert.deepEqual(row.before,releaseSelectionMapCiPacket.files[path].current,'complete committed Release predecessor');
  const current=norm(beforeCapacityB9Ci(path,rawReadFileSync(path,'utf8'),'capacity'));
  assert.equal(hash(current),row.current.sha256,path);
  assert.equal(adapter.capacityReleaseCiBefore(path,current),row.before.source);
  for(const input of [current,current.replaceAll('\n','\r\n')])assert.equal(releaseSelectionMapCiSource(path,input),row.before.source);
  for(const foreign of [current+'\n',current.slice(1),current.replaceAll('\n','\r\r\n'),null,{},17]){
   assert.equal(adapter.capacityReleaseCiBefore(path,foreign),foreign);
   assert.equal(releaseSelectionMapCiSource(path,foreign),foreign);
  }
  for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(adapter.capacityReleaseCiBefore(foreignPath,current),current);
  // Success above must never cache authorization for a later changed/missing owner.
  for(const changed of [current+'\n',current.slice(1),row.before.source])
   assert.throws(()=>assertIntegratedCurrent((p,e)=>p===path?changed:rawReadFileSync(p,e)),/fresh complete integration source/);
  assert.throws(()=>assertIntegratedCurrent((p,e)=>{if(p===path)throw Error('missing '+p);return rawReadFileSync(p,e);}),/missing/);
 }
 assertIntegratedCurrent();
});

test('release selection map raw JS and Lua inventories reject missing duplicate foreign and changed additions',()=>{
 const inventories={js:discoverJs(),lua:readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort()};
 for(const [kind,paths]of Object.entries(inventories)){
  assert.deepEqual(paths,releaseSelectionMapCiPacket.currentInventory[kind]);
  assertReleaseSelectionMapRawInventory(paths,kind);
   assert.deepEqual(releaseSelectionMapPriorInventory(paths,kind,readFileSync),releaseSelectionMapCiPacket.priorInventory[kind]);
  const opaque=[`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`];
  assert.deepEqual(releaseSelectionMapPriorInventory(opaque,kind),opaque,'unrelated historical input stays opaque for its own validator');
  const noAdditions=paths.filter(path=>releaseSelectionMapCiPacket.priorInventory[kind].includes(path));
  if(paths.length!==noAdditions.length)assert.throws(()=>assertReleaseSelectionMapRawInventory(noAdditions,kind),/raw discovery inventory/,'deleting every release addition cannot pass raw Full validation');
  assert.throws(()=>assertReleaseSelectionMapRawInventory(opaque,kind),/raw discovery inventory/);
  for(const bad of [paths.slice(1),[...paths,paths[0]],[...paths,`tests/${kind==='lua'?'lua/':''}foreign.${kind==='lua'?'lua':'test.mjs'}`]])
   assert.throws(()=>assertReleaseSelectionMapRawInventory(bad,kind),/raw discovery inventory/);
  for(const path of paths.filter(p=>!releaseSelectionMapCiPacket.priorInventory[kind].includes(p)))
   assert.throws(()=>releaseSelectionMapPriorInventory(paths,kind,(p,e)=>readFileSync(p,e)+(p===path?'\n':'')),/fresh release selection map added inventory source/);
 }
});

test('release selection map raw workflow checks each real execution deadline and trusted local route',()=>{
 const workflow=norm(readFileSync('.github/workflows/quality.yml','utf8'));
 assertReleaseSelectionMapExecutionGuards(workflow);
 for(const [before,after]of [
  ["matrix.os == 'windows-2025' && 45 || 30","matrix.os == 'windows-2025' && 30 || 30"],
  ["local-special' && 75 || 45","local-special' && 75 || 30"],
  ["local-special' && 75 || 45","local-special' && 76 || 45"],
  ['runs-on: ubuntu-24.04\n    timeout-minutes: 30','runs-on: ubuntu-24.04\n    timeout-minutes: 20'],
  ["github.event_name == 'workflow_dispatch' && inputs.runner_pool",'inputs.runner_pool'],
  ["github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/master'",'true']]){
  assert(workflow.includes(before),'negative control must change a real workflow input');
  assert.throws(()=>assertReleaseSelectionMapExecutionGuards(workflow.replaceAll(before,after)),/raw Quality/,before);
 }
 const fast="    timeout-minutes: ${{ matrix.os == 'windows-2025' && 45 || 30 }}";
 const posix='    timeout-minutes: 30';
 assert(workflow.includes(fast));assert(workflow.includes(posix));
 for(const bad of [workflow.replace(fast,''),workflow.replace(fast,fast+'\n'+fast),
  workflow.replace(fast,'      timeout-minutes: 45'),
  workflow.replace(fast,'').replace(posix,posix+'\n'+fast)])
  assert.throws(()=>assertReleaseSelectionMapExecutionGuards(bad),/raw Quality/,'missing, duplicate, step-only and wrong-job guards fail');
});

test('release selection map production requires fresh complete owners and leaves foreign bytes visible',()=>{
 const p=sourceEpoch.proof,prior=preReleaseSelectionMapSourceEpoch.proof;
 assert.equal(Object.keys(p.current).length,352);assert.equal(p.owners.length,116);
 assert.equal(Object.keys(prior.targets).length,64);assert.equal(Object.keys(p.targets).length,65);
 const anchor=Object.keys(releaseSelectionMapSourcePacket.current)[0],raw=path=>readFileSync(path,'utf8');
 const source=norm(raw(anchor)),expected=prior.current[anchor].source;
 for(const current of [source,source.replaceAll('\n','\r\n')]){
  const seen=[];assert.equal(sourceEpoch.preCombinedSource(anchor,current,{target:'releaseSelectionMapPrior',readSource:path=>{seen.push(path);return raw(path);}}),expected);
  assert.deepEqual(seen,p.owners,'every invocation freshly authenticates all owners');
 }
 for(const owner of p.owners)for(const mode of ['changed','missing','buffer','throw']){
  const read=path=>{if(path!==owner)return raw(path);if(mode==='throw')throw Error('injected missing owner');if(mode==='missing')return null;if(mode==='buffer')return Buffer.from(raw(path));return raw(path)+'\n';};
  assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target:'releaseSelectionMapPrior',readSource:read}),/linked owner/);
 }
 for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),Buffer.from(source),null,17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(anchor,foreign,{target:'releaseSelectionMapPrior',readSource:()=>{reads++;throw Error('foreign bytes');}}),foreign);assert.equal(reads,0);
 }
 assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target:'foreign'}),/unknown source target/);
 for(const mutate of [v=>{v.before[anchor].source+='\n';},v=>{delete v.current[anchor];},v=>{v.currentCommit='f'.repeat(40);},v=>{v.producers[anchor].parents=[];}]){
  const bad=structuredClone(releaseSelectionMapSourcePacket);mutate(bad);assert.throws(()=>extendReleaseSelectionMapSource(preReleaseSelectionMapSourceEpoch,bad));
 }
});

test('release selection map isolated production copy includes exact helper and packet without CI trust leaf',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'release-selection-map-copy-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 copyIntegrationSourceClosure(directory);
 for(const file of ['release-selection-map-source.mjs','release-selection-map-source.json.gz'])assert(existsSync(join(directory,'tests/helpers',file)));
 assert(!existsSync(join(directory,'tests/helpers/release-selection-map-ci-source.mjs')));
 const copied=await import(pathToFileURL(join(directory,'tests/helpers/closeout-source-epoch.mjs')).href);
 assert.deepEqual(copied.sourceEpoch.proof,jointSourceEpoch.proof);
 const sourceRoot=join(directory,'drift');mkdirSync(sourceRoot);
 // The original closure copier authenticates dependencies from a distinct root.
 copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory});
 const adapter=join(directory,'tests/helpers/release-selection-map-source.mjs');writeFileSync(adapter,readFileSync(adapter,'utf8')+'\n');
 assert.throws(()=>copyIntegrationSourceClosure(sourceRoot,{sourceRoot:directory}),/fresh helper copy identity/);
});

test('release enemy art advances one live Lua owner without rewriting historical selection contracts',()=>{
 const p=jointSourceEpoch.proof,prior=sourceEpoch.proof,packet=releaseEnemyArtSourcePacket,path='src/lua/abyss_lowcost_art.lua';
 assert.equal(p.currentTreeCommitted,false,'capture does not pretend to be a source commit');
 assert.equal(prior.currentTreeCommitted,true,'historical committed flag remains intact');
 assert.deepEqual(p.targets.releaseEnemyArtPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name);
 for(const [key,row]of Object.entries(prior.current)){
  if(key==='src/lua/abyss_card_flow.lua')continue; // exact PC22 owner checked by joint test
  assert.deepEqual(p.current[key],key===path?packet.current[path]:row);
 }
 const raw=key=>rawReadFileSync(key,'utf8');
 for(const [key,row]of Object.entries(p.current))if(row)assert.equal(norm(raw(key)),row.source,key+' live complete owner');
 const seen=[];
 assert.equal(jointSourceEpoch.preCombinedSource(path,raw(path),{target:'releaseEnemyArtPrior',readSource:key=>{seen.push(key);return raw(key);}}),packet.before[path].source);
 assert.deepEqual(seen,p.owners,'fresh complete linked owners');
 for(const owner of p.owners)assert.throws(()=>jointSourceEpoch.preCombinedSource(path,raw(path),{target:'releaseEnemyArtPrior',readSource:key=>raw(key)+(key===owner?'\n':'')}),/linked owner/);
 for(const foreign of [raw(path)+'\n',raw(path).slice(1),norm(raw(path)).replaceAll('\n','\r\r\n'),null,17,Buffer.from(raw(path))]){
  let reads=0;assert.equal(jointSourceEpoch.preCombinedSource(path,foreign,{target:'releaseEnemyArtPrior',readSource:()=>{reads++;throw Error();}}),foreign);assert.equal(reads,0);
  assert.equal(preReleaseEnemyArtSource(path,foreign),foreign);
 }
 for(const mutate of [v=>{v.before[path].source+='\n';},v=>{v.current[path].source+='\n';},v=>{delete v.current[path];},v=>{v.currentTreeCommitted=true;},v=>{v.baseCommit='f'.repeat(40);}]){
  const bad=structuredClone(packet);mutate(bad);assert.throws(()=>extendReleaseEnemyArtSource(sourceEpoch,bad));
 }
});


test('release enemy artwork CI authenticates full current closure and preserves exact historical sources',()=>{
 const readFileSync=enemyJoinRead('enemy');
 assertReleaseEnemyArtCiCurrent(readFileSync);
 const packet=releaseEnemyArtCiPacket;
 assert.equal(packet.currentTreeCommitted,false);
 for(const [path,row]of Object.entries(packet.files)){
  const source=readFileSync(path,'utf8');
  assert.equal(releaseEnemyArtCiSource(path,source),row.before.source);
  assert.equal(releaseEnemyArtCiSource(path,norm(source).replaceAll('\n','\r\n')),row.before.source);
  for(const foreign of [source+'\n',source.slice(1),source.slice(0,-1),null,{},17])
   assert.equal(releaseEnemyArtCiSource(path,foreign),foreign);
  for(const unknown of ['__proto__','constructor','foreign/'+path])
   assert.equal(releaseEnemyArtCiSource(unknown,source),source);
 }
 for(const path of [...Object.keys(packet.files),...Object.keys(packet.currentOwners),...Object.keys(packet.binaryOwners)]){
  assert.throws(()=>assertReleaseEnemyArtCiCurrent(enemyJoinRead('enemy',(p,e)=>{
   const raw=rawReadFileSync(p,e);return p===path?typeof raw==='string'?raw+'\n':Buffer.concat([raw,Buffer.from('\n')]):raw;
  })),/fresh complete integration source/);
  assert.throws(()=>assertReleaseEnemyArtCiCurrent(enemyJoinRead('enemy',(p,e)=>{if(p===path)throw Error('missing '+p);return rawReadFileSync(p,e);})),/missing/);
 }
 const lua='src/lua/abyss_lowcost_art.lua',raw=readFileSync(lua,'utf8');
 assert.equal(releaseEnemyArtCiSource(lua,raw),raw,'CI does not intercept production source ownership');
});
test('Release freeze CI continuation authenticates fresh owners before historical projection',async()=>{
 const readFileSync=(path,encoding)=>{const raw=rawReadFileSync(path,encoding);return typeof raw==='string'?fastFreezeB9Source(path,raw,'freeze'):raw;};
 const assertReleaseSelectionMapCiCurrent=(read=rawReadFileSync)=>assertFastFreezeB9UnionCurrent(read);
 const {releaseFreezeCiPacket:p,releaseFreezeCiBefore:before}=await import('./helpers/release-selection-map-ci-source.mjs');
 assert(p);assert.equal(p.baseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');assertReleaseSelectionMapCiCurrent();
 for(const [path,row]of Object.entries(p.files)){
  const raw=readFileSync(path,'utf8');assert.equal(hash(norm(raw)),row.current.sha256);
  for(const input of [norm(raw),norm(raw).replaceAll('\n','\r\n')])assert.equal(before(path,input),row.before?.source??input);
  for(const input of [raw+'\n',raw.slice(1),raw.replaceAll('\n','\r\r\n'),null,{},17])assert.equal(before(path,input),input);
  assert.equal(before('foreign/'+path,raw),raw);
  for(const change of ['append','missing','stale'])assert.throws(()=>assertReleaseSelectionMapCiCurrent((p,encoding)=>{
   if(p===path){if(change==='missing')throw Error('missing owner');if(change==='stale')return row.before?.source??'';return rawReadFileSync(p,encoding)+'\n';}return rawReadFileSync(p,encoding);
  }));
 }
 const {assertIntegratedCurrent}=await import('./helpers/integrated-ci-source.mjs');assertIntegratedCurrent();
});
test('prepared capacity and preflight views bind only complete named parent sources and fresh caller bytes',async()=>{
 assertSettingsReleaseCurrent();const parentRead=settingsReleaseRead('release',enemyFastRead('release',rawReadFileSync));
 const packet=JSON.parse(gunzipSync(rawReadFileSync('tests/helpers/release-capacity-preflight-source.json.gz')));
 const {releasePreflightUnionSource}=await import('./helpers/release-preflight-union-source.mjs');
 assertCapacityPreflightCurrent();
 for(const [path,row]of Object.entries(packet.files)){
  const current=norm(parentRead(path,'utf8'));assert.equal(hash(current),row.currentSha256);
  assert.strictEqual(releasePreflightUnionSource(path,current,'advisory'),current,'a missing advisory path cannot gain a parent view');
  for(const view of ['preflight','capacity'])for(const eol of ['\n','\r\n']){
   const source=current.replaceAll('\n',eol),binding=row.views[view];
   assert.equal(capacityPreflightSource(path,source,view),binding?binding.source.replaceAll('\n',eol):source);
   for(const before of [{},{sha256:'0'.repeat(64)}])assert.strictEqual(capacityPreflightSource(path,source,view,before),source);
   if(binding)assert.equal(capacityPreflightSource(path,source,view,{sha256:binding.sha256}),binding.source.replaceAll('\n',eol));
   for(const bad of [source+eol,source.slice(1),source.replaceAll(eol,'\r\r\n'),null,{},17,Buffer.from(source)])assert.strictEqual(capacityPreflightSource(path,bad,view),bad);
   for(const foreign of ['foreign/'+path,'__proto__','constructor','src/lua/abyss_run.lua'])assert.strictEqual(capacityPreflightSource(foreign,source,view),source);
   assert.strictEqual(capacityPreflightSource(path,source,'foreign'),source);
  }
  for(const mode of ['changed','missing','null','buffer'])assert.throws(()=>assertCapacityPreflightCurrent((p,e)=>{
   if(p!==path)return rawReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);if(mode==='null')return null;
   if(mode==='buffer')return rawReadFileSync(p);return rawReadFileSync(p,e)+'\n';
  }));
 }
 const {assertCapacityB9ReaderRepairCurrent}=await import('./helpers/release-capacity-b9-ci-source.mjs');
 for(const validate of [assertCapacityPreflightCurrent,assertCapacityB9ReaderRepairCurrent])
  assert.throws(()=>validate((p,e)=>p==='tests/helpers/release-capacity-preflight-source.json.gz'?Buffer.from('bad'):rawReadFileSync(p,e)),/fresh complete capacity\/preflight archive/);
});
test('capacity and integrated readers retain caller rejection of a changed nonrequested union owner',async()=>{
 const {integratedRead}=await import('./helpers/integrated-ci-source.mjs');
 const workflow='.github/workflows/quality.yml',owner='tests/helpers/release-selection-map-ci-source.mjs',archive='tests/helpers/release-capacity-preflight-source.json.gz';
 for(const makeRead of [integrationCapacityCiRead,read=>integratedRead('native',{read})])for(const mode of ['changed','missing','archive']){
  const target=mode==='archive'?archive:owner;
  const read=makeRead((p,e)=>{if(p!==target)return rawReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);
   const value=rawReadFileSync(p,e);return typeof value==='string'?value+'\n':Buffer.concat([value,Buffer.from('\n')]);});
  assert.throws(()=>read(workflow,'utf8'),mode==='missing'?/missing/:/fresh complete|fresh union|archive/);
 }
});
