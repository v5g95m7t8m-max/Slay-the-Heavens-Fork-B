import {releaseDelivery677Source,assertReleaseDelivery677Current} from './release-delivery-677-source.mjs';
// CI-only complete bootstrap continuation. No gameplay source or production projector.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./release-bootstrap-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'868f4e717b4ebe7af6a77b8bf6239748629d6d11b6de6e15af9f0e668a3971d6','complete Release bootstrap CI continuation');
const packet=JSON.parse(gunzipSync(bytes));
assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
assert.equal(packet.baseCommit,'36b9b157ee6f05b65eb9f1da7e2978647d36c210');
assert.equal(packet.bootstrapPredecessorCommit,'c2409ad750c15124b7b843c6bbfa5b222537cb75');
assert.equal(packet.currentCommit,packet.baseCommit);
assert.equal(packet.currentTreeCommitted,false,'auxiliary after bindings are a worktree capture, not claimed in bootstrap');
const bootstrap=['.github/workflows/licenses.yml','.github/workflows/quality.yml','.github/workflows/quick-feedback.yml'];
assert.deepEqual(Object.keys(packet.files).filter(p=>p.startsWith('.github/')).sort(),bootstrap);
assert.deepEqual(packet.currentInventory,packet.priorInventory,'bootstrap changes no test discovery');
for(const [path,row]of Object.entries(packet.files)){
 assert.equal(row.beforeCommit,bootstrap.includes(path)?packet.bootstrapPredecessorCommit:packet.baseCommit,'exact bootstrap CI predecessor: '+path);
 for(const binding of [row.before,row.current]){
  assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
 }
}
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const releaseBootstrapCiPacket=freeze(packet);
function historicalSource(path,source){
 source=releaseDelivery677Source(path,source);
 if(path==='.github/workflows/quick-feedback.yml'&&typeof source==='string'&&!source.includes('\r\r\n')&&['ec23dcec59adc0a6de7a1f1ba30304e6e6e3b0262fdc369b1fdb533b4f4c9800','7eb601d4859afe2aa6331608e544205d94a3c8fdd1d864c351fdc92cad24b5f9'].includes(hash(norm(source)))){
  const prior=norm(source).replace("      - name: Verify affected Release CI contracts explicitly\n        env:\n          BASE_SHA: ${{ github.event.pull_request.base.sha || inputs.base_sha }}\n        run: |\n          node --input-type=module <<'NODE'\n          import {execFileSync} from 'node:child_process';\n          const base=process.env.BASE_SHA;\n          if(!/^[0-9a-f]{40}$/.test(base||''))throw new Error('exact comparison base required');\n          const changed=execFileSync('git',['diff','--name-only','-z',base,'HEAD'],{encoding:'utf8'}).split('\\0');\n          const contracts=new Set(['.github/workflows/quick-feedback.yml','scripts/release-ci.mjs','tests/helpers/release-ci.cases.mjs','tests/helpers/release-bootstrap-ci-source.mjs']);\n          if(changed.some(path=>contracts.has(path))){\n            console.log('Executing affected Release CI contracts: ci-impact and ci-summary-runners');\n            execFileSync(process.execPath,['--test','tests/ci-impact.test.mjs','tests/ci-summary-runners.test.mjs'],{stdio:'inherit'});\n          }else console.log('No Release CI contract changes');\n          NODE\n",'').replace("    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.draft == true\n",'');
  return hash(prior)===packet.files[path].current.sha256?prior:source;
 }

 if(path==='tests/ci-complete-calibration.test.mjs'&&typeof source==='string'&&hash(norm(source))==='12241fe7c9ba344aa6fc4179ae8178736fb2cd94d43332f315c8c2c4ecb72247')return packet.files[path].current.source;
 if(path!=='.github/workflows/quality.yml'||typeof source!=='string')return source;
 const eol=source.includes('\r\n')?'\r\n':'\n';
 const block=["      - name: Require frozen Release Full before publication",
  "        if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'master' && startsWith(github.event.pull_request.head.ref, 'release/')",
  '        env:', '          GH_TOKEN: ${{ github.token }}', '        run: node scripts/release-ci.mjs verify-pr', ''].join(eol);
 const push='  push:'+eol+'    branches: [develop, master]'+eol;
 if(source.split(block).length!==2||source.split(push).length!==2)return source;
 const prior=source.replace(block,'').replace(push,'  push:'+eol+"    branches: [develop, master, 'release/**']"+eol);
 return hash(norm(prior))===packet.files[path].current.sha256?prior:source;
}
function checkedSource(path,source,before){
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(before&&(!row||row.before.sha256!==before.sha256))return releaseDelivery677Source(path,source,before);
 source=historicalSource(path,source);
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 if(before&&row.before.sha256!==before.sha256)return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
export const releaseBootstrapCiCheckedSource=checkedSource;
export function releaseBootstrapCiSource(path,source,before){
 if(path==='tests/helpers/draft-quality-workflow.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')&&hash(norm(source))==='357ad5c4d68378063b02cf75396f804c8c2b61d12a925595663a4b533948e4e6'){
  if(before&&before.sha256!=='5c3cc95c0371927db143c573c1500843b97ca8e138f67737aede03e558b1d986')return source;
  const prior=norm(source).replace("import {beforeReleaseFullGate} from './release-ci-workflow.mjs';\n",'').replace('  text = beforeReleaseFullGate(text);\n','');
  assert.equal(hash(prior),'5c3cc95c0371927db143c573c1500843b97ca8e138f67737aede03e558b1d986','complete pre-Release draft helper');
  return prior;
 }

 if(path==='tests/ci-impact.test.mjs'&&typeof source==='string'){
  const prior=norm(source).replace(/\nimport '\.\/helpers\/release-ci\.cases\.mjs';\n$/, '\n');
  if(hash(prior)==='bc325f953a1a8d6b44b24e7d7481e174386df3a5a102dc78581d19397dd0d602')source=prior;
 }
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 return checkedSource(path,source,before);
}
export function releaseBootstrapCiRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8'),prior=releaseBootstrapCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function releaseBootstrapWorkflowBefore(path,source){
 source=historicalSource(path,source);
 if(path==='.github/workflows/quality.yml'&&typeof source==='string'){
  const eol=source.includes('\r\n')?'\r\n':'\n';
  const block=["      - name: Require frozen Release Full before publication",
   "        if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'master' && startsWith(github.event.pull_request.head.ref, 'release/')",
   '        env:', '          GH_TOKEN: ${{ github.token }}', '        run: node scripts/release-ci.mjs verify-pr', ''].join(eol);
  const push='  push:'+eol+'    branches: [develop, master]'+eol;
  if(source.split(block).length===2&&source.split(push).length===2)
   source=source.replace(block,'').replace(push,'  push:'+eol+"    branches: [develop, master, 'release/**']"+eol);
 }
 assert(bootstrap.includes(path),'explicit complete bootstrap workflow');
 const row=packet.files[path];
 assert.equal(typeof source,'string');assert(!source.includes('\r\r\n'));
 assert.equal(hash(norm(source)),row.current.sha256,'fresh complete Release bootstrap workflow: '+path);
 return row.before.source;
}
export function assertReleaseBootstrapRawInventory(paths,kind='js'){
 assert(['js','lua'].includes(kind));
 assert.deepEqual([...paths].sort(),packet.currentInventory[kind],'complete Release bootstrap raw discovery inventory');
}
export function assertReleaseBootstrapCiCurrent(read=readFileSync){
 assertReleaseDelivery677Current(read);
 for(const [path,row]of Object.entries(packet.files))
  assert.equal(hash(norm(historicalSource(path,read(path,'utf8')))),row.current.sha256,'fresh complete integration source: bootstrap '+path);
 for(const [path,sha]of Object.entries(packet.immutableArchives))
  assert.equal(hash(read(path)),sha,'retained complete immutable bootstrap predecessor: '+path);
}
