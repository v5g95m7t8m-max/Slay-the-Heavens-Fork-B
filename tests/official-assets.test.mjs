import './sts1-menu-native.cases.mjs';
import {nativeAudioBuildArgs,buildNativeAudioGame} from '../scripts/build-native-audio-game.mjs';
import test from 'node:test';
import {cardFaceChildren} from '../scripts/card-face.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {officialAssetsProfile,officialAssetFlags,validateOfficialAssets,officialAssetsArgs,officialAssetsFromReceipt} from '../scripts/official-assets-profile.mjs';
import {artFeatureReceipt,artBuildOptionsFromReceipt,readArtFeatures} from '../scripts/art-features.mjs';
import {portraitInventory,portraitRuntimeInputs} from '../scripts/official-portraits.mjs';
import {auditUiBuildArgs} from '../scripts/audit-native-candidate.mjs';
import {uiProfileReceipt,uiProfileFromReceipt,validateUiProfileOptions} from '../scripts/ui-profile.mjs';
import {buildUI,assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {buildNativeCandidate} from '../scripts/build-native-candidate.mjs';
import {merchantControl} from '../scripts/cinematic-ui-layout.mjs';
import {gameBuildArgs} from '../scripts/build-game.mjs';
import {styleEvent} from '../scripts/v25-node-layout.mjs';
import {applyOfficialNeowLayout} from '../scripts/noncombat-neow-layout.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
import {assertOfficialRunContracts} from '../scripts/official-run-layout.mjs';
import {buildStsSharedCardChrome,geoCardReferenceTokens} from '../scripts/sts-card-reference-profile.mjs';
const children=node=>node.controls??node.children??[];
const all=node=>[node,...children(node).flatMap(all)];
const paths=(node,prefix='')=>allPaths(node,prefix);
function allPaths(node,prefix){const path=prefix+'/'+node.name;return [[path,node],...children(node).flatMap(item=>allPaths(item,path))];}
const child=(node,name)=>children(node).find(item=>item.name===name);
const restoredPagePath=path=>path.includes('/battlePanel/')||path.includes('/characterPanel/')
 ||path.includes('/menuPanel/start/')||/\/menuPanel\/(?:start|emblem|vista|heroArt)$/.test(path)
 // Only the adopted map/chrome owners change geometry; other room and menu
 // paths below must still retain their original transforms and input identity.
 ||/^\/SlayTheAbyss\/mapPanel\/(?:mapGroup1\/(?:title|notice|typeLegend)(?:\/|$)|previewBack(?:\/|$)|resources\/(?:hpIcon|hp|goldIcon|gold)$|resourceHints\/(?:hp|gold)(?:\/hit)?$)/.test(path)
 ||/^\/SlayTheAbyss\/nodePanel\/(?:title|hpIcon|hp|goldIcon|gold)$/.test(path)
 ||/^\/SlayTheAbyss\/potionEntry\/open(?:\/hit)?$/.test(path)
 ||/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)\/slot[1-5](?:\/|$)/.test(path);
function receipt(){return {officialAssetsProfile,artFeatures:artFeatureReceipt(officialAssetFlags),uiProfile:uiProfileReceipt(true),
 officialPortraits:{...portraitInventory(officialAssetFlags,{officialAssets:true}),inputs:portraitRuntimeInputs(officialAssetFlags).map(path=>({path}))}};}

test('official art is opt-in and preserves both legacy CLI presets and strict candidate guards',async()=>{
 assert.equal(validateOfficialAssets({}),false);
 assert.equal(validateOfficialAssets({officialAssets:true}),true);
 assert.deepEqual(officialAssetsArgs(['map.gil','--official-assets']),{args:['map.gil'],officialAssets:true});
 for(const args of [['--official-assets=false'],['--official-assets','--official-assets']])assert.throws(()=>officialAssetsArgs(args));
 assert.equal(validateOfficialAssets({officialAssets:true,releaseCandidate:true}),true);
 for(const patch of [{officialAssets:1},{lightweight2d:true},{v25BattleChrome:true},{v25CardAssets:'private'},{v25UiMasks:'private'},
  {nativeCardArt:{count:0}},{performanceArt:true},{readyCardArt:true},{componentWidgets:{}},{prepare(){}},{artFeatures:{cards:true}},
  {artFeatures:{selectionAvatar:false}},{artFeatures:{battlePortrait:false}},{artFeatures:{menuBackground:true}}]){
  assert.throws(()=>validateOfficialAssets({officialAssets:true,...patch}));
 }
 await assert.rejects(buildNativeCandidate({officialAssets:true,prepare(){}}),/separate candidate/);
 assert.deepEqual(gameBuildArgs(['base.gil','--art-version=official']),['base.gil','--official-assets','--native-page-lifecycle']);
 for(const version of ['legacy','enhanced'])assert(!gameBuildArgs(['base.gil','--art-version='+version]).includes('--official-assets'));
});

