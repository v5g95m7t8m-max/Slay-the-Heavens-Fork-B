import {enemyFastRead} from './helpers/release-enemy-fast-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, linkSync, symlinkSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { loadReleaseNotes, notesSha256, gitSourceIdentity } from '../scripts/release-notes.mjs';
import { toLua } from '../scripts/build-lua-data.mjs';
import { sha256 } from '../scripts/evidence-files.mjs';
import {uiProfileSource,uiProfileReceipt} from '../scripts/ui-profile.mjs';

const script = new URL('../scripts/build-native-candidate.mjs', import.meta.url);
test('canonical production modules and the native candidate recipe include the same generated bindings',async()=>{
 const {generatedModules}=await import('../scripts/native-candidate-scripts.mjs');
 const {generatedRuntimeModules}=await import(script);
 assert.deepEqual([...generatedModules].sort(),Object.keys(generatedRuntimeModules).sort());
 assert.ok(generatedModules.includes('abyss_v25_card_assets'),'default and V25 packages both require the generated enabled/disabled binding');
});

test('encoder source and checker projection are hashed before and during packaging',async t=>{
 const {sourceInputs}=await import(script),f=await fixture(t);
 const sourcePath=join(f.root,'encoder.mjs'),helperPath=join(f.root,'checker.mjs');
 writeFileSync(sourcePath,'encoder');writeFileSync(helperPath,'checker');
 const identity={sourcePath,sourceSha256:sha256('encoder'),sourceBytes:7,helperPath,helperSha256:sha256('checker'),helperBytes:7};
 const inputs=sourceInputs(f.root,{toolchainIdentity:identity});
 assert.ok(inputs.some(row=>row.path===realpathSync.native(sourcePath)&&row.sha256===identity.sourceSha256));
 const receipt=await f.run({toolchainIdentity:identity});assert.deepEqual(receipt.toolchainIdentity,identity);
 writeFileSync(sourcePath,'changed');
 assert.throws(()=>sourceInputs(f.root,{toolchainIdentity:identity}),/encoder input changed/);
 await assert.rejects(f.run({toolchainIdentity:identity}),/encoder input changed/);
});

async function fixture(t, overrides = {}) {
  const mod = await import(script);
  assert.equal(typeof mod.buildNativeCandidate, 'function', 'builder must be importable without CLI side effects');
  const root = mkdtempSync(join(tmpdir(), 'abyss-candidate-'));
  t.after(() => rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'src/lua'),{recursive:true}); mkdirSync(join(root,'data'));
  writeFileSync(join(root,'src/lua/abyss_ui.lua'),'return {}');
  writeFileSync(join(root,'data/input.json'),'{}');
  writeFileSync(join(root,'base.gil'),'ORIGINAL');
  const output=join(root,'output'); mkdirSync(output);
  const names=[],sources=new Map(),calls=[]; let workspace;
  const {scriptContent,initialSources={},existingScripts=[],graphs=[],signals=[],prepareGenerated,clientTemplates=[],...checkOverrides}=overrides;
  for(const [name,source] of Object.entries(initialSources))sources.set(name,source);
  const client={async readResource(){return {contents:[]};},async callTool({name,arguments:args}) {
    calls.push({name,args});
    let data={};
    const mapPath=join(workspace,'mock.gil');
    if(name==='scene_add_client_template')data={templateIndex:{AbyssReadyCardGroup:31,AbyssMonsterActor:32,AbyssMonsterPower:33}[args.template.name]??(/^AbyssSharedCardFace[1-9][0-9]*$/.test(args.template.name)?200+Number(args.template.name.slice('AbyssSharedCardFace'.length)):undefined)};
    if(name==='scene_list_interface')data={clientTemplates,clientInterfaces:[]};
    if(name==='scene_set_client_script'){ names.push(args.name);sources.set(args.name,readFileSync(args.sourceFile,'utf8')); writeFileSync(mapPath,'candidate'); data={mapPath}; }
    if(name==='scene_add_graph')data={graphId:7,name:'ABYSS_SETTLEMENT'};
    if(name==='write_graphs')data={written:[7]};
    if(name==='scene_check_client')data={ok:true,errors:0,warnings:0,problems:[],checked:[...sources.keys()],...checkOverrides};
    if(name==='scene_list_client_scripts')data={scripts:[...sources].map(([name,source])=>({name,file:name+'.lua',source:scriptContent??source})).concat(existingScripts)};
    if(name==='scene_remove_client') {const at=existingScripts.findIndex(script=>script.name===args.script);if(at>=0)existingScripts.splice(at,1);data={removed:{script:args.script}};}
    if(name==='inspect_map')data={graphs};
    if(name==='scene_list_signals')data={signals};
    return {structuredContent:data};
  }};
  // The fake SDK has no native process; filesystem and manifest checks stay real.
  const prepare=dir=>{workspace=dirname(dir);names.length=0;writeFileSync(join(dir,'game-ui.json'),'{"controls":[]}');writeFileSync(join(dir,'game-ui-templates.json'),JSON.stringify(['AbyssReadyCardGroup','AbyssMonsterActor','AbyssMonsterPower'].map(name=>({name,kind:'container',children:[]}))));writeFileSync(join(dir,'abyss_monster_actor_binding.lua'),'return {}');prepareGenerated?.(dir);};
  const writeScripts=async(mapPath,updates,workspace)=>{
    calls.push({name:'batch_write',args:{updates}});
    for(const update of updates)sources.set(update.name,readFileSync(update.sourceFile,'utf8'));
    const destination=join(workspace,'batch.gil');writeFileSync(destination,'candidate');return destination;
  };
  return {root,output,calls,clientTemplates,writeScripts,run:extra=>mod.buildNativeCandidate({root,baseMap:join(root,'base.gil'),output,client,prepare,
    sourceCommit:'f'.repeat(40),...extra,generatedModules:{abyss_monster_actor_binding:'builder',...extra?.generatedModules}})};
}

