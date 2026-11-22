import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {styleEvent} from '../scripts/v25-node-layout.mjs';

const children=n=>n.children??n.controls??[];
const find=(n,name)=>n.name===name?n:children(n).map(c=>find(c,name)).find(Boolean);
const child=(n,name)=>children(n).find(c=>c.name===name);

test('shared event corner masks clip the complete option chrome before live copy and input',()=>{
 const theme=v25Theme(nativeTheme),layout=nodeLayout(theme),event=find(layout,'eventView');
 const hits=Array.from({length:4},(_,i)=>child(child(event,'option'+(i+1)),'hit'));
 styleEvent(event,theme);
 for(let i=1;i<=4;i++){
  const row=child(event,'option'+i),parts=children(row),chrome=child(row,'v25StateChrome');
  const masks=parts.filter(n=>/^v25Corner[01]_[01]$/.test(n.name));
  assert.equal(masks.length,4,'all ordinary event options retain the same four corner masks');
  assert.deepEqual(row.size,theme.layout.nativeNode.event.options.size);
  assert.equal(child(row,'hit'),hits[i-1],'corner repair cannot replace the input owner');
  assert.deepEqual(child(row,'hit').size,row.size,'corner repair cannot shrink native input');
  assert.deepEqual(child(chrome,'topStitch').size,[row.size[0]-8,2],'the shared rim geometry is retained');
  assert.deepEqual(child(chrome,'topStitch').position,[0,row.size[1]/2-2]);
  assert.equal(child(chrome,'lowerRim').opacity,0);
  const chromeIndex=parts.indexOf(chrome);
  for(const mask of masks){
   assert(parts.indexOf(mask)>chromeIndex,'top rim must be behind the corner mask, not redrawn over its cut');
   for(const name of ['title','description','hit'])assert(parts.indexOf(mask)<parts.indexOf(child(row,name)),'clip only decoration, preserving live text/input order');
   assert.equal(mask.image,100003);
   assert.deepEqual(mask.size,[42,22]);
   assert.deepEqual(mask.fill,{shape:'horizontal',from:'right',amount:.5});
  }
 }
});

test('official event choices use one responsive rim and fill beneath intact copy and input',()=>{
 const theme=officialAssetsTheme(nativeTheme),event=find(nodeLayout(theme),'eventView');
 const first=child(event,'option1'),hit=child(first,'hit'),title=child(first,'title');
 styleEvent(event,theme);
 assert.strictEqual(child(first,'hit'),hit);
 assert.strictEqual(child(first,'title'),title);
 for(let i=1;i<=4;i++){
  const row=child(event,'option'+i),material=child(row,'roundedButton'),parts=children(row);
  assert.deepEqual(row.size,[700,44]);
  assert.deepEqual(child(row,'hit').size,row.size);
  assert(!parts.some(part=>part.name.startsWith('v25Corner')));
  assert.equal(child(row,'border').visible,false);
  for(const name of ['title','description','hit'])assert(parts.indexOf(material)<parts.indexOf(child(row,name)),'material stays behind live '+name);
  assert.deepEqual(material.anchor,{min:[0,0],max:[1,1]});
  assert.deepEqual(child(material,'cloth').size,[-4,-4]);
  assert.deepEqual(children(material).map(layer=>layer.name),['rim','cloth']);
  for(const layer of children(material)){
   const layerParts=children(layer);
   assert.deepEqual(layerParts.map(part=>part.name).sort(),
    ['corner-1_-1','corner-1_1','corner1_-1','corner1_1','horizontal','vertical']);
   for(const part of layerParts){
    assert.equal(part.image,part.name.startsWith('corner')?theme.image.disc:theme.image.rect,layer.name+'/'+part.name);
    assert.equal(part.raycastTarget,false);
   }
  }
 }
});
