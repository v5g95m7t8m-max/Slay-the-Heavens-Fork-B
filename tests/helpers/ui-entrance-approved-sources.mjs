import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

// Invert only the approved changes on develop since the selection PR's base.
// The older entrance archive still authenticates the reconstructed owners.
const archive=readFileSync(new URL('./ui-entrance-approved-sources.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(createHash('sha256').update(archive).digest('hex'),
 '58ea26de5268bc427bce73ecfb1ff43930f54b987c97777f9843e74d3467fe6d','approved entrance owner transformations');
const {owners}=JSON.parse(archive);
const bindings=new Map(owners.map(row=>[row.path,row]));

export function beforeApprovedUiEntrance(path,source){
 const row=bindings.get(path);
 if(!row)return source;
 const prior=restoreExactFixtureHunks(row,path,source);
 return prior!==source&&source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function matchesApprovedUiEntranceOwner(path,source){
 return !bindings.has(path)||beforeApprovedUiEntrance(path,source)!==source;
}
