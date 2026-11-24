import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {releaseUiRestoreArchive} from './release-ui-restore-source.mjs';

const mergedPaths=new Set([
 'tests/deck-browser-reveal-reuse.test.mjs',
 'tests/deck-item-lifecycle.test.mjs',
 'tests/helpers/copy-integration-source-closure.mjs',
 'tests/helpers/develop-release-backflow-source.mjs',
 'tests/helpers/v2-p1-ci-source.mjs',
 'tests/official-battle-relic-icons.test.mjs',
 'tests/relic-view-layout.test.mjs',
 'tests/sts-card-reference-runtime.test.mjs',
 'tests/sts-page-reveal.test.mjs',
]);
const mapRoomMergedPaths=new Set([
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs',
 'tests/helpers/copy-integration-source-closure.mjs',
 'tests/helpers/develop-release-backflow-source.mjs',
 'tests/sts-page-reveal.test.mjs',
]);
let replay,mapRoomReplay,mapRoomReplayCohort;

const mapRoomCohortPaths=new Set([
 'tests/helpers/combined-epoch/source-epoch-runtime.mjs',
 'tests/helpers/copy-integration-source-closure.mjs',
 'tests/helpers/develop-release-backflow-source.mjs',
 'tests/helpers/round3-catalog-source-inverse.mjs',
 'tests/encounter-formation-source-epoch.test.mjs',
 'tests/run-max-hp-config-inverse.test.mjs',
 'tests/session-menu-navigation.test.mjs',
 'scripts/build-native-audio-game.mjs',
 'tests/candidate-art-policy.test.mjs',
 'tests/lua/node_event_copy.lua',
 'tests/official-battle-potion-hud-source-epoch.test.mjs',
 'tests/defect-actor-boundary.test.mjs',
 'tests/integration-source-epoch.test.mjs',
 'tests/helpers/historical-sts-style-entry.mjs',
 'tests/defect-final-source-epoch.test.mjs',
 'tests/defect-integration-source.test.mjs',
 'tests/defect-utility-planning.test.mjs',
 'tests/menu-red-source-proof.cases.mjs',
 'tests/seven-refactor-source-epoch.test.mjs',
 'tests/room-ui-source-epoch.test.mjs',
 'tests/delivery.test.mjs',
 'scripts/ci-media-lfs.mjs',
 'tests/lua/menu_input_boundaries_current.lua',
 'tests/lua/noncombat_v25_menu.lua',
 'tests/lua/support/committed_defeat_fixture.lua',
 'tests/lua/support/session_menu_v25.lua',
 'tests/sts-page-reveal.test.mjs',
]);
// The complete Run test now pins all 43 backflow freshness rereads. Only that
// exact test revision can bridge into the unchanged map-room replay archive.
const runOwnerTracePath='tests/run-max-hp-config-inverse.test.mjs';
const runOwnerTraceSuccessor=Object.freeze({
 sha256:'80fa5d4abba3365678708d91c65975874d6cf57bb7a071a2f587ca0e6bd5cbc3',
 gitBlob:'d3b014defa783e2efb0c60dbc807277c3b658182',
});
const runOwnerTraceEdits=Object.freeze([
 [` // The exact trace also includes 14 action-button, 20 combat/event, and 9
 // deck/potion freshness reads, in addition to the prior ordered closure.
 const admittedReads=[...reads];
 assert.equal(admittedReads.length,460,'complete fresh raw closure size');
 assert.equal(hash(JSON.stringify(admittedReads)),'6b72ef490e6f79b870b0a21d5b63ddb122f065aff81f837e8f6fa3bafbd40d51',`,
 ` // The exact current trace includes the nested Actor/Stasis and MapRoom
 // checks, plus the original direct and continuation reads in their order.
 const admittedReads=[...reads];
 assert.equal(admittedReads.length,417,'complete fresh raw closure size');
 assert.equal(hash(JSON.stringify(admittedReads)),'05131aa3de86e8f88d0e82bca23e667bba10e3921cf029de891ec4e8b06c3a67',`],
]);
function beforeRunOwnerTracePin(path,source,archive){
 if(path!==runOwnerTracePath||!exactSourceMatches(source,runOwnerTraceSuccessor))return source;
 let prior=source.replaceAll('\r\n','\n');
 for(const [after,before] of runOwnerTraceEdits){
  assert.equal(prior.split(after).length,2,'exact Run raw-owner trace pin');
  prior=prior.replace(after,()=>before);
 }
 const row=archive.files[path];
 assert(row&&exactSourceMatches(prior,row.after),'exact Run raw-owner trace predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeMapRoomReplayCohort(path,source){
 if(!mapRoomCohortPaths.has(path))return source;
 mapRoomReplayCohort??=releaseUiRestoreArchive(readFileSync(new URL('./map-room-replay-cohort-source.json.gz',import.meta.url)),
  '6af29058c13b798d571e11355bca6af33a9912c4363a627a7618f6979ec8a61f','67fc8750dd6ef9a13067c6a43137f910b6a44228');
 return mapRoomReplayCohort.project(path,beforeRunOwnerTracePin(path,source,mapRoomReplayCohort));
}

export function beforeCurrentDevelopReplayMerge(path,source){
 source=beforeMapRoomReplayCohort(path,source);
 if(!mapRoomMergedPaths.has(path))return source;
 mapRoomReplay??=releaseUiRestoreArchive(readFileSync(new URL('./develop-map-room-replay-merge-source.json.gz',import.meta.url)),
  '859ef1f31ae5990213c98b3cb1db9ce8468f936579607d5718e825341225ebae','0044a5b7bef2f6ffbf14d5e41b4f79a9ae56daed');
 return mapRoomReplay.project(path,source);
}

// Historical readers continue through the exact pre-merge helpers. The live
// copier and production authentication use the combined current definitions.
export function beforeDevelopReplayMerge(path,source){
 source=beforeCurrentDevelopReplayMerge(path,source);
 if(!mergedPaths.has(path))return source;
 replay??=releaseUiRestoreArchive(readFileSync(new URL('./develop-replay-merge-source.json.gz',import.meta.url)),
  'a9c9075900b1e618f7fb23dcb4e3bc08dc88b5fdd9f798f5b881e0fbf465391f','7bcb98f9271a49bf9ca7eaf46b6f229335e60e8e');
 return replay.project(path,source);
}
