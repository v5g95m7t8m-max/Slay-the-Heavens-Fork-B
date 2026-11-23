import {beforeIllustrationTestSource,beforeReleaseReplayCiSource} from './release-replay-continuations.mjs';
import {releaseRewardDisplayPriorRead} from './release-ui-closeout-source.mjs';
import {beforeReleaseShopEntry,releaseUiRestoreArchive,shopEntryPriorRead} from './release-ui-restore-source.mjs';
import {beforeCombatVisualSource,combatVisualPriorRead} from './combat-visual-source.mjs';
import {beforeCharacterSelectionSource,beforeSts1MenuCiSource} from './sts1-menu-ci-source.mjs';
import {assertRefinedReleaseSourcesCurrent,beforeRefinedReleaseCiSource,beforeRefinedReleaseJsInventory,refinedReleaseHistoricalInput,beforeSelectionReplaySuccessor} from './refined-release-source.mjs';
import {beforeV2UiAdmission} from './v2-ui-admission-ci-source.mjs';
import {beforeV2UiEvidence,beforeV2UiPreTinyHouseSource} from './v2-p1-ci-source.mjs';
import {beforeCharacterPreparationCiSource} from './character-preparation-source.mjs';
import {integratedCiBytes} from './integrated-ci-binding.mjs';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';
// Full-source continuation for historical contracts; no partial/foreign projection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./fork-preflight-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'c6a6e34e8201b22b4c82fa554502785af7dc5f63840189e9c53da7692a55565e');
const proof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(proof.files)){
 if(row.before===null)assert.equal(row.beforeSha,null,'explicitly absent historical source');
 else assert.equal(hash(row.before),row.beforeSha);
}
assert.equal(proof.nativePredecessorCommit,'187a7db55c47b91ee0037486c1e3918f9541f11a');
assert.equal(proof.releaseBootstrapCommit,'873d4392c02fd5ac92e653e57a78fd59f6ae63c6');
for(const [path,row]of Object.entries(proof.files))if(row.releaseBootstrapBefore){
 const prior=row.releaseBootstrapBefore;
 assert.equal(hash(prior.source),prior.sha256,path+' complete Release predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(prior.source)}\0`).update(prior.source).digest('hex'),prior.gitBlob,path);
}
const currentHashes=Object.freeze({
 '.github/workflows/quality.yml':'5975715d9b983b6c586aa88be78e950358ff833c6ec7a73f1843fdf420d4cb6c',
 '.github/workflows/licenses.yml':'a27f39914855cbecebf6ee7285ff9744fa394d0a85b5fb89dfcc915e83b55d8d',
 'scripts/arm-auto-merge.mjs':'f9bb0f3615be546dec27376c8acf3ac139fe1e4d0632c5a6b8f1bb1fd4d88248',
 'scripts/ci-impact.mjs':'87dfdb1166cf6b0bab59164b472ee580a3fa3651b5d137d6b569ff0da03d57c9',
 'scripts/merge-queue-admission.mjs':'c07a727b7782e8da6211317eeb21b074eb618b4bb2757366f8f8aed0b68955c8',
 'scripts/publish-merge-group.mjs':'06ae5526a678b0b5f36863b310ac901687251cd9ac9563ce6cf72f14aadedf52',
 'scripts/publish-pr-quality.mjs':'e918f7bb12474f60a5272e72d285e22bb207765e098847ff726cb54621b277f7',
 'scripts/test-affected.mjs':'b89c6a4ba5a72640abfcc65d0ec3bd6ac60763305e5ed5fd1d5f4fb8bc8205e1',
 'tests/auto-merge.test.mjs':'f0c1597a357cbfd20f23186aa53c0670c5fa82e4b37b8d755a1e57d09a3def4c',
 'tests/ci-impact.test.mjs':'0095b9acc0c9c377704b05f3029e74302474256f8a434417dd5c0678b96caa1d',
 'tests/ci-summary-runners.test.mjs':'4d3654d6309e49bd9a2984e071243659db59223d3cd9c8fe7633665ebf38d7ca',
 'tests/merge-queue-admission.test.mjs':'f1fd68ea13b9a1fbea02431d4e10e7b6a121760c56de2b6d351aa43949d350cd',
 'tests/merge-queue.test.mjs':'083d1b134bcf73abbbd5fdbe1783358992fb99fdb5b7d87d1a33e94d22b6ccbd',
 'tests/quick-feedback.test.mjs':'ef3a2a86ebdd206ccb7bc83501465a0f3ea4a9e02ff41cb6bd406aaccd146e0c',
});
const transportBytes=readFileSync(new URL('./ci-media-transport-source.json.gz',import.meta.url));
assert.equal(hash(transportBytes),'56f69f4abc8687edd75d2087dfa890f94cf8d5f1d67fe2450338a0d2258355b2','complete CI media transport predecessor');
const transport=JSON.parse(gunzipSync(transportBytes));
assert.equal(transport.schemaVersion,1);
assert.equal(transport.base,'fe878280c74eb0461f6f1212b34e50550b80b681');
for(const [path,row] of Object.entries(transport.files)){
 assert.equal(hash(row.before),row.beforeSha,path+' complete media transport predecessor');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.before)}\0`).update(row.before).digest('hex'),row.gitBlob,path);
}
const normalize=s=>s.replaceAll('\r\n','\n');
// Keep earlier CI observations bound to the Release baseline while current
// tests execute the approved default and frozen candidate paths.
const releaseUiBuildBytes=readFileSync(new URL('./release-ui-build-ci-source.json.gz',import.meta.url));
assert.equal(hash(releaseUiBuildBytes),'e7a41ad3a06b8fa264aaad151a8b12e9c399f78a35183a35d9ed3f655abae044');
const releaseUiBuild=JSON.parse(gunzipSync(releaseUiBuildBytes));
assert.equal(releaseUiBuild.base,'ff6af63d9bf93056dd772347d10dc749e7fa8d34');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0${source}`).digest('hex');
for(const {before,after} of Object.values(releaseUiBuild.files)){
 assert.equal(hash(before.source),before.sha256);
 assert.equal(blob(before.source),before.gitBlob);
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
}
// Exact #808 predecessor for historical Release builds. Actual builds keep the compressed payload.
const capacity=releaseUiRestoreArchive(readFileSync(new URL('./release-capacity-source.json.gz',import.meta.url)),
 '29e21e465a4102b3b3db501cf4c9d0d44d2584bb0aa6ce56e9adaa624c1e77d1','4d475a485eae7c9bdd84cba1f69db3b5a4d3ddef');
const capacitySuccessor=releaseUiRestoreArchive(readFileSync(new URL('./release-capacity-successor-source.json.gz',import.meta.url)),
 '82a4d72f5d4accce0cf01ac66871640454b62a788fae894384debb2059bb3373','013bdffb7d4767075d7ebcf0be9eacd275bfbe89');
