import assert from 'node:assert/strict';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {uiEntranceOwns} from './ui-entrance-source.mjs';

// Replay the exact active fixture and copier predecessors without replacing prior receipts.
const receipts=Object.freeze({
 "tests/official-assets.test.mjs": {
  "current": {
   "sha256": "da41c85b22368e3ed4719a808b95548420959b2941af3a049c8231bc07adc5f4",
   "gitBlob": "be08d4f5085665c5ba12b35f611728edb4e0cc28"
  },
  "previous": {
   "sha256": "9033a9a6d33e4a133feb8db12fadcab03b6b96ec53d06c77e9fc22fadabba352",
   "gitBlob": "c794c0296c2b1cc06a6f9a63902d9577ab0143e1"
  },
  "hunks": [
   {
    "at": 106,
    "before": " const current=new Map([...paths(layout),...paths(template)]);\n const retiredDeckPrefix='/SlayTheAbyss/characterPanel/deckView/';\n const retiredStarterEntry=path=>/^\\/SlayTheAbyss\\/characterPanel\\/details\\/deck(?:Open|Title|Summary|Rule)(?:\\/|$)/.test(path);\n const retiredOverlay=path=>/^\\/SlayTheAbyss\\/(?:prologuePanel(?:\\/|$)|(?:exitPanel|runMenu)\\/(?:help|guide)(?:\\/|$)|potionPanel\\/)/.test(path);\n const retiredPickerChild=path=>/^\\/SlayTheAbyss\\/nodePanel\\/pickerView\\/card[4-6]\\//.test(path);\n const retiredChoice=path=>/^\\/SlayTheAbyss\\/choicePanel\\/card(?:[3-9]|10)(?:\\/|$)/.test(path);\n const retiredDeck=child(child(layout,'characterPanel'),'deckView');\n assert.equal(retiredDeck.visible,false);assert.deepEqual(retiredDeck.children,[],\n  'selection must use the shared deck browser instead of keeping twelve independent card slots');\n const merchant=new Map(paths(merchantControl(theme),'/SlayTheAbyss/nodePanel'));\n  for(const [path,node,before] of semantic){",
    "after": " const current=new Map([...paths(layout),...paths(template)]);\n const retiredDeckPrefix='/SlayTheAbyss/characterPanel/deckView/';\n const retiredStarterEntry=path=>/^\\/SlayTheAbyss\\/characterPanel\\/(?:deckView$|details\\/deck(?:Open|Rule|Title|Summary)(?:\\/|$))/.test(path);\n const retiredOverlay=path=>/^\\/SlayTheAbyss\\/(?:prologuePanel(?:\\/|$)|(?:exitPanel|runMenu)\\/(?:help|guide)(?:\\/|$)|potionPanel\\/)/.test(path);\n const retiredPickerChild=path=>/^\\/SlayTheAbyss\\/nodePanel\\/pickerView\\/card[4-6]\\//.test(path);\n const retiredChoice=path=>/^\\/SlayTheAbyss\\/choicePanel\\/card(?:[3-9]|10)(?:\\/|$)/.test(path);\n assert.equal(child(child(layout,'characterPanel'),'deckView'),undefined);\n const merchant=new Map(paths(merchantControl(theme),'/SlayTheAbyss/nodePanel'));\n  for(const [path,node,before] of semantic){"
   }
  ]
 },
 "tests/sts-character-browser.test.mjs": {
  "current": {
   "sha256": "f10724414fe7a44db6eead4007fbed882a69b6db090c10d017ee84b74f51c2a6",
   "gitBlob": "30d12b5dd4900db8a86ccb7e84cd9bee87402145"
  },
  "previous": {
   "sha256": "a8c371980710a7824aff8328cf5c041b06b1199eea548cb4e51b17668a7d40dc",
   "gitBlob": "be5b6ad2bc339cfc227818355a4505b94f88ddf9"
  },
  "hunks": [
   {
    "at": 76,
    "before": "assert(deck.browserShell and not deck.pileView and not deck.pileKind and not deck.choiceToken and not deck.battle)\nassert(deck.run.readOnlyPreview and #deck.cards==info.deckSize and deckPanel:GetChild('pileGrid').visible)\nassert(not panel.visible and not panel:GetChild('deckView').visible and #panel:GetChild('deckView'):GetChildren()==0)\nassert(host.pointerBlocked(),'preparation must keep preview input covered')\nassert(not host:openStarterDeck(),'covered/reentrant opening must fail')",
    "after": "assert(deck.browserShell and not deck.pileView and not deck.pileKind and not deck.choiceToken and not deck.battle)\nassert(deck.run.readOnlyPreview and #deck.cards==info.deckSize and deckPanel:GetChild('pileGrid').visible)\nassert(not panel.visible and not panel:GetChild('deckView'))\nassert(host.pointerBlocked(),'preparation must keep preview input covered')\nassert(not host:openStarterDeck(),'covered/reentrant opening must fail')"
   }
  ]
 },
 "tests/helpers/copy-integration-source-closure.mjs": {
  "current": {
   "sha256": "afa853afb92fccdd8c458cbe59c9e8e802facf422f9e3f460666c91eb6267bcf",
   "gitBlob": "4f42b1c3cca2582f88b9a6a03767e98e0c17cb7f"
  },
  "previous": {
   "sha256": "94a17264d5283f4e57edec8dd99d116e3b7ffd94543f1bc96e587cd8131d8157",
   "gitBlob": "3418cf344390eb729c5b5f012d76512a190750c2"
  },
  "hunks": [
   {
    "at": 349,
    "before": " 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'9c06103ee6926bb5def608470430784145880f69d4c3aee3fb35787c1309d509',\n 'tests/helpers/chapter-battle-scene-source.mjs':'1270c293d79c04ac4a5b15483dd4cc8f9c4279362e2f5c551f6e98c20c9ad293',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',",
    "after": " 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',\n 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',\n 'tests/helpers/rebased-release-source.mjs':'b1e42ded7f05f580fb25ab0417ccd8db45832f5e9e50db83a38d6aaa2767dc20',\n 'tests/helpers/chapter-battle-scene-source.mjs':'1270c293d79c04ac4a5b15483dd4cc8f9c4279362e2f5c551f6e98c20c9ad293',\n 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',"
   },
   {
    "at": 355,
    "before": " 'tests/helpers/m7-core-final-source-inverse.mjs':'c9d98969785466649e0e915df0d912f81b774d8b937b4fb63e74eed731635133',\n 'tests/helpers/release-ui-restore-source.mjs':'2ec5855476f1b4c8cf762ca1a7ee366028322841b07996a518af96fdd87259b9',\n 'tests/helpers/current-replay-fix-sources.mjs':'bfef80da2fc30501c3b2e82cd14bdb8130e4a089f2db231ff2587804fa83a08b',\n 'tests/helpers/character-preparation-source.mjs':'30f20a242e7b9e6f86570e58c0dfb6ba72776599d6428a263062c5b074be88ce',\n 'tests/helpers/develop-release-backflow-source.mjs':'2834679eef440cf54e64cfb2c144c2fc6dbb5dc7ed048c3767435c250827337f',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',\n 'tests/helpers/native-flow-fixture-source.mjs':'8ad7157fd4f3973ffba4f17f9eba440731ddf952e859fee53970d6c3879968e3',\n 'tests/helpers/ui-entrance-source.mjs':'55bbaca21af744a48dff1c5b445160b993bcf0862f813ce328a630408247e315',\n 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',\n 'tests/fixtures/ui-entrance-source.json.gz':'7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9',",
    "after": " 'tests/helpers/m7-core-final-source-inverse.mjs':'c9d98969785466649e0e915df0d912f81b774d8b937b4fb63e74eed731635133',\n 'tests/helpers/release-ui-restore-source.mjs':'2ec5855476f1b4c8cf762ca1a7ee366028322841b07996a518af96fdd87259b9',\n 'tests/helpers/current-replay-fix-sources.mjs':'cceed97f15f0f91ab37ea27d3bf6f5659d213c54dcf11225eaa0fed7adc8ccdf',\n 'tests/helpers/character-preparation-source.mjs':'b556363648dd13827dacb603038423caf4a1c2693e618747df58fc29da7be2fd',\n 'tests/helpers/develop-release-backflow-source.mjs':'2834679eef440cf54e64cfb2c144c2fc6dbb5dc7ed048c3767435c250827337f',\n 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',\n 'tests/helpers/native-flow-fixture-source.mjs':'8ad7157fd4f3973ffba4f17f9eba440731ddf952e859fee53970d6c3879968e3',\n 'tests/helpers/ui-entrance-source.mjs':'c64976a04e877f65315ad8553bd8f6380b6e50a5ab5fce60e3b37bbbb98825c1',\n 'tests/helpers/ui-entrance-approved-sources.mjs':'b5c903614eb19f512e365c8c4024e1c40c37f5ab5df790a016dbeecf7b0efdcb',\n 'tests/helpers/ui-entrance-approved-sources.json':'58ea26de5268bc427bce73ecfb1ff43930f54b987c97777f9843e74d3467fe6d',\n 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',\n 'tests/fixtures/ui-entrance-source.json.gz':'7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9',"
   }
  ]
 },
 "tests/helpers/replay-reviewed-selection.mjs": {
  "current": {
   "sha256": "5f81f16e89b98fd6d8e3dfeb5c5df09be9f2c2131a077dcdb25b8cf84cf70ea7",
   "gitBlob": "50a103a6bcaa5b17e98ae5a1621ca4bcbfab1c29"
  },
  "previous": {
   "sha256": "f39d920bd284ab1e069eb15e3433334ad9a6e1a8c516e326033b34eaaa4cc4a2",
   "gitBlob": "0492c4b56af211ed50ab40377e957d363d8d9bac"
  },
  "hunks": [
   {
    "at": 8,
    "before": "import {beforeCurrentProductionSource,beforeCharacterPreparationSource} from './character-preparation-source.mjs';\nimport {exactReviewedBuildInput} from './rebased-release-source.mjs';\nimport {beforeReviewedBuildInput} from './fork-preflight-source.mjs';\nimport {reviewedSelectionRead} from './reviewed-selection-current-source.mjs';\nimport {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';\nimport {beforeDeckPagesSuiteSource,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';",
    "after": "import {beforeCurrentProductionSource,beforeCharacterPreparationSource} from './character-preparation-source.mjs';\nimport {exactReviewedBuildInput} from './rebased-release-source.mjs';\nimport {beforeReviewedBuildInput,chapterEvidenceCurrentRead} from './fork-preflight-source.mjs';\nimport {reviewedSelectionRead} from './reviewed-selection-current-source.mjs';\nimport {uiEntranceOwns} from './ui-entrance-source.mjs';\nimport {checkedSelectionEntranceRead} from './ui-selection-current-source.mjs';\nimport {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';\nimport {beforeDeckPagesSuiteSource,readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';"
   },
   {
    "at": 28,
    "before": " assertIntegratedCurrent();\n const readOwner=reviewedSelectionRead();\n const retiredInput=readRetiredController(readOwner);\n assert(retiredInput.restored,'only the exact pointer successor can restore the retired input owner');\n for(const [path,row]of Object.entries(sourceEpoch.proof.current)){\n  const source=path===retiredControllerPath?beforeCharacterPreparationSource(path,retiredInput.source,readOwner)\n   :beforeCurrentProductionSource(path,readOwner(path),readOwner);\n  assert.equal(hash(norm(source)),row.sha256,'fresh current production owner: '+path);\n }",
    "after": " assertIntegratedCurrent();\n const readOwner=reviewedSelectionRead();\n // Entrance authentication consumes live owners. The archived build still uses Selection's reviewed inputs.\n const readEntrance=chapterEvidenceCurrentRead(checkedSelectionEntranceRead(readFileSync));\n const readProductionOwner=(path,encoding='utf8')=>uiEntranceOwns(path)?readEntrance(path,encoding):readOwner(path,encoding);\n const retiredInput=readRetiredController(readOwner);\n assert(retiredInput.restored,'only the exact pointer successor can restore the retired input owner');\n for(const [path,row]of Object.entries(sourceEpoch.proof.current)){\n  const source=path===retiredControllerPath?beforeCharacterPreparationSource(path,retiredInput.source,readProductionOwner)\n   :beforeCurrentProductionSource(path,readProductionOwner(path),readProductionOwner);\n  assert.equal(hash(norm(source)),row.sha256,'fresh current production owner: '+path);\n }"
   },
   {
    "at": 48,
    "before": "   assert(!isAbsolute(path)&&!path.split('/').includes('..'));const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});\n   const input=useArchivedOfficialInputs?readReviewedOfficialAssetInput(path):undefined;\n   const predecessor=input??exactReviewedBuildInput(path,readOwner,{beforeReviewedInput:beforeReviewedBuildInput});\n   if(predecessor===undefined)copyFileSync(path,target);\n   else writeFileSync(target,predecessor);",
    "after": "   assert(!isAbsolute(path)&&!path.split('/').includes('..'));const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});\n   const input=useArchivedOfficialInputs?readReviewedOfficialAssetInput(path):undefined;\n   const predecessor=input??exactReviewedBuildInput(path,readProductionOwner,{beforeReviewedInput:beforeReviewedBuildInput});\n   if(predecessor===undefined)copyFileSync(path,target);\n   else writeFileSync(target,predecessor);"
   }
  ]
 },
 "tests/noncombat-v25-layout.test.mjs": {
  "current": {
   "sha256": "5d59eddc142a51cce13130c3ab631869ff9ba45650eff93ea7c3178da930a633",
   "gitBlob": "b677949615f579e7b4275afd0e58cf0ae6f995c3"
  },
  "previous": {
   "sha256": "bc1691dbb767b37e9b941418d6cb5f74189d4befd199e52f4a7a29d00fe65954",
   "gitBlob": "9425a6af09d6b26dec0b9b7c941e04e2d1d057ba"
  },
  "hunks": [
   {
    "at": 307,
    "before": "});\n\ntest('selection replay authenticates the current source for both changed owners',async()=>{\n const {beforeOfficialCharacterBackflow}=await import('./helpers/current-replay-fix-sources.mjs');\n const {assertCurrentUiEntrance,authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');\n const read=path=>readFileSync(path,'utf8');\n authenticateUiEntrance(read);\n for(const path of ['src/lua/abyss_character_select_view.lua','src/lua/abyss_game_ui_input.lua']){",
    "after": "});\n\nasync function selectionEntranceFixtureRead(read=readFileSync){\n const {beforeBattlePeriphery}=await import('./helpers/battle-periphery-source.mjs');\n const {beforeChapterBattleScene}=await import('./helpers/chapter-battle-scene-source.mjs');\n const {chapterEvidenceCurrentRead}=await import('./helpers/fork-preflight-source.mjs');\n const {checkedSelectionEntranceRead}=await import('./helpers/ui-selection-current-source.mjs');\n const readCurrent=chapterEvidenceCurrentRead(checkedSelectionEntranceRead(read));\n return path=>beforeBattlePeriphery(path,beforeChapterBattleScene(path,readCurrent(path,'utf8')));\n}\n\ntest('selection replay authenticates the current source for both changed owners',async()=>{\n const {beforeOfficialCharacterBackflow}=await import('./helpers/current-replay-fix-sources.mjs');\n const {assertCurrentUiEntrance,authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');\n const read=await selectionEntranceFixtureRead();\n authenticateUiEntrance(read);\n for(const path of ['src/lua/abyss_character_select_view.lua','src/lua/abyss_game_ui_input.lua']){"
   },
   {
    "at": 333,
    "before": " const {beforeApprovedUiEntrance}=await import('./helpers/ui-entrance-approved-sources.mjs');\n const {authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');\n const read=path=>readFileSync(path,'utf8');\n authenticateUiEntrance(read);\n for(const path of ['config/architecture.json',...['game_ui','game_ui_lifecycle','game_ui_run','game_ui_view',",
    "after": " const {beforeApprovedUiEntrance}=await import('./helpers/ui-entrance-approved-sources.mjs');\n const {authenticateUiEntrance,beforeUiEntrance}=await import('./helpers/ui-entrance-source.mjs');\n const read=await selectionEntranceFixtureRead();\n authenticateUiEntrance(read);\n for(const path of ['config/architecture.json',...['game_ui','game_ui_lifecycle','game_ui_run','game_ui_view',"
   },
   {
    "at": 345,
    "before": "  }\n  authenticateUiEntrance(owner=>owner===path?current.replaceAll('\\r\\n','\\n').replaceAll('\\n','\\r\\n'):read(owner));\n }\n});",
    "after": "  }\n  authenticateUiEntrance(owner=>owner===path?current.replaceAll('\\r\\n','\\n').replaceAll('\\n','\\r\\n'):read(owner));\n }\n const owner='src/lua/abyss_node_ui.lua';\n const lf=readFileSync(owner,'utf8').replaceAll('\\r\\n','\\n'),crlf=lf.replaceAll('\\n','\\r\\n');\n for(const mixed of [lf.replace('\\n','\\r\\n'),crlf.replace('\\r\\n','\\n')]){\n  let reads=0;\n  const changing=await selectionEntranceFixtureRead((path,encoding)=>\n   path===owner&&++reads>1?mixed:readFileSync(path,encoding));\n  assert.equal(changing(owner),read(owner));\n  assert.throws(()=>changing(owner),{message:'uniform current Selection entrance source: '+owner});\n }\n});"
   }
  ]
 }
});
const receipt=path=>Object.hasOwn(receipts,path)?receipts[path]:undefined;

