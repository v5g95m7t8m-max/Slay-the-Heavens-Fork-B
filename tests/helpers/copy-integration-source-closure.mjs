// Copies only immutable test helper dependencies; production owners remain explicit fixtures.
import assert from 'node:assert/strict';
import {officialUiRepairClosure} from './official-ui-repair-closure.mjs';
import {feedbackCiPatch} from './sts-feedback-ci.mjs';
import {extendFeedbackHelperClosure} from './sts-feedback-source-runtime.mjs';
import {extendIntegratedHelperClosure} from './integrated-ci-source.mjs';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Git source identities use LF; binary witnesses (especially gzip) retain
// their exact bytes. Never decode an arbitrary helper dependency as text.
export function integrationClosureBytes(path,content){
 assert(Buffer.isBuffer(content),'helper closure requires bytes');
 if(!/\.(?:mjs|js|json|lua|md|yml|yaml)$/.test(path))return content;
 const text=content.toString('utf8');
 assert(Buffer.from(text).equals(content),'helper source must be valid UTF-8: '+path);
 return Buffer.from(text.replaceAll('\r\n','\n'));
}
const bytes=readFileSync(new URL('./integration-source-closure.json',import.meta.url));
assert.equal(hash(bytes),'800fcc9efd889f482259d0e1e9f1501f0e9597ac05552622ede00dd3dcdb4a94','complete integration helper closure identity');
const currentBytes=readFileSync(new URL('./closeout-source-closure.json',import.meta.url));
assert.equal(hash(currentBytes),'031c42758ec5b37d1782c5fdb70542358d4b2631a5ee9b486b6bb5faccc988b5','complete closeout source helper closure');
const predecessor=extendIntegratedHelperClosure(extendFeedbackHelperClosure(JSON.parse(currentBytes),feedbackCiPatch.helperClosure));
const runtime='tests/helpers/combined-epoch/source-epoch-runtime.mjs';
const closeout='tests/helpers/closeout-source-epoch.mjs';
assert.equal(predecessor[runtime],'ee54191f327d412a5e37a76ff236af6f4aac692e51884a0e3afd33fe62e427e4','fatal BGM helper copy predecessor');
assert.equal(predecessor[closeout],'163f0f84fcd4f9b4bcb982b250891a9c5156df556699d8a65ec0cf1b354d25f7','closeout source slice copy predecessor');
const priorFiles=Object.freeze({
 ...predecessor,
 'tests/helpers/lumine-portrait-source.mjs':'f6b48bd50ffc703348648cfe6c75686531f319952806a4376b25841c9f7acee0',
 [runtime]:'1e50066c015e6d886b9380795d83fbe266f3ddc9705d9a65cba77bc296f56333',
 [closeout]:'873523684eb7561b705b558b6b38eba752e5d7a7d29c386841d4b61276268e88',
 'tests/helpers/fatal-bgm-source-continuation.mjs':'c0a1f30805b3c5c0680888ee9de4ff77cef2bc8a729271d5ff7f967dada02382',
 'tests/fixtures/fatal-bgm-e65-source.json.gz':'3e560e461232785753f5a574732ec834b19c51cfd700f09cce212009dd4a22fb',
 'tests/helpers/exact-source-continuation.mjs':'9046457a50fa3c137985906423be546424287dc5a06ef940f6ffbeb553d63ccf',
 'tests/helpers/potion-text-source.mjs':'75dcd901e15f07831e1eeaf943e93ca5795068fa9d841e34cd0bb20e57f426b3',
 'tests/helpers/character-selector-source.mjs':'7b3e77e5a190772e6a7d063eb2134aeabd928a6db691705ffa220fa92b71b974',
 'tests/helpers/potion-pointer-source.mjs':'cdf4027a2b9f68804f37c827d8cf6affcc1b322bce0b98147c502c7b60a2c80f',
 'tests/fixtures/potion-pointer-source.json.gz':'9fce9e414190da11df3d1451bd4f373a1b6ec0d227d33a2e4e8d8cc1c34ecb41',
 'tests/helpers/official-ui-repair-source-epoch.mjs':'edabe5fc268d443e837dea9bd5785856b1b92874b75d9c32193ba53eb98fd46e',
 'tests/helpers/v2-ui-hud-source.mjs':'dca36319e8eb77df3e6db39b13db949736bae1ab11681cf6eab8269f9f4be268',
 'tests/fixtures/v2-ui-hud-source.json.gz':'649a52b20d2b9b2ad338a77b24daf29998014522e0dc0d5888bccce1529faa58',
 'tests/helpers/v2-run-menu-source-epoch.mjs':'a7e11793af79e698ed2a6ae832bd94cc8c47e2d6149e60d58db8138f1a1c77b8',
 'tests/fixtures/v2-run-menu-source.json':'b078f617134d3189f5a815e1c85b1edfd50c8e133950d5b81cbecb67a1358508',
 'tests/fixtures/develop-character-architecture-before.json.gz':'7a5ab46cd4e7d27fc414f05bebb1ffe06dcba742f990412205113f672b8db541',
});
const files=Object.freeze({
 ...priorFiles,
 [runtime]:'32993c1ea683a1e81311636002b5520608d12fa247eea62a88b121c8d557c4dd',
 "tests/helpers/tiny-house-ui-source.mjs":'55cde238d2b9fd6f70a92c7501e2802bb73ab6e603bd49991200982c737c46c7',
 "tests/fixtures/tiny-house-ui-source.json.gz":'66bfcad375c58f5c96a6e0b06afd1cdf5df490002628d5e837eb9ab6cc3a3c02',
 'tests/helpers/v2-ui-hud-source.mjs':'bf32590ea3e8c172ced44a9a9399ba022c0926dd83475dcb6ae62741ab1a09f0',
 'tests/fixtures/v2-ui-hud-source.json.gz':'9a1881227d100bf4a3a39908dd44d64d6b16f87bdb2220d55a2f3ce61f2882fe',
});
assert.equal(files[runtime],'32993c1ea683a1e81311636002b5520608d12fa247eea62a88b121c8d557c4dd','PC13 runtime helper predecessor');
const pc13Files=Object.freeze({
 ...files,
 [runtime]:'fb10a5dc6bf09177fe77bf858b1ffb39ee93dbacb784995dfc1bb1771bf5e545',
 'tests/helpers/pc13-reward-cover-source.mjs':'e1cf572bc792c036aaf03f25e03b1c7ab384bf257be353c43be775441a7c67ee',
 'tests/fixtures/pc13-reward-cover-source.json.gz':'9779296bb7bedc99990fa6ccad9c7ba0a0e581982a020c9dcc4a71210b3299cd',
});
assert.equal(pc13Files[runtime],'fb10a5dc6bf09177fe77bf858b1ffb39ee93dbacb784995dfc1bb1771bf5e545','M05 exact PC13 runtime helper predecessor');
const m05Files=Object.freeze({
 ...pc13Files,
 [runtime]:'7f3a94804f84b4f229b47adcd85adbc3b5387223c018f8e3fc32af145b469ac8',
 'tests/helpers/m05-shop-source.mjs':'5580a50d2c7636d4b3b5d708f39b89527d771af159964db6aab55ca7afb03b08',
 'tests/fixtures/m05-shop-source.json.gz':'0b394bc2fa5a642b3cf14fa257607703fc4bcbd5da766cffbb4e7733661dda59',
});
const loadingRecoveryFiles=Object.freeze({
 ...m05Files,
 'tests/helpers/pc13-reward-cover-source.mjs':'669622dc54b057ad81579c872ae45231e51e906c3163c513af57a6ce3ce8a6ea',
 'tests/helpers/loading-recovery-source.mjs':'873915500ae2b1a02abebb78a932a8cdfa5e56044ad5dcb34a4d51fd1fc02f5f',
});
const releaseGuideFiles=Object.freeze({
 ...loadingRecoveryFiles,
 [runtime]:'cb0a50200fbd9e249b897b0b71c2581b2290c3fd0de2edb46ff72f70dfd7c9cc',
 'tests/helpers/pc13-reward-cover-source.mjs':'5c136f0cb4634526a6f133ed34d430717e020be2bc236f7e03a1c35c8e456737',
 'tests/helpers/release-guide-backflow-source.mjs':'9a18f8a3c11130899e51b17cba7ca9b5de25c7daf30cf3badf24db9808210062',
 'tests/fixtures/release-guide-backflow-source.json.gz':'7fe4f04ac99a35a19b6faee1b1678204b38476776729cb679886973eeff53d56',
});
const tinyHouseFiles=Object.freeze({
 ...releaseGuideFiles,
 [runtime]:'c69727aeeeacd96469492cdce40b3d100eab1b1d6bd78ff03d67565615fc02d7',
 'tests/helpers/tiny-house-integrated-source.mjs':'dbe8ab324dd2f0a4154e2b1c420a19b12c21a00cb5c5739049f1baa4ae8980e8',
 'tests/helpers/develop-tiny-house-predecessors.json.gz':'b699c3e7a0dfc70c24a47ba43b1fc68cc2cd340b67d2927c71af7b95d73887d5',
});
const rewardTransitionFiles=Object.freeze({
 ...tinyHouseFiles,
 [closeout]:'4d3e6c160de2c6b69e661d5c57229c7b6e0c3f76d1c8eff30df51b23ef305650',
 'tests/helpers/pc13-reward-cover-source.mjs':'ce7b2396dca3f2769cb34c628ed39802b485a3a64d7693560d92f334309eb588',
 'tests/helpers/release-guide-backflow-source.mjs':'b3f38bf200d79d335a0048295b835d4d326ebfc7d52039171984998022b7facf',
 'tests/fixtures/combat-reward-transition-source.json.gz':'08c955924392a2a23a989e08b9bb4e061d06a66871b1cbacd9ad556c0b734476',
});
const mapFiles=Object.freeze({
 ...rewardTransitionFiles,
 'tests/helpers/card-feedback-owner-source.json.gz':'0710facff10a22ddca512869df2b0f526189deb5ca3394369e45fba20bd0d4ec',
 'tests/helpers/card-feedback-owner-source.mjs':'eceb0be36e5d40f82ef404cbfb1b2b2c2101b5f0b889e1c215ecff2ab15cd857',
 [runtime]:'b04107e3d9c8f0d923aa3547276f9ee84651915740c909d998a5b657a589d04f',
 'tests/helpers/sts1-map-source.mjs':'12710c7f6b4787876c69cec5f6443447252465be9cbbffa0d85f38729823cfeb',
 'tests/fixtures/sts1-map-source.json.gz':'a356e09f7fb3a7c2f16c09adbbafaae6290bc615fe3be530a9f02d2c3a6e8d39',
});
const powerMembershipFiles=Object.freeze({
 ...mapFiles,
 [closeout]:'564a22d425038c24b65fed7d5b1a6c6cc847b71b6f32702d3ed257c3ee18d0d6',
 'tests/helpers/power-membership-source.mjs':'7df5bd25a505c50895ccdf8db84a0f424b9d02baf7659dc69a483ed8ef03ff1d',
 'tests/helpers/power-membership-source.json.gz':'9b4ee9cf761b49297c4a0abfea0df825104e6dcc2e73ca9b633d2c50bce8a039',
});
const releaseUiFiles=Object.freeze({
 ...powerMembershipFiles,
 [runtime]:'8536d9f54bc814e92db509a248b199be0bbd8c84c5a8fac7369637f94e21c513',
 'tests/helpers/potion-pointer-source.mjs':'ba6547de02ef3188b9658764452283cd671e3324f19cf0775bce3221db53cdab',
 'tests/helpers/release-ui-restore-source.mjs':'dc2b0718c2cdaf170abc16894562d02b85bb14ae81d281d6a1c6bdba4ca424d5',
 'tests/helpers/release-shared-relic-source.json.gz':'4e72ca430cf8740dd6cb828547d8b8f29ba169c0c90cf49c2c662aa5964df5cc',
 'tests/helpers/release-ui-restore-source.json.gz':'e38609afe1efa63715e2f54619fde19501b20b59ebb9a9aaf5944e82b22e339b',
 'tests/helpers/release-card-field-cancel-source.json.gz':'f38a352f98ef946e1e836781dd9ebd131010c03e04cfa62f928d94f6358c3bca',
 'tests/helpers/release-card-right-click-source.json.gz':'a157bfd25b91346bc4b9c7beae6de19baec13e824ee808d59e827b5052d78a1a',
 'tests/helpers/release-controls-guide-removal-source.json.gz':'321abc9fb6759dd27644f414c88f3a2df0be32f236a258a52d5b89cc6d22d687',
});
// Refined enemy art extends only the existing historical helper closure.
const refinedReleaseFiles=Object.freeze({
 ...releaseUiFiles,
 'tests/helpers/release-ui-restore-source.mjs':'37410ec175d07b09c8dd8062ac2e19d212dc8eeaebc32f38dbf99e7b32d8b7dd',
 'tests/helpers/release-shop-entry-source.json.gz':'d3c114b39aa8affa1ae5c2b3ee54117640dcacce750efc24d78312792d8d2ff7',
 'tests/helpers/release-forge-source.json.gz':'8557c9daa0943c815ca11e0c135d081c08081f040bbef85b3cd799f7a586c564',
 'tests/helpers/refined-release-source.mjs':'154f5464849177b48426db7d816f4ddf87d9d26abd6bfcfb543162b4f26450d9',
 'tests/helpers/refined-release-source.json.gz':'6b9e66890ecfeac7f0b581ece462edaf41095f6d2937896cf6032e9e8ee9a9a3',
});
const integratedReleaseFiles=Object.freeze({
 ...refinedReleaseFiles,
 'tests/helpers/combat-visual-source.mjs':'6fbf561edae2163cb68163834289ea70b8ec94868507677be0f21fd9cabbfc7b',
 'tests/fixtures/combat-visual-source.json.gz':'c182bc4a8f2afef8e3aec0b32a43dcfd2c4f0c214763a34a86dec8e07daadc3d',
 'tests/helpers/energy-reference-source.mjs':'c640c2cf869dc51bcb4b47f143f91e3cb799bec0a80212166592a8c8c29f59c1',
 'tests/fixtures/energy-reference-source.json.gz':'2b0f8c497c73a8afca47b01a41c7c8800f92c2879202c827df663269329ef19e',
 'tests/helpers/release-map-deck-source.mjs':'e31f57cd3eb1fd7911d55984160eaeebcec50eecfb76718fcba49c59d2616edb',
 'tests/helpers/release-map-deck-source.json.gz':'8e16866bcec2fdc7628cbc91f7a74f09c18b9f621c6e065b75b2c98a8172a2d4',
 'tests/helpers/recording-0401-source.json.gz':'9af199338e44fb660599900c5474624853f02be24aa5590029f37cee2a551e24',
 'tests/helpers/release-integration-source.mjs':'5efadc152e80395a3b60300468600ad21e054244277f199528589ffca0f298d0',
 'tests/fixtures/release-integration-source.json.gz':'0ba3c551c50c35dfb4e27a0601063451693fba48d3ad9942dd34f6c2aec7d087',
 'tests/helpers/release-ui-restore-source.mjs':'2a17a830eb9f09d53302986c8e4cffc44791b78c2ac2d02c33ecdc6ea330edcd',
});
const reconciledReleaseFiles=Object.freeze({
 ...integratedReleaseFiles,
 'tests/helpers/rebased-release-source.mjs':'506d813c01143602af3f5169e3abb5945590a09bd2d7477b7d26ce2234160691',
 'tests/helpers/rebased-release-source.json.gz':'9ae910d679bdc8386063c58043a43e496ee34b7c6f22fc1a27cbaeca7b27222d',
 'tests/helpers/loading-recovery-source.mjs':'f3d9531862c3301feef906b0833bc19a80744273fb927bd9f2d9255c33de67b3',
 'tests/helpers/pc13-reward-cover-source.mjs':'e8d58b2f3484855a9e986c945b6add861436ca754fb24ef8be71f0777ef46b9b',
 [runtime]:'d25494ab5a1d269568c321fe3e9c1a2494239f3916d46bd93331a5328fff549b',
 'tests/helpers/potion-pointer-source.mjs':'ba6547de02ef3188b9658764452283cd671e3324f19cf0775bce3221db53cdab',
 'tests/helpers/release-ui-restore-source.mjs':'75da223110ac6a108face448920b3c07f61c427544cc8953a043721f99499c03',
 'tests/helpers/release-shared-relic-source.json.gz':'4e72ca430cf8740dd6cb828547d8b8f29ba169c0c90cf49c2c662aa5964df5cc',
 'tests/helpers/release-ui-restore-source.json.gz':'e38609afe1efa63715e2f54619fde19501b20b59ebb9a9aaf5944e82b22e339b',
 'tests/helpers/release-card-field-cancel-source.json.gz':'f38a352f98ef946e1e836781dd9ebd131010c03e04cfa62f928d94f6358c3bca',
 'tests/helpers/release-card-right-click-source.json.gz':'a157bfd25b91346bc4b9c7beae6de19baec13e824ee808d59e827b5052d78a1a',
 'tests/helpers/release-controls-guide-removal-source.json.gz':'321abc9fb6759dd27644f414c88f3a2df0be32f236a258a52d5b89cc6d22d687',
 'tests/helpers/release-shop-entry-source.json.gz':'d3c114b39aa8affa1ae5c2b3ee54117640dcacce750efc24d78312792d8d2ff7',
 'tests/helpers/release-forge-source.json.gz':'8557c9daa0943c815ca11e0c135d081c08081f040bbef85b3cd799f7a586c564',
 'tests/helpers/refined-release-source.mjs':'47de5251e4da81b8fea3628ae74338be8ff21dcb391333ebca35f27272742a4b',
 'tests/helpers/refined-release-source.json.gz':'6b9e66890ecfeac7f0b581ece462edaf41095f6d2937896cf6032e9e8ee9a9a3',
 'tests/helpers/combat-visual-source.mjs':'115a50fc7286640e9a370d33ab42bd45e1337430d25bfe14c7f8edeeaf9d636a',
 'tests/fixtures/combat-visual-source.json.gz':'c182bc4a8f2afef8e3aec0b32a43dcfd2c4f0c214763a34a86dec8e07daadc3d',
 'tests/helpers/energy-reference-source.mjs':'1dab90516f3945be27ef5da9fd3b11088d414d871bd59937373d6b4b773061d1',
 'tests/fixtures/energy-reference-source.json.gz':'2b0f8c497c73a8afca47b01a41c7c8800f92c2879202c827df663269329ef19e',
 'tests/helpers/release-map-deck-source.mjs':'db1c1f75f23d5c93a804c906185092f1719e9be5bb74cde388f56fde2f428f37',
 'tests/helpers/release-map-deck-source.json.gz':'8e16866bcec2fdc7628cbc91f7a74f09c18b9f621c6e065b75b2c98a8172a2d4',
 'tests/helpers/recording-0401-source.json.gz':'9af199338e44fb660599900c5474624853f02be24aa5590029f37cee2a551e24',
 'tests/helpers/release-integration-source.mjs':'5efadc152e80395a3b60300468600ad21e054244277f199528589ffca0f298d0',
 'tests/fixtures/release-integration-source.json.gz':'0ba3c551c50c35dfb4e27a0601063451693fba48d3ad9942dd34f6c2aec7d087',
 });
