import {settingsReleaseSource} from './helpers/settings-release-source.mjs';
import {beforeReleaseFastB9Ci} from './helpers/release-fast-b9-ci-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as rawReadFileSync,readdirSync} from 'node:fs';
import {releaseFastB9CiRead} from './helpers/release-fast-b9-ci-source.mjs';
import {createHash} from 'node:crypto';
import {beforeCapacityB9Ci} from './helpers/release-capacity-b9-ci-source.mjs';
import {discoverJs} from '../scripts/ci-shards.mjs';
import {sourceEpoch,preReleasePc22BasicFeedbackSourceEpoch,releasePc22BasicFeedbackSourceEpoch,releaseSelectionMapSourceEpoch} from './helpers/closeout-source-epoch.mjs';
import {integrationPacket,integrationCiSource,integrationRead,integrationInventory,integrationPriorInventory,assertIntegrationRawInventory,assertReleaseIntegrationCurrent} from './helpers/release-card-contact-integration.mjs';
import {releasePc22BasicFeedbackCiPacket,assertReleasePc22BasicFeedbackExecutionGuards} from './helpers/release-pc22-basic-feedback-ci-source.mjs';
import {releaseSelectionMapCiPacket,assertReleaseSelectionMapExecutionGuards} from './helpers/release-selection-map-ci-source.mjs';
import {enemyJoinRead,enemyJoinSource,assertEnemyJoinCurrent} from './helpers/release-enemy-art-join.mjs';
import {enemyCapacityRead,enemyCapacitySource,assertEnemyCapacityCurrent} from './helpers/release-enemy-capacity-join.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const readFileSync=rawReadFileSync;