test('receipts and pinned source audits reconstruct official art and reject mismatched profiles',()=>{
 const value=receipt();
 assert.equal(officialAssetsFromReceipt(value),true);
 assert.equal(artBuildOptionsFromReceipt(value).officialAssets,true);
 assert.equal(uiProfileFromReceipt(value),true);
 assert.equal(validateUiProfileOptions({officialAssets:true,nativePageLifecycle:true}),true);
 const args=auditUiBuildArgs(value);
 assert(args.includes('--official-assets'));assert(args.includes('--native-page-lifecycle'));
 assert(!args.includes('--lightweight-2d'));assert(!args.includes('--v25-battle-chrome'));
 assert.equal(officialAssetsFromReceipt({}),false);
 for(const patch of [{officialAssetsProfile:'unknown'},{experimentalBattleChrome:'v25-layered-v1'},
  {experimentalProfile:'bounded-2d-v1'},{artFeatures:artFeatureReceipt({})},{nativeCardArt:{}},{v25UiMasks:{}}])
  assert.throws(()=>officialAssetsFromReceipt({...value,...patch}));
});

// The complete pre-capacity assertions remain byte-authenticated in the release view.
test('historical approved pages keep live input identities while unrelated pages retain their geometry',t=>{
 t.diagnostic(replayReviewedSelection('tests/official-assets.test.mjs'));
});

