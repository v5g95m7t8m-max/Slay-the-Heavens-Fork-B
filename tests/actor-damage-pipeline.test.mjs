import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
import {runStatic} from '../scripts/check-lua-static.mjs';
import {discoverSources,measureSources} from '../scripts/lua-quality-metrics.mjs';
import {readFileSync,readdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {luaString} from '../scripts/build-lua-data.mjs';
import {assertActorFocusInventory,assertDevelopBackflowCurrent,authenticateDevelopBackflow,beforeDevelopBackflow} from './helpers/develop-release-backflow-source.mjs';

test('Actor damage pipeline retains modifiers, reaction order and original object rollback',()=>{
  const result=runLua('tests/lua/actor_damage_pipeline.lua');
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/ACTOR_DAMAGE_PIPELINE_PASS 5/);
});
test('Actor and Focus replay exact predecessor bytes and reject changed linked owners',()=>{
  const archive=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/develop-actor-focus-source.json.gz',import.meta.url))));
  const stasis=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/develop-stasis-upgrade-boundary-source.json.gz',import.meta.url))));
  const config='config/architecture.json';
  const read=path=>readFileSync(path,'utf8').replaceAll('\r\n','\n');
  const paths=readdirSync('src/lua').filter(path=>path.endsWith('.lua')).map(path=>'src/lua/'+path);
  assertActorFocusInventory(paths,read);
  assert.throws(()=>assertActorFocusInventory([...paths,'src/lua/foreign.lua'],read),/complete current Actor\/Focus Lua module inventory/);
  for(const added of Object.keys(archive.added)){
    assert.throws(()=>assertActorFocusInventory(paths.filter(path=>path!==added),read),/complete current Actor\/Focus Lua module inventory/);
    assert.throws(()=>assertActorFocusInventory([...paths,added],read),/complete current Actor\/Focus Lua module inventory/);
    assert.equal(beforeDevelopBackflow(added,read(added)),read(added));
  }
  const crlf=source=>source.replace(/\r?\n/g,'\r\n');
  for(const [path,{before}] of Object.entries(archive.files)){
    const live=read(path);
    const prior=path===config?stasis.files[config].before.source:before.source;
    assert.equal(authenticateDevelopBackflow(path,live,read),live.includes('\r\n')?crlf(prior):prior);
    assert.equal(authenticateDevelopBackflow(path,crlf(live),owner=>crlf(read(owner))),crlf(prior));
    assert.throws(()=>assertDevelopBackflowCurrent(path,before.source),/fresh current production owner/);
    assert.equal(authenticateDevelopBackflow(path,live+'\n',()=>assert.fail('unknown bytes must not read owners')),live+'\n');
    const doubleCr=live.replace(/\r?\n/g,'\r\r\n');
    assert.notEqual(doubleCr,live,'double CR negative must change bytes');
    assert.equal(authenticateDevelopBackflow(path,doubleCr,()=>assert.fail('double CR source must not read owners')),doubleCr);
    for(const owner of [...Object.keys(archive.files),...Object.keys(archive.added)]){
      const stale=archive.files[owner]?.before.source??read(owner)+'\n';
      assert.throws(()=>authenticateDevelopBackflow(path,live,p=>p===owner?stale:read(p)),/linked owner identity/);
      assert.throws(()=>authenticateDevelopBackflow(path,live,p=>{
        if(p===owner)throw Error('deleted');
        return read(p);
      }),/linked owner missing/);
    }
  }
  const stasisConfig=archive.files[config].before.source;
  for(const format of [source=>source,crlf]){
    const previous=format(stasisConfig);
    const before=format(stasis.files[config].before.source);
    const live=path=>format(read(path));
    assert.equal(beforeDevelopBackflow(config,previous),before);
    assert.equal(authenticateDevelopBackflow(config,previous,path=>path===config?previous:live(path)),before);
    assert.throws(()=>authenticateDevelopBackflow(config,previous,live),/linked owner identity: config\/architecture\.json/);
  }
  const stasisOwners=[...Object.keys(stasis.files),...Object.keys(stasis.added)];
  for(const owner of stasisOwners){
    const stale=owner===config?stasisConfig:read(owner)+'\n';
    assert.throws(()=>authenticateDevelopBackflow(config,read(config),path=>path===owner?stale:read(path)),/linked owner identity/);
  }
  const stasisPath='src/lua/abyss_act2_stasis.lua';
  assert.equal(authenticateDevelopBackflow(stasisPath,read(stasisPath),read),read(stasisPath).includes('\r\n')?crlf(stasis.files[stasisPath].before.source):stasis.files[stasisPath].before.source);
  assert.throws(()=>authenticateDevelopBackflow(stasisPath,read(stasisPath),path=>path===config?stasisConfig:read(path)),/linked owner identity/);
});
test('a Bias tick ignores the legacy optional turn API and consumes one Artifact',()=>{
  const directory=mkdtempSync(join(tmpdir(),'actor-focus-bias-'));
  try{
    const driver=join(directory,'bias.lua');
    writeFileSync(driver,`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Focus=require('abyss_focus')
local Combat=require('abyss_combat')
local s=Combat.new(require('abyss_data'),{seed=42,orbSlots=3,deck={{cardId='strike'}},enemies={'jaw_worm'}})
local p=s.player
assert(Focus.apply(s,p,5,p))
p.statuses.bias=2;p.statuses.artifact=1
local ignored=setmetatable({},{__index=function()error('optional turn API was inspected')end})
assert(not Focus.startTurn(s,ignored));assert(p.statuses.focus==5 and p.statuses.artifact==0)
local reduction=s.events[#s.events]
assert(reduction.kind=='status' and reduction.detail.status=='artifact' and reduction.detail.blockedStatus=='focus')
assert(reduction.sourceIntentPowers.origin=='ArtifactPower.queuedReduction')
assert(Focus.startTurn(s,ignored));assert(p.statuses.focus==3 and s.orbs.focus==3)
assert(require('abyss_stance_damage')~=require('abyss_stances'))
`);
    const result=runLua(driver);
    assert.equal(result.status,0,result.stdout+result.stderr);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('Actor damage and all extracted pipeline responsibilities have complete CC15 measurements',()=>{
  const measurements=measureSources(discoverSources(),runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics);
  assert.deepEqual(measurements.errors,[]);
  const actor=measurements.modules.find(m=>m.file==='src/lua/abyss_actor.lua');
  const names=['damageAmount','consumeAttackBlock','modifyIncomingAttack','applyAttackHpLoss','queueHitPowers','queueAttackedPowers','M.damage'];
  for(const name of names){
    const functions=actor.functions.filter(f=>f.name===name);
    assert.equal(functions.length,1,`${name}: complete measurement`);
    assert(functions[0].complexity<=15,`${name}: ${functions[0].complexity} exceeds 15`);
  }
  const start=actor.functions.find(f=>f.name==='damageAmount').line,end=actor.functions.find(f=>f.name==='M.blockFloat').line;
  for(const f of actor.functions.filter(f=>f.kind==='function'&&f.line>=start&&f.line<end))assert(f.complexity<=15,`${f.name}: nested/helper budget`);
});
test('damage modifiers, snapshot bounds and retaliation-order mutations fail actual behavior',()=>{
  const source=readFileSync('src/lua/abyss_actor.lua','utf8').replaceAll('\r\n','\n');
  const rare="    if target==state.player then unblocked=require('abyss_relic_family_combat').rare.onAttacked(state,source,fixed and 'thorns'or 'normal',unblocked)end";
  const last="    if target==state.player then unblocked=require('abyss_relic_queries').hooks.onLoseHpLast(state,unblocked)end";
  const mutations=[
    ['fixed Boot','source==state.player and not fixed and unblocked>0','source==state.player and unblocked>0'],
    ['snapshot integer bound','normalAmount<=9007199254740991','normalAmount<=9007199254740992'],
    ['last HP-loss stage',rare+'\n'+last,last+'\n'+rare],
    ['TOP reaction direction','for i = #reactions, 1, -1 do','for i = 1, #reactions do'],
  ];
  const directory=mkdtempSync(join(tmpdir(),'actor-damage-mutants-'));
  try{
    for(const [label,before,after] of mutations){
      assert.equal(source.split(before).length-1,1,`${label}: unique current mutation`);
      const mutant=join(directory,'actor.lua'),driver=join(directory,'driver.lua');
      writeFileSync(mutant,source.replace(before,after));
      writeFileSync(driver,`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path;package.loaded.abyss_actor=dofile(${luaString(mutant.replaceAll('\\','/'))});dofile(${luaString(resolve('tests/lua/actor_damage_pipeline.lua').replaceAll('\\','/'))})`);
      const result=runLua(driver);
      assert.notEqual(result.status,0,`${label}: mutant survived`);
      assert.match(result.stdout+result.stderr,/\[ACTOR_DAMAGE\]/,`${label}: behavioral assertion required`);
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
});
