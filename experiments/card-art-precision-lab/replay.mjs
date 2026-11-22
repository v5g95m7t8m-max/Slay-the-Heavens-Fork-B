import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {percentile} from '../../scripts/benchmark-runtime-path.mjs';
import {cardIds,hashPrecision} from './probes.mjs';

const [projectionPath,workerPath,outPath,modeArg,scenario='distinct']=process.argv.slice(2);
const mode=Number(modeArg);
assert(projectionPath&&workerPath&&outPath&&[0,1,2,3].includes(mode)&&['distinct','repeat'].includes(scenario));
const output=resolve(outPath);
mkdirSync(output);
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const projection=read(projectionPath);

const saveBytes=readFileSync(projection.save);
assert.equal(sha(saveBytes),projection.saveSha256);
assert.equal(projection.inverseReadback.faults.length,0);
const worker=readFileSync(workerPath);
assert.equal(sha(worker),'de72d4f80b230cfac330ab0ac6fa9d05e51bb8f51d352f08dd1ee6bcba0fe09d','expected BeyondSimulator MCP 0.5.2');
const marker='var W=null,Oa=';
const prefix=worker.toString('utf8').split(marker);
assert.equal(prefix.length,2);
// Extract the unchanged SDK prefix. Only worker transport/timer code is omitted.
const sdkPath=join(dirname(resolve(workerPath)),`.precision-lab-${process.pid}-export.mjs`);
const sdkBytes=prefix[0]+'\nexport {Qi,Gr,vi,dn,wi,pa,Me,d,ya};\n';
writeFileSync(sdkPath,sdkBytes);
const {Qi,Gr,vi,dn,wi,pa,Me,d,ya}=await import(pathToFileURL(sdkPath));
const report={status:'IN_PROGRESS',mode,scenario,identity:{...Object.fromEntries(
  ['sourceCommit','candidateSha256','saveSha256','buildId'].map(k=>[k,projection[k]])),
  workerSha256:sha(worker),sdkExportSha256:sha(sdkBytes),replaySha256:sha(readFileSync(new URL(import.meta.url)))},
  environment:{version:process.version,platform:process.platform,canvas:'pc-16-9',dt:1/60},
  scope:'BeyondSimulator 0.5.2 SDK and Lua/model wall time',official:'UNVERIFIED',stages:[]};
