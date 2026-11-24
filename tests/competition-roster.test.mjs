import {preAcceptedPr323Source} from './helpers/pr323-accepted-source-inverse.mjs';
import {preRosterConfigSource} from './helpers/competition-roster-config-composition.mjs';
import test from 'node:test';
import {historicalTest} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {preRosterSource,rosterSourceBindings as proof} from './helpers/competition-roster-source-inverse.mjs';
import {preRetirementSource} from './helpers/presentation-announcement-retirement.mjs';
import {preAcceptedPresentation} from './helpers/p0-presentation-inverse.mjs';
historicalTest('roster source inverse preserves the complete accepted sources and rejects original admission drift',()=>{
  assert.equal(proof.base,'cec690c1701af121e370facde5c1ca2ad9beb99e');
  assert.deepEqual(Object.keys(proof.files),['src/lua/abyss_game_ui.lua','src/lua/abyss_character_select_view.lua','config/architecture.json']);
  for(const [path,binding]of Object.entries(proof.files)){
  const project=path.endsWith('abyss_game_ui.lua')?preRetirementSource:preAcceptedPresentation;
  const source=preRosterConfigSource(path,preAcceptedPr323Source(path,readFileSync(path,'utf8')).replaceAll('\r\n','\n'),'roster');
  const before=preRosterSource(path,source);
  assert.notEqual(source,before);
  assert.equal(createHash('sha256').update(before).digest('hex'),binding.beforeSha256);
  assert.equal(project(path,source),project(path,before));
  for(const hunk of binding.hunks){
    const lines=source.split('\n');
    assert.deepEqual(lines.slice(hunk.at,hunk.at+hunk.after.length),hunk.after);
    const duplicate=hunk.after.length?[...hunk.after,...hunk.after]:[...hunk.before,...hunk.before];
    for(const replacement of [hunk.before,duplicate]){
      const changedLines=[...lines];changedLines.splice(hunk.at,hunk.after.length,...replacement);
      const changed=changedLines.join('\n');assert.notEqual(changed,source);
      if(changed===before)assert.equal(project(path,changed),project(path,before),'an exact whole accepted source remains a usable prior witness');
      else assert.throws(()=>project(path,changed),/unreviewed integrated retirement source drift/);
    }
  }
  assert.throws(()=>project(path,source+'\n-- unrelated drift\n'),/unreviewed integrated retirement source drift/);
  }
});
for (const [name, marker] of [
  ['run', 'COMPETITION_ROSTER_RUN_PASS 4'],
  ['ui', 'COMPETITION_ROSTER_UI_PASS'],
]) test(`competition roster ${name} permits public Geo, keeps development Raiden and rejects unavailable effective identities`, () => {
  const result=runLua(`tests/lua/competition_roster_${name}.lua`);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.ok(result.stdout.includes(marker),result.stdout);
});
test('current competition roster rejects stale touches across shared starter browsing and resize',()=>{
  const result=runLua(resolve('tests/lua/competition_roster_ui.lua'));
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/COMPETITION_ROSTER_UI_PASS native controls\/direct config\/touch\/stale confirm/);
});
test('native startup failure lifecycle covers competition Geo and retained full-source Watcher',()=>{
  const result=runLua('tests/lua/game_ui_classes_failure.lua');
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/GAME_UI_CLASSES_FAILURE_PASS 7/);
});


test('relative roster StS replay composes exact integration successors before its frozen witness',async()=>{
 const {beforeCurrentHistoricalStsSource}=await import('./helpers/calibration-replay-sources.mjs');
 const {inputRetirementStsFixtureSource}=await import('./helpers/input-retirement-sts-binding.mjs');
 const path='tests/integration-source-epoch.test.mjs',raw=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const digest=s=>createHash('sha256').update(s).digest('hex');
 for(const input of [raw,raw.replaceAll('\n','\r\n'),Buffer.from(raw)]){
  const witness=beforeCurrentHistoricalStsSource(path,input),text=Buffer.isBuffer(witness)?witness.toString('utf8'):witness;
  assert.equal(digest(text.replaceAll('\r\n','\n')),'58159c0c30a0bbd658c1d47543c2350d8534198c43c4ba59b03318f14195178d','exact pre-entrance merged integration witness');
  const prior=inputRetirementStsFixtureSource(path,witness),result=Buffer.isBuffer(prior)?prior.toString('utf8'):prior;
  assert.equal(digest(result.replaceAll('\r\n','\n')),'91dcae5efd5e6625764f85069f1552aaf7bfe5644d1b4c86e350faf90a9d576f','complete immutable archived StS integration source');
  assert.equal(Buffer.isBuffer(prior),Buffer.isBuffer(input),'historical reader preserves Buffer type');
 }
 for(const drift of [raw+'\n',raw.replaceAll('\n','\r\r\n')]){
  assert.equal(beforeCurrentHistoricalStsSource(path,drift),drift,'unknown complete bytes stay opaque');
  assert.throws(()=>inputRetirementStsFixtureSource(path,drift),/fresh composed StS integration source/);
 }
});