test('runtime profile receipt binds the actual generated bytes and rejects an unrequested enable',async t=>{
  const f=await fixture(t,{prepareGenerated:dir=>writeFileSync(join(dir,'abyss_ui_profile.lua'),uiProfileSource())});
  const receipt=await f.run({generatedModules:{abyss_ui_profile:'builder'}});
  assert.deepEqual(receipt.uiProfile,uiProfileReceipt(false));
  assert.equal(receipt.moduleDigests.abyss_ui_profile,sha256(uiProfileSource(false)));
  const changed=await fixture(t,{prepareGenerated:dir=>writeFileSync(join(dir,'abyss_ui_profile.lua'),uiProfileSource(true))});
  await assert.rejects(changed.run({generatedModules:{abyss_ui_profile:'builder'}}),/Generated UI profile differs/);
});

test('identical embedded modules avoid writes while changed modules and entry are rebuilt and all are verified',async t=>{
  const f=await fixture(t,{initialSources:{abyss_same:'return 1',abyss_changed:'return 0'}});
  writeFileSync(join(f.root,'src/lua/abyss_same.lua'),'return 1');
  writeFileSync(join(f.root,'src/lua/abyss_changed.lua'),'return 2');
  const receipt=await f.run();
  assert.deepEqual(receipt.reusedModules,['abyss_same']);
  assert.deepEqual(f.calls.filter(c=>c.name==='scene_set_client_script').map(c=>c.args.name).sort(),['abyss_changed','abyss_monster_actor_binding','abyss_ui']);
  assert.deepEqual(receipt.checkedModules,['abyss_changed','abyss_monster_actor_binding','abyss_same','abyss_ui']);
  assert.equal(f.calls.filter(c=>c.name==='scene_list_client_scripts'&&c.args.includeSource).length,2);
});

test('batch transport writes all changes once and retains full final verification',async t=>{
  const f=await fixture(t);
  for(let i=0;i<280;i++)writeFileSync(join(f.root,`src/lua/abyss_part_${i}.lua`),`return ${i}`);
  const receipt=await f.run({writeScripts:f.writeScripts});
  assert.equal(f.calls.filter(c=>c.name==='batch_write').length,1);
  assert.equal(f.calls.filter(c=>c.name==='scene_set_client_script').length,0);
  assert.equal(receipt.checkedModules.length,282);
  assert.equal(f.calls.filter(c=>c.name==='scene_check_client').length,1);
  assert.equal(receipt.statuses.staticCheck,'pass');
});

