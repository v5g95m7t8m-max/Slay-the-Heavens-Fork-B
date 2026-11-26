import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {officialAssetFlags} from '../scripts/official-assets-profile.mjs';
import {readArtFeatures} from '../scripts/art-features.mjs';
import {lumineSelectionBackground} from '../scripts/lumine-selection-background.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
import {loadUiReferences} from '../scripts/check-ui-references.mjs';
import {capacityProblems} from './helpers/ui-readability.mjs';
const parts=n=>n?.controls??n?.children??[],child=(n,name)=>parts(n).find(c=>c.name===name);
const all=n=>[n,...parts(n).flatMap(all)];
test('official menu and selection reuse live inputs with bounded native decoration',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);
 attachOfficialPortraits(layout,{selectionAvatar:true,battlePortrait:true});
 const stage=child(layout,'stage')??layout,menu=child(stage,'menuPanel'),panel=child(stage,'characterPanel');
 const start=child(child(menu,'start'),'hit'),confirm=child(child(panel,'confirm'),'hit');
 const resultLabel=structuredClone(child(child(menu,'start'),'label'));
 const oldBattle=JSON.stringify(child(stage,'battlePanel'));
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(child(menu,'start'),'hit'),start);
 assert.equal(child(child(panel,'confirm'),'hit'),confirm);
 assert.equal(child(panel,'deckView'),undefined,'retire the duplicated selection deck; reuse the shared browser');
 assert.equal(JSON.stringify(child(stage,'battlePanel')),oldBattle);
 assert.equal(child(menu,'vista').visible,false);
 assert.equal(child(menu,'emblem').visible,false);
 assert(child(child(menu,'v25MainMenu'),'sts1TitleLogo'),'retain the released #797 logo');
 for(const name of ['exitPanel','runMenu'])for(const key of ['guide','help'])
  assert.equal(child(child(stage,name),key),undefined,'retain the released #784 removal in '+name);
 // Pin the approved menu geometry independently of the layout theme.
 assert.deepEqual(child(menu,'start').position,[-464,-114]);
 assert.deepEqual(child(menu,'start').size,[208,48]);
 assert.deepEqual(start.size,child(menu,'start').size,'paint and hit areas share the approved bounds');
 assert.deepEqual(child(child(menu,'start'),'officialResultLabel'),{...resultLabel,name:'officialResultLabel',visible:false});
 for(const key of ['confirm','cancel'])for(const state of parts(child(child(panel,key),'hit'))){
  assert.equal(child(state,'label').text.content,key==='confirm'?'开始挑战':'返回');
  const flag=child(state,'v25Flag'),cloth=child(flag,'cloth'),rim=child(flag,'rim');
  assert(rim&&cloth,'smooth buttons retain separate rim and cloth');
  for(const [surface,radius] of [[rim,10],[cloth,8]]){
   const [width,height]=surface.size;
   assert.deepEqual(parts(surface).map(n=>n.image),[theme.image.rect,theme.image.rect,...Array(4).fill(theme.image.disc)]);
   assert.deepEqual(parts(surface).map(n=>n.size),[[width-2*radius,height],[width,height-2*radius],...Array(4).fill([2*radius,2*radius])]);
  }
  assert.equal(child(state,'label').text.colour,state.name==='disabled'?theme.color.textMuted:theme.officialAssets.buttonInk,'shared official button ink preserves disabled distinction');
  assert.equal(child(state,'plate').visible,false);assert.equal(child(state,'border').visible,false);
  assert.equal(all(flag).some(n=>n.image===theme.officialAssets.images.button),false,'official rectangle must not replace original flag');
 }
 assert.equal(child(panel,'v25Background').visible,true);
 assert.equal(child(child(panel,'v25Background'),'veil'),undefined,'preserve #785 removal of persistent full-screen selection shade');
 assert.equal(all(panel).filter(n=>n.name==='officialGeoBadge').length,0,'the selected character must not become an unrelated geo icon');
 const constellation=child(child(child(panel,'v25Roster'),'selected'),'v25Constellation');
 assert.equal(constellation.visible,true);assert.equal(all(constellation).filter(n=>n.kind==='image').length,93);
 const initial=child(selectedSlot(panel),'selectedInitial');
 assert.equal(initial,undefined,'initial must not cover the exact-alpha constellation');
 assert.equal(child(selectedSlot(panel),'selectedPixelAvatar'),undefined);
 const details=child(panel,'details'),bag=child(details,'v25GoldIcon');
 assert.equal(bag.kind,'container');assert.equal(all(bag).some(n=>n.image===theme.icon.gold),false,'approved grey money bag must not become a round coin');
 assert(all(bag).filter(n=>n.kind==='image').every(n=>n.image===theme.image.rect));
 assert.equal(child(bag,'bag').children[0].colour,'#D1D0BD');
 assert.equal(child(selectedSlot(panel),'selection').children[0].colour,'#E5C846');
 assert.equal(child(selectedSlot(panel),'selection').visible,false,'gold frame is selected only at runtime');
 assert.deepEqual(child(child(panel,'details'),'officialSelectionFigure').scale,[1,1]);
});
function selectedSlot(panel){return child(child(panel,'v25Roster'),'selected');}

