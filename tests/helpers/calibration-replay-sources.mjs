import {beforeMapRoomReplayCohort} from './develop-replay-merge-source.mjs';
import {beforeMapNodeVisualsLineEndings} from './input-retirement-sts-binding.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readRetiredInputLuaReceipt,readRetiredInputTestReceipt} from './input-retirement-inventory.mjs';
import {beforeCombatEvents,beforeDevelopUiBackflows,beforePotionBackflow,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {beforeActionButtons} from './action-buttons-source.mjs';
import {authenticateDevelopBackflow,beforeDeckPages} from './develop-release-backflow-source.mjs';
import {beforeCurrentReplayFixes} from './current-replay-fix-sources.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';

const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const blob=source=>hash(`blob ${Buffer.byteLength(source)}\0${source}`,'sha1');
const lf=source=>source.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./calibration-replay-sources.json.gz',import.meta.url));
assert.equal(hash(bytes),'ba41b8ca02fb157121f08addffdd14ade94d0d759494cfa9b56344426746c926','exact historical calibration input archive');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);
assert.equal(packet.base,'469e80240c5b7c60f75ff434bebac62d73c0bd0c');
const matches=(source,row)=>typeof source==='string'&&!source.includes('\r\r\n')&&
 hash(lf(source))===row.sha256&&blob(lf(source))===row.gitBlob;
const retirementBytes=readFileSync(new URL('./input-retirement-calibration-source.json.gz',import.meta.url));
assert.equal(hash(retirementBytes),'2ad6dd590a69fa7035d63d6fc2568dfff5ab815842192bc6a2eec619e316cfa1','exact calibration input retirement packet');
const retirement=JSON.parse(gunzipSync(retirementBytes));
assert.equal(retirement.base,'0461bcd30dac18818318cbafa77ad72fad069e0a');
for(const [path,row] of Object.entries(retirement.extra)){
 assert(Object.hasOwn(retirement.current,path),'registered calibration input successor: '+path);
 assert(matches(row.source,row),path+' exact retained fixture');
}
for(const row of retirement.retiredLua)assert(matches(row.source,row),'exact retired relic-view fixture');
for(const [path,row] of Object.entries(retirement.continuations))
 assert(matches(row.before.source,row.before),path+' exact input retirement CI test predecessor');
for(const [path,row] of Object.entries(packet.receipts))for(const [sha,retained] of Object.entries(row.before)){
 assert.equal(retained.sha256,sha,path+' recorded receipt identity');
 assert(matches(retained.source,retained),path+' exact retained receipt source');
}
for(const [path,row] of Object.entries(packet.continuations))
 assert(matches(row.before.source,row.before),path+' exact calibration continuation predecessor');

