import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {beforeUiEntrance,assertCurrentUiEntrance,entrancePredecessor} from './tests/helpers/ui-entrance-source.mjs';
import {beforeCurrentReplayCopier} from './tests/helpers/calibration-replay-sources.mjs';
const p='src/lua/abyss_battle_actions.lua';
const raw=x=>read(x,'utf8');
const hot=raw(p),cold=beforeUiEntrance(p,hot),crlf=x=>x.replaceAll('\n','\r\n');
assert.notEqual(hot,cold);
assert.equal(beforeUiEntrance(p,crlf(hot)),crlf(cold));
assert.equal(entrancePredecessor(p,hot,raw).source,cold);
assertCurrentUiEntrance(p,hot);assertCurrentUiEntrance(p,crlf(hot));
for(const bad of [cold,hot.slice(0,-1)+'!',hot+'\n',hot.replaceAll('\n','\r\r\n'),null]){
 assert.throws(()=>assertCurrentUiEntrance(p,bad),/fresh current production owner/);
 assert.throws(()=>entrancePredecessor(p,hot,x=>x===p?bad:raw(x)),/linked owner identity/);
}
assert.equal(beforeUiEntrance('wrong.lua',hot),hot);
const c='tests/helpers/copy-integration-source-closure.mjs';
assert.equal(beforeCurrentReplayCopier(c,raw(c)),beforeCurrentReplayCopier(c,raw('copy-integration-source-closure.mjs.prior')));
console.log('NOTICE_364F_EXACT_ADMISSION_PASS');
