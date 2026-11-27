// Exact placement epoch only. No timing, budget, concurrency or runtime projection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./posix15-shape-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'9f75ddcfc0b6b5ef19c1750efab7d7a5360d9da4825a93de3c9cfe9e702e9b06');
export const posix15ShapeProof=Object.freeze(JSON.parse(gunzipSync(bytes)));
assert.equal(hash(posix15ShapeProof.beforeSource),posix15ShapeProof.beforeSha256);
assert.equal(hash(posix15ShapeProof.afterSource),posix15ShapeProof.afterSha256);
export function prePosix15ShapeSource(path,source){
 if(path!==posix15ShapeProof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==posix15ShapeProof.afterSha256)return source;
 return posix15ShapeProof.beforeSource;
}

// The current sixteen-way matrix advances the launcher and its live Full checks.
// Frozen fifteen-way receipts still read their exact complete earlier bytes.
const posix16Sources={
 "scripts/ci-quality-shape.mjs": {
  "before": {
   "sha256": "86b519a185be48c2b9417761b6a9f81ff7c30cd015c534e992f2f50da317ee78",
   "gitBlob": "ec19d20e3722a7e328ec6cab29ea4a00c3b61a3d"
  },
  "after": {
   "sha256": "95cf9add27bab57bf69ee858850a14568c51b404b70c994cf137911b918a1b05",
   "gitBlob": "592a97e6eb3cf2d3a9712ad29694167caddd3a6a"
  },
  "hunks": [
   {
    "at": 3,
    "before": "  posix:Object.freeze(Array.from({length:15},(_,i)=>i+1)),",
    "after": "  posix:Object.freeze(Array.from({length:16},(_,i)=>i+1)),"
   }
  ]
 },
 "tests/ci-complete-calibration.test.mjs": {
  "before": {
   "sha256": "27c89e80fa88fddb6c7f0c2efaf270d7292e1279307d4e2cec521cfb4ce3b93a",
   "gitBlob": "a69967b62ef5a2df1a36d3589901d75b4fe75634"
  },
  "after": {
   "sha256": "c69803746dcd6cd97ca674236e675fd2dd191d4a84fa5790e01e358f69c987e5",
   "gitBlob": "3a372200ca0b6557dc37f215ba74d66719aaf083"
  },
  "hunks": [
   {
    "at": 23,
    "before": "import {prePosix15ShapeSource,posix15ShapeProof} from './helpers/posix15-shape-source-inverse.mjs';",
    "after": "import {prePosix15ShapeSource,posix15ShapeProof,prePosix16ReceiptSource} from './helpers/posix15-shape-source-inverse.mjs';"
   },
   {
    "at": 124,
    "before": "const path='scripts/ci-test-timings.json',binding=proof.files[path],before=JSON.parse(binding.beforeSource),after=JSON.parse(binding.afterSource),e=proof.evidence;",
    "after": "const full38Path='scripts/ci-quality-shape.mjs';\nconst full38Shape=prePosix16ReceiptSource(full38Path,rawBootstrapReadFileSync(full38Path,'utf8'));\nconst {qualityShardMatrices:full38Matrices,qualityShardJobs:full38ShardJobs}=await import('data:text/javascript,'+encodeURIComponent(full38Shape));\nconst full38Jobs=['check','presentation','engineering-posix',...full38ShardJobs,'impact','fast'];\nconst path='scripts/ci-test-timings.json',binding=proof.files[path],before=JSON.parse(binding.beforeSource),after=JSON.parse(binding.afterSource),e=proof.evidence;"
   },
   {
    "at": 461,
    "before": " assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(currentQualityShardJobs.length,33);assert.equal(currentFullQualityJobs.length,38);assert.equal(new Set(currentFullQualityJobs).size,38);",
    "after": " assert.deepEqual(full38Matrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(full38ShardJobs.length,33);assert.equal(full38Jobs.length,38);assert.equal(new Set(full38Jobs).size,38);"
   },
   {
    "at": 1713,
    "before": " assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(currentFullQualityJobs.length,38);",
    "after": " assert.deepEqual(full38Matrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(full38Jobs.length,38);"
   },
   {
    "at": 1883,
    "before": " assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(currentFullQualityJobs.length,38);",
    "after": " assert.deepEqual(full38Matrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n assert.equal(full38Jobs.length,38);"
   },
   {
    "at": 2039,
    "before": " for(const [platform,count,budget]of [['win32',18,1800000],['linux',15,1200000]]){",
    "after": " const platforms=[['win32',currentQualityShardMatrices.windows.length,1800000],['linux',currentQualityShardMatrices.posix.length,1200000]];\n for(const [platform,count,budget]of platforms){"
   },
   {
    "at": 2067,
    "before": " assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});\n for(const [platform,count,target,guard]of [['win32',18,1800000,10800000],['linux',15,1200000,5400000]]){",
    "after": " assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:18},(_,i)=>i+1),posix:Array.from({length:16},(_,i)=>i+1)});\n assert.equal(currentQualityShardJobs.length,34);\n assert.equal(currentFullQualityJobs.length,39);\n assert.equal(new Set(currentFullQualityJobs).size,39);\n for(const [platform,count,target,guard]of [['win32',18,1800000,10800000],['linux',16,1200000,5400000]]){"
   }
  ]
 },
 "tests/ci-impact.test.mjs": {
  "before": {
   "sha256": "92266545b92953179280a11f5f523511168fc94ce43e7a797e30eb6779eb75e8",
   "gitBlob": "318fd58eaad60b56cca3f973bedc142990a56375"
  },
  "after": {
   "sha256": "f0d58ccffc4236a6099ea118901acd2079cc7091b9bb8c9461dc5c486e3ccc93",
   "gitBlob": "75db62051bbfdd88ba0cabda91824cb9d7d01e69"
  },
  "hunks": [
   {
    "at": 249,
    "before": " const root=mkdtempSync(join(tmpdir(),'impact-posix15-')),cli=resolve('scripts/ci-impact.mjs');",
    "after": " const root=mkdtempSync(join(tmpdir(),'impact-posix16-')),cli=resolve('scripts/ci-impact.mjs');"
   },
   {
    "at": 275,
    "before": "   assert.equal(JSON.parse(emitted.windows_shards).length,18);assert.equal(JSON.parse(emitted.posix_shards).length,15);",
    "after": "   assert.equal(JSON.parse(emitted.windows_shards).length,18);assert.equal(JSON.parse(emitted.posix_shards).length,16);"
   }
  ]
 },
 "tests/ci-posix-shards.test.mjs": {
  "before": {
   "sha256": "ca20baafcff1ae9d8e35ec0829f3aac5acfdff5160cb7778c2877c60f2d3ab06",
   "gitBlob": "251c465ceab1eb73bd7d267e1346f830785981c8"
  },
  "after": {
   "sha256": "dba2f03a4dd27354039e20df853c9a6d6f2cda5b1e5793cef4614c01100829b5",
   "gitBlob": "93e61d93af02f513bc34e64c3bacdc9a162428a9"
  },
  "hunks": [
   {
    "at": 72,
    "before": "test('current POSIX matrix consumes fifteen shared shards with serial full regression and the authorized execution guard',()=>{\n  assert.deepEqual(qualityShardMatrices.posix,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);",
    "after": "test('current POSIX matrix consumes sixteen shared shards with serial full regression and the authorized execution guard',()=>{\n  assert.deepEqual(qualityShardMatrices.posix,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);"
   }
  ]
 },
 "tests/delivery.test.mjs": {
  "before": {
   "sha256": "7a0f5169fd0dfd51b5eef6cbb0f11cbd84fdfe430af2e59534a91de8e4c0913b",
   "gitBlob": "21f9aa13b9de54d6157d3887d6edca4517b10a3e"
  },
  "after": {
   "sha256": "8581a4d4210be75533edeffe23dc90c2f24ce5083f9e8a0cf2adb73925f5f839",
   "gitBlob": "fe8fa0c10a81f82467b7d2a3e774f951c3eb2ce9"
  },
  "hunks": [
   {
    "at": 552,
    "before": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]].map(([windows,posix])=>e=>{",
    "after": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15],[18,15]].map(([windows,posix])=>e=>{"
   },
   {
    "at": 558,
    "before": "  e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)'),\n  e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:3000}),\n  e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').name='engineering-posix (15/14)',",
    "after": "  e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (16/16)'),\n  e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (16/16)'),id:3000}),\n  e=>e.jobs.find(j=>j.name==='engineering-posix (16/16)').name='engineering-posix (16/15)',"
   },
   {
    "at": 714,
    "before": "    assert.deepEqual(qualityShardMatrices.posix,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);\n    assert.equal(qualityShardJobs.length,33,'current hosted shape is 18 Windows plus 15 POSIX shards');",
    "after": "    assert.deepEqual(qualityShardMatrices.posix,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);\n    assert.equal(qualityShardJobs.length,34,'current hosted shape is 18 Windows plus 16 POSIX shards');"
   },
   {
    "at": 723,
    "before": "      Array.from({length:15},(_,i)=>`engineering-posix (${i+1}/15)`));",
    "after": "      Array.from({length:16},(_,i)=>`engineering-posix (${i+1}/16)`));"
   },
   {
    "at": 733,
    "before": "    const example=proof.jobs.find(job=>job.name==='engineering-posix (1/15)');",
    "after": "    const example=proof.jobs.find(job=>job.name==='engineering-posix (1/16)');"
   },
   {
    "at": 742,
    "before": "test('old fully green twenty-one-, twenty-five-, twenty-seven-, twenty-eight-, thirty-, thirty-three-, thirty-five-, thirty-six- and thirty-seven-job shapes cannot certify current delivery or supply its first-shard receipt',()=>{\n  for(const [windows,posix] of [[8,8],[11,9],[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]])for(const layer of ['preflight','push']){",
    "after": "test('old fully green twenty-one-, twenty-five-, twenty-seven-, twenty-eight-, thirty-, thirty-three-, thirty-five-, thirty-six-, thirty-seven- and thirty-eight-job shapes cannot certify current delivery or supply its first-shard receipt',()=>{\n  for(const [windows,posix] of [[8,8],[11,9],[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15],[18,15]])for(const layer of ['preflight','push']){"
   },
   {
    "at": 759,
    "before": "test('current PR and push delivery reject a missing eighteenth Windows or fifteenth POSIX shard, duplicates and forged job totals or source identity',()=>{",
    "after": "test('current PR and push delivery reject a missing eighteenth Windows or sixteenth POSIX shard, duplicates and forged job totals or source identity',()=>{"
   }
  ]
 },
 "tests/full-quality.test.mjs": {
  "before": {
   "sha256": "e48b9fb016894e281568bb54d7fff3f5d8e3aaf231c94ce985b209844f10b159",
   "gitBlob": "8784faa143ea6c9f5a77d52129347b76f53a0e90"
  },
  "after": {
   "sha256": "fbde3453f819e66953c18dd963d4e56ecea667c80e26f2ba4837878a574bc5ef",
   "gitBlob": "e65ace69d2774f886f28e3734faae8c368dece53"
  },
  "hunks": [
   {
    "at": 33,
    "before": "test('Full publisher cannot certify old 27/28/30/33/35/36/37-job shapes or a forged/missing current actual shard',()=>{",
    "after": "test('Full publisher cannot certify old 27/28/30/33/35/36/37/38-job shapes or a forged/missing current actual shard',()=>{"
   },
   {
    "at": 35,
    "before": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]].map(([windows,posix])=>e=>{",
    "after": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15],[18,15]].map(([windows,posix])=>e=>{"
   },
   {
    "at": 41,
    "before": "  e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (15/15)'),\n  e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (15/15)'),id:3000}),\n  e=>e.jobs.find(j=>j.name==='engineering-posix (15/15)').name='engineering-posix (15/14)',",
    "after": "  e=>e.jobs=e.jobs.filter(j=>j.name!=='engineering-posix (16/16)'),\n  e=>e.jobs.push({...e.jobs.find(j=>j.name==='engineering-posix (16/16)'),id:3000}),\n  e=>e.jobs.find(j=>j.name==='engineering-posix (16/16)').name='engineering-posix (16/15)',"
   },
   {
    "at": 51,
    "before": "  e=>{e.jobs=e.jobs.filter(job=>job.name!=='rules (18/18)');e.jobTotal=37;e.matrix={windows:17,posix:15};},",
    "after": "  e=>{e.jobs=e.jobs.filter(job=>job.name!=='rules (18/18)');e.jobTotal=38;e.matrix={windows:17,posix:16};},"
   },
   {
    "at": 54,
    "before": "  const e=fixture();assert.equal(e.jobs.length,38);mutate(e);",
    "after": "  const e=fixture();assert.equal(e.jobs.length,39);mutate(e);"
   },
   {
    "at": 264,
    "before": " assert.equal(qualityShardJobs.length,33);",
    "after": " assert.equal(qualityShardJobs.length,34);"
   }
  ]
 },
 "tests/helpers/ci-complete-calibration-source-inverse.mjs": {
  "before": {
   "sha256": "02ba9ca1d056022b3013127a3820f2225d840c8ec898243297c0e3769416a871",
   "gitBlob": "4cf36533bff813f8dbc6c11fc5909961808d8d49"
  },
  "after": {
   "sha256": "671d82d54a6beb4721b889679c7acf6f886557fac3c974fc8511337dc63fdf2b",
   "gitBlob": "4eaf95a3d2e00845718e4ef14ecface6da20305f"
  },
  "hunks": [
   {
    "at": 8,
    "before": "import {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';",
    "after": "import {prePosix15ShapeSource,prePosix16ReceiptSource} from './posix15-shape-source-inverse.mjs';"
   },
   {
    "at": 51,
    "before": " source=prePosix15ShapeSource(path,source);",
    "after": " if(path==='scripts/ci-quality-shape.mjs')source=prePosix16ReceiptSource(path,source);\n source=prePosix15ShapeSource(path,source);"
   }
  ]
 },
 "tests/helpers/reward-query-planning-contract.mjs": {
  "before": {
   "sha256": "34d12e5b885eda7d1c94dbb9a491f4d83308f81558c56780dc27094342fb9c9e",
   "gitBlob": "7002450ca93b4d2adfb9dbf4ede972c7a11de9d6"
  },
  "after": {
   "sha256": "3cfb060cbac9a7bb2affd70fffcdaa9f60bbe00ce2e035be7edcd45a86ec00c4",
   "gitBlob": "eb97d2ba0b683915aa2422df95cc5f7383b9ac55"
  },
  "hunks": [
   {
    "at": 0,
    "before": "import {prePosix15ShapeSource} from './posix15-shape-source-inverse.mjs';",
    "after": "import {prePosix15ShapeSource,prePosix16ReceiptSource} from './posix15-shape-source-inverse.mjs';"
   },
   {
    "at": 43,
    "before": "  const shape=prePosix14ShapeSource('scripts/ci-quality-shape.mjs',prePosix15ShapeSource('scripts/ci-quality-shape.mjs',preComponentUiCiSource('scripts/ci-quality-shape.mjs',liveContext.read('scripts/ci-quality-shape.mjs'))));",
    "after": "  const shapePath='scripts/ci-quality-shape.mjs';\n  const prior=prePosix16ReceiptSource(shapePath,liveContext.read(shapePath));\n  const shape=prePosix14ShapeSource(shapePath,prePosix15ShapeSource(shapePath,preComponentUiCiSource(shapePath,prior)));"
   }
  ]
 },
 "tests/merge-queue.test.mjs": {
  "before": {
   "sha256": "578416f0af2289dcba3fb0dbc6e5b617182a33a354e5e112ca0bc047f147b5a0",
   "gitBlob": "3730188f49017aa26efa975d3086fddc7129ce69"
  },
  "after": {
   "sha256": "fa081d94beefc070d98713bc0d461ad5d703589ca7d47fc5d8436c9ac1e2b9ac",
   "gitBlob": "04e8c8ff5e34ce9a655032fc7ffb26be9911a031"
  },
  "hunks": [
   {
    "at": 101,
    "before": "test('native queue rejects old 13/9, 14/9, 16/9, 16/12, 17/13, 17/14 or 17/15 green jobs, missing rules18 or POSIX15, duplicates and forged totals or source receipts',()=>{",
    "after": "test('native queue rejects old 13/9, 14/9, 16/9, 16/12, 17/13, 17/14, 17/15 or 18/15 green jobs, missing rules18 or POSIX16, duplicates and forged totals or source receipts',()=>{"
   },
   {
    "at": 105,
    "before": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15]].map(([windows,posix])=>e=>{",
    "after": "  ...[[13,9],[14,9],[16,9],[16,12],[17,13],[17,14],[17,15],[18,15]].map(([windows,posix])=>e=>{"
   },
   {
    "at": 324,
    "before": " assert.equal(qualityShardMatrices.posix.length,15);\n assert.equal(qualityShardJobs.length,33);",
    "after": " assert.equal(qualityShardMatrices.posix.length,16);\n assert.equal(qualityShardJobs.length,34);"
   }
  ]
 }
};

