// Copies only immutable test helper dependencies; production owners remain explicit fixtures.
import assert from 'node:assert/strict';
import {officialUiRepairClosure} from './official-ui-repair-closure.mjs';
import {feedbackCiPatch} from './sts-feedback-ci.mjs';
import {extendFeedbackHelperClosure} from './sts-feedback-source-runtime.mjs';
import {extendIntegratedHelperClosure} from './integrated-ci-source.mjs';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Git source identities use LF; binary witnesses (especially gzip) retain
// their exact bytes. Never decode an arbitrary helper dependency as text.
export function integrationClosureBytes(path,content){
 assert(Buffer.isBuffer(content),'helper closure requires bytes');
 if(!/\.(?:mjs|js|json|lua|md|yml|yaml)$/.test(path))return content;
 const text=content.toString('utf8');
 assert(Buffer.from(text).equals(content),'helper source must be valid UTF-8: '+path);
 return Buffer.from(text.replaceAll('\r\n','\n'));
}
const bytes=readFileSync(new URL('./integration-source-closure.json',import.meta.url));
assert.equal(hash(bytes),'800fcc9efd889f482259d0e1e9f1501f0e9597ac05552622ede00dd3dcdb4a94','complete integration helper closure identity');
const currentBytes=readFileSync(new URL('./closeout-source-closure.json',import.meta.url));
assert.equal(hash(currentBytes),'031c42758ec5b37d1782c5fdb70542358d4b2631a5ee9b486b6bb5faccc988b5','complete closeout source helper closure');
const files={...extendIntegratedHelperClosure(extendFeedbackHelperClosure(JSON.parse(currentBytes),feedbackCiPatch.helperClosure))};
export const releasePc22BasicFeedbackHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'0c7ff98c42c47a1a48ad83537d1d7c37a6cc23aed55ada9c763122d4ea102d07'},
 {path:'tests/helpers/release-pc22-basic-feedback-source.mjs',before:null,after:'395e3810c67852768340eb868ee7397bb9ed0b232ff112efa93fb4b520e80b96'},
 {path:'tests/helpers/release-pc22-basic-feedback-source.json.gz',before:null,after:'1cb0fddfea365de7be5331dc169bd438f2cde36b372c4c15bf9c8ac8a2eed157'}
];
export const releaseSelectionMapHelperCopies=[
 {path:'tests/helpers/closeout-source-epoch.mjs',before:'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7',after:'9bc2594f88cd780a31a429f5a493568f076d039ab92f55b952631b586ce335c1'},
 {path:'tests/helpers/release-selection-map-source.mjs',before:null,after:'920fd01fa07dad36ed7e9b70ace199246000d87ad20c258221a2aca4a8e0ee52'},
 {path:'tests/helpers/release-selection-map-source.json.gz',before:null,after:'0c056c020ad655d5a2a901a6f196350582eaf0709afa736f363a0d68509daf62'}
];
for(const rows of [releasePc22BasicFeedbackHelperCopies,releaseSelectionMapHelperCopies])for(const row of rows){
 assert.equal(files[row.path]??null,row.before,'exact standalone Release helper-copy predecessor: '+row.path);
 if(row.path!=='tests/helpers/closeout-source-epoch.mjs')files[row.path]=row.after;
}
files['tests/helpers/closeout-source-epoch.mjs']='3101ebf6deee9f081fad6e3c8d4617b6db4bf17ee01453c82fc8d8a3fb742215';
export const releaseEnemyArtHelperCopies=[
  {
    "path": "tests/helpers/closeout-source-epoch.mjs",
    "before": "3101ebf6deee9f081fad6e3c8d4617b6db4bf17ee01453c82fc8d8a3fb742215",
    "after": "2a89d96cd40b689dc9ba73cbcb1abe4023a5cf79a0002023d3ebc61aeecaf1aa"
  },
  {
    "path": "tests/helpers/release-enemy-art-source.mjs",
    "before": null,
    "after": "4ae006a612f0604081c8135ce6f7ccad6459416232dad2f3cfccbf7ad02a2b65"
  },
  {
    "path": "tests/helpers/release-enemy-art-source.json.gz",
    "before": null,
    "after": "b2c17392b591bc57ec0f8de9236cfc862d74fcfef76d13261baa746966e411a4"
  }
];
for(const row of releaseEnemyArtHelperCopies){assert.equal(files[row.path]??null,row.before,'exact release enemy art helper-copy predecessor');files[row.path]=row.after;}
const inside=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../')&&!r.startsWith('..\\');};
export function copyIntegrationSourceClosure(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory);
 assert.notEqual(destination,realpathSync.native(sourceRoot),'isolated helper copy destination');
 for(const [path,sha]of Object.entries(files)){
  assert((path.startsWith('tests/helpers/')||path.startsWith('tests/fixtures/'))&&!path.split('/').includes('..'),'fixed helper path');
  const source=join(sourceRoot,path),content=integrationClosureBytes(path,readFileSync(source));assert.equal(hash(content),sha,'fresh helper copy identity: '+path);
  const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});
  assert(inside(destination,realpathSync.native(dirname(target))),'helper destination parent escaped');
  if(existsSync(target))assert(inside(destination,realpathSync.native(target))&&realpathSync.native(target)!==realpathSync.native(source),'helper destination aliases source');
  writeFileSync(target,content);
 }
}