test('batch write failure cannot produce a success receipt',async t=>{
  const f=await fixture(t);
  await assert.rejects(f.run({writeScripts:async()=>{throw Error('batch failed');}}),/batch failed/);
  assert.equal(f.calls.some(c=>c.name==='scene_check_client'),false);
});

test('missing fresh generated module cannot use a stale shared build',async t=>{
  const f=await fixture(t);mkdirSync(join(f.root,'build/lua'),{recursive:true});
  writeFileSync(join(f.root,'build/lua/abyss_data.lua'),'return {}');
  await assert.rejects(f.run({generatedModules:{abyss_data:'builder'}}),/ENOENT/);
});

test('every production entry parameter is registered by both native package routes',async t=>{
  const f=await fixture(t);
  const source=readFileSync('src/lua/abyss_ui.lua','utf8');
  writeFileSync(join(f.root,'src/lua/abyss_ui.lua'),source);
  await f.run();
  const {candidateScriptFiles}=await import('../scripts/native-candidate-scripts.mjs');
  const generated=join(f.root,'generated');mkdirSync(generated);
  writeFileSync(join(generated,'abyss_component_binding.lua'),'return {schemaVersion=1,enabled=false}');
  writeFileSync(join(generated,'abyss_v25_card_assets.lua'),'return {enabled=false}');
  for(const name of ['abyss_ui_profile','abyss_art_features','abyss_monster_actor_binding','abyss_monster_art_data', 'abyss_data','abyss_original_v4_data','abyss_map_layout','abyss_narrative','abyss_presentation','abyss_theme','abyss_menu_background_asset', 'abyss_ready_card_binding', 'abyss_ready_card_assets', 'abyss_traveler_portrait_assets'])
    writeFileSync(join(generated,name+'.lua'),'return {}');
  const packaged=candidateScriptFiles(join(f.root,'src/lua'),generated).find(row=>row.name==='abyss_ui');
  const parameters=[...source.matchAll(/:GetParam\(["']([^"']+)["']\)/g)].map(match=>match[1]);
  assert(parameters.length>0);
  for(const variables of [packaged.variables,f.calls.find(c=>c.name==='scene_set_client_script'&&c.args.name==='abyss_ui').args.variables])
    for(const name of parameters)assert.deepEqual(variables.find(row=>row.name===name),
      {name,type:'boolean',value:false,...(name==='nativeComponentControls'?{public:true}:{})},'Missing production entry parameter: '+name);
});

test('reused base removes only owned stale modules and reuses its writable settlement graph',async t=>{
  const f=await fixture(t,{existingScripts:[{name:'abyss_stale',file:'abyss_stale.lua'}],
    graphs:[{id:23,name:'_GSTS_ABYSS_SETTLEMENT',type:20000,writable:true}],signals:['ABYSS_WIN','ABYSS_LOSE']});
  await f.run();
  assert.equal(f.calls.filter(c=>c.name==='scene_remove_client').length,1);
  assert.equal(f.calls.filter(c=>c.name==='scene_add_graph'||c.name==='scene_add_signal').length,0);
  assert.equal(f.calls.find(c=>c.name==='write_graphs').args.graphs[0].graphId,23);
  assert.deepEqual(f.calls.find(c=>c.name==='scene_set_client_script'&&c.args.name==='abyss_ui').args.variables,
    [{name:'nativeMonsterArtEnabled',type:'boolean',value:true},{name:'nativeBgmEnabled',type:'boolean',value:false},
      {name:'experimentalCharacters',type:'boolean',value:false},
      {name:'nativeComponentControls',type:'boolean',value:false,public:true}]);
  assert.equal(f.calls.find(c=>c.name==='scene_add_client_ui').args.replace,true);
});

