import { entrancePredecessor } from '../ui-entrance-source.mjs';
import {beforeDevelopBackflow,configSourceTokens,isSessionRelicSuccessor,assertCurrentSessionRelicOwner,bindDevelopBackflow} from '../develop-release-backflow-source.mjs';
import {beforeInputRetirementReader,retiredControllerPath} from '../input-retirement-source.mjs';
import {authorizeRebasedDevelop,beforeRebasedCi} from '../rebased-release-source.mjs';
import {beforeSlimeSplitReceipt,beforeSlimeSplitSource} from '../slime-split-source.mjs';
import {authorizeCardFeedbackOwners,beforeCardFeedbackOwner} from '../card-feedback-owner-source.mjs';
import {authorizeSts1MapSource,beforeSts1MapSource} from '../sts1-map-source.mjs';
import {beforeTinyHouseIntegratedSource} from '../tiny-house-integrated-source.mjs';
import {beforeM05ShopSource,authorizeM05ShopSource} from '../m05-shop-source.mjs';
// Proposal only. No authorization cache; callers retain the original epoch proofs.
import assert from 'node:assert/strict';
import {projectTinyHouseUiSource,authorizeTinyHouseUiSource} from '../tiny-house-ui-source.mjs';
import {beforePc13RewardCover,authorizePc13RewardCover} from '../pc13-reward-cover-source.mjs';
import {beforeReleaseGuideSource,authorizeReleaseGuideSources} from '../release-guide-backflow-source.mjs';
import {projectPotionPointerSource,authorizePotionPointerSource} from '../potion-pointer-source.mjs';
import {projectLumineSource,authorizeLumineSource} from '../lumine-portrait-source.mjs';
import {projectV2UiHudSource,authorizeV2UiHudSource} from '../v2-ui-hud-source.mjs';
import {projectFatalBgmSource,authorizeFatalBgmSource} from '../fatal-bgm-source-continuation.mjs';
import {projectSelectorSource,authorizeSelectorSource} from '../character-selector-source.mjs';
import {projectPotionTextSource,authorizePotionTextSource} from '../potion-text-source.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {types} from 'node:util';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
// Only pure computations over complete immutable strings are memoized. Readers,
// owner authorization and projection results never enter these bounded caches.
function cacheStringCalculation(calculate){
 const cache=new Map(),limit=2*1024*1024;let retained=0;
 return source=>{
  if(cache.has(source))return cache.get(source);
  const result=calculate(source);
  if(source.length<=limit){
   while(cache.size>=256||retained+source.length>limit){
    const first=cache.keys().next().value;retained-=first.length;cache.delete(first);
   }
   cache.set(source,result);retained+=source.length;
  }
  return result;
 };
}
const sourceHash=cacheStringCalculation(source=>hash(normalize(source)));
// Input layout permission never applies to linked raw owners. Preserve every
// token, including string escapes, key order and duplicates, without reserialization.
function configLayoutMatcher(current){
 const currentTokens=configSourceTokens(current);
 return cacheStringCalculation(source=>{
 // Whitespace inside a number or keyword is not JSON layout. Parsing is only
 // a syntax gate; the original token text still decides identity.
 try{JSON.parse(source);}catch{return false;}
 return configSourceTokens(source)===currentTokens;
 });
}
const validPath=p=>p==='config/architecture.json'||/^src\/lua\/[A-Za-z0-9_-]+\.lua$/.test(p);
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
// Immutable proof records are shared by complete historical targets. Their
// byte/hash validation is pure; live owner reads below always run afresh.
const validatedFrozenBindings=new WeakSet();
function validateBinding(binding){
 if(binding===null)return;
 // Freezing an object does not freeze Object.prototype. Inherited identity
 // fields must retain fresh validation even after an earlier successful call.
 const cacheable=typeof binding==='object'&&!types.isProxy(binding)&&Object.isFrozen(binding)
  &&Object.hasOwn(binding,'source')&&Object.hasOwn(binding,'sha256')
  &&(Object.hasOwn(binding,'gitBlob')||!('gitBlob' in binding));
 if(cacheable&&validatedFrozenBindings.has(binding))return;
 assert.equal(typeof binding?.source,'string','source identity text');
 assert.equal(normalize(binding.source),binding.source,'source identity LF');
 assert.equal(hash(binding.source),binding.sha256,'source identity SHA256');
 if(binding.gitBlob)assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,'source identity Git blob');
 if(cacheable)validatedFrozenBindings.add(binding);
}
// A composed proof can share previously validated immutable source strings.
// Reuse is explicit and accepts only an already deeply frozen JSON data graph;
// mutable containers, accessors and cycles cannot become an authorization input.
function assertReusableFrozenData(value,seen=new WeakSet(),active=new WeakSet()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert(Number.isFinite(value),'reused source number');return;}
 assert.equal(typeof value,'object','reused source JSON data');
 assert(!active.has(value),'reused source data must be acyclic');
 if(seen.has(value))return;
 assert(Object.isFrozen(value),'reused source data must be frozen');
 assert.equal(Object.getOwnPropertySymbols(value).length,0,'reused source data has no symbol keys');
 const prototype=Object.getPrototypeOf(value),array=Array.isArray(value);
 assert(array?prototype===Array.prototype:prototype===Object.prototype||prototype===null,'reused source plain data');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(array)assert.equal(Object.keys(descriptors).length,value.length+1,'reused source complete JSON array');
 active.add(value);
 for(const [key,descriptor]of Object.entries(descriptors)){
  assert(Object.hasOwn(descriptor,'value'),'reused source data properties');
  if(array&&key==='length')assert.equal(descriptor.enumerable,false,'reused source array length');
  else{
   assert.equal(descriptor.enumerable,true,'reused source enumerable JSON property');
   if(array)assert(/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<value.length,'reused source JSON array index');
  }
  assertReusableFrozenData(descriptor.value,seen,active);
 }
 active.delete(value);seen.add(value);
}
// Composed epochs own their new containers and inherit immutable JSON records.
// Keep those records shared while the constructor still validates the full graph.
export function createComposedSourceEpochProjector(proof){
 return createSourceEpochProjector(freeze(proof),{allowConfigLayout:true,reuseFrozenInput:true});
}