test('approved pages keep live input identities while unrelated pages retain their geometry',()=>{
 const layout=gameLayout(),template=deckCardTemplate(),theme=officialAssetsTheme(nativeTheme);
 const nodes=[...paths(layout),...paths(template)];
 // Event presentation now explicitly adopts the existing room component and
 // the approved Neow adapter. Compare every owned field to that shared
 // projection instead of treating this authorized room as unchanged geometry.
 const expectedEvent=structuredClone(child(child(layout,'nodePanel'),'eventView'));
 styleEvent(expectedEvent,theme);
 applyOfficialNeowLayout({children:[{name:'nodePanel',children:[expectedEvent]}]},theme);
 const eventProjection=new Map(paths(expectedEvent,'/SlayTheAbyss/nodePanel'));
 // The approved minimal menu is an adopted component too. Bind every owned
 // geometry/input field to that projection while retaining unrelated pages.
 const expectedMenuLayout=structuredClone(layout);
 applyOfficialNoncombatLayout(expectedMenuLayout,theme);
 const menuProjection=new Map(['menuPanel','exitPanel','runMenu','pageReveal'].flatMap(name=>paths(child(expectedMenuLayout,name),'/SlayTheAbyss')));
 const semantic=nodes.filter(([,node])=>['text','cursorArea','presetButton'].includes(node.kind))
  .map(([path,node])=>[path,node,structuredClone(node)]);
 const containers=nodes.filter(([,node])=>node.kind==='container').map(([path,node])=>[path,node,{position:node.position,size:node.size,visible:node.visible,scale:node.scale,rotation:node.rotation}]);
 const cardText=new Map(),cardDecorationPaths=new Set(),retiredCardDecorationPaths=new Set(),cardHosts=new Set();
 for(const [path,face]of nodes)if(child(face,'roundFrame')&&child(face,'costDisc')){
  cardHosts.add(face);
  for(const key of ['name','cost','costDirection','type','label','description','stamp','hit'])if(child(face,key))cardText.set(child(face,key),key==='description'?'label':key);
  for(const [inner,node]of nodes)if(inner.startsWith(path+'/')&&node.kind==='container'){
   cardDecorationPaths.add(inner);
   if(['roundShadow','roundFrame','roundBody','skin','roleMark','tagEdge','tagBody','nativeRibbon','nativeCostOrb','v25NodeCardChrome']
    .some(name=>inner.startsWith(path+'/'+name+'/')))retiredCardDecorationPaths.add(inner);
  }
 }
 const result=applyOfficialAssets([layout,template],theme);
 const current=new Map([...paths(layout),...paths(template)]);
 const retiredDeckPrefix='/SlayTheAbyss/characterPanel/deckView/';
 const retiredStarterEntry=path=>/^\/SlayTheAbyss\/characterPanel\/(?:deckView$|details\/deck(?:Open|Rule|Title|Summary)(?:\/|$))/.test(path);
 const retiredOverlay=path=>/^\/SlayTheAbyss\/(?:prologuePanel(?:\/|$)|(?:exitPanel|runMenu)\/(?:help|guide)(?:\/|$)|potionPanel\/)/.test(path);
 const retiredPickerChild=path=>/^\/SlayTheAbyss\/nodePanel\/pickerView\/card[4-6]\//.test(path);
 const retiredChoice=path=>/^\/SlayTheAbyss\/choicePanel\/card(?:[3-9]|10)(?:\/|$)/.test(path);
 assert.equal(child(child(layout,'characterPanel'),'deckView'),undefined);
 const merchant=new Map(paths(merchantControl(theme),'/SlayTheAbyss/nodePanel'));
  for(const [path,node,before] of semantic){
   if(retiredPickerChild(path)||retiredChoice(path)){
    assert.equal(current.has(path),false,path+' exact unused capacity face is retired');continue;
   }
   if(retiredOverlay(path)){
    // Shared popup reuses action names but takes its own hit controls below.
    if(path.startsWith('/SlayTheAbyss/potionPanel/'))assert.notStrictEqual(current.get(path),node);
    else assert.equal(current.has(path),false,path);
    continue;
   }
   if(path.startsWith(retiredDeckPrefix)||retiredStarterEntry(path)){
    assert.equal(current.has(path),false,path+' retired selection browser control must be removed');continue;
   }
   if(path.startsWith('/SlayTheAbyss/deckPanel/pileReturn/')){
    // The rounded face is visible independently of the native input receiver.
    if(path.endsWith('/hit')){
     const hit=current.get(path);assert.equal(hit.kind,'cursorArea');
     assert.deepEqual(hit.size,before.size);assert.equal(hit.focusable,undefined);
     const art=current.get(path.replace(/\/hit$/,'/art'));
     assert.notEqual(art.visible,false);
     assert.equal(child(art,'roundedButton').kind,'container');
     assert.equal(child(art,'label').text.content,'返回');
    }
    continue;
   }
   assert.equal(current.get(path),node,path);
   if(menuProjection.has(path)){
    const expected=menuProjection.get(path);
    assert.equal(node.kind,before.kind,path+' existing menu semantic control kind');
    for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget'])
     assert.deepEqual(node[key],expected[key],path+' approved menu '+key);
    if(node.text){
     const actualText={...node.text},expectedText={...expected.text};
     delete actualText.colour;delete expectedText.colour;
     if(expectedText.autoSize&&expectedText.minFontSize*1.45+4>expected.size?.[1])expectedText.minFontSize=nativeTheme.font.minimum;
     assert.deepEqual(actualText,expectedText,path+' approved menu text');
    }
    continue;
   }
   if(eventProjection.has(path)){
    assert.deepEqual(node,eventProjection.get(path),path+' shared event projection');continue;
   }
   if(merchant.has(path)){
    const expected=structuredClone(merchant.get(path));
    if(expected.text)expected.text.content=before.text.content;
    assert.deepEqual(node,expected,path+' shared merchant projection');continue;
   }
   if(cardText.has(node)){
    const canonical=child(child(child(layout,'battlePanel'),'card1'),cardText.get(node))??cardFaceChildren(theme,'node').find(part=>part.name===cardText.get(node));
    if(canonical.text?.autoSize&&canonical.text.minFontSize*1.45+4>canonical.size[1])canonical.text.minFontSize=theme.font.minimum;
    for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget','text'])assert.deepEqual(node[key],canonical[key],path+' shared '+key);
    continue;
   }
   if(restoredPagePath(path)){
    // Retain the input/state contracts on pages with adopted geometry.
    for(const key of ['kind','states','focusable','interactable','raycastTarget'])assert.deepEqual(node[key],before[key],path+' '+key);
    continue;
   }
   if(path==='/SlayTheAbyss/combatRewards/label'){
    assert.equal(node.text.content,before.text.content);
    assert.deepEqual(node.position,[0,0]);
    continue;
   }
   if(path==='/SlayTheAbyss/combatRewards/hit'){
    assert.deepEqual(node.size,theme.officialAssets.actionButton.mapReturn.size);
    assert.equal(node.focusable,before.focusable);
    continue;
   }
  for(const key of ['position','size','visible','scale','rotation','states','focusable','interactable','raycastTarget']){
   const potionLabel=/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)\/label$/.test(path);
   const relicHit=/^\/SlayTheAbyss\/relicBar\/slot\d+\/hit$/.test(path);
   const footer=/^\/SlayTheAbyss\/deckPanel\/(browserDescription|rarityTip|previous|next|pageHint)$/.exec(path);
   const frame=footer&&theme.layout.deckView.browser.footer[footer[1]];
   const expected=key==='position'&&frame?frame.slice(0,2):key==='size'&&frame?frame.slice(2):key==='size'&&relicHit?[theme.officialAssets.battleRelicBar.hit,theme.officialAssets.battleRelicBar.hit]:key==='size'&&cardText.get(node)==='cost'
    ?child(child(child(layout,'battlePanel'),'card1'),'cost').size:key==='visible'&&potionLabel?false:before[key];
   assert.deepEqual(node[key],expected,path+' '+key);
  }
   if(node.text){const actual={...node.text},expected={...before.text};delete actual.colour;delete expected.colour;
    if(cardText.has(node))for(const key of ['outline','outlineColour','outlineOpacity']){
     const canonical=child(child(child(layout,'battlePanel'),'card1'),cardText.get(node)).text;
     assert.deepEqual(actual[key],canonical[key],path+' shared '+key);expected[key]=canonical[key];
    }
    if(expected.autoSize&&(expected.minFontSize*1.45+4>before.size?.[1]||path.endsWith('/shopView/removal/description')))expected.minFontSize=nativeTheme.font.minimum;assert.deepEqual(actual,expected,path);}
 }
  const canonical=child(child(layout,'battlePanel'),'card1');
  for(const [path,node,before]of containers){
   if(path==='/SlayTheAbyss/potionPanel'){
    const popup=current.get(path);
    const battlePopup=current.get('/SlayTheAbyss/battlePanel/potionHelp/potionPopup');
    assert.deepEqual(popup,{...battlePopup,name:'potionPanel'});
    continue;
   }
   if(retiredPickerChild(path)||retiredChoice(path)){
    assert.equal(current.has(path),false,path+' exact unused capacity face is retired');continue;
   }
   if(/^\/SlayTheAbyss\/nodePanel\/pickerView\/card[4-6]$/.test(path)){
    assert.strictEqual(current.get(path),node,path+' semantic parent identity is retained');
    assert.deepEqual(children(node),[],path+' unused parent contains no face payload');
    for(const key of Object.keys(before))assert.deepEqual(node[key],key==='visible'?false:key==='size'?theme.layout.card.size:before[key],path+' semantic parent '+key);
    continue;
   }
   if(retiredOverlay(path)){
    // Shared popup reuses action names but takes its own hit controls below.
    if(path.startsWith('/SlayTheAbyss/potionPanel/'))assert.notStrictEqual(current.get(path),node);
    else assert.equal(current.has(path),false,path);
    continue;
   }
   if(path.startsWith(retiredDeckPrefix)||retiredStarterEntry(path)){
    assert.equal(current.has(path),false,path+' retired selection browser control must be removed');continue;
   }
   if(menuProjection.has(path)){
    assert.equal(current.get(path),node,path+' menu input owner identity');
    for(const key of Object.keys(before))assert.deepEqual(node[key],menuProjection.get(path)[key],path+' approved menu '+key);
    continue;
   }
   if(restoredPagePath(path)||path.startsWith('/SlayTheAbyss/deckPanel/pileReturn'))continue;
   if(retiredCardDecorationPaths.has(path)){
    assert.equal(current.has(path),false,path+' retired independent card decoration must be removed');continue;
   }
   if(cardDecorationPaths.has(path)){assert(current.has(path),path+' shared decoration remains addressable');continue;}
   assert.equal(current.get(path),node,path);
   if(eventProjection.has(path)){
    assert.deepEqual(node,eventProjection.get(path),path+' shared event projection');continue;
   }
   if(merchant.has(path)){
    assert.deepEqual(node,merchant.get(path),path+' shared merchant projection');continue;
   }
   if(/^\/SlayTheAbyss\/combatRewards(?:\/|$)/.test(path)){
    const caption=child(node,'label');
    if(caption)assert.equal(caption.text.content,'返回战利品');
    continue;
   }
   const footer=/^\/SlayTheAbyss\/deckPanel\/(browserDescription|rarityTip|previous|next|pageHint)$/.exec(path);
   const frame=path==='/SlayTheAbyss/deckPanel/pileGrid'?theme.layout.deckView.pileViewport
    :footer&&theme.layout.deckView.browser.footer[footer[1]];
   const expected=frame?{...before,position:frame.slice(0,2),size:frame.slice(2)}:before;
   for(const key of Object.keys(expected)){
    const choiceSlot=/^\/SlayTheAbyss\/choicePanel\/card([12])$/.exec(path);
    if(choiceSlot&&key==='position'){
     const page=theme.layout.combatChoice,index=Number(choiceSlot[1])-1;
     assert.deepEqual(node.position,[page.origin[0]+index%page.columns*page.step[0],page.origin[1]+Math.floor(index/page.columns)*page.step[1]],path+' two-card page position');continue;
    }
    if(key==='scale'&&/^\/SlayTheAbyss\/potionEntry\/open\/hit\/(?:normal|hover|pressed|disabled)$/.test(path)){
     assert.deepEqual(node.scale,[1,1],path+' battle slot states already own their scale');continue;
    }
    if(key==='scale'&&node.name==='pressed'&&child(node,'roundedButton')){
     assert.deepEqual(node.scale,Array(2).fill(theme.officialAssets.actionButton.pressedScale),path+' common pressed scale');continue;
    }
    const relicSlot=/^\/SlayTheAbyss\/relicBar\/slot(\d+)$/.exec(path);
    if(relicSlot&&key==='position'){
     const bar=theme.officialAssets.battleRelicBar;
     assert.deepEqual(node.position,[bar.origin[0]+bar.step*(Number(relicSlot[1])-1),bar.origin[1]],path+' canonical position');continue;
    }
    assert.deepEqual(node[key],key==='size'&&cardHosts.has(node)?theme.layout.card.size:expected[key],path+' '+key);
   }
  }
 const cardPaths=[...paths(layout),...paths(template)].filter(([,node])=>child(node,'roundFrame')&&child(node,'costDisc'));
 const cards=cardPaths.map(([,node])=>node);
 const retiredDeckCards=nodes.filter(([path,node])=>path.startsWith(retiredDeckPrefix)&&cardHosts.has(node)).map(([,node])=>node);
 const retiredPickerCards=nodes.filter(([path,node])=>/^\/SlayTheAbyss\/nodePanel\/pickerView\/card[4-6]$/.test(path)&&cardHosts.has(node)).map(([,node])=>node);
 const retiredChoiceCards=nodes.filter(([path,node])=>retiredChoice(path)&&cardHosts.has(node)).map(([,node])=>node);
 assert.equal(retiredDeckCards.length,12,'the duplicated twelve-card selection modal is retired');
 assert.equal(retiredPickerCards.length,3,'only picker faces four through six are retired');
 assert.equal(retiredChoiceCards.length,8,'only choice faces three through ten are retired');
 const retiredCards=[...retiredDeckCards,...retiredPickerCards,...retiredChoiceCards];
 assert.equal(result.cardHosts,cardHosts.size-retiredPickerCards.length-retiredChoiceCards.length,'composition authenticates all capacity-bounded hosts before retiring the duplicate modal');
 assert.equal(cards.length,cardHosts.size-retiredCards.length);
 const focusFacePath='/SlayTheAbyss/deckPanel/cardFocus/face';
 const originalCardPaths=nodes.filter(([path,node])=>path!==focusFacePath&&cardHosts.has(node)&&!retiredCards.includes(node)).map(([path])=>path).sort();
 const liveOriginalPaths=cardPaths.filter(([path])=>path!==focusFacePath).map(([path])=>path).sort();
 assert.equal(originalCardPaths.length,38,'retain the original 38 official card hosts');
 assert.deepEqual(liveOriginalPaths,originalCardPaths,'retain every original active card host path');
 const focusFaces=cardPaths.filter(([path])=>path===focusFacePath);
 assert.equal(focusFaces.length,1,'exactly one approved read-only deck focus face');
 const focus=child(child(layout,'deckPanel'),'cardFocus');
 assert.strictEqual(focusFaces[0][1],child(focus,'face'));
 assert.equal(focus.visible,false,'the deck focus starts closed');
 assert(!all(focus).some(node=>node.kind==='cursorArea'),'the focus face adds no input receiver');
 assert(result.removedControls>500);
 for(const face of cardHosts)assert.equal(cards.includes(face),!retiredCards.includes(face),'retain every active original card host');
 assertOfficialRunContracts([layout,template]);
 for(const card of cards){
  for(const role of ['roundBody','roundFrame']){
   const old=child(card,role);assert.equal(old.visible,false);assert.deepEqual(old.children,[],'retired card material must stay empty');
  }
  const skin=child(card,'skin');if(skin){assert.equal(skin.visible,false);assert.deepEqual(skin.children,[]);}
  assert.equal(child(card,'costCore').image,107203);assert.equal(child(card,'costCore').visible,false);
  for(const role of ['stsReferenceBack','stsReferenceChrome']){
   const material=child(card,role);assert(material);assert.deepEqual(material.position,[0,0]);assert.deepEqual(material.size,theme.layout.card.size);
  }
 }
  const battle=child(layout,'battlePanel');
  assert.deepEqual(child(battle,'hero').position,[-324,-37]);
  assert.equal(child(child(battle,'hero'),'name').visible,false);
  assert.deepEqual(child(battle,'endTurn').position,[454.5,-220]);
  assert.deepEqual(child(battle,'endTurn').size,[143,56]);
  assert.deepEqual(child(battle,'drawIcon').position,[-585.5,-311.5]);
  for(const kind of ['draw','discard']){
   const pile=child(battle,kind+'Icon'),hit=child(pile,'hit'),label=child(battle,kind+'Label');
   const hx=pile.position[0]+hit.position[0],hy=pile.position[1]+hit.position[1];
   assert.equal(label.visible,false,'original pile captions remain hover details');
   assert.equal(label.text.content,'','runtime visibility refresh must not restore a caption over exhaust');
   assert.deepEqual(hit.size,pile.size,'actual pile stack must be clickable');
   const turn=child(battle,'endTurn');
   assert(hx+hit.size[0]/2<turn.position[0]-turn.size[0]/2||hx-hit.size[0]/2>turn.position[0]+turn.size[0]/2,'pile target must not overlap irreversible End Turn');
  }
  const hints=child(battle,'resourceHints');
  for(let slot=1;slot<=5;slot++){
   const help=child(battle,'potionHelp'),caption=child(help,'potionCaption'+slot);
   assert.equal(caption.active,false);assert.equal(caption.visible,false);assert.equal(caption.text.content,'','original potion slots have no permanent abbreviations');
   const bottle=child(battle,'potion'+slot)??child(help,'potion'+slot);
   assert.deepEqual(bottle.position,[nativeTheme.officialAssets.battleHud.potionX+(slot-1)*nativeTheme.officialAssets.battleHud.potionStep,nativeTheme.officialAssets.battleHud.y]);
   assert.deepEqual(bottle.size,[44,44]);
  }
  for(const kind of ['hp','gold']){
   const box=child(hints,kind),hit=child(box,'hit');
   for(let slot=1;slot<=3;slot++){
    const potion=child(battle,'potion'+slot);
    assert(Math.abs(box.position[0]-potion.position[0])>=(hit.size[0]+potion.size[0])/2,'resource help overlaps potion '+slot);
   }
  }
  const exhaust=child(battle,'exhaustIcon'),discard=child(battle,'discardIcon');
  assert.deepEqual(exhaust.size,[32,32],'exhaust must remain a compact visual entry');
  assert.deepEqual(child(exhaust,'hit').size,[44,44],'compact art retains a native touch target');
  assert.equal(child(exhaust,'image').image,102049,'reuse the verified existing exhaust keyword glyph');
  assert.notEqual(child(exhaust,'image').colour,'#000000','do not restore the solid black circle');
  assert.equal(child(battle,'exhaust').text.fontSize,18);
  assert.ok(child(battle,'exhaust').size[1]>=18*1.45+4,'counter retains one native text row');
  assert(exhaust.position[1]-child(exhaust,'hit').size[1]/2>discard.position[1]+child(discard,'hit').size[1]/2,'exhaust and discard hits overlap');
  const reference=theme.officialAssets.stsCardReference,material=buildStsSharedCardChrome(theme),tokens=geoCardReferenceTokens(theme);
  for(let i=1;i<=10;i++){
   const card=child(battle,'card'+i);assert(card);
   assert.deepEqual(card.size,[150,210]);
   for(const [name,key]of [['cost','cost'],['name','title'],['label','body']]){
    const field=child(card,name),geometry=reference.geometry[key];
    assert.deepEqual(field.position,geometry.position);assert.deepEqual(field.size,geometry.size);
    assert.equal(field.text.fontSize,Math.max(14,theme.font.minimum,tokens.typography[key]));
   }
   assert.deepEqual(child(card,'stsReferenceBack').children,material.children.filter(n=>['body','portraits'].includes(n.name)));
   assert.deepEqual(child(card,'stsReferenceChrome').children,material.children.filter(n=>!['body','portraits','costMaterial'].includes(n.name)));
   assert.deepEqual(child(card,'stsReferenceCost').children,material.children.filter(n=>n.name==='costMaterial'));
   assert.deepEqual(child(card,'roundBody').children,[],'retired square paper must not leak through reference corners');
   assert.equal(child(card,'nameBand').visible,false);
   for(const role of ['nativeRibbon','nativeCostOrb','skin']){
    const retired=child(card,role);assert.equal(retired.visible,false);assert.deepEqual(retired.children,[],role+' cannot duplicate shared material');
   }
   const glow=child(card,'nativePlayableRim');
   assert.deepEqual(nativeTheme.officialAssets.battleGlowSource.rgba,[.2,.9,1,.25],'source float color remains explicit despite native 8-bit quantization');
   assert.equal(child(glow,'softEdge').children[0].opacity,.25,'main border retains source alpha');
   for(const control of all(glow)){
    assert(control.size[0]>0&&control.size[0]<=1600&&control.size[1]>0&&control.size[1]<=900,'every glow control must satisfy formal encoder rect limits before scale');
   }
   for(const layer of glow.children){
    assert.equal(layer.children.length,8,'bounded soft contour has four edges and four corners');
    assert(layer.children.every(n=>n.image===106056||n.image===106057),'glow must use verified continuous alpha textures');
    for(const part of layer.children)assert.equal(part.imageType,part.name.startsWith('corner')?'basic':'stretch');
    for(const part of layer.children.filter(n=>n.name.startsWith('corner'))){
     assert.equal(Math.abs(part.position[0]),66,'radial center stays under the rounded card corner');
     assert.equal(Math.abs(part.position[1]),96,'radial peak must not float outside the silhouette');
    }
   }
  }
 assertNativeUiCapacity(layout);assertNativeUiCapacity(template);
});