const runHudPotionFixture='tests/official-run-hud-reuse.test.mjs';
function beforeRunHudPotionFixture(path,source){
 if(path!==runHudPotionFixture||!matches(source,{
  sha256:'d25b9916ef640c869b28dc2c4227b522be54937e6e3ed91e6074de88653e30cd',gitBlob:'0d2a72ed384947c0d47be6eaac6de6d3ee2c2b6e',
 }))return source;
 const current=lf(source);
 // #872 appends a live potion assertion; only historical Run HUD reads omit it.
 const boundary=current.indexOf("\ntest('battle and noncombat potion popups share compact panel and action tokens',");
 assert(boundary>0,'exact Run HUD potion fixture suffix');
 const prior=current.slice(0,boundary);
 assert(matches(prior,{
  sha256:'0ac73d7298d2ef127daf0afc2b386073d19d9f5c25720b7f6513bfcaad4aa333',gitBlob:'bce30e2816a09bc594a84bec31c504b77ffe5d1f',
 }),'exact Run HUD potion fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeCalibrationReplay(path,source){
 source=beforeCurrentHistoricalStsSource(path,source);
 source=beforeMapNodeVisualsLineEndings(path,source);
 source=beforeRunHudPotionFixture(path,source);
 if(Object.hasOwn(retirement.continuations,path)){
  const {before,after}=retirement.continuations[path];
  if(matches(source,after))source=source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
 }
 if(!Object.hasOwn(packet.continuations,path))return source;
 const row=packet.continuations[path];
 if(!matches(source,row.after))return source;
 return source.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
}
const copierPath='tests/helpers/copy-integration-source-closure.mjs';
const historicalStsEntry='tests/helpers/historical-sts-style-entry.mjs';
export function beforeCurrentHistoricalStsSource(path,source){
 if(Buffer.isBuffer(source)){
  const text=source.toString('utf8'),prior=beforeCurrentHistoricalStsSource(path,text);
  return prior===text?source:Buffer.from(prior);
 }
 // New exact integration tests first continue to the entrance witness's reviewed input.
 if(['tests/integration-source-epoch.test.mjs','tests/helpers/combined-epoch/source-epoch-runtime.mjs',
  'tests/session-menu-navigation.test.mjs','tests/tiny-house-pending-ui.cases.mjs'].includes(path))source=beforeCurrentReplayFixes(path,source);
 source=beforeUiEntranceWitness(path,source);
 if(path===copierPath)return beforeCurrentReplayCopier(path,source);
 if(path!==historicalStsEntry)return beforeCurrentReplayFixes(path,source);
 if(!matches(source,{
  sha256:'f358b5956f55a33890ea4f4481b75bcd0bfc56048cbc50e4b45a0f9870654c3b',gitBlob:'eb9b2d891344249dfb6644f8800240e3078d38b6',
 }))return source;
 const prior=lf(source)
  .replace("import {beforeCurrentHistoricalStsSource} from './calibration-replay-sources.mjs';\n",'')
  .replace('beforeCurrentHistoricalStsSource(p,readFileSync(join(root,p),e))','readFileSync(join(root,p),e)');
 assert(matches(prior,{
  sha256:'96c580efcf1c7ed4e1be8b1bc3a27d15212c8b485e5a345d5ec450ad364017ae',gitBlob:'ce9126941e02931a16a28e10e20182c41799c7ef',
 }),'exact historical StS runner predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
export function beforeCurrentReplayCopier(path,source){
 if(path===copierPath&&matches(source,{
  sha256:'9c0b358a3b75b59ebe7218f988297661b71a42b47d20e34a3b9734a2c0a71a10',gitBlob:'143ce2350c049fa4fe641e86dc34b18d094a8c73',
 })){
  const prior=lf(source).replace(/const entranceFiles=Object.freeze\(\{\n[\s\S]+?\n\}\);\n/,'')
   .replace('Object.entries(entranceFiles)','Object.entries(currentReplayFiles)');
  assert.equal(hash(prior),'98ff5c37986a48db7ec6257a537193a57156cbdcce8e20cf48f5d206ff64aa40','exact merged entrance copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path===copierPath&&matches(source,{
  sha256:'69eb9c5241f43631e1e341747b0565a92b0e348ba7a9c3e9ea4479a524e98d91',gitBlob:'e39d70be38e7a42b6078c656d4624ed71d448ee5',
 })){
  const prior=lf(source).replace(/const entranceFiles=Object.freeze\(\{\n[\s\S]+?\n\}\);\n/,'')
   .replace('Object.entries(entranceFiles)','Object.entries(currentReplayFiles)');
  assert.equal(hash(prior),'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b','exact entrance copier predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path!==copierPath||!(matches(source,{
  sha256:'f606b9a16cf0800cdec7f8a781aaab7deca6f05e08937a3488fef86a54b6742b',gitBlob:'a796a1ddf69bd0a3c19e21eb7be78d21f498e720',
 })||matches(source,{
  sha256:'98ff5c37986a48db7ec6257a537193a57156cbdcce8e20cf48f5d206ff64aa40',gitBlob:'dfe81edcd36a45f8ffed7d42c849b7755708463b',
 })))return source;
 const text=lf(source);
 const block='const currentReplayFiles=Object.freeze({\n';
 const start=text.indexOf(block),end=text.indexOf('const inside=',start);
 assert(start>=0&&end>start,'exact current replay copy closure extension');
 const prior=(text.slice(0,start)+text.slice(end)).replace('Object.entries(currentReplayFiles))','Object.entries(actionButtonFiles))');
 assert(matches(prior,{
  sha256:'848e21017bfe022dd0a5e8215ffa94aee50b328ac9d7055ef1fade4f3a170677',gitBlob:'f3005ce3dcd73c1a5bd64fc252535ee6950bc6ff',
 }),'exact pre-repair helper copy closure');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

function matchesCurrentReceipt(path,source,expected){
 source=beforeCurrentReplayFixes(path,beforeUiEntranceWitness(path,source));
 if(matches(source,expected))return true;
 const ui=beforeDevelopUiBackflows(path,source);
 const actions=beforeActionButtons(path,ui);
 return [beforePotionBackflow(path,source),ui,actions,beforeCombatEvents(path,actions),beforeDeckPages(path,source)]
  .some(prior=>matches(prior,expected));
}

const relicEquipReceipt={
 path:'src/lua/abyss_relic_hooks.lua',
 current:{sha256:'c03ea48ca4375b1fd08cafc4d59e64ab0c6af387c490edfddb8136703fff28e0',gitBlob:'24a61843c9f6bc4a39baa4a2a13282469d858900'},
 prior:{sha256:'19b0ba4fcd2c5ca37219623868b8cdd978787e8861e50e2e43fefb8c70be2f2f',gitBlob:'792504a367f4488fb08942e0030d5376ea4de73c'},
};

function readRelicEquipReceipt(readCurrent){
 const {path,current,prior}=relicEquipReceipt;
 const source=readCurrent(path,'utf8');
 assert(matches(source,current)&&(!source.includes('\r')||lf(source).replaceAll('\n','\r\n')===source),
  'current relic equip receipt input changed: '+path);
 // This receipt predates unrelated closeout owners. Reuse the sealed session
 // relic transition and require the same live bytes on the linked re-read.
 const archived=authenticateDevelopBackflow(path,source,owner=>{
  const live=readCurrent(owner,'utf8');
  if(owner===path)assert(live===source,'current relic equip receipt input changed during replay: '+path);
  return live;
 });
 assert(matches(archived,prior),'exact relic equip receipt predecessor: '+path);
 return lf(archived);
}

// A frozen receipt may read a registered old blob only after checking the
// corresponding current file. Raw Full discovery and inputs use their normal readers.
export function readCalibrationReceiptInput(path,digest,read,readCurrent=readFileSync){
 if(path===relicEquipReceipt.path&&digest===relicEquipReceipt.prior.sha256)return readRelicEquipReceipt(readCurrent);
 const fallback=()=>{
  const source=read(),prior=beforeCurrentReplayFixes(path,source);
  return typeof prior==='string'&&hash(lf(prior))===digest?prior:source;
 };
 const retired=readRetiredInputTestReceipt(path,digest,readCurrent);
 if(retired!==undefined)return retired;
 if(path==='tests/lua/relic_view_controller_click.lua'){
  const row=retirement.retiredLua.find(row=>row.sha256===digest);
  if(row)return readRetiredInputLuaReceipt(path,digest,readCurrent,row);
 }
 const current=Object.hasOwn(retirement.current,path)?retirement.current[path]:null;
 const retained=Object.hasOwn(packet.receipts,path)&&Object.hasOwn(packet.receipts[path].before,digest)?packet.receipts[path].before[digest]:null;
 if(path===retiredControllerPath&&digest===stsStylePriorRuntime.files[path].sha256){
  assert(readRetiredController(p=>readCurrent(p,'utf8')).restored,'retired production controller receipt requires the current pointer owner');
  return stsStylePriorRuntime.files[path].source;
 }
 if(current){
  const extra=Object.hasOwn(retirement.extra,path)?retirement.extra[path]:null;
  const prior=Object.hasOwn(stsStylePriorRuntime.files,path)?stsStylePriorRuntime.files[path]:null;
  const witness=retained??(extra?.sha256===digest?extra:prior?.sha256===digest?prior:null);
  if(witness){
   assert(matchesCurrentReceipt(path,readCurrent(path,'utf8'),current),'current receipt input changed: '+path);
   assert(matches(witness.source,witness),path+' exact retained calibration input');
   return witness.source;
  }
 }
 if(!Object.hasOwn(packet.receipts,path))return fallback();
 const row=packet.receipts[path];
 if(!Object.hasOwn(row.before,digest))return fallback();
 if(row.current===null)assert.throws(()=>readCurrent(path,'utf8'),{code:'ENOENT'},'retired receipt input reappeared: '+path);
 else{
  const raw=beforeCurrentHistoricalStsSource(path,readCurrent(path,'utf8'));
  let current=raw;
  if(path==='tests/helpers/combined-epoch/source-epoch-runtime.mjs'||path==='tests/helpers/copy-integration-source-closure.mjs'||
     path==='tests/helpers/round3-catalog-source-inverse.mjs'){
   current=beforeMapRoomReplayCohort(path,raw);
   assert.notEqual(current,raw,'current receipt input changed: '+path);
  }
  assert(matchesCurrentReceipt(path,current,row.current),'current receipt input changed: '+path);
 }
 return row.before[digest].source;
}