test('integrated selection has a native starter relic and no pre-run deck hit area',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);
 const panel=child(child(layout,'stage')??layout,'characterPanel'),details=child(panel,'details');
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(details,'deckOpen'),undefined);
 const relic=child(details,'v25RelicIcon');
 assert.equal(relic.visible,true);
 assert.deepEqual(relic.size,[36,44]);
 assert(parts(relic).length>=3 && parts(relic).every(n=>n.kind==='image'&&n.image===100003));
 assert(parts(relic).every(n=>n.raycastTarget===false),'the relic ornament must not claim input');
});

test('production background preserves the exact approved experiment rows, including colour and half masks',()=>{
 const background=lumineSelectionBackground();
 const rows=background.rows.map(r=>[...r.slice(0,7),...r.slice(11,13),r[18],r[19],r[13],...r.slice(14,17),r[20]]
  .map(v=>Number.isInteger(v)?v:Math.round(v*1000)/1000));
 // Independently frozen from lumine-native-v11/rows-1600.json, not this adapter.
 assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'8feed38c818cfa0abda50d1955cfaa99f360ec60bf501544a7245aa4c779eee5');
 assert.equal(rows.length,1600);assert.equal(rows.filter(r=>r[15]===1).length,224);
});

test('selection uses static exact-alpha geometry and reuses the selected frame without a glyph overlay',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);applyOfficialNoncombatLayout(layout,theme);
 const panel=child(child(layout,'stage')??layout,'characterPanel'),slot=selectedSlot(panel),initial=child(slot,'selectedInitial');
 assert.deepEqual(slot.size,[100,100]);assert(child(slot,'stone'));
 assert.deepEqual(slot.position,[-226,-226.5]);
 assert.equal(initial,undefined);
 const symbol=child(slot,'v25Constellation');assert.deepEqual(symbol.size,[118,118]);
 assert.deepEqual(symbol.position,[0,0]);assert(symbol.visible);
 assert(all(symbol).filter(n=>n.kind==='image').every(n=>[theme.image.rect,100006].includes(n.image)&&n.colour==='#202A29'));
 assert.equal(all(symbol).filter(n=>n.kind==='image'&&n.image===100006).length,49);
 for(const arc of all(symbol).filter(n=>n.kind==='image'&&n.image===100006)){
  assert.equal(arc.fill.shape,'horizontal');assert.equal(arc.fill.from,'right');
  assert(arc.fill.amount>0&&arc.fill.amount<1);
 }
 assert.equal(all(symbol).some(n=>['text','presetButton','cursorArea'].includes(n.kind)),false);
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(parts(selectedSlot(panel)).filter(n=>n.name==='v25Constellation').length,1);
 assert.equal(parts(panel).filter(n=>n.name==='lumineSelectionBackground').length,1);
});

function restorePriorMenuNavigation(panel,focusPaths) {
 const prior=structuredClone(panel);
 function addAt(node,key,index) {
  const entries=Object.entries(node);
  entries.splice(index,0,[key,true]);
  for (const name of Object.keys(node)) delete node[name];
  Object.assign(node,Object.fromEntries(entries));
 }
 if (panel.name!=='menuPanel') addAt(prior,'isolateNavigation',5);
 for (const path of focusPaths) addAt(path.reduce(child,prior),'focusable',3);
 return prior;
}