const cursesFormationFixture=Object.freeze({
 "path": "tests/ci-complete-calibration.test.mjs",
 "beforeSha256": "c69803746dcd6cd97ca674236e675fd2dd191d4a84fa5790e01e358f69c987e5",
 "afterSha256": "6bb186af1cfa4f682246c244ccac839f86e9e61db8c014e0841f5a91906215a2",
 "hunks": [
  {
   "at": 1503,
   "before": "   assert.equal(jointCiMatches(file,source,target),false);assert.equal(jointCiSourceAt(file,source,target),source);",
   "after": "   if(file==='tests/encounter-formation-source-epoch.test.mjs'&&target==='formationReceipt'){\n    // The exact Formation continuation has its own receipt; the sealed Curses source does not.\n    assert.equal(jointCiMatches(file,source,target),true);\n    assert.equal(hash(jointCiSourceAt(file,source,target)),'cc49af6185255c8b877e1fdc0d79028d1f676534fd65a0d1fd28f43536af29c0');\n    assert.equal(jointCiMatches(file,row.current,target),false);\n    assert.equal(jointCiSourceAt(file,row.current,target),row.current);\n   }else{\n    assert.equal(jointCiMatches(file,source,target),false);assert.equal(jointCiSourceAt(file,source,target),source);\n   }"
  }
 ]
});

export function prePosix16ReceiptSource(path,source){
 if(!Object.hasOwn(posix16Sources,path)||typeof source!=='string')return source;
 const {after,before,hunks}=posix16Sources[path];
 const lf=source.replaceAll('\r\n','\n');
 if(lf.includes('\r')||source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 const current=restoreExactFixtureHunks(cursesFormationFixture,path,lf);
 if(!exactSourceMatches(current,after))return source;
 const prior=restoreExactFixtureHunks({path,hunks,beforeSha256:before.sha256,afterSha256:after.sha256},path,current);
 assert(exactSourceMatches(prior,before),'exact fifteen-way Full receipt predecessor: '+path);
 return source===lf?prior:prior.replaceAll('\n','\r\n');
}