test('scene and button substitutions preserve semantic icons and all four native button states',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 const before=new Map(paths(layout).filter(([,node])=>node.kind==='image').map(([path,node])=>[path,node.image]));
 applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel'),turn=child(battle,'endTurn');
 assert.deepEqual(turn.states,{normal:'normal',hover:'hover',pressed:'pressed',disabled:'disabled'});
  for(const state of turn.children){
   assert(child(state,'v25Chrome'));
   assert.equal(child(child(state,'v25Chrome'),'faceLight'),undefined,'no rectangular face highlight patch');
   for(const name of ['border','borderLeft','borderRight','inner','innerLeft','innerRight','plate','plateLeft','plateRight'])assert.equal(child(state,name).visible,false,'legacy '+name+' must not widen the restored turn button');
  }
 for(const [path,node]of paths(layout))if(/\/(portrait|intentIcon|intentBadge|intentExtra|hpIcon|goldIcon|blockedLock|art|art_attack|art_skill|art_power|icon)$/.test(path)&&node.kind==='image'){
  const expected=path==='/SlayTheAbyss/nodePanel/eventView/art'?theme.icon.eventArt.default:
   before.get(path)??(/^\/SlayTheAbyss\/relicBar\/slot(?:1[3-9]|2[0-5])\/icon$/.test(path)?before.get('/SlayTheAbyss/relicBar/slot1/icon'):undefined);
  assert.equal(node.image,expected,path);
 }
 assert.equal(child(child(layout,'menuPanel'),'backdrop').image,nativeTheme.image.officialBackdrops.title);
 const menu=child(layout,'menuPanel'),result=child(menu,'result');
 for(const key of ['floor','victories','time','deck']){
  const stat=child(result,'stat_'+key);assert.equal(child(stat,'face').image,107311);
  assert.equal(child(stat,'face').colour,'#FFFFFF');assert.equal(child(stat,'border').colour,nativeTheme.color.goldDim);
 }
 const map=child(layout,'mapPanel'),field=child(child(map,'mapGroup1'),'mapField');
 assert.equal(field.image,nativeTheme.image.rect);assert.equal(field.colour,nativeTheme.color.mapCanvas.backdrop);
  assert.equal(theme.cardSkin.text.body,nativeTheme.officialAssets.cardInk);assert.equal(nativeTheme.cardSkin.text.body,undefined);
 const removal=child(child(child(layout,'nodePanel'),'shopView'),'removal');
 const description=child(removal,'description');
 assert.equal(description.text.fontSize,20);assert.equal(description.text.minFontSize,nativeTheme.font.minimum);
 assert.equal(description.text.autoSize,true);assert.deepEqual(description.size,[104,64]);
});