test('unknown script ownership and ambiguous settlement graphs remain hard failures',async t=>{
  const foreign=await fixture(t,{existingScripts:[{name:'foreign_script',file:'foreign.lua'}]});
  await assert.rejects(foreign.run(),/ownership/);
  assert.equal(foreign.calls.some(c=>c.name==='scene_remove_client'),false);
  const repeated=await fixture(t,{graphs:[{id:2,name:'_GSTS_ABYSS_SETTLEMENT',type:20000,writable:true},
    {id:3,name:'_GSTS_ABYSS_SETTLEMENT',type:20000,writable:true}]});
  await assert.rejects(repeated.run(),/ambiguous/);
});

test('source/generated module collisions are rejected',async t=>{
  const f=await fixture(t);await assert.rejects(f.run({generatedModules:{abyss_ui:'builder'}}),/Duplicate.*module/);
});

test('extracted UI subviews are embedded, read back and checked with the entry module',async t=>{
  const f=await fixture(t);
  const sources=new Map(['abyss_battle_card_view','abyss_battle_info_content','abyss_battle_info_view',
    'abyss_battle_intent_view','abyss_battle_potion_view','abyss_battle_reward_owner',
    'abyss_battle_status_view','abyss_battle_unit_view','abyss_shop_ui'].map(name=>[
    name,readFileSync(new URL(`../src/lua/${name}.lua`,import.meta.url),'utf8')
  ]));
  for(const [name,source] of sources)writeFileSync(join(f.root,`src/lua/${name}.lua`),source);
  const receipt=await f.run();
  assert.deepEqual(receipt.checkedModules,[...sources.keys(),'abyss_monster_actor_binding','abyss_ui'].sort());
  for(const [name,source] of sources) {
    const write=f.calls.find(call=>call.name==='scene_set_client_script'&&call.args.name===name);
    assert.equal(readFileSync(write.args.sourceFile,'utf8'),source);
  }
  assert.equal(f.calls.some(call=>call.name==='scene_list_client_scripts'),true);
});

test('readback with correct module names but stale contents is rejected',async t=>{
  const f=await fixture(t,{scriptContent:'return "old contents"'});await assert.rejects(f.run(),/content|digest|readback/i);
});

test('parent alias outside root is rejected before creating any output directory',async t=>{
  const f=await fixture(t),outside=mkdtempSync(join(tmpdir(),'abyss-external-'));
  t.after(()=>rmSync(outside,{recursive:true,force:true}));
  try{symlinkSync(outside,join(f.root,'escape'),'junction');}catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('Directory alias creation requires filesystem privilege');return;}throw error;}
  await assert.rejects(f.run({output:join(f.root,'escape/new')}),/root|outside/i);
  assert.equal(existsSync(join(outside,'new')),false,'Rejected output must not create directories outside root');
});

test('complete fake SDK builds unique receipts without replacing historical input aliases',async t=>{
  const f=await fixture(t); linkSync(join(f.root,'base.gil'),join(f.output,'candidate.json'));
  const a=await f.run(),b=await f.run();
  assert.notEqual(a.buildId,b.buildId); assert.equal(readFileSync(join(f.root,'base.gil'),'utf8'),'ORIGINAL');
  assert.equal(a.statuses.staticCheck,'pass'); assert.equal(a.statuses.playtest,'not_run');
  assert.match(a.candidate.sha256,/^[a-f0-9]{64}$/); assert.match(a.payloadDigest,/^[a-f0-9]{64}$/);
  assert.deepEqual(a.checkedModules,['abyss_monster_actor_binding','abyss_ui']); assert(existsSync(a.receiptPath));
});
for(const [label,override] of [['empty',{checked:[]}],['missing',{checked:['other']}],['duplicate',{checked:['abyss_ui','abyss_ui']}],['errors',{ok:true,errors:1}]]) {
  test(`rejects ${label} module-check results without success receipt`,async t=>{
    const f=await fixture(t,override); await assert.rejects(f.run(),/check|module/i);
    assert.equal(existsSync(join(f.output,'candidate.json')),false);
  });
}

