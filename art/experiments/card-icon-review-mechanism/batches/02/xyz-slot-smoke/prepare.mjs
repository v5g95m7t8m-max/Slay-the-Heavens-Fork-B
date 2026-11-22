import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const [geometryDir,output]=process.argv.slice(2);
assert(geometryDir&&output,'Usage: prepare.mjs <no-mask geometry directory> <generated Lua path>');
const sha=(text)=>createHash('sha256').update(text).digest('hex');
const codes={strike:'a1ff40e5398f683b950ae8fc75755ea84f65abd129ca2068e2a067db00dd82e1',bash:'68f26ebfc4e969766018d124a785ef8c58562e11b7ae2b78b7f4b6a72ea39491'};
const col=s=>[1,3,5].map(i=>parseInt(s.colour.slice(i,i+2),16)).concat(s.opacity??255);
const center=[.5,.5],zero=[0,0,0];
const rows={};
const hex=(n,w)=>{assert(Number.isInteger(n)&&n>=0&&n<16**w);return n.toString(16).padStart(w,'0');};
const encode=r=>hex(r.image-100000,1)+[...r.position,...r.size].map((n,i)=>hex(Math.round(n*20)+(i<2?2048:0),3)).join('')+
  r.rotation.map(x=>hex(Math.round(x*10)+1800,3)).join('')+r.colour.map(n=>hex(n,2)).join('');
const lua=v=>Array.isArray(v)?'{'+v.map(lua).join(',')+'}':typeof v==='object'?'{'+Object.entries(v).map(([k,x])=>'['+JSON.stringify(k)+']='+lua(x)).join(',')+'}':typeof v==='string'?JSON.stringify(v):String(v);
for(const [cardId,hash] of Object.entries(codes)){
 const text=readFileSync(join(geometryDir,cardId+'-geometry.json'),'utf8');assert.equal(sha(text),hash);
 const d=JSON.parse(text),slots=[];
 for(const s of d.controls){
  assert.equal(s.cost,1);assert(!('mask' in s||'fill' in s||'pivot' in s||'scale' in s));
  const common={anchorMin:center,anchorMax:center,pivot:center,scale:[1,1],imageType:'basic',colour:col(s)};
  if(s.type==='rect'){
    const [x,y,w,h]=s.box;
    slots.push({...common,image:100001,position:[x+w/2-72,32-y-h/2],size:[w,h],rotation:zero});continue;
  }
  assert.equal(s.type,'nativeTriangle');
  const {cx,cy,w,h,rx,ry,rz}=s.placement;
  slots.push({...common,image:100003,position:[cx-72,cy-32],size:[w,h],rotation:[rx,ry,rz]});
 }
 assert.equal(slots.length,d.nativeImages);
 rows[cardId]={cardId,runtime:true,capacity:32,slots,luaSha256:hash,precisionPacked:slots.map(encode).join(''),precisionEncoding:'axes3-decideg-hex30'};
}
writeFileSync(output,'return '+lua(rows)+'\n');