test('official selection keeps its approved 1600 background while battle and opt-out retain their explicit sources',t=>{
 const root=resolve('.artifacts/test-tmp');mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'official-assets-'));
 t.after(()=>rmSync(dir,{force:true,recursive:true}));
 buildUI(dir,undefined,{officialAssets:true,nativePageLifecycle:true});
 assert.deepEqual(readArtFeatures(dir),officialAssetFlags);
 const layout=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 const battle=child(child(layout,'stage'),'battlePanel');
 assert(child(child(battle,'card1'),'stsReferenceChrome'),'official battle card must mount the shared reference chrome');
 assert(child(child(battle,'hero'),'officialFigure'));
 const portrait=readFileSync(join(dir,'abyss_traveler_portrait_assets.lua'),'utf8');
 assert.doesNotMatch(portrait,/battle133=/,'official build excludes the unused fallback battle portrait');assert.match(portrait,/avatar96=/);
 assert.match(portrait,/battlePixel=/);
 const inventory=portraitInventory(officialAssetFlags,{officialAssets:true});
 assert.equal(inventory.assets.some(a=>a.asset==='temporary-pixel-traveler'),false);
 assert.match(portrait,/battleApprovedNative=/);
 const selected=inventory.assets.find(a=>a.asset==='lowpolyLumine');
 const fighting=inventory.assets.find(a=>a.asset==='traveler-geo/portraits/lumine-native-v1');
 assert.equal(fighting?.images,464);
 assert.equal(fighting.motion,'shared-actor-root-only');
 assert.equal(inventory.selectionUses,'lowpolyLumine');assert.equal(selected?.images,1600);
 assert.notEqual(selected.sourceSha256,fighting.sourceSha256,'approved background and combat idle retain distinct source identities');
 assert.equal(inventory.assets.some(a=>a.asset==='traveler-geo/portraits/battle133-selection'),false);
 assert.equal(inventory.assets.find(a=>a.asset==='traveler-geo/portraits/avatar96').images,457);
 assert.doesNotMatch(portrait,/lowpolyLand=/);
 assert.match(readFileSync(join(dir,'abyss_theme.lua'),'utf8'),/official-assets-first/);
 assert.match(readFileSync(join(dir,'abyss_ui_profile.lua'),'utf8'),/nativePageLifecycle=true/);
 buildUI(dir);
 const fallback=JSON.parse(readFileSync(join(dir,'game-ui.json'),'utf8'));
 assert.notEqual(child(child(child(child(child(fallback,'stage'),'battlePanel'),'card1'),'roundBody'),'vertical')?.image,107253);
 assert.deepEqual(readArtFeatures(dir),{cards:false,menuBackground:false,selectionAvatar:false,battlePortrait:false,monsters:false});
});

