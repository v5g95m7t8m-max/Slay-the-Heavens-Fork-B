import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {luaString} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';

const fixture='tests/lua/dynamic_monster_input_bindings.lua';
const detail='abyss_battle_detail_bindings';
const intentExit='on(host.cursor.CursorExit,function(event) cancel(false,false,event) end)';
const guardedIntentExit=`if not current() then return end\n            ${intentExit}`;
function moduleSource(name) {
  return readFileSync(`src/lua/${name}.lua`,'utf8').replaceAll('\r\n','\n');
}

function assertMutationFailure(t,name,source,message) {
  const directory=mkdtempSync(join(tmpdir(),'abyss-dynamic-input-mutation-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const script=join(directory,'mutation.lua');
  writeFileSync(script,`package.preload.${name}=function()return assert(load(${luaString(source)},'@mutation'))()end\ndofile(${luaString(fixture)})\n`);
  const result=runLua(script);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,message);
}

test('dynamic monster controls retain actor ownership and precisely retire stale input', () => {
  const result=runLua(fixture);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/DYNAMIC_MONSTER_INPUT_BINDINGS_PASS/);
  assert.match(result.stdout,/REENTRANT_RETIRE_SITES=11/);
  assert.match(result.stdout,/PARTIAL_BIND_FAILURE_SITES=11/);
});

test('old actor pointers cannot target the same ID in a replacement battle', t => {
  const name='abyss_battle_target_bindings';
  const source=moduleSource(name);
  const fence='or owner.run~=boundRun or not boundRun or boundRun.combat~=boundBattle then return end';
  assert.equal(source.split(fence).length,2);
  assertMutationFailure(t,name,source.replace(fence,'then return end'),/old battle identity remained usable/);
});

test('partial-bind injection requires intent cleanup to precede native registration', t => {
  const source=moduleSource(detail);
  const cleanup='if cleanups then cleanups[#cleanups+1]={control=control,cancel=cancel} end';
  assert.equal(source.split(cleanup).length,2);
  assert.equal(source.split(guardedIntentExit).length,2);
  assert.ok(source.indexOf(cleanup)<source.indexOf(guardedIntentExit));
  const mutation=source.replace(cleanup,'').replace(guardedIntentExit,`${cleanup}\n            ${guardedIntentExit}`);
  assertMutationFailure(t,detail,mutation,/partial intent Enter was not cleaned after native registration failed/);
});

test('reentrant retirement regression rejects continuation after intent cursor registration', t => {
  const source=moduleSource(detail);
  assert.equal(source.split(guardedIntentExit).length,2);
  assertMutationFailure(t,detail,source.replace(guardedIntentExit,intentExit),
    /registration continued after retirement at 6/);
});
