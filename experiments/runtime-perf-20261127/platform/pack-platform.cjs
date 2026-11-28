const fs=require('node:fs');
const cp=require('node:child_process');
const os=require('node:os');
const sha=require('node:crypto').createHash;
const path=require('node:path');
const read=p=>fs.readFileSync(p,'utf8');
const bytes=p=>fs.readFileSync(p);
const hash=p=>sha('sha256').update(bytes(p)).digest('hex');
const verified=(p,match)=>{const s=read(p);if(!s.includes(match))throw new Error(p+' missing '+match);return s};
const parseLog=(p)=>{
 const s=verified(p,'PRODUCTION_HOST_PASS seed=42');
 const result=JSON.parse(s.split('\n').find(x=>x.startsWith('RUNTIME_BASELINE_JSON ')).slice(22));
 const trace=s.split('\n').filter(x=>x.startsWith('PLATFORM_RESIDENT ')).map(x=>{const [,phase,tree,alive,visible]=x.split(' ');return {phase,tree:+tree,alive:+alive,visible:+visible}});
 return {logSha256:hash(p),pass:s.split('\n').find(x=>x.startsWith('PRODUCTION coldFrames=')),maxRssKiB:result.maxRssKiB,
  samples:result.rows.map(r=>({...r,memory:r.memory,...(trace.find(x=>x.phase===r.phase)?{resident:trace.find(x=>x.phase===r.phase)}:{})}))};
};
const count=x=>1+(x.children??[]).reduce((a,b)=>a+count(b),0);
const f='build/platform-official/game-ui.json', tf='build/platform-official/game-ui-templates.json';
const layout=JSON.parse(read(f));
const report={schemaVersion:1,sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 sourceTree:cp.execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),
 environment:{node:process.version,fengari:require(path.resolve('node_modules/fengari/package.json')).version,os:os.platform(),arch:os.arch(),kernel:os.release(),
  resourceLimit:'No asserted CPU/memory control; shared offline CaaS, measurements observational'},
 evidenceClass:'offline generated production-source host, not compiled GIL or official platform',
 viewport:'mobile 1560x720', seed:42,
 mode:JSON.parse(read('platform-profile-config.log')),
 sceneDescription:{core:'seed-42 real official-source callback and build preset, legal first enemy encounter (one enemy), 75 deck entries in controlled fixture, ten drawn cards, 60 OnUpdate at 1/60, three selected and committed cards with feedback settling, cold/warm deck, pause/resume, destroy/reenter', output:'Generated UI/templates with local template IDs; no native GIL readback', officialDevice:'NOT_RUN'},
 definitions:{
  elapsedMs:'Host wall delta between BASELINE_MARK calls, including fixture and instrumentation. Scene tick interval is simulated; not frame wall time, IPC duration, or device measurements.',
  nativeCalls:'Calls handled by observer.lua allowlist on native contract stand-ins (GetChild, GetChildren, SetActive only in production profile). Extra trace adds explicitly instrumented game/script globals under separate keys.',
  propertyWrites:'Proxy __newindex attempts; same value included; setters can generate writes, so do not sum with method totals.',
  resident:'Unique stand-in controls reached through children/items. Alive uses engineAlive state. Visible requires own and ancestors visible plus true activeInHierarchy; does not measure pixel occlusion, clipping, draw calls, or engine capacity. Only at marked phase boundaries.',
  memory:'Node + Fengari process bytes at mark; maxRssKiB whole process. Trace retains prior host intentionally for reentry assertions and walks the tree, so not a leak test or device memory.',
  staticCounts:'Generating source UI descriptors, not imported GIL or editor capacities; distinguished from simultaneously visible stand-in controls.',
  traceOverhead:'A second probe with separate counter/traversal overhead. Not an optimization A/B or comparable performance pair.',
 },
 generated:{
   controls:layout.controls.reduce((a,b)=>a+count(b),0),
   roots:layout.controls.map(r=>({name:r.name,controls:count(r),staticVisible:r.visible!==false})),
   templates:JSON.parse(read(tf)).map(r=>({name:r.name,controls:count(r)})),
   hashes:{gameUi:hash(f),gameUiTemplates:hash(tf),tracePatch:hash(path.join(__dirname,'platform-fixture-trace.patch'))},
 },
 stock:parseLog('platform-official.log'),
 trace:parseLog('platform-official-trace.log'),
};
fs.writeFileSync(path.join(__dirname,'platform-source-host-rerun.json'),JSON.stringify(report,null,2)+'\n');
for(const r of report.trace.samples){const methods=Object.fromEntries(Object.entries(r.nativeMethods).filter(([k])=>k.startsWith('game.')||k.startsWith('script.')));console.log(r.phase,JSON.stringify(methods),JSON.stringify(r.resident??{}))}
