import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {patchRuntime} from './candidate-patch.mjs';

const output=resolve(process.argv[2]??'build/precision-measure');
mkdirSync(output,{recursive:true});
const source=patchRuntime(readFileSync('src/lua/abyss_card_art_runtime.lua','utf8'));
writeFileSync(join(output,'abyss_card_art_runtime.lua'),source);
const cli=resolve('node_modules/fengari-node-cli/src/lua-cli.js');
for(const tier of [60,100,160,250,400]){
  const timing=spawnSync(process.execPath,[cli,'-e',
    'assert(dofile(os.getenv("PRECISION_LAB_RUN")) == nil)'],{
    encoding:'utf8',timeout:90000,env:{...process.env,
      PRECISION_LAB_RUN:resolve('experiments/card-art-precision-lab/measure.lua'),
      PRECISION_LAB_TIER:String(tier),
      LUA_PATH:output.replaceAll('\\','/')+'/?.lua;./build/lua/?.lua;./src/lua/?.lua;;'},
  });
  assert.equal(timing.status,0,timing.stderr);
  assert.equal(timing.stdout.trim().split('\n').length,152);
  writeFileSync(join(output,`timing-${tier}.csv`),timing.stdout);
  console.log(tier,timing.stdout.trim().split('\n').length-1);
}