async function releaseFixture(t, stale = false, mutate = () => {}) {
  let root;
  const f=await fixture(t,{prepareGenerated:dir=>{
    const notes=loadReleaseNotes({root,releaseCandidate:true});
    writeFileSync(join(dir,'abyss_narrative.lua'),stale ? (stale === 'wrong-version' ? 'return {["codeVersion"]="v0.0.1"}' : 'return {}')
      : `return {["codeVersion"]=${toLua(notes.build.version)}}`);
    mutate(root,dir);
  }});
  root=f.root;mkdirSync(join(root,'data/release'));
  writeFileSync(join(root,'package.json'),'{"version":"0.1.1"}');
  writeFileSync(join(root,'package-lock.json'),'{"version":"0.1.1","packages":{"":{"version":"0.1.1"}}}');
  writeFileSync(join(root,'.release-please-manifest.json'),'{".":"0.1.1"}');
  writeFileSync(join(root,'CHANGELOG.md'),'## 0.1.1 (2026-10-27)\n\n### 新增\n\n* 与候选绑定的版本说明。\n');
  writeFileSync(join(root,'data/release/publications.json'),'{"schemaVersion":1,"releases":[]}');
  writeFileSync(join(root,'.gitignore'),'output/\n');
  for(const args of [['init','-q'],['add','.'],['-c','user.name=Release Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']]) {
    const git=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(git.status,0,git.stderr);
  }
  return {...f,run:extra=>f.run({sourceCommit:gitSourceIdentity(root).sourceCommit,
    generatedModules:{abyss_narrative:'scripts/build-ui.mjs'},releaseCandidate:true,...extra})};
}
test('explicit frozen native candidate packages exact menu version and binds source/notes hash without publication',async t=>{
  const f=await releaseFixture(t),receipt=await f.run();
  const notes=loadReleaseNotes({root:f.root,releaseCandidate:true});
  assert.deepEqual(receipt.release,{version:'v0.1.1',workKey:'alpha-test',notesSha256:notesSha256(notes.currentNotice)});
  assert.equal(receipt.sourceDirty,false);assert.equal(receipt.sourceCommit,notes.build.sourceCommit);
  assert(receipt.checkedModules.includes('abyss_narrative'));
  assert.equal(receipt.inputs.find(input=>input.path==='CHANGELOG.md').sha256,
    sha256(readFileSync(join(f.root,'CHANGELOG.md'))), 'candidate still binds the exact official-log source text');
  assert.deepEqual(JSON.parse(readFileSync(join(f.root,'data/release/publications.json'))).releases,[]);
});
test('stale, wrong-version or omitted native narrative cannot claim frozen release provenance',async t=>{
  const stale=await releaseFixture(t,true);await assert.rejects(stale.run(),/Bundled code version differs/);
  const wrong=await releaseFixture(t,'wrong-version');await assert.rejects(wrong.run(),/Bundled code version differs/);
  const omitted=await releaseFixture(t);await assert.rejects(omitted.run({generatedModules:{}}),/must package.*narrative/);
});
test('frozen native candidate rejects dirty source and misleading source SHA',async t=>{
  const f=await releaseFixture(t);
  await assert.rejects(f.run({sourceCommit:'f'.repeat(40)}),/differs from checkout/);
  writeFileSync(join(f.root,'data/input.json'),'{"dirty":true}');
  await assert.rejects(f.run(),/clean source checkout/);
  const concurrent=await releaseFixture(t,false,root=>writeFileSync(join(root,'untracked.txt'),'late change'));
  await assert.rejects(concurrent.run(),/source identity changed during packaging/);
});

test('custom preparation cannot smuggle disabled artwork templates or hosts into a default-off candidate',async t=>{
 const {artFeaturesSource}=await import('../scripts/art-features.mjs');
 for(const [label,mutate]of [
  ['background template',dir=>writeFileSync(join(dir,'game-ui-templates.json'),JSON.stringify([{name:'AbyssOfficialBackgroundImage',kind:'image',size:[20,20],image:100001}]))],
  ['shared template',dir=>writeFileSync(join(dir,'game-ui-templates.json'),JSON.stringify([{name:'AbyssReadyCardImage',kind:'image',size:[1,1],image:100001}]))],
  ['avatar host',dir=>writeFileSync(join(dir,'game-ui.json'),JSON.stringify({controls:[{name:'officialAvatar',kind:'container',children:[]}]}))],
 ]){
  const f=await fixture(t,{prepareGenerated:dir=>{writeFileSync(join(dir,'abyss_art_features.lua'),artFeaturesSource({}));writeFileSync(join(dir,'abyss_menu_background_asset.lua'),'return {}');mutate(dir);}});
  await assert.rejects(f.run({generatedModules:{abyss_art_features:'builder',abyss_menu_background_asset:'builder'}}),/disabled artwork/i,label);
  assert.equal(f.calls.length,0,'reject before SDK mutations');
 }
});