assert.equal(loadingRecoveryFiles['tests/helpers/loading-recovery-source.mjs'],'873915500ae2b1a02abebb78a932a8cdfa5e56044ad5dcb34a4d51fd1fc02f5f','STS fade exact loading helper predecessor');
const stsFadeFiles=Object.freeze({...reconciledReleaseFiles,...{
  "tests/helpers/loading-recovery-source.mjs": "f3d9531862c3301feef906b0833bc19a80744273fb927bd9f2d9255c33de67b3",
  "tests/helpers/sts-selection-fade-source.mjs": "73b46c3cebe908ea332c56264b1300937d9e67de678225b5ac213b16ef245adf",
  "tests/fixtures/sts-selection-fade-source.json": "aa738acfea89d0c38209c903dca0b0a573e217ce11c0542a022cf18e0b784717"
}});
assert.equal(stsFadeFiles['tests/helpers/sts-selection-fade-source.mjs'],'73b46c3cebe908ea332c56264b1300937d9e67de678225b5ac213b16ef245adf','STS UI exact fade helper predecessor');
const stsCloseoutFiles=Object.freeze({
 ...stsFadeFiles,
 'tests/helpers/potion-pointer-source.mjs':'4dd975ca7ca30f3b5781d24567e38dfd5c384b6ae185f8e6a584a55337aae1f9',
 'tests/helpers/sts-selection-fade-source.mjs':'d6e692e05653c6377d27551c40be5e7f6f0a2dfb5c65a9e1f1f0f04dc2f044e9',
 'tests/helpers/sts-ui-closeout-source.mjs':'9303fe7c8dc88f40b552cdc8f291ec22932d6ee28e1e7f7463191a2f1ffa32a9',
 'tests/fixtures/sts-ui-closeout-source.json':'6d3859741054bc3da48bd31b5a520ce559da6a06a866a9232741c82a175e891d',
});
const developBackflowFiles=Object.freeze({
 ...stsCloseoutFiles,
 'tests/fixtures/develop-traveler-touch-source.json.gz':'58bed3fd2bfe7a20e5e9d2b9760b5f7dd165bde92201dd49fa90e36bb17168c9',
 'tests/helpers/release-map-deck-source.mjs':'87a1f219bfca2f4ae049896248efd8217c76e90010aee0a1567e51b0e6fc0aa1',
 'tests/helpers/develop-release-backflow-source.mjs':'70df2b48d5d0573d959be2dd80cf7799722c7cafa5e7b09701eac0d15b644036',
 'tests/fixtures/develop-release-backflow-source.json.gz':'c50d048f5daaa4ecc7ffa110ca9a4dc144cb4393e51fb8666c572b16347bede4',
 'tests/helpers/character-preparation-source.mjs':'1adaca46c085f2daaf7450e8421ec4f38bb6b0e30e726f92cc716abef0330fdb',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'4e615ebe00db432f4454613cebc88c3ade5ca1053e6a1bc7ac80fe3c067a5ee3',
 'tests/helpers/sts-selection-fade-source.mjs':'08f3f5786f05014ef56e18ff612c910855bfb1887de50ab8e8c0c86dda65c4cc',
});
const eventProjectionFiles=Object.freeze({
 ...developBackflowFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'8d9fcbd160b16bcf9675dbbcc25080793c719a1520f6e9916439eea9dbfd0aad',
 'tests/helpers/colorless-catalog-source-inverse.mjs':'b624a090c35dbbb0b2a161092ad98628f5d34767f07d7aee9f5415f0c796726c',
 'tests/fixtures/event-projection-predecessors.json.gz':'87e8e3e410ad515264f668ca53abd8fee8bf8c57b7603c10d7c60882cb9339ea',
});
const developMapRenderFiles=Object.freeze({
 ...eventProjectionFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'eee9a991d89bb145dd78e5d67bc3e9f4272ef57e6aa32e6e1dee73be87634c08',
 'tests/fixtures/develop-map-render-source.json.gz':'9d52d048c3db1818cb7f9e7fdc8cd881639e958b782593f5dae99923c26d80aa',
});
const developCardDisplayFiles=Object.freeze({
 ...developMapRenderFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'f2bb907cea9fff64e7f7eb46ee0dd99a4a5f126276d9d0f876ed8aabbea47777',
 'tests/fixtures/develop-card-display-responsibilities-source.json.gz':'fafb7ec975e6ae3fa1f0629a7366a0f673bbad64668afede85267e7af0d0871c',
});
const developPortraitLifecycleFiles=Object.freeze({
 ...developCardDisplayFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'89bb991c048ae5817d06453843c9df829c7dc5b3cc660fe49d0849e39e551b95',
 'tests/fixtures/develop-native-portrait-lifecycle-source.json.gz':'1e0d7cf24e2bd08938383e862161fe5d70c9a5ae29a216a8890c1768b8c57422',
});
const developRewardUiFiles=Object.freeze({
 ...developPortraitLifecycleFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'898bc55c77a2f021aa77a2b8e162900566daffa09c4262773de46a39f3b567d7',
 'tests/fixtures/develop-reward-ui-responsibilities-source.json.gz':'063a04ed8a26ea941887da6050376f12964baaf63ca62ac63f92a8bc62a4c207',
});
const developBattleFeedbackFiles=Object.freeze({
 ...developRewardUiFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'cdd1d43eb8a0cd6e3b829c52954bddbcbc961449089d4a17f787dea391e890bc',
 'tests/fixtures/develop-battle-feedback-responsibilities-source.json.gz':'c8432495ff7b795025f12f0f931d55e6409505b6347fbbddc46701555f80e791',
});
const developStasisUpgradeFiles=Object.freeze({
 ...developBattleFeedbackFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'980e0e060d3c52a5d38ad948afb7f2d020bea83f4578828c801211a1f7cc6822',
 'tests/fixtures/develop-stasis-upgrade-boundary-source.json.gz':'04dd257d8cdd059a629082e1e3cf39c89f636dc8b2376c3c30286baae23065de',
 'tests/fixtures/develop-card-display-leaf-source.json.gz':'424ee22e001dbcc5bf1256622b0dd527da3b1ca428330fbf7ce98c7fa21c943d',
});
const developActorFocusFiles=Object.freeze({
 ...developStasisUpgradeFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'60077930e44d7faf8c8c645c981720e7a8b0755b1955ab62bdaf182fa7e23328',
 'tests/fixtures/develop-actor-focus-source.json.gz':'2dd9f47a776d59d6cfc4ce544f8e0783f133cfda4f78f489b25b983b53315688',
});
const developSessionRelicFiles=Object.freeze({
 ...developActorFocusFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'e78f9ff41aa7bc32f166288e7628a0590baf79ca660afa28498d4fb1b4847c2c',
 'tests/fixtures/develop-session-relic-source.json.gz':'3597ea919d88cd07f5e4e8f2c8918c0558f613f6a3fd3d6fda3a08469276db05',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'10c612b573801aff960786be378827d32af65ac52edbbfd282a7f562155ca683',
});
const developIntegrationReplayFiles=Object.freeze({
 ...developSessionRelicFiles,
 'tests/helpers/round3-catalog-source-inverse.mjs':'876d284929930e1a5af54febd8db894519b5df96e1726cca3a8a5a9e35feeb96',
});
const developSourceEpochReplayFiles=Object.freeze({
 ...developIntegrationReplayFiles,
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'374a8859981663781a20dae1cc4d3fd2032d6f74b09f7eaec9945a36e24ebac3',
 'tests/helpers/character-preparation-source.mjs':'076768299363a94357c64603a91243577238bdadccf6aa94d0159c8222457720',
 'tests/helpers/slime-split-source.mjs':'a0b689346b7912b21d5268fc77d3b76310f39085effb58540a32f5ac9ccaaf2b',
});
const developReplayFingerprintFiles=Object.freeze({
 ...developSourceEpochReplayFiles,
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'de28a1d3cbef648c5dd12f1c69075d8917916772c85c8f103948392b80206cf4',
 'tests/helpers/develop-release-backflow-source.mjs':'5df32d98656b84986286a08ff35c3e20fab316fb8b8a19b2c94e1e832240034b',
 'tests/helpers/rebased-release-source.mjs':'187d921a65bee4bfb76f0b1083849139d2dbb4434dfb786df6c1407fda2c1f2d',
 'tests/helpers/round3-catalog-source-inverse.mjs':'6fc3ea3a193ac586187ab5749a8c61b3b9e3ec1a87f689b62b545c73ed64ec3e',
 'tests/helpers/source-fingerprint.mjs':'dfbee65636a24c4c4ffe755b27fd741e00ea2e81b044638c424a866b97309d8f',
});
const developReplayUiFiles=Object.freeze({
 ...developReplayFingerprintFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'f9787f1c456c0201c0d7a592e0d400cc8547b80017b82472aeecfc010abb1755',
 'tests/helpers/relic-detail-source.mjs':'2fd994110473464aa1fad34f720423ddaa4e4ac68b3ca8d2a4020cd4f5eaa4a0',
 'tests/fixtures/relic-detail-source.json.gz':'981b97459ad1d75b79d03e197534dbab883d1f79055c7e2776d9ec32f09a9327',
 'tests/fixtures/develop-combat-pile-opening-source.json.gz':'a9e96c6caa44e21e45493a63385bf315ba9eaaf9a30257533bc46ccf9e51f9e6',
});
const mapRoomEntryFiles=Object.freeze({
 ...developReplayUiFiles,
 "tests/helpers/combined-epoch/source-epoch-runtime.mjs":'4df578d1abba64c7c1313d91b49a4531060b8a8c9e55affce77c7b89979ed1d0',
 'tests/helpers/develop-release-backflow-source.mjs':'994ecec386c0193de78ff473f94c26270c4c855aee82a97218474983abcb9a37',
 'tests/helpers/relic-detail-source.mjs':'d0a38c20119cdf8c951b4fb470ab91910a3474d8972d4c2650de4eed667cbfa4',
 'tests/helpers/native-host-replay-source.mjs':'e7755ecdd96304a1355b610493cbe7827f62543dcbf94392e22539fbf6160ea7',
 'tests/helpers/native-host-replay-source.json.gz':'979352d3332e2cc708d22055ed69bb3fcc00a954c1cd55f8f807924116360145',
 'tests/helpers/native-fixture-replay-source.mjs':'50e75316a6e35c9917207d8a2167f8c30723b663954038457e798fc5411986b9',
 'tests/helpers/native-fixture-replay-source.json.gz':'5743ecc4139667a78cea2871f25679aa05d400a9deadccb702d0196ed06bd52a',
 'tests/helpers/round3-catalog-source-inverse.mjs':'aa305d8d0185ffec57a7ab85065e9767bb607b2c973b23e035413168def86a03',
 'tests/fixtures/develop-map-room-entry-source.json.gz':'bff89df36b2fbbf1bec727dae075c632dba48d50c6c8c75b8e3f271d7600c160',
});
const deckPagesFiles=Object.freeze({
 ...mapRoomEntryFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'6907c5660f7585d9a58b122ff605bc76f69267af0ca4580cfeadbb133a02e50b',
 'tests/fixtures/develop-deck-pages-source.json.gz':'d3a6b845870da64358c3ca36307062c02cc39d2e070e21eb875f9e2e42d02036',
});
const inputRetirementFiles=Object.freeze({
 ...deckPagesFiles,
 'tests/helpers/game-ui-extraction-source-inverse.mjs':'53382c07cd63cd010a8aa3c9b2dc12ba3a38ac628d3104cce8eb2ef3c8c33d8c',
 [runtime]:'4bf2e1c7038d0bbe0bffd85ec5be1c4685811b63bf79653f56756779b5463348',
 'tests/helpers/develop-release-backflow-source.mjs':'cf5458eeed5203f9264cfc1c60f1ec0e8c37ec4840cae06668a8002edaf94a7f',
 'tests/helpers/input-retirement-source.mjs':'7d849cfad2c62efc07b65bb4c845dfe6b54b2f3bf2d3bca560457a1eed631488',
 'tests/fixtures/develop-deck-browser-backflow-source.json.gz':'84b5198436d5858f1630db9d577a188d2033b4e7cb8ce2897e7ecd4378ebf49c',
 'tests/fixtures/develop-potion-popup-source.json.gz':'d7e6b6a7b6d603cec23424eedb0ed25fbef3c7fdeae2a4d1ee6fe208ca693690',
 'tests/fixtures/develop-combat-events-source.json.gz':'6a25140a8a86554e7c072e94cad465082d5930d20ffb7c4b0837bf0f6aa1b87d',
 'tests/helpers/character-preparation-source.mjs':'b9cbb744b5e8915bb30cede2bc27f037346be2fb613e2d189e5e713fa7ed2933',
 'tests/helpers/rebased-release-source.mjs':'09cd53484024ec226c747686da16d05ee229b763b41f55533d92d2d1a6cd35a5',
 'tests/helpers/native-host-replay-source.mjs':'9a9adcd1ffd1f89db073f735335ccbb51d4112bf8a4ff83de9bf2338f81b19b7',
 'tests/helpers/native-host-replay-source.json.gz':'f6e9062262769766edcca6a82898acec6b66a0e7f3b30d26655c2b45eb511da5',
 'tests/helpers/native-fixture-replay-source.mjs':'a35bc0a9dd6f574fa5bd373100d2c2566ff6178fc8b52fe931f529b173ff229c',
 'tests/helpers/native-fixture-replay-source.json.gz':'d1cbf62cf27c0458efec5a303852cfbf38acad680e77a15fdb902b34a758c1c5',
 'tests/fixtures/develop-input-retirement-source.json.gz':'ed86f17b8f643d4392828e582582859d7b86d0a143de94b1fac4cfab9a5bf912',
 'tests/fixtures/develop-combat-pile-opening-source.json.gz':'a9e96c6caa44e21e45493a63385bf315ba9eaaf9a30257533bc46ccf9e51f9e6',
 'tests/helpers/ending-terminal-source.mjs':'d97a3b655ac591e8b2a95dd4e8e856ce3b472ec5d5f6c34337d63e4899d4f6a6',
 'tests/helpers/character-preparation-source.json.gz':'a3d61ed1e47036e5288cc4bc673388065ee0ace71497cba74da5b669a0a16790',
 'tests/fixtures/architecture-admission-before.json.gz':'93c84b252594eb1362c2bdb5a46cf5c82b7c05129df6d0695dd9e7fd79f2ca42',
 'tests/helpers/sts-feedback-ci.json.gz':'c91fadf0cda8b9b3d8fbe562854aa6c59ae007c13f1b978c6c905448eaf06f59',
 'tests/helpers/reward-query-boundary-source-inverse.mjs':'047320dcda1683f7425f09a181dbc9cb71f5984ef13a4cfb7ad9d5a01cca42cf',
 'tests/helpers/m7-core-final-source-inverse.mjs':'e54e91f55205207fd832ddad079b3fcf03102c4ca1ebcb045d6507b52feaab6b',
 'tests/helpers/native-flow-fixture-source.mjs':'eeec0dfdddc1f0da31340645641134bf314ec57d5db20e533dc7cdb67c6ea49b',
 'tests/helpers/native-flow-fixture-source.json.gz':'5709c250f1411a9edbdaa6669bf0d39bfecc824841684b7948eba3297d5aea35',
 'tests/helpers/source-fingerprint.mjs':'82873d43045cd012a0ed817a27d88343bd0f092d755d49a04629f98b9bd72612',
});
const actionButtonFiles=Object.freeze({
 ...inputRetirementFiles,
 'tests/helpers/develop-release-backflow-source.mjs':'0b94dc40162bd992de8ecff48bbdd5d3d3d391a27bd59268eac309d714bf0752',
 'tests/helpers/action-buttons-source.mjs':'fdb6c73f52cf92fededa3d48fded11f05e21356ec66864a43c54bdf51781d4cd',
 'tests/fixtures/action-buttons-source.json.gz':'86634a756c4085906261d4d318118bb1f7692a642479651526c1ace0fefe4487',
});
const currentReplayFiles=Object.freeze({
 ...actionButtonFiles,
 'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs':'6199f290e0faf4770452de5e6481aa4d27e4d039bcd2d4b6673b96694726d6d0',
 'tests/helpers/defect-final-source-epoch.mjs':'d6dabee023a3a9f8a2620c3edd1dee0b8b359aa62aff8a17b63175e170ab8b04',
 'tests/helpers/effects-target-group-source-epoch.mjs':'c73c6b050ece8efd96775188c146e1d736561d068f61cd3e7081c74d937fc0af',
 'tests/helpers/encounter-formation-source-epoch.mjs':'a044c0830309415ea3858a6368f6d794440db1f2d68b6cf3742111b03cd047c5',
 'tests/helpers/noncombat-source-epoch.mjs':'4b8705f85cf1609b8e1c28253610b3ddc4ea8a1fa8dae4b054601c56fdd3c9b2',
 'tests/helpers/relic-equip-source-epoch.mjs':'b768a3e8023f0286f4aa577d1300f932567b9d731b836038dac5959e9d67ce02',
 'tests/helpers/room-ui-source-epoch.mjs':'ce50bd58037ea74976dae9e94515dfd16f91432c715ee880c00ae8080a73202e',
 'tests/helpers/seven-refactor-source-epoch.mjs':'5944f7c74d61e93fa5870281b5cc45993535c2e96c4d0014a1d5fe24baa46341',
 'tests/helpers/silent-final-source-epoch.mjs':'d31330033fd9e188d93001a55213e1c471546f6e57b3b6ec68f726c23468e35e',
 'tests/helpers/silent-tactics-source-epoch.mjs':'decd2795a2b2a02ae717787dd5ae822f69191b1660464da905a641f8116930d1',
 'tests/helpers/watcher-flow-source-epoch.mjs':'def224824eedc945a1cb402dd0429861593f0ff08a822f1961a954bf467f3378',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'a8afebef6e0f30862db595c59dfc5e2056e3ea52207b70644a0fa3a5ae1568db',
 'tests/helpers/source-fingerprint.mjs':'61602dc332625a797e6d316c4871de39b4d241aa722a3f0dab3db2435576cbfd',
 'tests/helpers/game-ui-extraction-source-inverse.mjs':'2289fc74eb6d0948182080709e12d0e1f497a9c7b845dcbdeb704b6bd191be1a',
 'tests/helpers/action-buttons-source.mjs':'2ed23e99f0b72927215c24189b1a93752d9869b968cca0fc327a4b780900d4af',
 'tests/helpers/develop-release-backflow-source.mjs':'9e3606266f404f4992c32eb168b8924314deaf129ecbe2ac09c8fd2641efc954',
 'tests/helpers/m7-core-final-source-inverse.mjs':'acd5d226aa7f1e4e843a2b6db3f6e4d97b36476df2319ad6b6176cfac1c0cf86',
 'tests/helpers/potion-pointer-source.mjs':'0eee6e133a69f776e08576c0f5c981c1601ec45a371c1d641ec647f998734c76',
 'tests/helpers/input-retirement-source.mjs':'50ed8e5e59062cc3c0f59dff740b550a17fddfaf817d2dd53b0d09c125ab5222',
 'tests/helpers/release-ui-restore-source.mjs':'de6835c2a44271c50a20ea39cb18c68f3d5c84b04ce8959171c013b34efc4664',
 'tests/helpers/current-replay-fix-sources.mjs':'033b3684438a3c3a5c51a5acaebe6a86881db44c39d82068776dd38386c84a0d',
 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',
 'tests/helpers/input-retirement-sts-binding.mjs':'f6395a7c5e299738db3caf30f29d7d29724e7ac091af012a585c76b785697219',
 'tests/helpers/input-retirement-merged-sts-source.json.gz':'0c8455ee5877bbb5c4c2fa9e8c2dfb5bfba9cb7e6c388bf1c67f149ac53ca960',
 'tests/helpers/sts-fade-ci-source.mjs':'08e3a0e48adc084331516d89af8a91ef013c55553b227e6ade54eb647b6512ab',
 'tests/fixtures/sts-fade-ci-source.json':'be33c862d5b8d8d3f3d40a70228c9eba52c8391e0425b77df07a04297e8bfdb6',
 'tests/fixtures/sts-ui-closeout-ci.json':'d9855569eb08eeb059fa50ec036d65fe7d28050b10bde7b6a5626c081fe02ac0',
});
const entranceFiles=Object.freeze({
 ...currentReplayFiles,
 'tests/helpers/v2-p1-ci-source.mjs':'add40fc31930e44b7b5d62a21aa30f9aa476b818c924c791682df7dd8ccadf46',
 'tests/helpers/refined-release-source.mjs':'747f63088f1830dad97f7fa116df16f265c555639c9a01161ba9ba3b3b5ecc5c',
 'tests/helpers/battle-periphery-source.mjs':'d436c48e4fb14039a53361fdf8464512f6a95226c81ff32ffe4d2930877db210',
 'tests/helpers/rebased-release-source.mjs':'b1e42ded7f05f580fb25ab0417ccd8db45832f5e9e50db83a38d6aaa2767dc20',
 'tests/helpers/chapter-battle-scene-source.mjs':'1270c293d79c04ac4a5b15483dd4cc8f9c4279362e2f5c551f6e98c20c9ad293',
 'tests/helpers/release-integration-source.mjs':'74093921a53a94ba842afac199e579a622b60fea5abf2519d416ede77bbfa1a7',
 'tests/fixtures/release-lazy-monster-art-source.json.gz':'211c3588a53b1f97c98d9f9b905349d82b244a2e81a940d4ebe48022381ca92e',
 'tests/helpers/m7-core-final-source-inverse.mjs':'c9d98969785466649e0e915df0d912f81b774d8b937b4fb63e74eed731635133',
 'tests/helpers/release-ui-restore-source.mjs':'2ec5855476f1b4c8cf762ca1a7ee366028322841b07996a518af96fdd87259b9',
 'tests/helpers/current-replay-fix-sources.mjs':'cceed97f15f0f91ab37ea27d3bf6f5659d213c54dcf11225eaa0fed7adc8ccdf',
 'tests/helpers/character-preparation-source.mjs':'b556363648dd13827dacb603038423caf4a1c2693e618747df58fc29da7be2fd',
 'tests/helpers/develop-release-backflow-source.mjs':'2834679eef440cf54e64cfb2c144c2fc6dbb5dc7ed048c3767435c250827337f',
 'tests/helpers/native-fixture-replay-source.mjs':'7dbd2ded60c5b155b958a5e6e2ff44537b2b62c15e113642aaf8f6194771832d',
 'tests/helpers/native-flow-fixture-source.mjs':'8ad7157fd4f3973ffba4f17f9eba440731ddf952e859fee53970d6c3879968e3',
 'tests/helpers/ui-entrance-source.mjs':'c64976a04e877f65315ad8553bd8f6380b6e50a5ab5fce60e3b37bbbb98825c1',
 'tests/helpers/ui-entrance-approved-sources.mjs':'b5c903614eb19f512e365c8c4024e1c40c37f5ab5df790a016dbeecf7b0efdcb',
 'tests/helpers/ui-entrance-approved-sources.json':'58ea26de5268bc427bce73ecfb1ff43930f54b987c97777f9843e74d3467fe6d',
 'tests/helpers/exact-fixture-hunks.mjs':'83f9cb15d9d745c86c555a77875b6b2bfc283a12ec380bcd2af518aa6526a935',
 'tests/fixtures/ui-entrance-source.json.gz':'7ac3f53b242819cdb569c0a1ebf60de0605b72297a1072ea612bfeb11b0597c9',
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs':'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',
 [runtime]: 'e4d3f37edd23a2040290b1091540d17776fe6f7f7a129f4c31e48e71a8f9a0c0',
 [closeout]: '4f559399c631fbd0fd25ea7f1ceb8f3b8c6643e167f0116d9f151e12ee0a0ecb',
 'tests/helpers/input-retirement-source.mjs':'886cc9b65d51c5e5507691f516439d3475f44a3fdfba5dcf96cfb2dde1c5cf2e',
 'tests/fixtures/event-readability-source.json.gz':'1ccc3098014ebf726a776928f5d0b41c29b6a2a1cff21f096ee42a53b0da9cd5',
 'tests/helpers/reward-query-boundary-source-inverse.mjs':'07d2abf826061305510cebfd60a4c13b2d07e86352d63a5db1868a40c9cc082c',
 'tests/helpers/relic-query-source-inverse.mjs':'41b4cddcba283db2cbcdc4d9c19fdd8bb14321378bd1151fc76a74b7ec9b1120',
 'tests/helpers/reward-current-source.mjs':'3ef0c1268abbd8758655d4898b3d62edba8c877eab76fff2ad7e5406e4613dfd',
 'tests/helpers/reward-current-source.json.gz':'a68d10abe6e6f3bd33a69f85326d34dce1250b34b6892543cb5c1314c01f3b9f',
});
const inside=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('../')&&!r.startsWith('..\\');};
export function copyIntegrationSourceClosure(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory);
 assert.notEqual(destination,realpathSync.native(sourceRoot),'isolated helper copy destination');
 for(const [path,sha]of Object.entries(entranceFiles)){
  assert((path.startsWith('tests/helpers/')||path.startsWith('tests/fixtures/'))&&!path.split('/').includes('..'),'fixed helper path');
  const source=join(sourceRoot,path),content=integrationClosureBytes(path,readFileSync(source));assert.equal(hash(content),sha,'fresh helper copy identity: '+path);
  const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});
  assert(inside(destination,realpathSync.native(dirname(target))),'helper destination parent escaped');
  if(existsSync(target))assert(inside(destination,realpathSync.native(target))&&realpathSync.native(target)!==realpathSync.native(source),'helper destination aliases source');
  writeFileSync(target,content);
 }
}
