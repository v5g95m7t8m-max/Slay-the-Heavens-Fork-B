import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {loadNativeUiEncoder} from '../../scripts/native-ui-encoder.mjs';
import {embeddedScripts} from '../../scripts/native-script-inventory.mjs';

const [receiptArg,outArg]=process.argv.slice(2);
const tool=process.env.MILIASTRA_MCP_ROOT;
assert(tool&&receiptArg&&outArg,'Set MILIASTRA_MCP_ROOT and pass <candidate.json> <new output>');
const receiptPath=resolve(receiptArg),out=resolve(outArg),root=process.cwd(),pinned=join(out,'readback');
const receipt=JSON.parse(readFileSync(receiptPath)),mapPath=receipt.candidate.path;
const sha=raw=>createHash('sha256').update(raw).digest('hex');
assert.equal(sha(readFileSync(mapPath)),receipt.candidate.sha256);
const {native}=await loadNativeUiEncoder(tool);
const wire=await import(pathToFileURL(join(tool,'src/scene/wire.mjs')));
const ui=native.getClientUi({mapPath,ui:'SlayTheAbyss'});
const scripts=embeddedScripts({mapPath,includeSource:true},wire);
for(const row of scripts.scripts) assert.equal(sha(row.source),receipt.moduleDigests[row.name],row.name);
mkdirSync(out);
mkdirSync(pinned);
const write=(name,value)=>writeFileSync(join(pinned,name+'.json'),JSON.stringify(value));
write('ui',ui);write('scripts',scripts);
write('readback-receipt',{ok:true,sourceCommit:receipt.sourceCommit,candidate:{sha256Before:receipt.candidate.sha256}});
const names=new Set(['AbyssDeckCard','AbyssMonsterActor','AbyssMonsterPower','AbyssReadyCardGroup',
  'PrecisionShared0','PrecisionShared1',...receipt.templates.map(t=>t.name)]);
function visit(node) {
  for(const key of ['itemTemplate','template']) if(node[key]) names.add(node[key]);
  for(const child of node.children??node.controls??[]) visit(child);
}
visit(ui.interface);
for(const name of names) {
  const result=native.getClientUi({mapPath,template:name});
  visit(result.template);write(name,result);
}
// Reuse the archived native→Simulator projection, with this candidate's inputs.
const archived=new URL('../../docs/evidence/battle-piles-final-20261111/readback-adapter.mjs.gz',import.meta.url);
const code=gunzipSync(readFileSync(archived));
assert.equal(sha(code),'34d98b2861b2da7bd50f55df8d47cd6b9b93412d048060dc43c3718348c9d61d');
const adapter=code.toString('utf8')
  .replace(/const root=.*?out=.*?;/,`const root=${JSON.stringify(root)},out=${JSON.stringify(out)};`)
  .replace(/const pinned=.*?;/,`const pinned=${JSON.stringify(pinned)};`)
  .replace(/const candidatePath=.*?;/,`const candidatePath=${JSON.stringify(receiptPath)};`)
  .replace(/'D:\/MiliastraTools\/genshin-miliastra-mcp\/([^']+)'/g,(_,rel)=>JSON.stringify(join(tool,rel)))
  .replaceAll('templateRecords.length!==6',`templateRecords.length!==${names.size}`)
  .replaceAll('.size!==6',`.size!==${names.size}`)
  .replace('PR588 official assets f9ced550 actual GIL','Card art precision probe')
  .replace('pr588.actual.save.json','precision-lab.save.json')
  .replace("if(original.text[field]!==undefined&&", "if((field!=='minFontSize'||original.text.autoSize===true)&&original.text[field]!==undefined&&");
const adapterPath=join(out,'adapter.mjs');
writeFileSync(adapterPath,adapter);
await import(pathToFileURL(adapterPath));
const evidence=JSON.parse(readFileSync(join(out,'adapter-receipt.json')));
assert.equal(evidence.inverseReadback.faults.length,0,JSON.stringify(evidence.inverseReadback.faults.slice(0,10)));
