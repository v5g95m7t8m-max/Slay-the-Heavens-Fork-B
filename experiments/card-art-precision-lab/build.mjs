import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {copyFileSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {attachReadyCardHosts,readyArtTemplates} from '../../scripts/art/ready-card-runtime.mjs';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {runNativeClientCheck} from '../../scripts/native-client-check.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';
import {writeScriptBatch} from '../../scripts/native-script-batch.mjs';
import {nativeUiVariables} from '../../scripts/native-candidate-scripts.mjs';
import {cardIds,hashPrecision,legacySlots,nativeTemplate,tiers} from './probes.mjs';
import {patchRuntime,patchUi} from './candidate-patch.mjs';
import {batchSizes,batchTemplate,encodeRow,patchPackedRuntime,patchPackedUi,patchPackedPresentation} from './packed.mjs';

const [baseArg,outArg,budgetArg='160',profile='comparison']=process.argv.slice(2);
const budget=Number(budgetArg), tool=process.env.MILIASTRA_MCP_ROOT;
assert(baseArg&&outArg&&tool&&tiers.includes(budget),'Set MILIASTRA_MCP_ROOT and pass <candidate.json> <new output> <60|100|160|250|400>');
assert(['comparison','packed75'].includes(profile),'invalid art candidate profile');
assert(process.env.MILIASTRA_ALLOW_LIVE_WRITE==='0','Use an isolated copy');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const file=path=>({path,sha256:sha(readFileSync(path)),bytes:statSync(path).size});
const base=JSON.parse(readFileSync(baseArg));
assert.equal(file(base.candidate.path).sha256,base.candidate.sha256);
assert.equal(base.statuses.staticCheck,'pass');
assert.equal(base.artFeatures.flags.cards,false);
const out=resolve(outArg);
mkdirSync(out);
let mapPath=join(out,'baseline-copy.gil');
copyFileSync(base.candidate.path,mapPath);

const {native,identity}=await loadNativeUiEncoder(tool);
const wire=await import(pathToFileURL(join(tool,'src/scene/wire.mjs')));
const {luaSyntaxError}=await import(pathToFileURL(join(tool,'src/client-check.mjs')));
const ui=native.getClientUi({mapPath,ui:'SlayTheAbyss'}).interface;
const hosts=attachReadyCardHosts(ui);
assert(hosts.length>=10);
const deck=native.getClientUi({mapPath,template:'AbyssDeckCard'}).template;
assert.equal(attachReadyCardHosts(deck).length,1);
const templates=[];
function addTemplate(template, replace=false) {
  const result=native.addClientTemplate({mapPath,...template,replace,outputName:template.name},out);
  assert(Number.isSafeInteger(result.templateIndex)&&result.templateIndex>0);
  mapPath=result.mapPath;
  const readback=native.getClientUi({mapPath,template:template.name});
  assert.equal(readback.templateIndex,result.templateIndex);
  return result.templateIndex;
}
addTemplate(deck,true);
const [imageTemplateIndex,containerTemplateIndex]=readyArtTemplates().map((t,i)=>addTemplate({...t,name:'PrecisionShared'+i}));
const packed={},slots={},packedTemplates={};
let uniqueDrawings;
if(profile==='packed75'){
  for(const size of batchSizes){
    const template=batchTemplate(size),startBytes=statSync(mapPath).size;
    const templateIndex=addTemplate(template);
    const readback=native.getClientUi({mapPath,template:template.name}).template;
    assert.equal(readback.children.length,size);
    assert.deepEqual(readback.children.map(c=>c.name),template.children.map(c=>c.name));
    packedTemplates[size]=templateIndex;
    templates.push({name:template.name,templateIndex,images:size,containers:1,rawGilDelta:statSync(mapPath).size-startBytes});
  }
  const warrior=JSON.parse(readFileSync('data/reference/warrior75.json')).cards.map(card=>card.id);
  assert.equal(new Set(warrior).size,75);
  const ids=[...cardIds,...warrior.filter(id=>!cardIds.includes(id))];
  assert.equal(ids.length,75);
  for(const [i,id] of ids.entries()) packed[id]={cardId:id,runtime:true,precisionPacked:hashPrecision(budget,i).map(encodeRow).join('')};
  uniqueDrawings=new Set(Object.values(packed).map(d=>d.precisionPacked)).size;
  assert.equal(uniqueDrawings,75);
} else for (const [i,id] of cardIds.entries()) {
  const name='PrecisionArt'+i, rows=hashPrecision(budget,i);
  const template=nativeTemplate(name,rows);
  const startBytes=statSync(mapPath).size;
  const templateIndex=addTemplate(template);
  const readback=native.getClientUi({mapPath,template:name}).template;
  assert.deepEqual(readback.children.map(g=>g.children.length),template.children.map(g=>g.children.length));
  assert.deepEqual(readback.children.flatMap(g=>g.children.map(c=>c.image)),rows.map(r=>r[0]));
  templates.push({id,name,templateIndex,images:budget,containers:1+template.children.length,rawGilDelta:statSync(mapPath).size-startBytes});
  packed[id]={cardId:id,runtime:true,precisionTemplateIndex:templateIndex,precisionCount:budget};
  slots[id]={cardId:id,runtime:true,slots:legacySlots(rows)};
}
const original=embeddedScripts({mapPath,includeSource:true},wire).scripts;
const scripts=new Map(original.map(r=>[r.name,r.source]));
const buildId=randomUUID();
const lua=value=>'return '+toLua(value)+'\n';
const updated=profile==='packed75'?{
  abyss_ui:patchPackedUi(scripts.get('abyss_ui'),buildId),
  abyss_card_art_runtime:patchPackedRuntime(scripts.get('abyss_card_art_runtime'),readFileSync(new URL('packed-runtime.lua',import.meta.url),'utf8')),
  abyss_precision_binding:lua({imageTemplateIndex,containerTemplateIndex,packedTemplates}),
  abyss_precision_packed:lua(packed),
  abyss_character_presentation:patchPackedPresentation(scripts.get('abyss_character_presentation')),
}:{
  abyss_ui:patchUi(scripts.get('abyss_ui'),buildId),
  abyss_card_art_runtime:patchRuntime(scripts.get('abyss_card_art_runtime')),
  abyss_precision_binding:lua({imageTemplateIndex,containerTemplateIndex}),
  abyss_precision_prefabs:lua(packed),
  abyss_precision_slots:lua(slots),
};
const variables=[...nativeUiVariables(),{name:'precisionLabMode',type:'integer',value:0,public:true}];
mapPath=writeScriptBatch(mapPath,Object.entries(updated).map(([name,source])=>({name,source,
  ...(name==='abyss_ui'?{variables}:{})})),out,{...wire,clientScriptRecord:native.clientScriptRecord,luaSyntaxError});
mapPath=native.addClientUi({...ui,mapPath,replace:true,outputName:'precision-lab'},out).mapPath;
const check=runNativeClientCheck({mapPath},tool);
writeFileSync(join(out,'static-check.json'),JSON.stringify(check,null,2)+'\n');
assert(check.ok,'Client static validation failed');
for (const [name,value] of Object.entries(updated)) scripts.set(name,value);
const actual=embeddedScripts({mapPath,includeSource:true},wire).scripts;
assert.equal(actual.length,scripts.size);
for(const row of actual) assert.equal(row.source,scripts.get(row.name),row.name);
const candidatePath=join(out,'precision-lab.gil');
copyFileSync(mapPath,candidatePath);
assert.equal(file(base.candidate.path).sha256,base.candidate.sha256);
const result={buildId,sourceCommit:base.sourceCommit,sourceDirty:base.sourceDirty,base:base.candidate,
  candidate:file(candidatePath),budget,clientTool:identity,hostCount:hosts.length+1,templates,
  profile,mode:profile==='packed75'?{default:0,off:0,packed:3}:{default:0,off:0,legacy:1,prefab:2},
  nativeSlotBytes:Buffer.byteLength(updated.abyss_precision_slots??''),
  prefabBindingBytes:Buffer.byteLength(updated.abyss_precision_prefabs??''),
  packedAssetCount:uniqueDrawings,packedLuaBytes:Buffer.byteLength(updated.abyss_precision_packed??''),
  experimentBuildFiles:Object.fromEntries(['build.mjs','candidate-patch.mjs','probes.mjs','packed.mjs','packed-runtime.lua','ownership.mjs'].map(name=>[name,sha(readFileSync(new URL(name,import.meta.url)))])),
  geometryJsonBytes:Buffer.byteLength(JSON.stringify(cardIds.map((_,i)=>hashPrecision(budget,i)))),
  moduleDigests:Object.fromEntries(actual.map(s=>[s.name,sha(s.source)])),
  changed:Object.keys(updated),staticCheck:'PASS',officialImport:'UNVERIFIED',device:'UNVERIFIED'};
writeFileSync(join(out,'candidate.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({candidate:result.candidate,base:result.base,budget,hostCount:result.hostCount}));
