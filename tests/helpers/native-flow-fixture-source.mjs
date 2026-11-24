import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {beforeUiEntranceWitness} from './ui-entrance-source.mjs';

const archive=readFileSync(new URL('./native-flow-fixture-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),'5709c250f1411a9edbdaa6669bf0d39bfecc824841684b7948eba3297d5aea35','exact native flow fixture archive');
const {base,files}=JSON.parse(gunzipSync(archive));
assert.equal(base,'0461bcd30dac18818318cbafa77ad72fad069e0a');
assert.deepEqual(Object.keys(files),[
 'scripts/potion-discard-layout.mjs',
 'src/lua/abyss_match_event_ui.lua',
 'tests/helpers/replay-reviewed-selection.mjs',
 'tests/lua/formal_campaign_entry.lua',
 'tests/lua/full_source_campaign_entry.lua',
 'tests/lua/support/native_monster_only_entry.lua',
 'tests/official-assets-runtime.test.mjs',
 'tests/official-assets.test.mjs',
 'tests/official-battle-pile-layout.test.mjs',
 'tests/readable-unit-typography-inverse.test.mjs',
 'tests/sts-character-browser.test.mjs',
 'tests/sts-selection-fade.test.mjs',
]);
for(const [path,{before,after}] of Object.entries(files)){
 assert(exactSourceMatches(before.source,before),path+' exact native flow predecessor');
 assert.match(after.sha256,/^[a-f0-9]{64}$/);
 assert.match(after.gitBlob,/^[a-f0-9]{40}$/);
 assert.notEqual(before.gitBlob,after.gitBlob);
}

export function beforeNativeFlowFixture(path,source,{requireCurrent=false}={}){
 if(!Object.hasOwn(files,path))return source;
 source=beforeUiEntranceWitness(path,source);
 const {before,after}=files[path];
 const current=exactSourceMatches(source,after);
 if(requireCurrent)assert(current,'fresh complete native flow fixture: '+path);
 if(!current)return source;
 return source.includes('\r\n')?before.source.replaceAll('\n','\r\n'):before.source;
}

export function assertNativeFlowFixturesCurrent(read){
 for(const path of Object.keys(files))beforeNativeFlowFixture(path,read(path,'utf8'),{requireCurrent:true});
}