test('joint Release authenticates the full live production corpus and retains both immutable standalone corpora',()=>{
 const p=sourceEpoch.proof,prior=preReleasePc22BasicFeedbackSourceEpoch.proof;
 const files=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.equal(files.length,352);assert.deepEqual(files,Object.keys(p.current).filter(path=>p.current[path]!==null).sort());
 for(const path of files)assert.equal(norm(readFileSync(path,'utf8')),p.current[path].source,path+' fresh joint source');
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(p.targets[name],target,name+' complete immutable original target');
 assert.equal(Object.keys(prior.targets).length,64);assert.equal(Object.keys(p.targets).length,70);
 assert.equal(prior.owners.length,116);assert.equal(p.owners.length,117);
 assert.deepEqual(p.targets.releasePc22BasicFeedbackReviewed.files,releasePc22BasicFeedbackSourceEpoch.proof.current);
 assert.deepEqual(p.targets.releaseSelectionMapReviewed.files,releaseSelectionMapSourceEpoch.proof.current);
 for(const side of [releasePc22BasicFeedbackSourceEpoch,releaseSelectionMapSourceEpoch])for(const [name,target]of Object.entries(side.proof.targets))assert.deepEqual(p.targets[name],target);
 const changed=files.filter(path=>p.current[path].sha256!==prior.current[path].sha256);
 assert.deepEqual(changed,['src/lua/abyss_card_flow.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_game_ui_view.lua','src/lua/abyss_lowcost_art.lua']);
 const card=p.current['src/lua/abyss_card_flow.lua'].source;
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(card)}\0`).update(card).digest('hex'),'486b63e804f138ee7a1ba1dc8241bdf9d3b99731');
 assert(card.includes('position={flight.tx,flight.ty-(flight.stop or 0)}'));
 assert.equal(p.currentTreeCommitted,false,'historical producer commits are not relabelled as a committed joint corpus');
});

test('joint owner authorization freshly rejects every missing changed or mistyped owner and leaves foreign inputs visible',()=>{
 const p=sourceEpoch.proof,anchor='src/lua/abyss_card_flow.lua',raw=path=>readFileSync(path,'utf8'),source=norm(raw(anchor));
 for(const target of ['releasePc22BasicFeedbackPrior','releaseSelectionMapReviewed']){
  const seen=[];
  assert.equal(sourceEpoch.preCombinedSource(anchor,source,{target,readSource:path=>{seen.push(path);return raw(path);}}),p.targets[target].files[anchor].source);
  assert.deepEqual(seen,p.owners);
  for(const owner of p.owners)for(const replacement of [null,raw(owner)+'\n',Buffer.from(raw(owner))])
   assert.throws(()=>sourceEpoch.preCombinedSource(anchor,source,{target,readSource:path=>path===owner?replacement:raw(path)}),/linked owner/);
 }
 for(const input of [source+'\n',source.slice(1),null,17,Buffer.from(source),source.replaceAll('\n','\r\r\n')]){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(anchor,input,{target:'releasePc22BasicFeedbackPrior',readSource:()=>{calls++;throw Error('foreign');}}),input);assert.equal(calls,0);
 }
});

test('joint CI binds every current input, preserves both packets and never masks production or foreign drift',()=>{
 assertReleaseIntegrationCurrent();
 const releaseRead=(path,encoding)=>beforeReleaseFastB9Ci(path,settingsReleaseSource(path,beforeCapacityB9Ci(path,readFileSync(path,encoding)),'release'),undefined,readFileSync);
 // The changed CI wrapper is authenticated separately from the immutable old inventory.
 const wrapper='tests/helpers/release-card-contact-integration.mjs';
 for(const mode of ['changed','missing'])assert.throws(()=>assertEnemyJoinCurrent((p,e)=>{
  if(p===wrapper){if(mode==='missing')throw Error('missing '+p);return readFileSync(p,e)+'\n';}
  return readFileSync(p,e);
 }),mode==='missing'?/missing/:/fresh complete integration source/);
 for(const [path,sha]of Object.entries(integrationPacket.files)){
  const source=norm(readFileSync(path,'utf8'));assert.equal(hash(norm(releaseRead(path,'utf8'))),sha,path);
  if(source!==releaseRead(path,'utf8')){
    assert.equal(norm(beforeReleaseFastB9Ci(path,settingsReleaseSource(path,beforeCapacityB9Ci(path,source.replaceAll('\n','\r\n')),'release'),undefined,readFileSync)),norm(releaseRead(path,'utf8')));
    const foreign=source.replaceAll('\n','\r\r\n');
    assert.equal(beforeCapacityB9Ci(path,foreign),foreign);
   }
  for(const side of ['pc22','selection']){
   for(const foreign of [source+'\n',source.slice(1),null,{},17])assert.equal(integrationCiSource(path,foreign,side),foreign,path);
   for(const foreignPath of ['__proto__','constructor','foreign/'+path])assert.equal(integrationCiSource(foreignPath,source,side),source);
   if(path.startsWith('src/')||path==='config/architecture.json'){
    assert.equal(integrationCiSource(path,source,side),source,'CI cannot authorize production');
    assert.equal(norm(integrationRead(side)(path,'utf8')),source,'CI reader leaves raw production authorization to the production projector');
   }
  }
  for(const mode of ['changed','missing'])assert.throws(()=>assertReleaseIntegrationCurrent((p,e)=>{
   if(p!==path)return rawReadFileSync(p,e);if(mode==='missing')throw Error('missing '+p);return e?source+'\n':Buffer.from(source+'\n');
  }),mode==='missing'?/missing/:/fresh complete integration source/);
 }
 for(const [side,packet]of [['pc22',releasePc22BasicFeedbackCiPacket],['selection',releaseSelectionMapCiPacket]]){
  const read=integrationRead(side);
  for(const [path,row]of Object.entries(packet.files))assert.equal(hash(norm(read(path,'utf8'))),row.current.sha256,path+' exact '+side+' current view');
 }
 for(const path of Object.keys(integrationPacket.archives))assert.throws(()=>assertReleaseIntegrationCurrent((p,e)=>p===path?Buffer.concat([rawReadFileSync(p),Buffer.from('\n')]):rawReadFileSync(p,e)),/immutable Release join predecessor/);
});

test('joint raw inventories retain both additions and reject missing duplicate foreign and changed inputs',()=>{
 const raw={js:discoverJs(),lua:readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort()};
 for(const [kind,paths]of Object.entries(raw)){
  assert.deepEqual(paths,integrationInventory(kind));assertIntegrationRawInventory(paths,kind);
  for(const [side,packet]of [['pc22',releasePc22BasicFeedbackCiPacket],['selection',releaseSelectionMapCiPacket]]){
   assert.deepEqual(integrationPriorInventory(paths,side,kind),packet.currentInventory[kind]);
   const added=paths.filter(p=>!packet.currentInventory[kind].includes(p));
   if(kind==='js'||side==='selection')assert(added.length>0);
   if(added.length)assert.throws(()=>assertIntegrationRawInventory(paths.filter(p=>!added.includes(p)),kind),/raw discovery inventory/);
   for(const path of added)assert.throws(()=>integrationPriorInventory(paths,side,kind,(p,e)=>{
    const raw=readFileSync(p,e);return p===path?raw+'\n':raw;
   }),error=>error.code==='ERR_ASSERTION'&&[
    'fresh Release integration added inventory source: '+path,
    'fresh complete integration source: enemy capacity '+path,
   ].includes(error.message.split('\n')[0]));
  }
  for(const bad of [[],paths.slice(1),[...paths,paths[0]],[...paths,'tests/foreign.test.mjs']])assert.throws(()=>assertIntegrationRawInventory(bad,kind),/raw discovery inventory/);
 }
 const workflow=readFileSync('.github/workflows/quality.yml','utf8');
 assertReleasePc22BasicFeedbackExecutionGuards(workflow);assertReleaseSelectionMapExecutionGuards(workflow);
});

test('actual 00ab enemy capacity join freshly rejects cross-input and archive drift through both public readers',()=>{
 const anchor='scripts/build-ui.mjs',dependency='scripts/build-native-candidate.mjs';
 const raw=readFileSync(anchor,'utf8'),source=norm(raw);
 assertEnemyCapacityCurrent();
 for(const side of ['enemy','release']){
  const expected=enemyCapacityRead(side)(anchor,'utf8');
  assert.notEqual(norm(expected),source,'both complete parent inputs differ from the real combined builder');
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(enemyCapacitySource(anchor,input,side),expected);
  for(const foreign of [source+'\n',source.slice(1),source.replaceAll('\n','\r\r\n'),null,17,Buffer.from(source)]){
   let reads=0;assert.strictEqual(enemyCapacitySource(anchor,foreign,side,{read:()=>{reads++;throw Error('foreign');}}),foreign);assert.equal(reads,0);
  }
  for(const path of [dependency,'tests/helpers/release-enemy-capacity-join.json.gz','tests/helpers/release-capacity-b9-reader-repair.json.gz']){
   for(const mode of ['drift','missing','null']){
    const read=(p,e)=>{if(p!==path)return readFileSync(p,e);if(mode==='missing')throw Error('missing '+p);if(mode==='null')return null;const b=readFileSync(p,e);return typeof b==='string'?b+'\n':Buffer.concat([b,Buffer.from('\n')]);};
    assert.throws(()=>enemyCapacityRead(side,read)(anchor,'utf8'));
    assert.throws(()=>integrationRead('pc22',read)(anchor,'utf8'));
   }
   assert.equal(enemyCapacityRead(side)(anchor,'utf8'),expected,'restoration authorizes freshly');
  }
  const buffer=enemyCapacityRead(side)(anchor);assert(Buffer.isBuffer(buffer));assert.equal(norm(buffer.toString()),norm(expected));
 }
 for(const path of ['src/lua/abyss_lowcost_art.lua','config/architecture.json','foreign/'+anchor,'__proto__',null,17]){
  let reads=0;assert.equal(enemyCapacitySource(path,source,'enemy',{read:()=>{reads++;throw Error('production');}}),source);assert.equal(reads,0);
 }
 const joined='tests/release-card-contact-integration.test.mjs',joinedRaw=readFileSync(joined,'utf8');
 assert.strictEqual(beforeCapacityB9Ci(joined,joinedRaw,'b9',{sha256:'0'.repeat(64)}),joinedRaw,'wrong predecessor preserves the original complete input');
 assert.throws(()=>enemyCapacityRead('unknown'),/known enemy capacity parent/);
});