const menuProofSuccessor=releaseUiRestoreArchive(readFileSync(new URL('./release-menu-proof-successor-source.json.gz',import.meta.url)),
 'd3f739fafbf65fab9015fef7bbf37b08aebd9669fa38df56b38d2bc00a4deb07','ee9f461337e8ae4c84735f0b5461f2be643ef5cd');
const beforeCapacitySource=(path,source)=>capacity.project(path,capacitySuccessor.project(path,source));
function assertCapacitySources(read){
 const inputs=Object.keys(capacity.files).map(path=>[path,read(path,'utf8')]);
 const isCurrent=([path,source])=>beforeCapacitySource(path,source)!==source;
 if(!inputs.some(isCurrent))return false;
 for(const input of inputs)assert(isCurrent(input),'fresh Release capacity source: '+input[0]);
 return true;
}
function beforeCapacityRead(read,requireCurrent=false){
 return (path,encoding)=>{
  const source=read(path,encoding),prior=beforeCapacitySource(path,source);
  if(requireCurrent&&Object.hasOwn(capacity.files,path))assert.notEqual(prior,source,'fresh Release capacity source: '+path);
  return prior;
 };
}

// Preserve the exact historical copier and regression source after Traveler status coverage.
function beforeTravelerStatusCiSource(path,source){
 const copier=path==='tests/helpers/copy-integration-source-closure.mjs';
 const regression=path==='tests/integration-source-epoch.test.mjs';
 const actorTemplate=path==='tests/native-monster-actor-template.test.mjs';
 if((!copier&&!regression&&!actorTemplate)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 let lf=normalize(source);
 if(copier&&hash(lf)==='a3e67622418134d3b6fc49a2218a33d54191a8e53663e3785723893c74e02a0c'){
  lf=lf.replace(/^const compactPopupReplayFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(compactPopupReplayFiles)','Object.entries(atomicCardEffectsFiles)');
  assert.equal(hash(lf),'7461c029c6d0f46924a945217354f8b858ec4b817e7ddb6fbcfad5d69744056b','exact pre-popup helper copy source');
 }
 if(copier&&hash(lf)==='7461c029c6d0f46924a945217354f8b858ec4b817e7ddb6fbcfad5d69744056b'){
  lf=lf.replace(/const atomicCardEffectsFiles=Object\.freeze\(\{\n[\s\S]*?\n\}\);\n/,'')
   .replace('Object.entries(atomicCardEffectsFiles)','Object.entries(travelerStatusFiles)');
  assert.equal(hash(lf),'03e69836be70d236cce38ad56a0a42589609bab3803fb9b72230abe8b9a60359','exact card-effect helper copy predecessor');
 }
 if(copier&&hash(lf)==='03e69836be70d236cce38ad56a0a42589609bab3803fb9b72230abe8b9a60359'){
  lf=lf.replace(" 'tests/helpers/release-ui-restore-source.mjs':'0a404f50a22153788baa3c8612588c266e4eecc3ac2b97a74ca7fa00a9c7f0a2',\n 'tests/fixtures/release-compound-intent-source.json.gz':'4d1d0ca90bc98c95fef49584283807598edd42f995d230357d28fa41efa14111',\n"," 'tests/helpers/release-ui-restore-source.mjs':'12525d81e0e26d39b823b398e4f438e3a005dd6e2a10f91f71eec00adf007586',\n");
  assert.equal(hash(lf),'b72155ee1af41dfd1300b4f364a1c5de8de666173c95e37cc72fb14bec63afab','exact compound intent helper copy predecessor');
 }
 if(copier&&hash(lf)==='b72155ee1af41dfd1300b4f364a1c5de8de666173c95e37cc72fb14bec63afab'){
  lf=lf.replace(" 'tests/helpers/release-ui-restore-source.mjs':'12525d81e0e26d39b823b398e4f438e3a005dd6e2a10f91f71eec00adf007586',\n"," 'tests/helpers/release-ui-restore-source.mjs':'f80f891d9f7bf72b098efa22b02b8cdcd83b02cd6be90cfb9003ac83cb9eeaed',\n")
   .replace(" 'tests/helpers/release-replay-continuations.mjs':'693477ca050c9f8eee0817fb308fc5d023bff4b020c4ab147d178b1ebf8fae23',\n"," 'tests/helpers/release-replay-continuations.mjs':'a01c34b0ae81fb75aa761577db7f05dbc3afd7c24ee4eab6c44c47ceef8fa264',\n")
   .replace(" 'tests/fixtures/release-replay-final-source.json.gz':'2b3737cb405ce06c42d6dfe5f099a234f452f4b174f97dc481d0e149cb1b23fd',\n","");
  assert.equal(hash(lf),'1637331fc3742191fa287a302c8e19b2dd0e6d5cca4e048e3bafb78b4daffca2','exact final Release replay helper copy predecessor');
 }
 if(copier&&hash(lf)==='1637331fc3742191fa287a302c8e19b2dd0e6d5cca4e048e3bafb78b4daffca2'){
  lf=lf.replace(" 'tests/helpers/release-ui-restore-source.mjs':'f80f891d9f7bf72b098efa22b02b8cdcd83b02cd6be90cfb9003ac83cb9eeaed',\n"," 'tests/helpers/release-ui-restore-source.mjs':'37410ec175d07b09c8dd8062ac2e19d212dc8eeaebc32f38dbf99e7b32d8b7dd',\n")
   .replace(" 'tests/helpers/release-replay-continuations.mjs':'a01c34b0ae81fb75aa761577db7f05dbc3afd7c24ee4eab6c44c47ceef8fa264',\n"," 'tests/helpers/release-replay-continuations.mjs':'37fababc8fa8b4f9bbd108692b39289b74964eee0a201085a6b756dd8d938d59',\n")
   .replace(" 'tests/fixtures/release-deck-lineage-source.json.gz':'a32c93925e562ee1c617bd647e18f131a0c066659eb653ba67afe3beb75454d0',\n","");
  assert.equal(hash(lf),'0905d3901444316d81a8bcb99b9323fc9728e16401c358d0ba1f79b0d79a68d2','exact historical deck helper copy predecessor');
 }
 if(copier&&hash(lf)==='0905d3901444316d81a8bcb99b9323fc9728e16401c358d0ba1f79b0d79a68d2'){
  lf=lf.replace(" 'tests/helpers/combat-visual-source.mjs':'56a4c47f810f88c3dc1380f2c7f7c5cc8e42085950881f93e0fb10355c308ed6',\n 'tests/helpers/release-replay-continuations.mjs':'37fababc8fa8b4f9bbd108692b39289b74964eee0a201085a6b756dd8d938d59',\n 'tests/fixtures/release-replay-continuations.json.gz':'a2abaa3feb21f2f1a2e8f9c9fef3da2af3525073110eebaa394d82b71a095b95',\n"," 'tests/helpers/combat-visual-source.mjs':'f90e9852079ce269b75d69225552b3720fe43fe789f63e2fa09dee15bdff308c',\n");
  assert.equal(hash(lf),'e9045772fa7bc30c8f12123cfb3ba78996f11f12c9384fe2c781ec296dee4116','exact #829 and #854 helper copy predecessor');
 }
 if(copier&&hash(lf)==='e9045772fa7bc30c8f12123cfb3ba78996f11f12c9384fe2c781ec296dee4116'){
  lf=lf.replace(" 'tests/helpers/energy-reference-source.mjs':'b756c8e44aa38c736bbcdb07ed24a676449ae6184447e18c28cb8b43ab324598',\n 'tests/fixtures/release-reward-companion-source.json.gz':'f793e5dfb1d4c8b9a6f90d06e59a4aa777a820372ac13a70628e24dd5919ba88',\n"," 'tests/helpers/energy-reference-source.mjs':'eda0da3e4206a76c9bfe2b48a040e24c217a9b2f1416a673b728c03c4da4a2b7',\n")
   .replace(" 'tests/helpers/combat-visual-source.mjs':'f90e9852079ce269b75d69225552b3720fe43fe789f63e2fa09dee15bdff308c',\n 'tests/helpers/traveler-status-source.mjs':'2c853e67bd0148ed6de45a3e6ac0e69fe97dd543f967ecbb492f498c46e3c741',\n 'tests/fixtures/release-battle-detail-source.json.gz':'62be372b9fcdbfee8c06bb68cf3808ec8932ed8097537c85c83fa85310e6ea9f',\n"," 'tests/helpers/combat-visual-source.mjs':'795056833d48bd9a2e5a1944a5d9b56fb5d0f0ce7967fdbac72da5566ae5e35d',\n 'tests/helpers/traveler-status-source.mjs':'41da0aaea833a446033b1fb964d31eebc4c4b5cd22e990a03370636f7afcc5ff',\n");
  assert.equal(hash(lf),'7f3574e841cfe053de331c55ca4872bde0143c7a1b6bde58b03757ff3a821121','exact reward and battle detail helper copy predecessor');
 }
 if(copier&&hash(lf)==='7f3574e841cfe053de331c55ca4872bde0143c7a1b6bde58b03757ff3a821121'){
  lf=lf.replace(" 'tests/helpers/release-ui-closeout-source.mjs':'ad5561e57e88406fa9615ff0ac7ed654b625112b7667c0b6da06d8a0fc4e3b84',\n 'tests/fixtures/release-shop-fixture-source.json.gz':'cfafa1b569223099444cb0340d8483ecd5daade105effeb6934802fb73133020',\n"," 'tests/helpers/release-ui-closeout-source.mjs':'f0494e25c04a94b932ff7160f5dd00904cfde3ff8c86beb00eb83968b251ba08',\n");
  assert.equal(hash(lf),'23868164b55d4d54cb3cf6d661f869545a606607ff1bbf4721518c9dfa5ed574','exact shop fixture helper copy predecessor');
 }
 if(copier&&hash(lf)==='23868164b55d4d54cb3cf6d661f869545a606607ff1bbf4721518c9dfa5ed574'){
  lf=lf.replace(" 'tests/helpers/release-ui-closeout-source.mjs':'f0494e25c04a94b932ff7160f5dd00904cfde3ff8c86beb00eb83968b251ba08',\n"," 'tests/helpers/release-ui-closeout-source.mjs':'a3d1de143ef40fdaab5a08bca47e4e1ff29414d2e3e97826fb68db84885998ab',\n")
     .replace(" 'tests/fixtures/release-reward-display-source.json.gz':'c06069437d787cc0e590f2c6899b026e0ee47d060173b867dbd9dfcd8bb89255',\n",'');
  assert.equal(hash(lf),'7839a90538fdc661a02da94afed8b610a9a204141108456a1618ed6dcf7d5070','exact reward display helper copy predecessor');
 }
 if(copier&&hash(lf)==='7839a90538fdc661a02da94afed8b610a9a204141108456a1618ed6dcf7d5070'){
  lf=lf.replace(" 'tests/helpers/release-map-deck-source.mjs':'d76d9d67c6e696d966fe9608a46e66eea0c0e2739c06dd9672151afd4b1f0973',\n"," 'tests/helpers/release-map-deck-source.mjs':'dd02f8976ed65dae8d055f881020f71d6169a4e396c9cd0bc72d6c84c9254e9a',\n")
     .replace(" 'tests/helpers/combat-visual-source.mjs':'795056833d48bd9a2e5a1944a5d9b56fb5d0f0ce7967fdbac72da5566ae5e35d',\n"," 'tests/helpers/combat-visual-source.mjs':'721b73965767d683ef2b1853113baa1508fb7d8f913031df84b5285ba38caada',\n")
     .replace(" 'tests/helpers/release-ui-closeout-source.mjs':'a3d1de143ef40fdaab5a08bca47e4e1ff29414d2e3e97826fb68db84885998ab',\n","")
     .replace(" 'tests/fixtures/release-ui-closeout-source.json.gz':'1798bb413901e57c51a19f359721a4621212c7a48d51a7d4b48bdc4be05eddba',\n","");
  assert.equal(hash(lf),'3910354d5306dd7ff7a86d282e5f5716b7ec8e3982d98e5a29d26d32bddd48d4','exact Release UI closeout helper copy predecessor');
 }
 if(copier&&hash(lf)==='3910354d5306dd7ff7a86d282e5f5716b7ec8e3982d98e5a29d26d32bddd48d4'){
  lf=lf.replace(" 'tests/helpers/release-map-deck-source.mjs':'dd02f8976ed65dae8d055f881020f71d6169a4e396c9cd0bc72d6c84c9254e9a',", " 'tests/helpers/release-map-deck-source.mjs':'c661e5dfa5035a09a47935bd7bfbc3e1f37b992d809bc7387d93e757c3df6fd5',");
  assert.equal(hash(lf),'2c468260f8ca242e3a9e2d3d683616b45cca8ac6ad962388d7e0c5c0ceb2f85a','exact Forethought helper copy predecessor');
 }
 if(regression&&hash(lf)==='5fd049b43048293745bc2b49582c68436c20185e95b59f291cb911ed9cd59bcf'){
  lf=lf.replace(/^test\('compound intent owners[^\n]*\n[\s\S]*?^\}\);\n/m,'');
  assert.equal(hash(lf),'cff90e25684015aa6df74f6d3533ecb0448eb6597b18eb8eebf9c0a618a10ecb','exact compound intent test predecessor');
 }
 const sha=hash(lf);
 let prior,expected;
 if(copier&&sha==='2c468260f8ca242e3a9e2d3d683616b45cca8ac6ad962388d7e0c5c0ceb2f85a'){
  prior=lf.replace(/const travelerStatusFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
   .replace('Object.entries(travelerStatusFiles))','Object.entries(loadingRecoveryFiles))');
  expected='eb6e433e3a66f62e4b5aece6f475322cbf3d6d68e6d5e85107676cdff98719ac';
 }else if(regression&&['e411b5d46c2bde12ef10d0615abaeacee3bc83d6c72221aa212cb3e708494089','cff90e25684015aa6df74f6d3533ecb0448eb6597b18eb8eebf9c0a618a10ecb'].includes(sha)){
  prior=lf.replace("import {beforeReleaseUiCloseoutSource,ownsReleaseUiCloseoutSource,releaseUiCloseoutPriorRead} from './helpers/release-ui-closeout-source.mjs';\n",'')
   .replace("import {beforeTravelerStatusSource,travelerStatusSourcePaths} from './helpers/traveler-status-source.mjs';\n",'')
   .replace(/^test\('Traveler status continuation[^\n]*\n[\s\S]*?^\}\);\n\n/m,'');
  expected='db962d7fe34be9e68f12ee153be9ef6679135e0803d28fb0db0db8a3d3fba0f4';
 }else if(actorTemplate&&sha==='d28f7e6ac4221f6424d9c4c9c36e23c79e5d7f88186f4ae288a8faa52e36ac6e'){
  prior=lf.replace(" cursorArea: 'statusDismiss',\n",'')
   .replace("image: 'hpIcon goldIcon energyRing","image: 'hpIcon goldIcon floorIcon energyRing")
   .replace(" assert.equal(descendants(stage.children.find(n=>n.name==='topBar')).find(n=>n.name==='floorIcon').visible,false);\n",'')
   .replace("for(const name of ['floor','actorLayer'","for(const name of ['floorIcon','floor','actorLayer'");
  expected='ed025ce2aade0407368c7970aee5fd980ae3b865790397b30f7ca53ff5e2ada3';
 }else return source;
 assert.equal(hash(prior),expected,'exact Traveler status CI predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

// Authenticate the current copier before giving old CI receipts its exact predecessor.
function beforeLoadingRecoveryCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 let lf=normalize(source);
 if(hash(lf)==='eb6e433e3a66f62e4b5aece6f475322cbf3d6d68e6d5e85107676cdff98719ac'){
  lf=lf.replace(" 'tests/helpers/energy-reference-source.mjs':'eda0da3e4206a76c9bfe2b48a040e24c217a9b2f1416a673b728c03c4da4a2b7',\n",
   " 'tests/helpers/energy-reference-source.mjs':'a8db68450b733114e4b5cb9c345d6d7935b9309e150e4ce7717e9c833e4df0ad',\n")
   .replace(" 'tests/fixtures/release-reward-frame-source.json.gz':'09f99aff296875fa9787a94bfd6be19c1a4d76dcb9a33fd6b1f31213d10cd8a5',\n",'');
  assert.equal(hash(lf),'92da908833bf36c0c924b5752c582c78302cd794b53f01eedb49fbb5956d3f4c','exact reward frame helper copy predecessor');
 }
 if(hash(lf)!=='92da908833bf36c0c924b5752c582c78302cd794b53f01eedb49fbb5956d3f4c')return source;
 const prior=lf.replace(/const loadingRecoveryFiles=Object\.freeze\(\{[\s\S]*?^\}\);\n/m,'')
  .replace('Object.entries(loadingRecoveryFiles))','Object.entries(refinedReleaseFiles))');
 assert.equal(hash(prior),'42a2fae24acaca0ff0214e5e0e592b2ff4cfd7f1e506578ba36faf327d17ae87','exact loading recovery helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

function beforeRefinedReleaseCopier(path,source){
 if(path!=="tests/helpers/copy-integration-source-closure.mjs"||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=="7aa6c9e75928548fced7107e38ef05b787e4a63c661fa4ab124dd1a8ce06314b")return source;
 const prior=lf.replace("// Refined enemy art extends only the existing historical helper closure.\nconst refinedReleaseFiles=Object.freeze({\n ...releaseUiFiles,\n 'tests/helpers/release-ui-restore-source.mjs':'26d8b8099e6b8f6fb30869479dcbcac90ff8c77ea04bc80ab4f8ad25c8bc8be3',\n 'tests/helpers/release-forge-source.json.gz':'8557c9daa0943c815ca11e0c135d081c08081f040bbef85b3cd799f7a586c564',\n 'tests/helpers/refined-release-source.mjs':'154f5464849177b48426db7d816f4ddf87d9d26abd6bfcfb543162b4f26450d9',\n 'tests/helpers/refined-release-source.json.gz':'6b9e66890ecfeac7f0b581ece462edaf41095f6d2937896cf6032e9e8ee9a9a3',\n});\n",'').replace("Object.entries(refinedReleaseFiles))","Object.entries(releaseUiFiles))");
 assert.equal(hash(prior),"810c7ddebb21d62e26730d225ba218c33aa009656fee38929ee2881821ea813b",'exact refined Release helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Restore the previous exact copy contract before its own historical projection.
function beforeShopEntryCopier(path,source){
 if(path!=='tests/helpers/copy-integration-source-closure.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='42a2fae24acaca0ff0214e5e0e592b2ff4cfd7f1e506578ba36faf327d17ae87')return source;
 const prior=lf.replace(" 'tests/helpers/release-shop-entry-source.json.gz':'d3c114b39aa8affa1ae5c2b3ee54117640dcacce750efc24d78312792d8d2ff7',\n",'').replace(" 'tests/helpers/release-ui-restore-source.mjs':'37410ec175d07b09c8dd8062ac2e19d212dc8eeaebc32f38dbf99e7b32d8b7dd',"," 'tests/helpers/release-ui-restore-source.mjs':'26d8b8099e6b8f6fb30869479dcbcac90ff8c77ea04bc80ab4f8ad25c8bc8be3',");
 assert.equal(hash(prior),'6da6f0f4defe5d10ec161a626d020ecd22d6f651d0e35c2ba941907f579337a6','exact shop entry helper copy predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeShopRoomCiSource(path,source){
 const merchant=path==='tests/lua/merchant_dialogue_lifecycle.lua';
 const pagination=path==='tests/lua/support/official_node_picker_pagination.lua';
 if((!merchant&&!pagination)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source),sha=hash(lf);
 const importLine="local advanceShop = dofile('tests/lua/support/shop_timeline.lua')\n";
 let prior,expected;
 if(merchant&&sha==='5f961e91862bd42d9288d82c889607651c200c4276197f4c47938a07d9df64f8'){
  prior=lf.replace(importLine,'')
   .replace(' advanceShop(ui) -- Stage the concealed shelf before testing interruption of its visible slide.\n','')
   .replace('assert(tap());advanceShop(ui)','assert(tap());ui:update(.31)')
   .replace("assert(not root:GetChild('shopRoom').visible)","assert(not root:GetChild('merchant'):GetChild('portrait').visible)");
  expected='97e5495448e73f35cf5a8b33ba0c5094f22360b7553644384eacc8850ccbf306';
 }else if(pagination&&sha==='ba6e805f24fa5ffb79b1a8adc9a278e5f8ee53a2d06a18958353c5dec3519369'){
  prior=lf.replace(importLine,'').replace("assert(ui:press('merchant/talk'));advanceShop(ui)",
   "assert(ui:press('merchant/talk'));ui:update(.31)");
  expected='d365f7b1d9f8f36eb016a84578a97ddd1051cf1c1c321d2d6b347289f943ea8e';
 }else return source;
 assert.equal(hash(prior),expected,'exact Release shop room test predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function shopEntryPreflightRead(read){
 const prior=shopEntryPriorRead((path,...args)=>beforeShopRoomCiSource(path,read(path,...args)));
 return (path,...args)=>beforeShopEntryCopier(path,beforeLoadingRecoveryCopier(path,beforeTravelerStatusCiSource(path,prior(path,...args))));
}
function beforeReleaseAssetInventory(path,source){
 if(path!=='docs/legal/assets.json'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 let lf=normalize(source);
 if(hash(lf)==='bda923e34a9c5c025c87a9b17b4f59718cafaaf17607bb73c51667e2e8a06746'){
  const inventory=JSON.parse(lf);
  for(const file of Object.keys(inventory.files)){
   if(file.startsWith('docs/evidence/shop-828/'))delete inventory.files[file];
  }
  lf=JSON.stringify(inventory,null,2)+'\n';
  assert.equal(hash(lf),'c4c0df4494ef02b2f5341b2ed52fba207dc5cbb66065e584b7ffe3fa3df893a9','exact shop evidence inventory predecessor');
 }
 if(hash(lf)!=='c4c0df4494ef02b2f5341b2ed52fba207dc5cbb66065e584b7ffe3fa3df893a9')return source;
 const inventory=JSON.parse(lf),category='sts1-combat-sdk-evidence';
 delete inventory.categories[category];
 for(const [file,entry] of Object.entries(inventory.files)){
  if(entry.category===category)delete inventory.files[file];
 }
 const prior=JSON.stringify(inventory,null,2)+'\n';
 assert.equal(hash(prior),'821176420ff12bfca7675c6c3fdbbb5bf5f7d10a1b95e1202fad08c671635ecb','exact Release evidence inventory predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeReleaseBackflowTest(path,source){
 if(path!=='tests/delivery.test.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const lf=normalize(source);
 if(hash(lf)!=='8450cf025ac639efea3d40452f614fa5200ab5b21b2ca59e82ad7b0b87b1318d')return source;
 const prior=lf.replace("import { fileURLToPath } from 'node:url';\n",'')
  .replace(/^test\('Release event and default-branch sweep report residuals against an immutable develop tree',[\s\S]*?(?=^test\('checkout writer)/m,'');
 assert.equal(hash(prior),'f74b528375f1f487985a4c108687cd62b61fccb2a23070bb5810205fb69cfc2a','exact Release backflow test predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
// Restore only the exact staged-shop test when replaying earlier CI evidence.
function beforeShopPurchaseRegression(path,source){
 if(path!=="tests/official-assets-flow.test.mjs"||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const current=normalize(source);
 if(hash(current)!=='632cddaca410e7402e8a98ae161fbc0360b3b70ace9135a515e084bc2596ab74')return source;
 const prior=current.replace("local advanceShop=dofile('tests/lua/support/shop_timeline.lua')\nlocal page=root:GetChild('nodePanel')\nassert(page:GetChild('shopRoom').visible and not page:GetChild('shopView').visible)\nassert(F.click(root,'nodePanel','merchant/talk'))\nassert(page:GetChild('shopRoom').visible and not page:GetChild('shopView').visible)\nadvanceShop(h)\nassert(page:GetChild('shopView').visible and not h.nodeUI.shopBusy)\n",'')
  .replace("advanceShop(h.nodeUI);assert(run.phase=='map' and h.mode=='node')","h.nodeUI:update(.31);assert(run.phase=='map' and h.mode=='node')");
 assert.equal(hash(prior),'0097a0c33630ce01495b99601c4220dc424295ca6dadade7967bbf9106be2ad8','exact pre-shop-purchase fixture');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
function beforeReleaseUiBuildSource(path,source){
 source=beforeCharacterSelectionSource(path,source);
 source=menuProofSuccessor.project(path,source);
 source=beforeSelectionReplaySuccessor(path,source);
 if(path==='docs/legal/assets.json'&&typeof source==='string'&&hash(normalize(source))==='1c3ea4f310aaf5dccdf177946728f65eaeb1ed882f70b5543bcae178774f0983'){
  const inventory=JSON.parse(source);
  delete inventory.categories['release-enemy-tooltip-evidence'];
  delete inventory.files['docs/evidence/release-enemy-tooltips/comparison.png'];
  const prior=JSON.stringify(inventory,null,2)+'\n';
  assert.equal(hash(prior),'eb0a2c2df791ba1c7e50db28599dc79461a4cfa70a3883605c8b9038b0c9944f','exact inventory before the enemy tooltip evidence');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path==='tests/integrated-ci-source.cases.mjs'&&typeof source==='string'&&hash(normalize(source))==='dc24e78d4d1fa5b43f8cfcac855bd852eca02afc96d785cf2b71a969e2542a49'){
  const prior=normalize(source).replace('   const alreadyAtTarget=hash(source)===row.current.sha256&&row.views[target].sha256===row.current.sha256;\n','')
   .replace('alreadyAtTarget?crlf:expected','row.views[target].sha256===row.current.sha256?crlf:expected');
  assert.equal(hash(prior),'3e6a0dd86a826099554169a298731f7382f9a682043412f610916671d8c7ca15','exact integration case predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path==='tests/helpers/integrated-ci-source.mjs'&&typeof source==='string'&&hash(normalize(source))==='d2613162662475f42c9e4d77326919db7f3ace6f29f1972131b08948a1e2607c'){
  const prior=normalize(source).replace(/^\/\/ Release hotfixes retain[^\n]*\n[\s\S]*?(?=^export function integratedSource)/m,'')
   .replace('export function integratedSource(path,source,target){\n','export function integratedSource(path,source,target){\n source=beforePreflightSource(path,source);\n')
   .replace("if(path.startsWith('src/')||path==='config/architecture.json')return beforePreflightSource(path,source);","if(path.startsWith('src/')||path==='config/architecture.json')return source;")
   .replace(' const predecessor=row?.views[target]?beforeReleaseSuccessor(path,source):source;\n source=releaseBootstrapCiSource(path,predecessor===source?beforePreflightSource(path,source):predecessor,row?.current);',' source=releaseBootstrapCiSource(path,source,row?.current);')
   .replace(/ const readCurrent=read;\n([\s\S]*?) for\(const \[path,row\]of Object.entries\(integratedCiProof.files\)\)\{[\s\S]*?\n \}/,
    "$1 for(const [path,row]of Object.entries(integratedCiProof.files))assert.equal(hash(norm(releaseBootstrapCiCheckedSource(path,read(path,'utf8'),row.current))),row.current.sha256,'fresh complete integration source: '+path);");
  assert.equal(hash(prior),'179207678a818066e28f9867d197e3b39c95568fdac16d590fed6bbeeb97efac','exact integration helper predecessor');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 if(path==='docs/legal/assets.json'&&typeof source==='string'&&hash(normalize(source))==='eb0a2c2df791ba1c7e50db28599dc79461a4cfa70a3883605c8b9038b0c9944f'){
  const inventory=JSON.parse(source);
  delete inventory.files['docs/evidence/release-power-tips/ui-comparison.png'];
  const prior=JSON.stringify(inventory,null,2)+'\n';
  assert.equal(hash(prior),'9dc3e8a2d070fe5e633be6c869b296f672fc1d82782d30a8b1c4037f359c41b1','exact evidence inventory before the Release status comparison');
  source=source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
 }
 source=beforeShopPurchaseRegression(path,source);
 source=beforeReleaseReplayCiSource(path,beforeIllustrationTestSource(path,source),'early');
 source=beforeShopRoomCiSource(path,beforeReleaseBackflowTest(path,beforeReleaseAssetInventory(path,source)));
 source=beforeTravelerStatusCiSource(path,source);
 source=beforeShopEntryCopier(path,beforeReleaseShopEntry(path,beforeLoadingRecoveryCopier(path,source)));
 const read=shopEntryPreflightRead(owner=>beforeReleaseReplayCiSource(owner,
  beforeCharacterSelectionSource(owner,readFileSync(owner,'utf8')),'early'));
 source=beforeCombatVisualSource(path,source,read);
 const prior=beforeReleaseReplayCiSource(path,source,'late');
 if(prior!==source){
  const readPrior=owner=>beforeReleaseReplayCiSource(owner,beforeCombatVisualSource(owner,read(owner),read),'late');
  source=beforeCombatVisualSource(path,prior,readPrior);
 }
 source=beforeSts1MenuCiSource(path,source);
 source=beforeRefinedReleaseCiSource(path,beforeRefinedReleaseCopier(path,beforeCapacitySource(path,source)));
 if(!Object.hasOwn(releaseUiBuild.files,path)||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const text=normalize(source),{before,after}=releaseUiBuild.files[path];
 if(hash(text)!==after.sha256||blob(text)!==after.gitBlob)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}
export function beforeReleaseTinyHouseSource(path,source){
 return beforeV2UiPreTinyHouseSource(path,beforeReleaseUiBuildSource(path,source));
}
export function historicalReleaseBuildInput(path,read){
 read=releaseRewardDisplayPriorRead(read);
 if(!Object.hasOwn(releaseUiBuild.files,path))return refinedReleaseHistoricalInput(path,beforeCapacityRead(read));
 const source=read(path,'utf8'),prior=beforeReleaseUiBuildSource(path,source);
 assert.notEqual(prior,source,'fresh approved build source: '+path);
 return prior;
}
const coopLabCiBytes=readFileSync(new URL('./coop-lab-ci-predecessors.json.gz',import.meta.url));
assert.equal(hash(coopLabCiBytes),'e55c26c3dbc7cde22ae4e47de876f205b47bdbfc30dc469830fe0ae9255285dc','complete co-op lab CI predecessors');
const coopLabCi=JSON.parse(gunzipSync(coopLabCiBytes));
assert.equal(coopLabCi.base,'ecf54a29a54228e058238fbbc8716a665a3021d6');
for(const row of Object.values(coopLabCi.files))assert.equal(hash(row.before),row.beforeSha);
function beforeCoopCiSource(path,source){
 source=beforeV2UiEvidence(path,beforeReleaseUiBuildSource(path,source));
 const row=Object.hasOwn(coopLabCi.files,path)?coopLabCi.files[path]:null;
 if(!row || typeof source!=='string' || source.includes('\r\r\n') || hash(normalize(source))!==row.afterSha)return source;
 return source.includes('\r\n')?row.before.replaceAll('\n','\r\n'):row.before;
}
const coopLabTest='tests/coop-primitive-lab.test.mjs';
const coopLabTestSha='93a22f446fec66df1339fc135071c929a3cc07d0c2473424510842af689d18dc';
function assertCoopJsInventory(paths,preceding,read){
 const current=[...preceding,coopLabTest].sort();
 assert.deepEqual([...paths].sort(),current,'complete current raw discovery inventory');
 const testSource=read(coopLabTest,'utf8');
 assert(typeof testSource==='string'&&!testSource.includes('\r\r\n')&&
  hash(normalize(testSource))===coopLabTestSha,'fresh added inventory source: '+coopLabTest);
}
const shopEntryTests={
 js:['tests/shop-entry.test.mjs','3b687d1afb6ee83dc7103bc4c074e990a748a96ef55c4cba326498a5ed2d1919'],
 lua:['tests/lua/shop_entry.lua','85547fda98f035ff78a0cebdf56e91ba43899f0579d706c4cb045e13a55f6259',
  'e2b0e5297f87eb64525710b871ba23bd9bbcf81e942623c316759e9991dcebeb'],
};
function beforeAddedTest(paths,[path,...authenticated],read){
 const position=paths.indexOf(path);
 if(position===-1)return paths;
 assert.equal(paths.lastIndexOf(path),position,'duplicate inventory source: '+path);
 const source=read(path,'utf8');
 assert(typeof source==='string'&&!source.includes('\r\r\n')&&authenticated.includes(hash(normalize(source))),'fresh added inventory source: '+path);
 return paths.filter(test=>test!==path);
}
export function beforeShopEntryInventory(paths,kind,read=readFileSync){
 if(kind==='lua')paths=beforeAddedTest(paths,['tests/lua/traveler_power_tooltip.lua','35363665f69113883246aa33984d4ab17eba727a87476256a617dc0f42dd45f7',
  '76e7c52c6330e921faff4738f7d125100ba349f0ca041347552ba9de22a5ee87',
  '681970da72659363cd5c15e32e2bb741d8cadb42ec7f2f4fcf6993a95345d7ab',
  'f73f84b1cf354f044a417ce0746ed5ba5bea1383438793407ee00e179af83a66',
  'a640f2a82d585e74bdb8bb7f5216571d85489b3815a9c8dc17561524fbb36c41'],read);
 return beforeAddedTest(paths,shopEntryTests[kind],read);
}
const releaseAddedJs=[
 ['tests/compact-popup-surface.test.mjs','1a6349e7cc53725bfb922a62b8ad6bcfd79b2c37ba0dbe23afda2f300a2741a1'],
 ['tests/detail-latency.test.mjs','310f906435fbbfa45899b30a5344ca83f9de32860d09394b9824de95ee9cffee'],
 ['tests/forethought-selection.test.mjs','efe0d72d48c9c281f9af7f77fe432cdb2c6cb0edca8ee508f0897ea447a7ffab'],
 ['tests/native-script-storage.test.mjs','a63c7b5266ac5c0acd1201717025df85d008be6ec6ca63fce208a677fd58efa9'],
 ['tests/potion-sts-structure.test.mjs','56b91c313e26d1129a39b7678a39df7df38a71a2252deb060351c5cc115e6118'],
 ['tests/sts-selection-fade.test.mjs','3257ed5beda1cca328ac38a080f9112e9394f6d4152d0a0d27e9a6765182df1b',
  '75de678debbfb7e1cdacb94607e448f2a9aecd98b85d2a05d3ff59523d916266'],
];
function beforeReleaseJsInventory(paths,read){
 return releaseAddedJs.reduce((prior,test)=>beforeAddedTest(prior,test,read),paths);
}
export function beforeReleaseLuaInventory(paths,read=readFileSync){
 paths=beforeAddedTest(paths,['tests/lua/detail_latency.lua','571549b4b6819079fe7b353abfbd56ef1f5733f8f316246d4e44e1527e98020e'],read);
 paths=beforeAddedTest(paths,['tests/lua/potion_management_visual.lua','4732441f834fa47346ac567392bb4c68758b580b091ef2ce54ab05591d89c5f4'],read);
 return beforeShopEntryInventory(paths,'lua',read);
}
export function assertCurrentJsInventory(paths,preceding,read=readFileSync){
 paths=beforeReleaseJsInventory(paths,read);
 paths=beforeRefinedReleaseJsInventory(beforeShopEntryInventory(paths,'js',read),[...preceding,coopLabTest],read,true);
 assertCoopJsInventory(paths,preceding,read);
}
export function beforeCoopJsInventory(paths,preceding,read=readFileSync){
 paths=beforeReleaseJsInventory(paths,read);
 paths=beforeRefinedReleaseJsInventory(beforeShopEntryInventory(paths,'js',read),[...preceding,coopLabTest],read);
 if(!paths.includes(coopLabTest))return paths;
 assertCoopJsInventory(paths,preceding,read);
 return paths.filter(path=>path!==coopLabTest);
}
const closeoutSuccessors=Object.freeze({
 'scripts/ci-shards.mjs':'6becba66be6048f090cd0036c2e5292f180d9010bbe24aef181977dca18fdeb3',
 'tests/defect-integration-source.test.mjs':'e20ed02229b4e316bce92decaec45037eeceb8116f31216b8970c7964674f1c0',
 'tests/defect-utility-planning.test.mjs':'b93215b0cece7151a1929d0535c40595f7a3d9586f237ba0a3966f52687142c1',
 'tests/art-feature-source-inverse.test.mjs':'6627174ae56ab48b831a69e947fa30fb355879095d35f5cdd92b4ae641d1d1dd',
 'scripts/check-architecture.mjs':'328658e71bcb57a2fcf1455e8daa6b31ad15ca1ae1078158ac91bd5b6931befa',
 'scripts/check-quality-ratchet.mjs':'a8d2d90d5767a499c80d44214375400983611c4f9aad3739bada901b59f0b9ce',
 'tests/architecture.test.mjs':'31db85476a8c725950c5e58926edd7cfcfedd493469a56531ecef840d64e547d',
});

// Reuse the existing immutable archive for historical inputs while authenticating
// exact live source successors, including their current tests.
const sourceSuccessors=Object.freeze({
 // Bind the v2.0.0 candidate metadata without rewriting any archived view.
 'package.json':'f1b1fa527b0a019901c4aa48789a52df9efd31e00f7b4c0ca19057efc2fae15a',
 'package-lock.json':'4324b6b6d38e7c8dc3d8d00a374663cf4eaf27e02f72ca4eebd51a63414c2436',
 '.release-please-manifest.json':'9e38a481f52b5af8537babca8f5d13d5a0ab72473e1deba2e1aeb71e05dcd5b9',
 'CHANGELOG.md':'50a35daf679051577ce4cc49709a6914ecd01378294ef76b06057541046808f8',
 'docs/legal/assets.json':'1092785bd84163abd9ba779f6447807513c3ddf1bb8c0787584a93b1fb468b70',
 'scripts/official-portraits.mjs':'03d4ea596257e87e4d3ea3f22fc1f1e938f516b8d20c4e9983aceeb51d5b5186',
 'tests/lumine-idle.test.mjs':'183cc0be21ca7a757e3cde25529064a62d5315915e88c3427412786e9ad69e09',
 'tests/official-assets.test.mjs':'455ab9407e88aa5be83ec0900ee6f60321acbbad859fc2bdf59b11183b868f8c',
 'tests/official-portraits-build.test.mjs':'06280b8717f0c0194479cab956e3fea53d00b7d26c06f3fbb37b1152224e4a63',
 'tests/build-ui-input-protection.test.mjs':'ee2171a48378827f623bed2795c7924c5cf1c2548fecc1dfce016cb4e9620318',
 'tests/v25-portrait-profile.test.mjs':'def7e70b4e64fbb5a901407ade2a379af647220afc900de2b4f550ee7c214403',
 'data/presentation/narrative.zh-CN.json':'5db5e77f3789a98e49335bb2443e44f8703ebe349e9e1cd524cfb64a0a3006aa',
 'tests/lore-v2.test.mjs':'2aee46188d476f8ee24b0a736da4d2dcfb214c9f2fe54d5593f1c937a7d67d9f',
 'tests/lua/merchant_dialogue_lifecycle.lua':'25393fa6499858dbbf9551b416aca5930d93426b366c6f6c5123ee611bf3cb06',
 'scripts/check-task-intake.mjs':'972cbe675515a1fd4f7866170c37bd7568b94c6dbeca1e7bf340e46742e42029',
 'tests/sprint-intake.test.mjs':'daeabe161a8a7996b9961b46c37775ffb0e07639a4b34ab32f84f7a658d65929',
 'scripts/backlog-metadata.mjs':'082c419cbd0e20eae4ec4cb36f93541af3149f686dd064f06f5a12c983e27933',
 'scripts/backlog-closeout.mjs':'f732936568466ee86ddfd9735e318a9f03284caa2f45abffd66b319cca58d8b5',
 'scripts/verify-backlog-roadmap.mjs':'1d535b694c4d6a6d62cef7c973105fe02d48c55dc3e109e5f3eab0ebcdd3affb',
 'tests/backlog-roadmap.test.mjs':'b4a523a6a7763e825804404a270da6a401a17b59b9855b701a82cb8571f3b17d',
 'tests/delivery.test.mjs':'f74b528375f1f487985a4c108687cd62b61fccb2a23070bb5810205fb69cfc2a',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'c875f2290f59590c6b06e851b627dcac3d684a4e288f6ae88ff839cb3b79c017',
 'tests/helpers/closeout-source-epoch.mjs':'5c47cf4cfa424551010f1e12f39fc84363ad77c93733c4f3d3e8932e00e1c4c9',
 'tests/helpers/copy-integration-source-closure.mjs':'c0a43b2cfca0c01bc6608fbd4f8bcd279c4d91c3d839d92654daf0513bc6d2f3',
 'tests/ci-complete-calibration.test.mjs':'0581fa1b5e5e7735a85337a02c7ad9a5826cc59c36b56d4233da1d34924ad268',
 'tests/integration-source-epoch.test.mjs':'52c1cb8227f7849a1757d531c82611d36f7d73cad3462185599d18b9be096440',
 'tests/defect-actor-boundary.test.mjs':'bd3deb3006a06adb5b8cb5f1bbda90a354882b015d5a57bd1c1623df35dfb039',
 'tests/defect-final-source-epoch.test.mjs':'c5d27da04e6430a3bb4da253075cf0b7fe5baf5599c86dad8d9b922eafb72651',
 'tests/encounter-formation-source-epoch.test.mjs':'1a624e24e88927828d3d09012145046bcc0317c99757c6aa2d8b30e4ff55e399',
 'tests/room-ui-source-epoch.test.mjs':'230214c3b5f21e8f440c21178afd5636fc1219b528bfb2fffe446150e15e1d20',
 'tests/watcher-actor-boundary.test.mjs':'1954759b210bc333d65550e9abda023e0fe5aaa9b7253ce6aa1ea1939cabc909',
 'tests/helpers/replay-reviewed-selection.mjs':'47ba348e9a26348b1ed0255cd16bb9099cf5767986a70a28f2f132c39f4c278d',
 ...closeoutSuccessors,
});
const archiveFiles=JSON.parse(gunzipSync(integratedCiBytes)).files;
let closeoutPredecessors;
function closeoutPredecessor(path){
 assert(Object.hasOwn(closeoutSuccessors,path),'registered closeout CI successor: '+path);
 if(!closeoutPredecessors){
  const archive=readFileSync(new URL('./closeout-ci-source.json.gz',import.meta.url));
  assert.equal(hash(archive),'cfc72306af30d0d4b0b61398e3ed0eea36767d6e005c146eb215897fc431a8f8','immutable closeout CI sources');
  const {current,records}=JSON.parse(gunzipSync(archive));
  closeoutPredecessors=new Map(Object.keys(closeoutSuccessors).map(file=>{
   const sha256=current[file];
   assert.match(sha256??'',/^[a-f0-9]{64}$/,'archived closeout predecessor: '+file);
   return [file,{sha256,source:records[sha256]}];
  }));
 }
 return closeoutPredecessors.get(path);
}
function beforeIntegrationSuccessor(path,source){
 if(!Object.hasOwn(sourceSuccessors,path)||typeof source!=='string'||source.includes('\r\r\n')
   ||hash(normalize(source))!==sourceSuccessors[path])return source;
 const prior=archiveFiles[path]?.current??closeoutPredecessor(path);
 assert.equal(hash(prior.source),prior.sha256,'immutable integration predecessor: '+path);
 return source.includes('\r\n')?prior.source.replaceAll('\n','\r\n'):prior.source;
}
export function assertIntegrationSuccessorsCurrent(read=readFileSync){
 const prior=read;
 read=releaseRewardDisplayPriorRead((path,...args)=>beforeCharacterSelectionSource(path,prior(path,...args)));
 const requireCurrent=assertCapacitySources(read);
 read=beforeCapacityRead(shopEntryPreflightRead(read),requireCurrent);
 assertRefinedReleaseSourcesCurrent(read);
 read=combatVisualPriorRead(read);
 for(const [path,row] of Object.entries(coopLabCi.files)){
  const source=beforeV2UiEvidence(path,beforeReleaseUiBuildSource(path,read(path,'utf8')));
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===row.afterSha,'fresh complete integration source: '+path);
 }
 for(const [path,sha] of Object.entries(sourceSuccessors)){
  const source=beforeV2UiAdmission(path,beforeCoopCiSource(path,read(path,'utf8')));
  assert(typeof source==='string'&&!source.includes('\r\r\n')&&hash(normalize(source))===sha,'fresh complete integration source: '+path);
 }
}
export function beforePreflightSource(path,source,view='prior'){
 if(Object.hasOwn(Object.prototype,path))return source;
 source=beforeCharacterSelectionSource(path,source);
 source=beforeCharacterPreparationCiSource(path,beforeV2UiAdmission(path,beforeCoopCiSource(path,source)));
 source=beforeIntegrationSuccessor(path,source);
 // Only the exact flag-registry successor enters the earlier Release witness.
 if(view==='release-bootstrap'&&path==='scripts/ui-profile.mjs'&&typeof source==='string'&&!source.includes('\r\r\n')
  &&hash(normalize(source))==='b45c87c321573e91d3c8e838e837e3db839d79d2758459a67543b763df8c1734'){
  const prior=stsStylePriorRuntime.files[path];
  assert.equal(prior.sha256,'2df6c3fd8f16f41a36db51bd76bdd53f2e805ee92a35ca0d03e91f50d93dfdd3','archived candidate policy predecessor');
  return prior.source;
 }
 const transportRow=Object.hasOwn(transport.files,path)?transport.files[path]:null;
 if(transportRow&&['prior','release-bootstrap'].includes(view)&&typeof source==='string'&&
  !source.includes('\r\r\n')&&hash(normalize(source))===transportRow.currentSha)
  source=source.includes('\r\n')?transportRow.before.replaceAll('\n','\r\n'):transportRow.before;
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(normalize(source))!==(Object.hasOwn(currentHashes,path)?currentHashes[path]:row.currentSha))return source;
 assert(['prior','release-bootstrap'].includes(view),'explicit preflight predecessor view');
 const prior=view==='release-bootstrap'?row.releaseBootstrapBefore?.source:row.before;
 // Newly introduced gates have no historical implementation to invent or hide.
 if(prior===undefined||prior===null)return source;
 const eol=source.includes('\r\n')?'\r\n':'\n';return prior.replaceAll('\n',eol);
}
export function preflightPriorRead(read=readFileSync,view='prior'){return(path,encoding)=>{
 const raw=read(path,encoding);if(typeof raw!=='string'&&!Buffer.isBuffer(raw))return raw;
 const text=typeof raw==='string'?raw:raw.toString('utf8'),prior=beforePreflightSource(path,text,view);
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};}