test('official host uses direct inventory actions, read-only relic details and explicit run discard',async t=>{
 const {mkdtempSync,mkdirSync,readFileSync,rmSync}=await import('node:fs');
 const {join,resolve}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const {createRequire}=await import('node:module');
 const {buildUI}=await import('../scripts/build-ui.mjs');
 const {buildLuaData,luaString}=await import('../scripts/build-lua-data.mjs');
 mkdirSync('build/test-tmp',{recursive:true});
 const directory=mkdtempSync(resolve('build/test-tmp/sts-ui-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{officialAssets:true,nativePageLifecycle:true});
 const stage=child(JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8')),'stage');
 // Validate the reviewed action styles with the previous navigation fields
 // reconstructed only for the layout comparison.
 for(const [name,sha,focusPaths] of [
  ['menuPanel','0a446fd209492789ac70789eddded2a6c23a8c95441462b580d9d13ce4f7958c',
   [['result','viewEasterEgg','hit'],...['start','continueRun','titleQuit','settle'].map(name=>[name,'hit'])]],
  ['exitPanel','2f839c0755387aa4131ff9a9b72f886bf516ab715385a78b937117ab4c0adaf5',
   ['cancel','confirm'].map(name=>[name,'hit'])],
  ['runMenu','d18ff3b4edd0af091727ff52ee370c9db1d2628500c3424b02eb246ca53a04d1',
   ['resume','map','mainMenu','abandon','quit'].map(name=>[name,'hit'])],
 ]){
  const panel=child(stage,name);
  assert(all(panel).every(node=>node.focusable!==true&&node.isolateNavigation!==true),'retire authored navigation: '+name);
  const prior=restorePriorMenuNavigation(panel,focusPaths);
  if(name==='menuPanel')for(const action of ['start','continueRun','titleQuit']){
   // #963 applied the shipped v2.1.1 outline to these three title labels.
   const label=child(child(prior,action),'label');
   assert.equal(label.text.outlineOpacity,1,action+' retains the shipped title outline');
   delete label.text.outlineOpacity;
  }
  assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),sha,
   'preserve the complete reviewed menu outside the pinned navigation and label edits: '+name);
 }
 const script=`package.path=${luaString(directory.replaceAll('\\','/')+'/?.lua;src/lua/?.lua')}
dofile('tests/lua/support/sts_ui_closeout.lua')`;
 const require=createRequire(import.meta.url);
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{encoding:'utf8',timeout:60000});
 assert.equal(result.status,0,result.error?.message??result.stderr+result.stdout);
 assert.match(result.stdout,/STS_UI_CLOSEOUT_PASS/);
});

const require=createRequire(import.meta.url),directory=mkdtempSync(join(tmpdir(),'selection-overlay-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
buildLuaData('data',join(directory,'abyss_data.lua'));
buildUI(directory,undefined,{officialAssets:true,nativePageLifecycle:true});
const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));
const panel=child(child(layout,'stage'),'characterPanel');

test('generated official character selection follows the approved details revision',()=>{
 const references=loadUiReferences();
 for(const version of ['v2.0.0','v2.2.0']){
  const revisions=references.filter(row=>row.targetVersion===version&&
   row.codePath==='scripts/character-selection-composition.mjs'&&row.state==='details');
  assert.deepEqual(revisions.filter(row=>['APPROVED','CURRENT_IMPLEMENTATION'].includes(row.status))
   .map(row=>[row.revision,row.status]),[['release-sts1-20261122','APPROVED']]);
  assert.equal(revisions.find(row=>row.revision==='sts1-open-copy-20261119')?.status,'SUPERSEDED');
 }
 const output=join(directory,'refined-release');
 buildUI(output,undefined,{officialAssets:true,refinedReleaseMonsterArt:true,nativePageLifecycle:true,experimentalCharacters:false});
 const tree=JSON.parse(readFileSync(join(output,'game-ui.json'),'utf8'));
 const selection=child(child(tree,'stage'),'characterPanel');
 const details=child(selection,'details');
 const motion=child(details,'infoMotion'),infoLayers=motion?parts(motion):[details];
 assert(infoLayers.length>0);
 for(const info of infoLayers)for(const name of ['name','stats','gold','v25Story','relic','relicText']){
  assert.equal(child(info,name)?.kind,'text',name);
 }
 const retired=new Set(['deckTitle','deckSummary','deckRule','deckOpen','deckView']);
 const found=all(selection).filter(node=>retired.has(node.name)||/初始牌组|查看牌组/.test(node.text?.content??''));
 assert.deepEqual(found.map(node=>node.name),[],'obsolete starter deck controls in the official selection tree');
 for(const info of infoLayers){
  const story=child(info,'v25Story'),{content,fontSize,minFontSize}=story.text;
  const problems=capacityProblems([{path:'characterPanel/details/v25Story',kind:story.kind,visible:true,
   text:content,size:story.size,font:fontSize,minimum:minFontSize}],nativeTheme.layout.nativeText.lineHeight);
  assert.deepEqual(problems,[],'reserve both native lines for the mobile synopsis');
  assert(story.size[1]>=nativeTheme.layout.nativeText.lineHeight*2,'reserve two lines for longer synopses');
  assert.equal(content,'使用岩元素护盾与结晶应对敌人。');
  assert.equal(minFontSize,fontSize,'retain the authored text size');
  const stats=child(info,'stats'),relic=child(info,'relic');
  assert(story.position[1]+story.size[1]/2<stats.position[1]-stats.size[1]/2,'story clears health');
  assert(story.position[1]-story.size[1]/2>relic.position[1]+relic.size[1]/2,'story clears the relic title');
 }
});

