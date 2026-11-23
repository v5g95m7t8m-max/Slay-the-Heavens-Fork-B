import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [root=process.cwd()]=process.argv.slice(2);
const source=path=>readFileSync(resolve(root,path),'utf8');
const load=async p=>import(pathToFileURL(resolve(root,p)));
const {gameLayout}=await load('scripts/game-ui-layout.mjs');
const {applyOfficialAssets,officialAssetsTheme}=await load('scripts/official-assets-layout.mjs');
const {withViewport}=await load('scripts/viewport-layout.mjs');
const theme=officialAssetsTheme(JSON.parse(source('data/presentation/ui_theme.json')));
const g=withViewport(gameLayout(),theme);
applyOfficialAssets([g],theme);
const c=(n,k)=>{const x=(n.controls??n.children??[]).find(x=>x.name===k);assert.ok(x,'missing '+k);return x;};
const [W,H]=theme.canvas.base;
const stage=c(g,'stage'), battle=c(stage,'battlePanel'), entry=c(stage,'potionEntry');
const fixtures=[[1280,720],[1600,900],[1920,1080],[1600,720],[2340,1080]];
const rect=([x,y],[w,h])=>[x-w/2,y-h/2,x+w/2,y+h/2];
const contained=(a,b)=>a[0]>=b[0]&&a[1]>=b[1]&&a[2]<=b[2]&&a[3]<=b[3];
const area=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
const clip=(a,b)=>[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])];
const dims=a=>[a[2]-a[0],a[3]-a[1]];
const rows=Array.from({length:theme.layout.battlePotions.count},(_,k)=>{
 const i=k+1,b=c(i<=3?battle:c(battle,'potionHelp'),'potion'+i),s=c(entry,'slot'+i),sHit=c(s,'hit');
 assert.equal(b.kind,'presetButton');assert.equal(sHit.kind,'cursorArea');
 assert.equal(c(c(battle,'potionHelp'),'potionHelp'+i).visible,false,'legacy hidden help not another tap region');
 assert.equal(s.visible,false,'run-surface slots only visible once occupied');
 const face=c(b,'normal'),offset=face.position??[0,0];
 const faces=['normal','hover','pressed','disabled'].map(n=>{
   const f=c(b,n);return rect(b.position.map((x,j)=>x+(f.position?.[j]??0)),f.size.map((v,j)=>v*(f.scale?.[j]??1)));
 });
 return {slot:i, visibleFace: faces[0],faces,
  visualCenter:b.position.map((n,j)=>n+offset[j]),
  battle:rect(b.position,b.size),
  run:rect(s.position.map((n,j)=>n+(sHit.position?.[j]??0)),sHit.size),
  legacyOrigin:theme.layout.battlePotions.origin.map((n,j)=>n+k*theme.layout.battlePotions.step[j])};
});
const viewportResult=(model,rows)=>{
 const [w,h]=model,s=Math.min(w/W,h/H),project=([a,b,c,d])=>[w/2+s*a,h/2-s*d,w/2+s*c,h/2-s*b],bounds=[0,0,w,h];
 for(const field of ['battle','run']){
  const boxes=rows.map(x=>project(x[field]));
  for(const [i,b] of boxes.entries()){
   const r=rows[i],visible=clip(b,bounds);
   assert.ok(contained(project(rect(r.visualCenter,[40,40])),visible),field+' slot '+r.slot+' lost the visible 40×40 core');
   assert.ok(r.faces.every(f=>contained(project(f),visible)),field+' slot '+r.slot+' face leaves owner');
   assert.ok(boxes.every((x,j)=>i===j||area(x,b)<1e-7),field+' slots overlap');
  }
 }
 return {screen:model,scale:s,visibleBattle:rows.map(x=>dims(clip(project(x.battle),bounds))),visibleRun:rows.map(x=>dims(clip(project(x.run),bounds)))};
};
const screens=fixtures.map(f=>viewportResult(f,rows));
const mutants=[
 ['shift-middle-hit',r=>{r[1].battle=r[1].battle.map((p,j)=>p+(j%2===0?10:0));}],
 ['scale-hit-like-face',r=>{r[1].battle=r[1].visibleFace;}],
 ['add-run-neighbor-overlap',r=>{r[1].run[0]-=5;}],
];
for(const [name,mutate] of mutants){const edited=structuredClone(rows);mutate(edited);assert.throws(()=>viewportResult(fixtures[0],edited),{name:'AssertionError'},name);}
console.log(JSON.stringify({scope:'official geometry composition, viewport transform model only; no runtime raycast/official device',screens,rows,mutants:mutants.map(x=>x[0]),layoutFiles:Object.fromEntries(['scripts/game-ui-layout.mjs','scripts/ui-layout.mjs','scripts/official-assets-layout.mjs','scripts/official-battle-hud.mjs','scripts/official-run-hud-components.mjs','scripts/viewport-layout.mjs','src/lua/abyss_viewport.lua','data/presentation/ui_theme.json'].map(p=>[p,createHash('sha256').update(source(p)).digest('hex')]))},null,2));