const flush=()=>writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const save=JSON.parse(saveBytes);
const mapPath=save.assets.server.meta.sourceFile;
assert.equal(sha(readFileSync(mapPath)),projection.candidateSha256);
const candidate=read(join(dirname(mapPath),'candidate.json'));
assert.equal(candidate.candidate.sha256,projection.candidateSha256);
assert(Object.values(candidate.mode).includes(mode),'unsupported mode for this candidate');
report.budget=candidate.budget;
const screenshotWanted=process.env.PRECISION_REPLAY_PNG==='1';
let heldScene;
const mount=Qi.prototype.mountScript,requireLua=Qi.prototype.luaRequire;
const precisionRequires={};
Qi.prototype.luaRequire=function(state){
  const name=Buffer.from(d.lua_tolstring(state,1)??[]).toString();
  if(name.startsWith('abyss_precision_'))precisionRequires[name]=(precisionRequires[name]??0)+1;
  return requireLua.call(this,state);
};
Qi.prototype.mountScript=function(options){
  return mount.call(this,/^abyss_ui(?:\.lua)?$/.test(options.path)?{...options,params:{...options.params,precisionLabMode:mode}}:options);
};
const code=value=>new TextEncoder().encode(value);
let session,L,active;
function lua(source){session.runtime.runChunk(L,source,'PRECISION_LAB_OBSERVER')}
function expose(fn,local,name){
  const top=d.lua_gettop(L);
  d.lua_getglobal(L,code(fn));
  for(let i=1;;i++){
    const key=d.lua_getupvalue(L,-1,i);
    if(!key){d.lua_settop(L,top);throw Error('missing '+local);}
    if(Buffer.from(key).toString()===local){
      d.lua_setglobal(L,code(name));d.lua_settop(L,top);return;
    }
    d.lua_pop(L,1);
  }
}
function status(){
  const top=d.lua_gettop(L);
  d.lua_getglobal(L,code('__PRECISION_STATUS'));
  assert.equal(d.lua_pcall(L,0,1,0),0,Buffer.from(d.lua_tolstring(L,-1)??[]).toString());
  const data=JSON.parse(Buffer.from(d.lua_tolstring(L,-1)).toString());
  d.lua_settop(L,top);return data;
}
function native(path){
  let n=session.runtime.roots[0];
  assert(n);
  for(const part of path.split('/')){n=n.children.find(c=>c.name===part);assert(n,path);}
  return n;
}
function shown(n){
  for(;n;n=n.parent)if(!n.alive||n.active===false||n.visible===false)return false;
  return true;
}
function target(path){
  const n=native(path);
  assert(shown(n),'target not visible: '+path);
  const boxes=wi(session),box=boxes.get(n.Id),matrix=pa(session,boxes).get(n.Id);
  assert(box&&matrix,path);
  return Me(matrix,box.centerX,box.centerY);
}
function pointer(action,{x,y}){return vi(session,action,x,y)}
function tap(path){
  const point=target(path);
  pointer('move',point);pointer('down',point);step();pointer('up',point);step();
}
function snapshot(){
  let visible=0,hidden=0,visibleHands=0,visibleFallbacks=0;
  for(const n of session.runtime.controlsById.values()){
    if(n.name!=='artSamples'||!n.alive)continue;
    const nodes=(n.children??[]).slice();
    if(n.parent?.parent?.name==='battlePanel'&&/^card[1-9]/.test(n.parent.name)&&shown(n.parent)){
      if(shown(n)&&nodes.length)visibleHands++;
      if(shown(n.parent.children.find(x=>x.name==='art')))visibleFallbacks++;
    }
    while(nodes.length){
      const child=nodes.pop();
      if(shown(child))visible++;else hidden++;
      nodes.push(...child.children);
    }
  }
  return {visibleArtControls:visible,hiddenArtControls:hidden,visibleHands,visibleFallbacks,registered:session.runtime.controlsById.size,
    rss:process.memoryUsage().rss,heap:process.memoryUsage().heapUsed};
}
function step(){
  const before=performance.now();
  dn(session,1/60);
  const elapsed=performance.now()-before;
  if(active){
    active.steps.push(elapsed);
    active.peakRegistered=Math.max(active.peakRegistered,session.runtime.controlsById.size);
    active.peakAnimations=Math.max(active.peakAnimations??0,session.runtime.uiAnimations?.size??0);
  }
}
function until(label,ready,max=180){
  const start=performance.now();
  for(let updates=0;updates<=max;updates++){
    if(ready())return {updates,wallMs:performance.now()-start};
    if(updates<max)step();
  }
  expose('__PRECISION_ART_STATUS','order','__PRECISION_ORDER');lua('__precisionDump()');
  const art=native('stage/battlePanel/card1/artSamples');
  const chain=[];
  for(let n=art;n;n=n.parent)chain.push([n.name,n.alive,n.active,n.visible]);
  throw Error(label+' readiness not observed: '+JSON.stringify({state:status(),tree:snapshot(),chain,
    children:art.children.slice(0,3).map(n=>[n.name,n.alive,n.active,n.visible]),logs:session.runtime.logs.slice(-10)}));
}
function stage(name,fn){
  const row={name,frame:session.runtime.clock.frame,steps:[],before:snapshot(),peakRegistered:session.runtime.controlsById.size};
  report.stages.push(row);active=row;
  const start=performance.now();
  try{return fn(row)}
  finally{
    row.wallMs=performance.now()-start;row.after=snapshot();row.state=status();
    if(row.steps.length)row.stepMs={mean:row.steps.reduce((a,b)=>a+b,0)/row.steps.length,
      p95:percentile(row.steps,.95),p99:percentile(row.steps,.99),max:Math.max(...row.steps)};
    active=null;flush();
  }
}

async function capturePng(scene){
  const bundle=readFileSync(join(dirname(workerPath),'index.js'));
  assert.equal(sha(bundle),'5a64b946fac68d29052e387de11cfb64b90bd5c8a559a74b0fe5d90241be1bca');
  const parts=bundle.toString().split('var wu=Math.max(');
  assert.equal(parts.length,2);
  const rendererPath=join(dirname(sdkPath),`.precision-lab-${process.pid}-renderer.mjs`);
  writeFileSync(rendererPath,parts[0]+'\nexport {Gc,vc};\n');
  try{
    const {Gc,vc}=await import(pathToFileURL(rendererPath));
    const assets=await Gc().prepare(scene.nodes);
    const png=vc(scene,session.runtime.canvasWidth,session.runtime.canvasHeight,assets);
    writeFileSync(join(output,'ten-card.png'),png.data);
    return {sha256:sha(png.data),assetWarnings:assets.warnings};
  }finally{unlinkSync(rendererPath);}
}

