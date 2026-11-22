import assert from 'node:assert/strict';
import {patchUi,replaceOnce} from './candidate-patch.mjs';
import {patchControlOwnership} from './ownership.mjs';
import {readyArtTemplates} from '../../scripts/art/ready-card-runtime.mjs';

export const batchSizes=[60,10,1];

function hex(value,digits){
  assert(Number.isInteger(value)&&value>=0&&value<16**digits,'precision field overflow');
  return value.toString(16).padStart(digits,'0');
}

export function encodeRow([image,x,y,w,h,z,...rgba]){
  assert([100001,100002,100003].includes(image)&&w>0&&h>0&&rgba.length===4);
  return hex(image-100000,1)+[x,y,w,h].map((v,i)=>{
    const step=Math.round(v*20);
    assert(Math.abs(step/20-v)<1e-7,'geometry is not on the 0.05 px grid');
    return hex(step+(i<2?2048:0),3);
  }).join('')+hex(z+180,3)+rgba.map(v=>hex(v,2)).join('');
}

export function batchTemplate(size) {
  assert(batchSizes.includes(size));
  const [image,group]=readyArtTemplates();
  return {...group,name:'PrecisionBatch'+size,visible:true,
    children:Array.from({length:size},(_,i)=>({...image,name:'row'+(i+1),visible:true}))};
}

export function patchPackedUi(source,buildId) {
  let result=patchUi(source,buildId);
  result=replaceOnce(result,"        if mode==1 or mode==2 then","        if mode==3 then");
  result=replaceOnce(result,"            cardArt = optionalArt('cards', function()\n                local binding=require('abyss_precision_binding')",
    "            cardArt = optionalArt('precision', function()\n                local binding=require('abyss_precision_binding')");
  result=replaceOnce(result,"                local assets\n                if mode==1 then assets=require('abyss_precision_slots') else assets=require('abyss_precision_prefabs') end",
    "                local assets=require('abyss_precision_packed')");
  result=replaceOnce(result,"imageTemplateIndex=binding.imageTemplateIndex,containerTemplateIndex=binding.containerTemplateIndex})\n                return runtime\n            end)\n        elseif",
    "imageTemplateIndex=binding.imageTemplateIndex,containerTemplateIndex=binding.containerTemplateIndex,\n                    packedTemplates=binding.packedTemplates})\n                return runtime\n            end)\n        elseif");
  return replaceOnce(result,"    if not ready then return false,reason,'card:'..tostring(cursor) end",
    "    if not ready and (script:GetParam('precisionLabMode') or 0)~=3 then return false,reason,'card:'..tostring(cursor) end");
}

export function patchPackedRuntime(source,packedLua) {
  let result=replaceOnce(source,"    if metadata.rectangles~=nil then",`    if type(metadata.precisionPacked)=='string' then
        local bytes=metadata.precisionPacked
        if #bytes>=24 and #bytes<=400*24 and #bytes%24==0 and not bytes:find('[^%x]') then
            result={packed=bytes,count=#bytes/24}
        end
    elseif metadata.rectangles~=nil then`);
  result=replaceOnce(result,"        instantiate=api.instantiate,imageTemplateIndex=api.imageTemplateIndex,containerTemplateIndex=api.containerTemplateIndex}",
    "        instantiate=api.instantiate,imageTemplateIndex=api.imageTemplateIndex,containerTemplateIndex=api.containerTemplateIndex,\n        packedTemplates=api.packedTemplates,cursor=1}");
  result=replaceOnce(result,"local function advance(record)\n    check(record)",packedLua+`
local function advance(record,size)
    check(record)
    if record.drawing.packed then
        advancePacked(record,size)
        return
    end`);
  result=replaceOnce(result,"                if record.allocated and eligible(record) and createdLastUpdate<MAX_CREATES then\n                    createdLastUpdate=createdLastUpdate+1;progressed=true\n                    work(record,function()advance(record)end)",`                local size=record.drawing.packed and packedBatchSize(record) or 0
                local cost=size+1
                if record.allocated and eligible(record) and createdLastUpdate+cost<=MAX_CREATES then
                    createdLastUpdate=createdLastUpdate+cost;progressed=true
                    work(record,function()advance(record,size)end)`);
  return patchControlOwnership(result);
}

export function patchPackedPresentation(source) {
  return replaceOnce(source,'        current.id=card.id',`        local art=existing[card.id] and existing[card.id].nativeArt
        if art and art.cardId==card.id and type(art.precisionPacked)=='string'then current.nativeArt=art end
        current.id=card.id`);
}
