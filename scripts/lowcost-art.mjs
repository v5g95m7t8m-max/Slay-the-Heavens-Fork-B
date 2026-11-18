import {readFileSync} from 'node:fs';
const child=(n,key)=>(n?.controls??n?.children??[]).find(c=>c.name===key);
const capacities={relic:16,enemy:32};
export const releaseEnemyArtInputs=['lowcost-enemy-art','release-enemy-art']
 .map(name=>new URL(`../data/presentation/${name}.json`,import.meta.url));
export function loadLowCostArt(kinds=Object.keys(capacities)){
 const result={};
 for(const kind of kinds){
  const capacity=capacities[kind];
  const source=JSON.parse(readFileSync(new URL(`../data/presentation/lowcost-${kind}-art.json`,import.meta.url),'utf8'));
  if(source.schemaVersion!==1||source.canvas!==100||source.capacity!==capacity||!Object.keys(source.assets??{}).length)throw Error('Invalid low-cost artwork registry: '+kind);
  for(const [id,asset]of Object.entries(source.assets)){
   if(!asset.name||!Array.isArray(asset.shapes)||!asset.shapes.length||asset.shapes.length>capacity)throw Error('Invalid artwork capacity: '+id);
   for(const shape of asset.shapes)if(![100001,100002,100003].includes(shape.image)||
    ![shape.x,shape.y,shape.w,shape.h,shape.rotation??0].every(Number.isFinite)||shape.w<=0||shape.h<=0||
    Math.abs(shape.x)+shape.w/2>72||Math.abs(shape.y)+shape.h/2>72||!/^#[0-9a-f]{6}$/i.test(shape.colour))throw Error('Invalid artwork shape: '+id);
  }
  result[kind]=source;
 }
 return result;
}
// The standard production audio profile and its pinned reconstruction share this decision.
export function usesReleaseEnemyArt(flags,{officialAssets,v25BattleChrome,lightweight2d}={}){
 return !officialAssets&&!v25BattleChrome&&!lightweight2d&&!flags.cards&&!flags.monsters
  &&flags.menuBackground&&flags.selectionAvatar&&flags.battlePortrait;
}
export function loadReleaseEnemyArt(){
 const {enemy}=loadLowCostArt(['enemy']);
 const overlay=JSON.parse(readFileSync(releaseEnemyArtInputs[1],'utf8'));
 const capacity=41;
 if(overlay.schemaVersion!==1||overlay.canvas!==100||overlay.capacity!==capacity||!Object.keys(overlay.assets??{}).length)
  throw Error('Invalid release enemy artwork registry');
 for(const [id,asset]of Object.entries(overlay.assets)){
  if(!Object.hasOwn(enemy.assets,id)||asset.name!==enemy.assets[id].name||!Array.isArray(asset.shapes)
   ||asset.shapes.length<1||asset.shapes.length>capacity)throw Error('Invalid release enemy artwork: '+id);
  for(const s of asset.shapes){
   const angles=[s.rx??0,s.ry??0,s.rotation??0];
   if(![100001,100002,100003].includes(s.image)||![s.x,s.y,s.w,s.h,...angles].every(Number.isFinite)
    ||s.w<=0||s.h<=0||[Math.abs(s.x)+s.w/2,Math.abs(s.y)+s.h/2].some(n=>n>85)
    ||angles.some(n=>Math.abs(n)>180)||(angles[0]!==0&&angles[1]!==0)
    ||!/^#[0-9a-f]{6}$/i.test(s.colour))throw Error('Invalid release enemy artwork shape: '+id);
  }
  // Provenance stays in the source JSON; only drawable fields reach the client.
  enemy.assets[id]={name:asset.name,shapes:asset.shapes};
 }
 enemy.capacity=capacity;
 return {enemy};
}
function pool(icon,capacity){return {name:icon.name+'Art',kind:'container',position:[...(icon.position??[0,0])],size:[100,100],visible:false,raycastTarget:false,
 children:Array.from({length:capacity},(_,i)=>({name:'shape'+i,kind:'image',size:[1,1],image:100001,colour:'#FFFFFF',visible:false,raycastTarget:false}))};}
export function attachLowCostEnemyArt(actor,capacity=capacities.enemy){
 const portrait=child(actor,'portrait');
 if(!portrait||actor.name!=='AbyssMonsterActor'||child(actor,'portraitArt'))return;
 const children=actor.controls??actor.children;
 children.splice(children.indexOf(portrait)+1,0,pool(portrait,capacity));
}
export function attachLowCostArt(tree){
 function walk(node,path=''){
  path+='/'+node.name;const children=node.controls??node.children??[];
  for(const c of [...children])walk(c,path);
  attachLowCostEnemyArt(node);
  const icon=child(node,'icon');
  const relic= /\/relicBar\/slot\d+$/.test(path)||/\/relicPanel\/(row\d+\/slot|single)$/.test(path)||
   /\/shopView\/relic\d+$/.test(path)||/\/treasureView\/(reward|rewardItem\d+)$/.test(path);
  if(icon&&relic&&!child(node,'iconArt'))children.splice(children.indexOf(icon)+1,0,pool(icon,16));
 }
 walk(tree);return tree;
}
