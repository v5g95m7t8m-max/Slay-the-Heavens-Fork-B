// Fixed StS runner trust leaf, outside the archive and its copy closure.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeMergedInputRetirement} from './input-retirement-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {beforeNativeFlowFixture} from './native-flow-fixture-source.mjs';
import {beforeCurrentOfficialRuntimeFixture} from './sts-fade-ci-source.mjs';

const archive=readFileSync(new URL('./input-retirement-merged-sts-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),'0c8455ee5877bbb5c4c2fa9e8c2dfb5bfba9cb7e6c388bf1c67f149ac53ca960');
const integration=JSON.parse(gunzipSync(archive));
assert.equal(integration.base,'392fae8d8dee2bd57829dda0e8da836f45107398');
assert.equal(integration.path,'tests/integration-source-epoch.test.mjs');
assert(exactSourceMatches(integration.before.source,integration.before),'exact protected StS integration source');

function beforeArchiveStorageLedger(source){
 let current=source;
 // #857 and #869 add provenance that was absent in the archived StS view.
 if(exactSourceMatches(current,{
  sha256:'5ec27c5274a512ccdf2dfb183f65bd15321c87883e3e4e633e6502f726429353',gitBlob:'dcd99bd13cf06653847b5ca8eb76748c229f17a4',
 })){
  current=current.replaceAll('\r\n','\n');
  for(const [first,after] of [
   ['native-event-illustrations','deck-browser-host-evidence'],
   ['data/presentation/event-native-controls.json','docs/evidence/deck-pages-20261122/visual/develop-first-open.png'],
  ]){
   const start=current.indexOf(`    "${first}": {\n`),end=current.indexOf(`    "${after}": {\n`);
   assert(start>=0&&end>start,'exact current asset ledger continuation: '+first);
   current=current.slice(0,start)+current.slice(end);
  }
 }
 assert(exactSourceMatches(current,{
  sha256:'1d33f53a8ae76990456e0829980be613201a8bde6502593013bb928768a9627c',gitBlob:'23e19be19acbca290bdad08d71f2e111b1143f1e',
 }),'fresh composed input-retirement asset ledger');
 const text=current.replaceAll('\r\n','\n');
 const start=text.indexOf('    "tests/fixtures/integration-ci-epochs.json.gz": {\n');
 const end=text.indexOf('    "docs/evidence/sts-selection-fade-20261121/after-selection.png": {\n');
 assert(start>=0&&end>start,'exact replay-storage ledger records');
 const prior=text.slice(0,start)+text.slice(end);
 assert(exactSourceMatches(prior,{
  sha256:'7f45838670611c4c526d35cb0bb556a7f2ef0cd1e18677ba917906409a5979cb',gitBlob:'b0cca00488f9054dc880841eed6b87ac9a48560c',
 }),'exact protected input-retirement asset ledger');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

// Bridge only the reviewed Windows map test to the existing retirement receipt.
export function beforeMapNodeVisualsLineEndings(path,source){
 if(path!=='tests/map-node-visuals.test.mjs'||!exactSourceMatches(source,{
  sha256:'17005e15d5036d841de485e62cf942f38d157329216d4c5e1c1ddb0661f3464a',gitBlob:'872cbc85761229b50769311d04e3a6a43aacbdf0',
 }))return source;
 const current=source.replaceAll('\r\n','\n');
 const target="  const toCrlf = value => value.replace(/\\r?\\n/g, '\\r\\n');\n  const expected = source.includes('\\r\\n') ? toCrlf(previous) : previous;\n  assert.equal(authenticateDevelopBackflow(path, source, readOwner), expected);\n  assert.equal(authenticateDevelopBackflow(path, toCrlf(source), readOwner), toCrlf(previous));\n";
 const original="  assert.equal(authenticateDevelopBackflow(path, source, readOwner), previous);\n  assert.equal(authenticateDevelopBackflow(path, source.replaceAll('\\n', '\\r\\n'), readOwner), previous.replaceAll('\\n', '\\r\\n'));\n";
 assert.equal(current.split(target).length,2,'unique reviewed map line-ending hunk');
 const prior=current.replace(target,()=>original);
 assert(exactSourceMatches(prior,{
  sha256:'f373b9803c6b7afe2a0c79298d4ebd711e0110fe0574cb480bfb690532fef65d',gitBlob:'4012d6c8045290d7613dcad794e06a45f8454423',
 }),'exact input-retirement map fixture predecessor');
 return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}

export function inputRetirementStsFixtureSource(path,raw){
 const buffered=Buffer.isBuffer(raw),source=buffered?raw.toString('utf8'):raw;
 const fixture=beforeNativeFlowFixture(path,beforeMapNodeVisualsLineEndings(path,source),{requireCurrent:true});
 const native=beforeMergedInputRetirement(path,fixture,{requireCurrent:true});
 // The exact native-flow chain already returns the composed StS runtime predecessor.
 // Accept it only after a current native-flow fixture actually projected.
 const runtimeAlreadyProjected=path==='tests/official-assets-runtime.test.mjs'&&fixture!==source&&exactSourceMatches(native,{
  sha256:'1ba0126359c0dbf655585c7248c5963b7d6d89572fb47c84403df7adf7c090ef',gitBlob:'65d01cdbd3b32ff56ee99e113d47e6ff8854034d',
 });
 let prior=runtimeAlreadyProjected?native:beforeCurrentOfficialRuntimeFixture(path,native);
 if(path==='docs/legal/assets.json')prior=beforeArchiveStorageLedger(native);
 if(path===integration.path){
  // #859's merged test adds live replay checks; keep the same archived StS view.
  const merged=exactSourceMatches(native,{
   sha256:'58159c0c30a0bbd658c1d47543c2350d8534198c43c4ba59b03318f14195178d',gitBlob:'d9fa7f66445a406502ae7966d9d3da0b4ec936b4',
  });
  assert(merged||exactSourceMatches(native,integration.after),'fresh composed StS integration source');
  prior=native.includes('\r\n')?integration.before.source.replaceAll('\n','\r\n'):integration.before.source;
 }
 return buffered?(prior===source?raw:Buffer.from(prior)):prior;
}

export const inputRetirementStsWitness=Object.freeze({
 'tests/helpers/copy-integration-source-closure.mjs':'848e21017bfe022dd0a5e8215ffa94aee50b328ac9d7055ef1fade4f3a170677',
 'tests/helpers/historical-sts-style-entry.mjs':'96c580efcf1c7ed4e1be8b1bc3a27d15212c8b485e5a345d5ec450ad364017ae',
});