test('official generated selection retires the legacy full-screen shade above its approved artwork',()=>{
 const background=child(panel,'lumineSelectionBackground'),shade=child(panel,'officialBackdropVeil');
 assert(parts(panel).indexOf(shade)>parts(panel).indexOf(background),'exercise the inherited foreground shade');
 assert.deepEqual(shade.size,[1280,720]);
 assert.equal(shade.visible,false,'ready artwork must not inherit the old full-screen backdrop shade');
 assert.equal(child(panel,'blocker').kind,'cursorArea','retire paint only; retain the selection input barrier');
 assert.equal(child(panel,'v25Background').visible,true,'the controller still owns its loading fallback');
 const fallback=child(panel,'v25Background');
 assert.deepEqual(parts(fallback).map(n=>n.name),['landscape','selectionShade']);
 assert.notEqual(child(fallback,'landscape').visible,false,'loading retains the fallback landscape');
 assert.equal(child(fallback,'selectionShade').visible,false,'the new transition layer starts hidden; loading remains unshaded');
 assert.deepEqual(readArtFeatures(directory),officialAssetFlags);
});

test('official native portrait ready, pause and reentry cannot restore the retired full-screen shade',t=>{
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local root=F.Viewport.apply(F.control({children=F.Layout}),1280,720)
local panel=root:GetChild('characterPanel');panel:SetVisible(true)
local art=panel:GetChild('lumineSelectionBackground')
local legacy=panel:GetChild('officialBackdropVeil')
local fallback=panel:GetChild('v25Background')
local landscape,transition=fallback:GetChild('landscape'),fallback:GetChild('selectionShade')
local motion=require('abyss_character_entrance').new(panel,{color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end},function()end)
local Asset=require('abyss_traveler_portrait_assets')
Asset.imagePrefabId,Asset.containerPrefabId,Asset.selectionHalfImagePrefabId=41,73,99
Enum={ImageSource={StaticReference='static'},ImageType={Stretch=23},ImageFillHorizontalType={Right=1}}
Color={FromRGBA=function(...)return {...}end}
local methods={}
function methods:SetVisible(value)self.visible=value end
function methods:SetActive(value)self.active=value end
function methods:SetImage(source,id)self.imageId=id end
for _,name in ipairs({'SetAnchorMin','SetAnchorMax','SetPivot','SetSizeDelta','SetLocalScale','SetLocalRotation','SetAnchoredPosition','SetAsLastSibling','SetFillHorizontal','SetFillUnused'})do methods[name]=function()end end
local function install(control)
 control.SetActive=methods.SetActive
 for _,c in pairs(control.children)do install(c)end
end
install(root)
local created,destroyed,rejectCreation=0,0,false
game={InstantiateClientUIControl=function(index,parent)
 assert(index==41 or index==73 or index==99)
 if rejectCreation then return nil end
 created=created+1;return setmetatable({parent=parent,alive=true},{__index=methods})
end,DestroyClientUIControl=function()destroyed=destroyed+1 end}
local portraits=require('abyss_traveler_portraits').new(root,nil,{selectionAvatar=true,battlePortrait=true})
local covered={}
local function scope(label)
 print('SELECTION_SCOPE '..label..' legacy='..tostring(legacy.visible)..' fallback='..tostring(fallback.visible)..' art='..tostring(art.visible)..' phase='..portraits:status().selection.phase)
 if legacy.visible then covered[#covered+1]=label end
end
portraits:sync('menu',true,false,'ironclad');scope('building')
assert(fallback.visible and landscape.visible and not transition.visible,'loading fallback is effectively unshaded')
for _=1,600 do portraits:tick();if portraits:readyForPage('menu',true,'ironclad','characterPanel')then break end end
assert(portraits:readyForPage('menu',true,'ironclad','characterPanel'))
motion:show({id='ironclad'},true)
motion:update(1)
assert(portraits:status().selection.phase=='ready' and art.visible and art:GetChild('figure').visible and not landscape.visible and not transition.visible and transition.imageColor.a==0)
scope('ready')
local total=created
portraits:sync('menu',false,false,'ironclad');motion:pause(true)
assert(not art.visible and fallback.visible and landscape.visible and not transition.visible and landscape.imageColor.a==255 and transition.imageColor.a==0);scope('paused')
portraits:sync('menu',true,false,'ironclad');portraits:tick()
motion:pause(false)
assert(art.visible and not landscape.visible and not transition.visible and created==total and destroyed==0);scope('reentry')
assert(panel:GetChild('blocker').visible,'input barrier was removed with legacy paint')
assert(portraits:release());motion:hide();rejectCreation=true
portraits:sync('menu',true,false,'ironclad');portraits:tick()
assert(portraits:status().selection.phase=='failed' and not art.visible and fallback.visible and landscape.visible and not transition.visible)
scope('failed')
portraits:onEngineDestroy();portraits:tick();scope('destroyed')
assert(#covered==0,'inherited full-screen shade covers the approved selection art: '..table.concat(covered,','))
print('SELECTION_OVERLAY_SCOPE_PASS created='..created)
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/SELECTION_OVERLAY_SCOPE_PASS/);
 t.diagnostic(result.stdout);
});

test('default opt-out retains its existing backdrop shade and no approved native selection host',()=>{
 const output=join(directory,'default');buildUI(output);
 const tree=JSON.parse(readFileSync(join(output,'game-ui.json'),'utf8'));
 const selection=child(child(tree,'stage'),'characterPanel');
 assert.notEqual(child(selection,'officialBackdropVeil').visible,false);
 assert.equal(child(selection,'lumineSelectionBackground'),undefined);
 assert.equal(child(selection,'veil').opacity,1);
});

async function selectionEntranceFixtureRead(read=readFileSync){
 const {beforeBattlePeriphery}=await import('./helpers/battle-periphery-source.mjs');
 const {beforeChapterBattleScene}=await import('./helpers/chapter-battle-scene-source.mjs');
 const {chapterEvidenceCurrentRead}=await import('./helpers/fork-preflight-source.mjs');
 const {checkedSelectionEntranceRead}=await import('./helpers/ui-selection-current-source.mjs');
 const readCurrent=chapterEvidenceCurrentRead(checkedSelectionEntranceRead(read));
 return path=>beforeBattlePeriphery(path,beforeChapterBattleScene(path,readCurrent(path,'utf8')));
}

test('selection replay authenticates the current source for both changed owners',async()=>{
 const {beforeOfficialCharacterBackflow}=await import('./helpers/current-replay-fix-sources.mjs');
 const {assertCurrentUiEntrance,authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');
 const read=await selectionEntranceFixtureRead();
 authenticateUiEntrance(read);
 for(const path of ['src/lua/abyss_character_select_view.lua','src/lua/abyss_game_ui_input.lua']){
  const current=read(path),previous=beforeOfficialCharacterBackflow(path,current);
  assert.notEqual(previous,current);
  assert.equal(beforeUiEntrance(path,previous),beforeUiEntrance(path,current));
  assert.throws(()=>assertCurrentUiEntrance(path,previous),/fresh current production owner/);
  assert.throws(()=>authenticateUiEntrance(owner=>owner===path?previous:read(owner)),/combined linked owner identity/);
 }
});

test('selection replay rejects stale owners after approved develop changes',async()=>{
 const {beforeApprovedUiEntrance}=await import('./helpers/ui-entrance-approved-sources.mjs');
 const {authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');
 const read=await selectionEntranceFixtureRead();
 authenticateUiEntrance(read);
 for(const path of ['config/architecture.json',...['game_ui','game_ui_lifecycle','game_ui_run','game_ui_view',
  'node_ui','node_ui_input','page_reveal'].map(name=>`src/lua/abyss_${name}.lua`)]){
  const current=read(path),prior=beforeApprovedUiEntrance(path,current);
  assert.notEqual(current,prior,path);
  assert.equal(beforeUiEntrance(path,current),beforeUiEntrance(path,prior));
  for(const invalid of [prior,current+'\n',current.slice(0,-1)+'!',null,Buffer.from(current)]){
   assert.throws(()=>authenticateUiEntrance(owner=>owner===path?invalid:read(owner)),
    {message:'combined linked owner identity: '+path+' during entrance validation'});
  }
  authenticateUiEntrance(owner=>owner===path?current.replaceAll('\r\n','\n').replaceAll('\n','\r\n'):read(owner));
 }
 const owner='src/lua/abyss_node_ui.lua';
 const lf=readFileSync(owner,'utf8').replaceAll('\r\n','\n'),crlf=lf.replaceAll('\n','\r\n');
 for(const mixed of [lf.replace('\n','\r\n'),crlf.replace('\r\n','\n')]){
  let reads=0;
  const changing=await selectionEntranceFixtureRead((path,encoding)=>
   path===owner&&++reads>1?mixed:readFileSync(path,encoding));
  assert.equal(changing(owner),read(owner));
  assert.throws(()=>changing(owner),{message:'uniform current Selection entrance source: '+owner});
 }
});

test('approved selection composition retains the exact historical views and checks the live revision',async()=>{
 const {beforeOfficialCharacterBackflow}=await import('./helpers/current-replay-fix-sources.mjs');
 const {beforeCharacterPreparationSource,beforeCurrentProductionSource}=await import('./helpers/character-preparation-source.mjs');
 const {beforeRebasedCi,beforeRebasedRelease,beforeRebasedStsUi,
  authorizeRebasedDevelop,authorizeRebasedRelease,authorizeRebasedStsUi}=await import('./helpers/rebased-release-source.mjs');
 const path='scripts/character-selection-composition.mjs';
 const read=owner=>readFileSync(owner,'utf8');
 const current=read(path),prior=beforeOfficialCharacterBackflow(path,current);
 const drift='!'+current.slice(1);
 const reader=source=>owner=>owner===path?source:read(owner);
 const missing=owner=>{if(owner===path)throw Error('fixture missing');return read(owner);};
 const foreign=/combined linked owner identity: scripts\/character-selection-composition\.mjs/;
 assert.notEqual(current,prior);
 for(const [project,authorize] of [[beforeRebasedCi,authorizeRebasedDevelop],
  [beforeRebasedRelease,authorizeRebasedRelease],[beforeRebasedStsUi,authorizeRebasedStsUi]]){
  const historic=project(path,prior);
  assert.notEqual(historic,prior);
  assert.equal(project(path,current),historic);
  assert.equal(project(path,drift),drift);
  const crlf=current.replaceAll('\r\n','\n').replaceAll('\n','\r\n');
  assert.equal(project(path,crlf).replaceAll('\r\n','\n'),historic.replaceAll('\r\n','\n'));
  authorize([[path,current]],read);
  authorize([[path,prior]],reader(prior));
  assert.throws(()=>authorize([[path,current],[path,prior]],read),/mixed live and predecessor sources/);
  assert.throws(()=>authorize([[path,prior],[path,current]],reader(prior)),/mixed live and predecessor sources/);
  assert.throws(()=>authorize([[path,prior]],read),foreign);
  for(const invalid of [prior,drift,null,Buffer.from(current)]){
   assert.throws(()=>authorize([[path,current]],reader(invalid)),foreign);
  }
  assert.throws(()=>authorize([[path,current]],missing),/combined linked owner missing/);
 }
 const prepared=beforeCharacterPreparationSource(path,prior,reader(prior));
 assert.equal(createHash('sha256').update(prepared.replaceAll('\r\n','\n')).digest('hex'),
  'c4d35a804a2f3febf216f1dd68cfed87dcac3728098ca9a182e9acaa008dd93f');
 assert.equal(beforeCurrentProductionSource(path,current,read),prepared);
 assert.throws(()=>beforeCurrentProductionSource(path,current,reader(prior)),foreign);
 for(const invalid of [prior,drift,null,Buffer.from(current)]){
  assert.throws(()=>beforeCurrentProductionSource(path,invalid,read),/fresh current production owner/);
 }
});