export function createSourceEpochProjector(input,{root=process.cwd(),allowConfigLayout=false,reuseFrozenInput=false}={}){
 // Clone once to prevent the caller changing proof data after validation.
 assert.equal(typeof reuseFrozenInput,'boolean','source proof reuse policy');
 if(reuseFrozenInput)assertReusableFrozenData(input);
 const proof=reuseFrozenInput?input:JSON.parse(JSON.stringify(input));
 assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
 assert.match(proof.currentCommit,/^[a-f0-9]{40}$/);
 assert(Array.isArray(proof.owners));
 const owners=new Set(proof.owners);assert.equal(owners.size,proof.owners.length,'unique owners');
 const currentPaths=Object.keys(proof.current).sort();
 for(const [path,binding]of Object.entries(proof.current)){assert(validPath(path),'source path');validateBinding(binding);}
 for(const owner of proof.owners){assert(validPath(owner),'owner path');assert(Object.hasOwn(proof.current,owner),'owner current identity');}
 for(const [name,target]of Object.entries(proof.targets)){
  assert(/^[A-Za-z0-9_-]+$/.test(name),'target name');assert.match(target.commit,/^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(target.files).sort(),currentPaths,'complete target path set');
  for(const [path,binding]of Object.entries(target.files)){
   validateBinding(binding);
   if(binding?.sha256!==proof.current[path]?.sha256)assert(owners.has(path),'changed source closure');
  }
 }
 freeze(proof);
 const sameConfigLayout=allowConfigLayout&&proof.current['config/architecture.json']
  ?configLayoutMatcher(proof.current['config/architecture.json'].source):()=>false;
 const readers=new WeakMap(),readLive=path=>{
  try{return readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 };
 const liveReaders=new WeakSet([readLive]);
 function requireTarget(target){assert(Object.hasOwn(proof.targets,target),'unknown source target');return proof.targets[target];}
 function rawReader(reader){return readers.get(reader)?.raw??reader;}
 function preCombinedSource(path,source,{target,readSource=readLive}={}){
  const destination=requireTarget(target);
  const liveInput=source;
  const isLiveReader=liveReaders.has(rawReader(readSource));
  const projected=entrancePredecessor(path,source,rawReader(readSource),{allowConfigLayout});
  source=projected.source;readSource=projected.read;
  const rawInput=source,backflow=beforeDevelopBackflow(path,source,{allowConfigLayout}),rebased=beforeRebasedCi(path,backflow);
  const reconciled=beforeSlimeSplitSource(path,rebased),mapPrior=beforeCardFeedbackOwner(path,beforeSts1MapSource(path,reconciled)),guidePrior=beforeReleaseGuideSource(path,mapPrior);
  const inputSource=beforePc13RewardCover(path,beforeM05ShopSource(path,beforeTinyHouseIntegratedSource(path,guidePrior)));
  source=inputSource;
  const current=proof.current[path],before=destination.files[path];
  const sessionSuccessor=isSessionRelicSuccessor(path,rawInput,{allowConfigLayout});
  source=projectTinyHouseUiSource(path,projectV2UiHudSource(path,projectPotionPointerSource(path,source,current),current),current);
  source=projectLumineSource(path,projectPotionTextSource(path,projectSelectorSource(path,projectFatalBgmSource(path,source,current),current),current),current);
  // New witnesses are retained here; retirement belongs to a separate checked
  // materializer. Unknown/original/foreign bytes never authorize owner reads.
  // A registered Develop successor can still need projection when this target
  // records the same precursor as the current receipt.
  if(typeof source!=='string'||!current||!before||(backflow===rawInput&&reconciled===rebased&&current.sha256===before.sha256)||(sourceHash(source)!==current.sha256&&(!allowConfigLayout||path!=='config/architecture.json'||!sameConfigLayout(source))))return rawInput??liveInput;
  assert.equal(typeof readSource,'function','linked owner reader');
  const readRaw=rawReader(readSource);
  // An exact frozen input can be replayed against its owner cohort. Live
  // Develop successors and the default live reader require current owners.
  const historicalOwners=!isLiveReader&&backflow===rawInput
   &&(sourceHash(rawInput)===current.sha256||(path==='config/architecture.json'&&sameConfigLayout(rawInput)))?proof.current:undefined;
  const backflowReader=bindDevelopBackflow(readRaw,historicalOwners);
  backflowReader.authenticate(path,rawInput,{allowConfigLayout});
  readSource=owner=>{
   const raw=backflowReader.readOwner(owner);
   if(sessionSuccessor)assertCurrentSessionRelicOwner(owner,raw);
   return backflowReader.authenticate(owner,raw);
  };
  const readRebased=owner=>beforeRebasedCi(owner,readSource(owner));
  beforeSlimeSplitReceipt(path,rebased,readRebased);
  const samples=[],rawSamples=[],mapSamples=[],reconciledSamples=[[path,backflow]];
  let guideProjected=guidePrior!==mapPrior;
  for(const owner of proof.owners){
   let actual;try{actual=readSource(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
   reconciledSamples.push([owner,actual]);
   actual=beforeSlimeSplitReceipt(owner,beforeRebasedCi(owner,actual),readRebased);
   mapSamples.push([owner,actual]);
   const mapOwner=beforeCardFeedbackOwner(owner,beforeSts1MapSource(owner,actual)),prior=beforeReleaseGuideSource(owner,mapOwner);
   guideProjected ||= prior!==mapOwner;
   actual=beforeTinyHouseIntegratedSource(owner,prior);
   const binding=proof.current[owner];rawSamples.push([owner,actual]);actual=beforePc13RewardCover(owner,beforeM05ShopSource(owner,actual));samples.push([owner,actual,binding]);
   actual=projectTinyHouseUiSource(owner,projectV2UiHudSource(owner,projectPotionPointerSource(owner,actual,binding),binding),binding);
   actual=projectLumineSource(owner,projectPotionTextSource(owner,projectSelectorSource(owner,projectFatalBgmSource(owner,actual,binding),binding),binding),binding);
   assert(binding===null?actual===null||actual===undefined:typeof actual==='string'&&sourceHash(actual)===binding.sha256,'combined linked owner identity: '+owner);
  }
  authorizeRebasedDevelop(reconciledSamples,readSource);
  const readReconciled=owner=>beforeSlimeSplitReceipt(owner,readRebased(owner),readRebased);
  mapSamples.push([path,reconciled]);
  authorizeSts1MapSource(mapSamples,readReconciled);
  authorizeCardFeedbackOwners(mapSamples,readReconciled);
  const readMapPrior=owner=>beforeCardFeedbackOwner(owner,beforeSts1MapSource(owner,readReconciled(owner)));
  if(guideProjected)authorizeReleaseGuideSources(readMapPrior);
  const readGuidePrior=owner=>beforeTinyHouseIntegratedSource(owner,beforeReleaseGuideSource(owner,readMapPrior(owner)));
  const readM05Prior=owner=>beforeM05ShopSource(owner,readGuidePrior(owner));
  const readPrior=owner=>beforePc13RewardCover(owner,readM05Prior(owner));
  authorizeFatalBgmSource(path,inputSource,current,samples,readPrior);
  authorizeSelectorSource(path,inputSource,current,samples,readPrior);
  authorizePotionTextSource(path,inputSource,current,samples,readPrior);
  authorizeLumineSource(path,inputSource,current,samples,readPrior);
  authorizeV2UiHudSource(path,inputSource,current,samples,readPrior);
  authorizePotionPointerSource(path,inputSource,current,samples,readPrior);
  authorizeM05ShopSource(rawSamples,readGuidePrior);
  authorizePc13RewardCover(rawSamples,readM05Prior);
  authorizeTinyHouseUiSource(path,inputSource,current,samples,readPrior);
  return before.source;
 }
 function combinedReader(readSource=readLive,target){
  requireTarget(target);assert.equal(typeof readSource,'function','linked owner reader');
  const prior=readers.get(readSource);if(prior?.target===target)return readSource;
  const raw=rawReader(readSource),reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 function withCombinedProjection(path,source,{target,readSource=readLive},use){
  requireTarget(target);assert.equal(typeof readSource,'function','linked owner reader');
  const readRaw=rawReader(readSource),observed=new Map(),projections=new Map();
  // Reuse only deterministic projections within this replay. Reread each
  // requested owner, reject changes to its first observation and check the
  // entire observed cohort again before returning the projected source.
  const readFresh=owner=>{
   let value;
   try{value=readRaw(owner);}catch(error){
    if(owner!==retiredControllerPath||error?.code!=='ENOENT')assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));
    value=null;
   }
   if(observed.has(owner))assert(value===observed.get(owner),'combined linked owner identity: '+owner+' changed during replay');
   else observed.set(owner,value);
   return value;
  };
  if(liveReaders.has(readRaw))liveReaders.add(readFresh);
  const options={target,readSource:readFresh};
  const projected=preCombinedSource(path,source,options);
  const historicalInput=beforeInputRetirementReader(readFresh);
  const readProjection=owner=>{
   const value=owner===retiredControllerPath?historicalInput(owner):readFresh(owner);
   if(!projections.has(owner))projections.set(owner,preCombinedSource(owner,value,options));
   return projections.get(owner);
  };
  const result=use(projected,readProjection);
  for(const owner of observed.keys())readFresh(owner);
  return result;
 }
 return Object.freeze({proof,preCombinedSource,combinedReader,withCombinedProjection,readerTarget:reader=>readers.get(reader)?.target});
}