// Storage factoring must retain the entire authored UI and per-instance state.
test('default native card packing shares repeated faces and expands to the exact authored trees',async()=>{
 const helper=new URL('../scripts/native-ui-card-sharing.mjs',import.meta.url);
 assert.ok(existsSync(helper),'native card storage sharing is required');
 const {packNativeCardFaces,expandSharedCardFaces}=await import(helper);
 const {gameLayout}=await import('../scripts/game-ui-layout.mjs');
 const {deckCardTemplate}=await import('../scripts/deck-ui-layout.mjs');
 const layout=gameLayout(),templates=[deckCardTemplate()],original=structuredClone({layout,templates});
 const packed=packNativeCardFaces(layout,templates);
 assert.equal(packed.sharing.logicalHosts,61);assert.equal(packed.sharing.sharedHosts,48);
 assert.equal(packed.sharing.templateNames.length,3);
 assert.ok(packed.sharing.beforeControls-packed.sharing.afterControls>6000);
 assert.deepEqual({layout,templates},original,'packing must not mutate the generator inputs');
 assert.deepEqual(expandSharedCardFaces(packed.layout,packed.templates),original);
 assert.deepEqual(packNativeCardFaces(layout,templates),packed,'stable names and output for the same content');
 const expanded=expandSharedCardFaces(packed.layout,packed.templates),faces=[];
 const walk=n=>{if((n.children??[]).some(c=>c.name==='artPlate'))faces.push(n);for(const c of n.children??n.controls??[])walk(c);};walk(expanded.layout);
 const a=faces[0].children.find(c=>c.name==='name'),b=faces[1].children.find(c=>c.name==='name');
 a.text.content='one instance';assert.notEqual(b.text.content,a.text.content,'template instances cannot share writable data');
 assert.deepEqual({layout,templates},original);
});

test('native card packing preserves nonmatching and container-specific roots and rejects ambiguous references',async()=>{
 const helper=new URL('../scripts/native-ui-card-sharing.mjs',import.meta.url);
 assert.ok(existsSync(helper),'native card storage sharing is required');
 const {packNativeCardFaces,expandSharedCardFaces}=await import(helper);
 const face=(name,extra={})=>({name,kind:'container',size:[148,208],children:[{name:'artPlate',kind:'image',size:[10,10],image:100001},{name:'ink',kind:'image',size:[10,10],image:100002}],...extra});
 const base={name:'Test',controls:[face('a'),face('b',{visible:false,position:[12,9],scale:[.5,.5]})]};
 const packed=packNativeCardFaces(base,[]);
 assert.equal(packed.sharing.sharedHosts,2);assert.deepEqual(expandSharedCardFaces(packed.layout,packed.templates),{layout:base,templates:[]});
 for(const extra of [{size:[147,208]},{children:[{name:'artPlate',kind:'image',image:100002}]},
  {blockKeys:false},{showCursor:false},{blockCursor:true},{isolateNavigation:true},{script:'private'},{unknownState:1}]){
  const x={name:'Test',controls:[face('a'),face('b',extra)]},result=packNativeCardFaces(x,[]);
  assert.equal(result.sharing.sharedHosts,0,JSON.stringify(extra));assert.deepEqual(result.layout,x);
 }
 const scripted={name:'Scripted',controls:['a','b'].map(name=>face(name,{children:[{name:'artPlate',kind:'image',image:100001},{name:'scripted',kind:'image',script:'private',image:100002}]}))};
 assert.equal(packNativeCardFaces(scripted,[]).sharing.sharedHosts,0,'private child scripts and their control bindings remain in their authored scope');
 const navigated={name:'Navigation',controls:[face('a',{navigation:{right:'a/ink'}}),face('b',{navigation:{right:'b/ink'}})]};
 assert.equal(packNativeCardFaces(navigated,[]).sharing.sharedHosts,0,'explicit root navigation targets cannot cross a template boundary');
 const outside={name:'Navigation',controls:[...base.controls,{name:'outside',kind:'cursorArea',navigation:{right:'a/ink'}}]};
 assert.equal(packNativeCardFaces(outside,[]).sharing.sharedHosts,0,'external navigation targets also preserve authored scope');
 const tiny={name:'Tiny',controls:['a','b'].map(name=>face(name,{children:[{name:'artPlate',kind:'image',image:100001}]}))};
 assert.equal(packNativeCardFaces(tiny,[]).sharing.sharedHosts,0,'packing may not add records to small duplicate trees');
 const empty=packNativeCardFaces(base,[],{enabled:false});assert.equal(empty.sharing.sharedHosts,0);assert.deepEqual(empty.layout,base);
 assert.throws(()=>expandSharedCardFaces(packed.layout,[]),/shared.*template|missing/i);
 assert.throws(()=>expandSharedCardFaces(packed.layout,[...packed.templates,...packed.templates]),/duplicate/i);
 const cyclic=structuredClone(packed.templates);cyclic[0].children=[{name:'loop',kind:'reference',template:cyclic[0].name}];
 assert.throws(()=>expandSharedCardFaces(packed.layout,cyclic),/cycle/i);
 assert.throws(()=>packNativeCardFaces(base,packed.templates),/reserved|shared.*template/i);
});