function uniformSelectionSource(source){
 if(typeof source!=='string')return false;
 const lf=source.replaceAll('\r\n','\n');
 return !lf.includes('\r')&&(source===lf||source===lf.replaceAll('\n','\r\n'));
}

function decodedSelectionSource(raw){
 if(!Buffer.isBuffer(raw))return raw;
 const source=raw.toString('utf8');
 return Buffer.from(source).equals(raw)?source:undefined;
}

const copierPath='tests/helpers/copy-integration-source-closure.mjs';
export const selectionCopierReceipt=Object.freeze({path:copierPath,
 afterSha256:receipts[copierPath].current.sha256,afterBlob:receipts[copierPath].current.gitBlob});

export function beforeSelectionReceiptSource(path,source){
 const binding=receipt(path);
 if(!binding||!uniformSelectionSource(source)||!exactSourceMatches(source,binding.current))return source;
 const prior=restoreExactFixtureHunks({path,beforeSha256:binding.previous.sha256,
  afterSha256:binding.current.sha256,hunks:binding.hunks},path,source);
 assert(exactSourceMatches(prior,binding.previous),'exact selection receipt predecessor: '+path);
 return source.includes('\r\n')?prior.replaceAll('\r\n','\n').replaceAll('\n','\r\n'):prior;
}

export function checkedSelectionReceiptRead(read){
 const checked=(path,encoding)=>{
  const raw=read(path,encoding),binding=receipt(path);
  if(binding){
   const source=decodedSelectionSource(raw);
   assert(uniformSelectionSource(source)&&exactSourceMatches(source,binding.current),
    'fresh complete integration source: '+path);
  }
  return raw;
 };
 for(const path of Object.keys(receipts))checked(path,'utf8');
 return checked;
}

export function checkedSelectionEntranceRead(read){
 return (path,encoding)=>{
  const raw=read(path,encoding);
  if(uiEntranceOwns(path))
   assert(uniformSelectionSource(decodedSelectionSource(raw)),'uniform current Selection entrance source: '+path);
  return raw;
 };
}
