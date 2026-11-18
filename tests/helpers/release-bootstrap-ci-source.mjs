// CI-only complete bootstrap continuation. No gameplay source or production projector.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const bytes=readFileSync(new URL('./release-bootstrap-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'868f4e717b4ebe7af6a77b8bf6239748629d6d11b6de6e15af9f0e668a3971d6','complete Release bootstrap CI continuation');
// Append an exact CI-only current view. The old bootstrap/integration archives
// and their hashes stay immutable; production code never imports this helper.
const capacityBytes=readFileSync(new URL('./task111-capacity-ci-source.json',import.meta.url));
assert.equal(hash(capacityBytes),'b30875912d25e3adcd6cd83a0c71c5c5c1d97f9a219c20f7094d667c2f584108','complete TASK-111 CI continuation');
const capacity=JSON.parse(capacityBytes);
assert.equal(capacity.schemaVersion,1);assert.equal(capacity.normalization,'LF');
assert.equal(capacity.baseCommit,'1cc5479b713edab6fd26db4e20f8eb22b7401cb2');
assert.equal(capacity.productionCommit,'be5466c1a35f78b660c3c7e712b714c98af0ce24');
assert.equal(capacity.currentTreeCommitted,false,'CI/test bindings are a capture after the production freeze');
assert.deepEqual(Object.keys(capacity.files),['scripts/official-portraits.mjs','scripts/platform-load.mjs','tests/official-portraits-build.test.mjs','tests/platform-load.test.mjs','tests/v25-portrait-profile.test.mjs']);
for(const [path,row]of Object.entries(capacity.files))for(const binding of [row.before,row.current]){
 assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
}
// Review correction is a new exact outer view; committed predecessor packets remain immutable.
const reviewBytes=readFileSync(new URL('./task111-capacity-review-ci-source.json',import.meta.url));
assert.equal(hash(reviewBytes),'6be10ce258d1d6654f91c01047bf442bf4b9cc7e2eafcf5137b3565ef832f325','complete TASK-111 review CI continuation');
const review=JSON.parse(reviewBytes);
assert.equal(review.schemaVersion,1);assert.equal(review.normalization,'LF');
assert.equal(review.baseCommit,'7d62a227af187c2df7edf4941adb8fb30cf708b6');
assert.equal(review.sourceComment,'https://github.com/FurinyaWorks/Slay-the-Heavens/pull/703#issuecomment-6905101000');
assert.equal(review.currentTreeCommitted,false);
assert.deepEqual(Object.keys(review.files),['scripts/art/ready-card-runtime.mjs','scripts/build-ui.mjs','scripts/platform-load.mjs','tests/build-ui-input-protection.test.mjs','tests/platform-load.test.mjs']);
for(const [path,row]of Object.entries(review.files)){
 for(const binding of [row.before,row.current]){
  assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
 }
 if(capacity.files[path])assert.deepEqual(row.before,capacity.files[path].current,'retained TASK-111 predecessor: '+path);
}
// Default production reduction is an additional complete outer source view.
// Its predecessors and their source/measurement claims remain immutable.
const reductionBytes=readFileSync(new URL('./task111-default-reduction-ci-source.json.gz',import.meta.url));
assert.equal(hash(reductionBytes),'580a5b94a1235e3b849d2a8ca47ae12d3a7f89fa0e7a4f1617d09d58a1be0ada','complete TASK-111 default reduction CI continuation');
const reduction=JSON.parse(gunzipSync(reductionBytes));
assert.equal(reduction.schemaVersion,1);assert.equal(reduction.normalization,'LF');
assert.equal(reduction.baseCommit,'396b55757a9e536b052f6c960daf1159351f57b1');assert.equal(reduction.currentTreeCommitted,false);
assert.deepEqual(Object.keys(reduction.files),['scripts/audit-native-candidate.mjs','scripts/build-native-candidate.mjs','scripts/official-portraits.mjs','tests/helpers/native-toolchain-fixture.mjs','tests/lowpoly-select-flags.test.mjs','tests/native-candidate-art.test.mjs','tests/native-candidate-audit.test.mjs','tests/native-candidate.test.mjs','tests/native-monster-actor-template.test.mjs','tests/official-background-candidate.test.mjs','tests/official-portraits-build.test.mjs']);
assert.deepEqual(Object.keys(reduction.addedFiles),['scripts/native-ui-card-sharing.mjs']);
for(const [path,row]of Object.entries({...reduction.files,...reduction.addedFiles})){
 for(const binding of [row.before,row.current].filter(Boolean)){
  assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
 }
 if(reduction.files[path]){
  const prior=review.files[path]?.current??capacity.files[path]?.current;
  if(prior)assert.deepEqual(row.before,prior,'retained TASK-111 predecessor: '+path);
 }else assert.equal(row.before,null,'new source has no invented predecessor');
}
// Receipt propagation fixes are a new leaf; the frozen production packet stays intact.
const audioBytes=readFileSync(new URL('./task111-default-audio-ci-source.json.gz',import.meta.url));
assert.equal(hash(audioBytes),'9cbd6377f119df375beedda9077d7ce5ee63fe803c0ee8ccbd90fcc20bd8fba8','complete TASK-111 audio handoff CI continuation');
const audio=JSON.parse(gunzipSync(audioBytes));
assert.equal(audio.schemaVersion,1);assert.equal(audio.normalization,'LF');
assert.equal(audio.baseCommit,'d46bf7aa9a27e0a47528412d7f0ad8fd7e2cbf2b');assert.equal(audio.currentTreeCommitted,false);
assert.deepEqual(Object.keys(audio.files),['scripts/build-native-audio-game.mjs','scripts/build-native-bgm-candidate.mjs','tests/native-bgm-build-provenance.test.mjs','tests/native-candidate-art.test.mjs','tests/native-candidate.test.mjs']);
for(const [path,row]of Object.entries(audio.files)){
 for(const binding of [row.before,row.current]){
  assert.equal(binding.source,norm(binding.source),path);assert.equal(hash(binding.source),binding.sha256,path);
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,path);
 }
 if(reduction.files[path])assert.deepEqual(row.before,reduction.files[path].current,'retained production freeze: '+path);
}
function audioBefore(path,source){
 const row=Object.hasOwn(audio.files,path)?audio.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
function reductionBefore(path,source){
 source=audioBefore(path,source);
 const row=Object.hasOwn(reduction.files,path)?reduction.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
function reviewBefore(path,source){
 source=reductionBefore(path,source);
 const row=Object.hasOwn(review.files,path)?review.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
function capacityBefore(path,source,before){
 source=reviewBefore(path,source);
 const row=Object.hasOwn(capacity.files,path)?capacity.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||before&&row.before.sha256!==before.sha256)return source;
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
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
function beforeQuickFeedbackAdvisory(path,source){
 if(path!=='.github/workflows/quick-feedback.yml'||typeof source!=='string'||source.includes('\r\r\n')||hash(norm(source))!=='7eb601d4859afe2aa6331608e544205d94a3c8fdd1d864c351fdc92cad24b5f9')return source;
 const prior=norm(source).replace("      - name: Verify affected Release CI contracts explicitly\n        env:\n          BASE_SHA: ${{ github.event.pull_request.base.sha || inputs.base_sha }}\n        run: |\n          node --input-type=module <<'NODE'\n          import {execFileSync} from 'node:child_process';\n          const base=process.env.BASE_SHA;\n          if(!/^[0-9a-f]{40}$/.test(base||''))throw new Error('exact comparison base required');\n          const changed=execFileSync('git',['diff','--name-only','-z',base,'HEAD'],{encoding:'utf8'}).split('\\0');\n          const contracts=new Set(['.github/workflows/quick-feedback.yml','scripts/release-ci.mjs','tests/helpers/release-ci.cases.mjs','tests/helpers/release-bootstrap-ci-source.mjs']);\n          if(changed.some(path=>contracts.has(path))){\n            console.log('Executing affected Release CI contracts: ci-impact and ci-summary-runners');\n            execFileSync(process.execPath,['--test','tests/ci-impact.test.mjs','tests/ci-summary-runners.test.mjs'],{stdio:'inherit'});\n          }else console.log('No Release CI contract changes');\n          NODE\n",'').replace("    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.draft == true\n",'');
 return hash(prior)===packet.files[path].current.sha256?prior:source;
}
export const capacityCiPacket=freeze(capacity);
export const capacityReviewCiPacket=freeze(review);
export const defaultReductionCiPacket=freeze(reduction);
export const defaultReductionAudioCiPacket=freeze(audio);
function checkedSource(path,source,before){
 source=capacityBefore(path,source,before);
 const row=Object.hasOwn(packet.files,path)?packet.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n'))return source;
 if(before&&row.before.sha256!==before.sha256)return source;
 source=beforeQuickFeedbackAdvisory(path,source);
 return hash(norm(source))===row.current.sha256?row.before.source:source;
}
export const releaseBootstrapCiCheckedSource=checkedSource;
export function releaseBootstrapCiSource(path,source,before){
 if(path.startsWith('src/')||path==='config/architecture.json')return source;
 return checkedSource(path,source,before);
}
export function releaseBootstrapCiRead(read=readFileSync){return(path,encoding)=>{
 const raw=read(path,encoding),text=typeof raw==='string'?raw:raw.toString('utf8'),prior=releaseBootstrapCiSource(path,text);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
export function releaseBootstrapWorkflowBefore(path,source){
 source=beforeQuickFeedbackAdvisory(path,source);
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
export function assertCapacityOwnersCurrent(read=readFileSync){
 for(const [path,row]of Object.entries(audio.files))
  assert.equal(hash(norm(read(path,'utf8'))),row.current.sha256,'fresh complete TASK-111 CI source: audio handoff / fresh complete integration source: '+path);
 for(const [path,row]of Object.entries({...reduction.files,...reduction.addedFiles}))
  assert.equal(hash(norm(audioBefore(path,read(path,'utf8')))),row.current.sha256,'fresh complete TASK-111 CI source: default reduction / fresh complete integration source: '+path);
 for(const [path,row]of Object.entries(review.files))
  assert.equal(hash(norm(reductionBefore(path,read(path,'utf8')))),row.current.sha256,'fresh complete TASK-111 CI source: review '+path);
 for(const [path,row]of Object.entries(capacity.files))
  assert.equal(hash(norm(reviewBefore(path,read(path,'utf8')))),row.current.sha256,'fresh complete TASK-111 CI source: '+path);
}
export function assertReleaseBootstrapCiCurrent(read=readFileSync){
 assertCapacityOwnersCurrent(read);
 const rawRead=read;
 read=(path,encoding)=>{
  const raw=rawRead(path,encoding);
  if(!Object.hasOwn(capacity.files,path)&&!Object.hasOwn(review.files,path)&&!Object.hasOwn(reduction.files,path)&&!Object.hasOwn(audio.files,path))return raw;
  const source=typeof raw==='string'?raw:raw.toString('utf8'),prior=capacityBefore(path,source);
  return typeof raw==='string'?prior:prior===source?raw:Buffer.from(prior);
 };
 for(const [path,row]of Object.entries(packet.files))
  assert.equal(hash(norm(beforeQuickFeedbackAdvisory(path,read(path,'utf8')))),row.current.sha256,'fresh complete integration source: bootstrap '+path);
 for(const [path,sha]of Object.entries(packet.immutableArchives))
  assert.equal(hash(read(path)),sha,'retained complete immutable bootstrap predecessor: '+path);
}