test('default candidate imports shared faces before their references and binds the physical output',async t=>{
 const helper=new URL('../scripts/native-ui-card-sharing.mjs',import.meta.url);
 assert.ok(existsSync(helper));
 const card=name=>({name,kind:'container',size:[148,208],children:[{name:'artPlate',kind:'image',image:100001},{name:'ink',kind:'image',image:100002}]});
 const prepareGenerated=dir=>writeFileSync(join(dir,'game-ui.json'),JSON.stringify({name:'SlayTheAbyss',controls:[card('one'),card('two')]}));
 const f=await fixture(t,{prepareGenerated}),receipt=await f.run();
 assert.equal(receipt.nativeUiPacking?.sharing.sharedHosts,2,'formal default must actually use sharing');
 assert.equal(receipt.nativeUiPacking.templateIndices.AbyssSharedCardFace1,201);
 const templates=f.calls.filter(c=>c.name==='scene_add_client_template');assert.equal(templates[0].args.template.name,'AbyssSharedCardFace1');
 const ui=f.calls.find(c=>c.name==='scene_add_client_ui').args;
 assert.equal(ui.controls[0].kind,'reference');assert.equal(ui.controls[0].template,'AbyssSharedCardFace1');
 assert.ok(receipt.productionManifest.packedLayout);assert.ok(receipt.productionManifest.packedTemplates);
 assert.equal(JSON.parse(readFileSync(receipt.productionManifest.layout.path)).controls[0].kind,'container','authored tree stays intact');
 const foreign=await fixture(t,{prepareGenerated,clientTemplates:[{name:'AbyssSharedCardFace1',templateIndex:201}]});
 await assert.rejects(foreign.run(),/shared.*ownership|unowned.*shared/i);
 assert.equal(foreign.calls.some(c=>c.name==='scene_add_client_template'),false,'foreign template collision must fail before writes');
});