test('audio wrapper forwards the explicit official profile and lifecycle without legacy background defaults',async()=>{
 const parsed=nativeAudioBuildArgs(['base.gil','--official-assets']);
 assert.deepEqual(parsed.options.artFeatures,officialAssetFlags);assert.equal(parsed.options.nativePageLifecycle,true);
 const stop=Error('before native toolchain');let called=false;
 await assert.rejects(buildNativeAudioGame({...parsed.options,baseMap:'base.gil',buildFull:async options=>{
  called=true;assert.equal(options.officialAssets,true);assert.equal(options.nativePageLifecycle,true);
  assert.deepEqual(options.artFeatures,officialAssetFlags);throw stop;
 }}),error=>error===stop);assert(called);
});
import {replayReviewedSelection} from './helpers/replay-reviewed-selection.mjs';

test('official selection leaves the portrait unobscured and exit retains the live button owner',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 const panel=child(layout,'characterPanel'),details=child(panel,'details');
 const hit=child(child(child(layout,'runMenu'),'mainMenu'),'hit');
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(details,'informationBoard'),undefined,'the left copy must not shade the portrait');
 for(const name of ['deckTitle','deckSummary','deckOpen'])assert.equal(child(details,name),undefined);
 for(const name of ['name','stats','gold','v25Story','relic','relicText']){
  const control=child(details,name);
  assert.equal(control.text.align,'left',name);
  assert.equal(control.text.outline,true,name);
 }
 assert.equal(child(panel,'scrim').visible,false);
 assert.strictEqual(child(child(child(layout,'runMenu'),'mainMenu'),'hit'),hit);
 assert.deepEqual(hit.size,[180,60]);
 assert.equal(hit.kind,'presetButton');
 assert.deepEqual(Object.keys(hit.states),['normal','hover','pressed','disabled']);
 const back=child(child(panel,'cancel'),'hit');
 const confirm=child(child(panel,'confirm'),'hit');
 for(const button of [hit,back,confirm])for(const state of children(button)){
  const legacy=children(state).filter(part=>['officialButtonBacking','border','plate'].includes(part.name));
  assert(legacy.length>0,'official composition must exercise the existing backing');
  assert(legacy.every(part=>part.visible===false),'legacy backing is visible through the rounded corners');
 }
 for(const state of children(hit)){
  assert.deepEqual(child(state,'v25Flag'),child(child(back,state.name),'v25Flag'));
  assert.equal(child(state,'label').text.content,'退出游戏');
 }
});