const setup=readFileSync(new URL('replay-fixture.lua',import.meta.url),'utf8');
const ids=scenario==='repeat'?Array(10).fill('defend'):cardIds;
const idLiteral='{'+ids.map(x=>JSON.stringify(x)).join(',')+'}';
try {
  const start=performance.now();
  session=Gr(save.assets.server,{templatesProject:save.assets.client,scripts:save.assets.scripts,
    serverConfig:save.serverLogic,canvasId:'pc-16-9',language:'LanguageChs'});
  report.startupMs=performance.now()-start;
  const rootScript=session.runtime.mountedScripts.find(s=>/^abyss_ui(?:\.lua)?$/.test(s.path));
  assert(rootScript?.alive,JSON.stringify({mounts:session.runtime.mountedScripts.map(x=>x.path),logs:session.runtime.logs.slice(-5)}));
  assert(session.runtime.logs.some(l=>l.text==='ABYSS_UI ready'));
  L=rootScript.env;
  expose('OnUpdate','view','__PRECISION_VIEW');
  lua(setup);
  expose('__PRECISION_ART_STATUS','order','__PRECISION_ORDER');
  stage('menu',()=>until('menu',()=>shown(native('stage/menuPanel/start/hit'))&&status().operable));
  stage('opening',()=>{
    lua('__PRECISION_VIEW.seed=17; assert(__PRECISION_VIEW:start()); assert(__PRECISION_VIEW:selectCharacter("traveler"))');
    until('character',()=>status().operable);
    lua('assert(__PRECISION_VIEW:confirmCharacter())');
    until('run',()=>status().run);
    lua('__precisionSkipOpening()');
    until('opening end',()=>status().operable);
  });
  // Hand and enemy fixtures use the same production Run, Combat.new and draw.
  for(const count of [0,1,5,10]){
    if(count>1)stage('reset-before-'+count,()=>{
      lua('__precisionBattle({},0)');
      until('zero after clear',()=>status().cards===0&&status().operable&&status().artControls===0);
    });
    stage('hand-'+count,row=>{
      lua('__precisionBattle('+idLiteral+','+count+')');
      row.firstVisible=null;row.operable=null;
      row.all=until('hand '+count,()=>{
        const s=status(), tree=snapshot();
        if(row.firstVisible===null&&tree.visibleHands)row.firstVisible=row.steps.length;
        if(row.operable===null&&s.operable){row.operable=row.steps.length;row.fallbacksAtOperable=tree.visibleFallbacks;}
        return s.mode==='battle'&&s.cards===count&&s.operable&&tree.visibleHands===(mode?count:0);
      });
    });
  }
  stage('settled-hand',row=>{
    for(let i=0;i<60;i++)step();
    if(screenshotWanted)heldScene=ya(session,{view:true}).scene;
    const first=status().cardIds.split(',')[0];
    const expected=hashPrecision(candidate.budget,cardIds.indexOf(first)).map(r=>r.slice(0,6));
    const images=native('stage/battlePanel/card1/artSamples').children.flatMap(c=>c.children)
      .filter(c=>c.kind==='image').map(c=>[c.imageId,c.anchoredPositionX,c.anchoredPositionY,c.sizeDeltaX,c.sizeDeltaY,c.localRotationZ]);
    row.geometryCount=images.length;
    row.actorLayer=native('stage/battlePanel/actorLayer').children.filter(shown).map(n=>n.name);
    if(mode){
      const signature=list=>list.map(r=>r.map(v=>Math.round(v*1000)).join(',')).sort();
      assert.deepEqual(signature(images),signature(expected),'art projection changed geometry');
    }else assert.equal(images.length,0);
    row.artIds=new Set(status().cardIds.split(',')).size;
    assert.equal(row.artIds,scenario==='repeat'?1:10);
    row.texts=Array.from({length:10},(_,i)=>['name','cost','type','label'].map(key=>
      native('stage/battlePanel/card'+(i+1)+'/'+key).text));
    assert(row.texts.every(row=>row.every(value=>typeof value==='string'&&value.trim())),'empty game text');
    const originalIds=native('stage/battlePanel/card1/artSamples').children.flatMap(c=>c.children.map(n=>n.Id));
    lua('__PRECISION_VIEW:refresh()');step();
    const refreshedIds=native('stage/battlePanel/card1/artSamples').children.flatMap(c=>c.children.map(n=>n.Id));
    assert.deepEqual(refreshedIds,originalIds,'same card reallocated during refresh');
  });
  stage('deck-open-close',row=>{
    row.cycles=[];
    for(let i=0;i<3;i++){
      lua('assert(__PRECISION_VIEW:openDeck())');
      until('deck',()=>status().deck&&status().operable);
      if(mode)until('deck art',()=>snapshot().visibleArtControls>0);
      const opened=snapshot();
      lua('assert(__PRECISION_VIEW:closeDeck())');
      until('return',()=>!status().deck&&status().operable&&snapshot().visibleHands===(mode?10:0));
      row.cycles.push({opened,closed:snapshot()});
    }
  });
  stage('card-drag',()=>{
    const before=status();
    const from=target('stage/battlePanel/card10/hit');
    pointer('move',from);pointer('down',from);
    pointer('move',{x:session.runtime.canvasWidth/2,y:session.runtime.canvasHeight/2});
    step();pointer('move',from);pointer('up',from);
    until('cancel',()=>status().operable);
    assert.equal(status().cards,before.cards);assert.equal(status().energy,before.energy);
  });
  for(let i=0;i<(scenario==='repeat'?2:1);i++)stage(i===0?'play-defense':'play-defense-again',row=>{
    const before=status();
    const slot=before.cardIds.split(',').indexOf('defend')+1;
    assert(slot>0);
    const from=target('stage/battlePanel/card'+slot+'/hit'),drop={x:640,y:450};
    pointer('move',from);pointer('down',from);pointer('move',drop);step();step();
    const started=performance.now();
    pointer('up',drop);
    row.feedback=until('Defend played',()=>status().cards===before.cards-1&&status().energy===before.energy-1,240);
    row.releaseToChangeSdkMs=performance.now()-started;
    until('Defend animation',()=>status().operable,240);
    assert.equal(status().cards,before.cards-1);
  });
  stage('end-turn',()=>{
    const before=status();
    tap('stage/battlePanel/endTurn');
    until('next turn',()=>status().operable&&status().turn===before.turn+1,360);
  });
  stage('reward',()=>{
    lua('__precisionReward()');
    until('reward',()=>status().operable&&status().phase==='reward'&&snapshot().visibleHands===(mode?3:0));
    assert(/cleave|星陨|斩|[＋+]/i.test(native('stage/battlePanel/card1/name').text));
  });
  stage('shop',()=>{
    lua('__precisionShop()');
    const merchant='stage/nodePanel/merchant/talk/hit';
    until('shop introduction',()=>status().operable&&status().mode==='node'&&shown(native(merchant)));
    tap(merchant);
    until('shop',()=>shown(native('stage/nodePanel/shopView/card1')));
    if(mode)until('shop card art',()=>shown(native('stage/nodePanel/shopView/card1/artSamples'))&&snapshot().visibleArtControls>0);
  });
  stage('run-close',()=>{
    lua('__precisionExit()');
    until('menu after close',()=>status().mode==='menu'&&status().operable);
    assert.equal(snapshot().visibleArtControls+snapshot().hiddenArtControls,0);
  });
  report.final=snapshot();
  report.precisionModuleRequires=precisionRequires;
  assert.equal(Object.keys(precisionRequires).length,mode?2:0,'unrequested drawing module load');
  report.logs=session.runtime.logs.filter(l=>/PRECISION|ABYSS_NATIVE_ART|failed|lua-error/.test(l.text+' '+l.level));
  assert.deepEqual(report.logs.filter(l=>l.level==='lua-error'||/ABYSS_UI failed|ABYSS_NATIVE_ART rejected/.test(l.text)),[]);
  report.status='PASS';
  if(heldScene)report.screenshot=await capturePng(heldScene);
}catch(error){
  report.status='FAIL';report.error=error.stack;console.error(error.stack);process.exitCode=1;
}finally{
  if(session){
    for(const runtime of session.runtimes)runtime.destroy();
    report.remainingAfterDestroy=session.runtime.controlsById.size;
    if(report.remainingAfterDestroy!==0){report.status='FAIL';process.exitCode=1;}
  }
  Qi.prototype.mountScript=mount;Qi.prototype.luaRequire=requireLua;
  unlinkSync(sdkPath);
  flush();
  console.log(report.status,report.stages.map(s=>s.name).join(' '));
}