test('packed candidates cannot reuse the legacy logical-only UI cache',async t=>{
 const face=name=>({name,kind:'container',size:[148,208],children:[{name:'artPlate',kind:'image',image:100001},{name:'ink',kind:'image',image:100002}]});
 const f=await fixture(t,{prepareGenerated:dir=>writeFileSync(join(dir,'game-ui.json'),JSON.stringify({name:'SlayTheAbyss',controls:[face('one'),face('two')]}))});
 const first=await f.run(),prior=structuredClone(first);
 prior.candidate.sha256=sha256(readFileSync(join(f.root,'base.gil')));
 // Populate every binding that the old logical-only cache would accept.
 prior.officialPortraits={imageTemplateIndex:50,containerTemplateIndex:31};prior.officialBackground={templateIndex:51};
 writeFileSync(join(f.root,'candidate.json'),JSON.stringify(prior));
 f.clientTemplates.push({name:'AbyssSharedCardFace1',templateIndex:201});
 const start=f.calls.length,second=await f.run();
 assert.equal(second.reusedUi,undefined);
 assert.ok(f.calls.slice(start).some(c=>c.name==='scene_add_client_ui'),'packed physical UI must be rewritten');
 assert.equal(f.calls.slice(start).filter(c=>c.name==='scene_add_client_template'&&c.args.template.name==='AbyssSharedCardFace1').length,1);
});

test('default reduction CI continuation authenticates every new current owner without rewriting prior packets',async()=>{
 const adapter=await import('./helpers/release-bootstrap-ci-source.mjs');
 const {assertIntegratedCurrent}=await import('./helpers/integrated-ci-source.mjs');
 const historicalRead=enemyFastRead('release',readFileSync);
 const packet=adapter.defaultReductionCiPacket;assert.ok(packet,'complete default reduction continuation required');
 assert.equal(packet.baseCommit,'396b55757a9e536b052f6c960daf1159351f57b1');
 assertIntegratedCurrent();
 const audio=adapter.defaultReductionAudioCiPacket;assert.ok(audio,'complete audio handoff continuation required');
 assert.equal(audio.baseCommit,'d46bf7aa9a27e0a47528412d7f0ad8fd7e2cbf2b');
 for(const [file,row]of Object.entries({...packet.files,...packet.addedFiles,...audio.files})){
  const source=historicalRead(file,'utf8').replaceAll('\r\n','\n');assert.equal(sha256(source),row.current.sha256);
  for(const changed of [source+'\n',source.replace(/./,'!')]){
   assert.equal(adapter.releaseBootstrapCiSource(file,changed),changed);
   assert.throws(()=>assertIntegratedCurrent((path,encoding)=>path===file?changed:readFileSync(path,encoding)),/fresh complete TASK-111 CI source/);
  }
  assert.throws(()=>assertIntegratedCurrent((path,encoding)=>{if(path===file)throw Error('ENOENT '+file);return readFileSync(path,encoding);}),/ENOENT/);
 }
 assertIntegratedCurrent();
});


test('native card packing only factors nonoverlapping hosts and reduces physical records',async()=>{
 const {packNativeCardFaces,expandSharedCardFaces}=await import('../scripts/native-ui-card-sharing.mjs');
 const nested=(name,depth)=>({name,kind:'container',size:[148,208],children:[{name:'artPlate',kind:'image',image:100001},
  depth?nested('nested',depth-1):{name:'ink',kind:'image',image:100002}]});
 const source={name:'Nested',controls:[nested('a',2),nested('b',2)]},packed=packNativeCardFaces(source,[]);
 assert.equal(packed.sharing.logicalHosts,6);assert.equal(packed.sharing.sharedHosts,2,'only outermost nonoverlapping hosts may be factored');
 assert.equal(packed.sharing.templateNames.length,1);assert.ok(packed.sharing.afterControls<packed.sharing.beforeControls);
 assert.deepEqual(expandSharedCardFaces(packed.layout,packed.templates),{layout:source,templates:[]});
});


test('frozen release-candidate mode uses the same default card storage sharing',async t=>{
 const face=name=>({name,kind:'container',size:[148,208],children:[{name:'artPlate',kind:'image',image:100001},{name:'ink',kind:'image',image:100002}]});
 const f=await releaseFixture(t,false,(_root,dir)=>writeFileSync(join(dir,'game-ui.json'),JSON.stringify({name:'SlayTheAbyss',controls:[face('one'),face('two')]})));
 const r=await f.run();assert.equal(r.sourceDirty,false);assert.equal(r.release.version,'v0.1.1');
 assert.equal(r.officialAssetsProfile,undefined);assert.equal(r.nativeUiPacking.sharing.sharedHosts,2);
 assert.equal(f.calls.find(c=>c.name==='scene_add_client_ui').args.controls[0].kind,'reference');
});