test('official run pages use one three-step floor marker just after the potion slots',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel'),map=child(layout,'mapPanel'),node=child(layout,'nodePanel');
 const marks=[child(battle,'topBar'),child(map,'officialRunBar'),child(node,'officialRunBar')]
  .map(bar=>child(bar,'officialStairs'));
 const [stairs]=marks;
 assert(stairs,'shared floor indicator');
 assert.deepEqual(marks,[stairs,stairs,stairs]);
 assert.equal(children(stairs).length,3);
 assert.deepEqual(children(stairs).map(step=>step.size),[[7,18],[7,12],[7,6]]);
 assert(children(stairs).every(step=>step.image===theme.image.rect));
 assert(stairs.position[0]>child(battle,'potion3').position[0]);
 assert.equal(child(battle,'title').text.content,'');
 assert.equal(child(battle,'title').text.align,'left');
 assert.deepEqual(child(node,'title').position,child(battle,'title').position);
});

test('ordinary fade keeps the original input barrier and retires the cinematic artwork',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);
 const cover=child(layout,'pageReveal'),blocker=child(cover,'blocker'),cancel=child(cover,'cancel');
 assert(child(child(child(layout,'prologuePanel'),'scene'),'seal'),'legacy fixture still retains its reference');
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(layout,'prologuePanel'),undefined);
 assert.deepEqual(children(cover).map(node=>node.name),['veil','blocker','message','cancel']);
 assert.equal(child(cover,'veil').colour,'#000000');
 assert.equal(child(cover,'message').visible,false);
 assert.strictEqual(child(cover,'blocker'),blocker);
 assert.strictEqual(child(cover,'cancel'),cancel);
});
test('approved native title and button artwork preserve the official menu hit surfaces',()=>{
  const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme),menu=child(layout,'menuPanel');
  const receiver=child(child(menu,'start'),'hit');
  applyOfficialNoncombatLayout(layout,theme);
  assert.strictEqual(child(child(menu,'start'),'hit'),receiver);
  const logo=child(child(menu,'v25MainMenu'),'sts1TitleLogo');
  assert(logo && children(logo).length>0);
  assert(children(logo).every(part=>children(part).length>0 && children(part).length<=60));
  for(const [name,frame,text] of [
    ['start',theme.menuPresentation.start,'开始游戏'],
    ['titleQuit',theme.menuPresentation.quit,'退出游戏'],
  ]) {
    const button=child(menu,name), hit=child(button,'hit');
    assert.deepEqual(button.position,frame.slice(0,2));
    assert.deepEqual(hit.size,frame.slice(2));
    assert.equal(hit.kind,'cursorArea');
    assert.equal(child(button,'label').text.align,'left');
    assert.equal(child(button,'label').text.content,text);
    const faces=children(child(button,'v25MenuFace'));
    assert.deepEqual(faces.map(part=>part.name),['normal','hover','pressed','disabled']);
    assert.equal(children(faces[0]).length,0,'STS1 resting text has no plate');
    assert(faces.slice(1).every(face=>children(face).length===24));
    assert.notDeepEqual(children(faces[1]),children(faces[2]));
    assert.equal(child(button,'menuAccent'),undefined);
  }
});
