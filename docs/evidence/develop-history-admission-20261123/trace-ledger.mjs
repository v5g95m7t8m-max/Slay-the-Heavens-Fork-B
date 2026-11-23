// Diagnostic only. Run from the exact #907 workspace after independently
// checking the preceding Shop fixture admission; never use in production CI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=pathToFileURL(process.cwd()+'/');
const {beforeInputRetirementStsSuite}=await import(new URL('tests/helpers/input-retirement-source.mjs',root));
const {inputRetirementStsFixtureSource,inputRetirementStsWitness}=await import(new URL('tests/helpers/input-retirement-sts-binding.mjs',root));
const {assertStsStyleCiCurrent}=await import(new URL('tests/helpers/sts-style-ci-source.mjs',root));
const {discoverJs}=await import(new URL('scripts/ci-shards.mjs',root));
const name='docs/legal/assets.json';
const read=p=>readFileSync(p,'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const blob=x=>createHash('sha1').update(`blob ${Buffer.byteLength(x)}\0`).update(x).digest('hex');
const identity=(text,digest,oid)=>{assert.equal(sha(text),digest);assert.equal(blob(text),oid);};
const cut=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b);assert(i>=0&&j>i&&i===s.lastIndexOf(a));return s.slice(0,i)+s.slice(j);};
const exact=read(name).replaceAll('\r\n','\n');
identity(exact,'5ec27c5274a512ccdf2dfb183f65bd15321c87883e3e4e633e6502f726429353','dcd99bd13cf06653847b5ca8eb76748c229f17a4');
assert.throws(()=>inputRetirementStsFixtureSource(name,exact),/fresh composed input-retirement asset ledger/);
let middle=cut(exact,'    "native-event-illustrations": {\n','    "deck-browser-host-evidence": {\n');
middle=cut(middle,'    "data/presentation/event-native-controls.json": {\n','    "docs/evidence/deck-pages-20261122/visual/develop-first-open.png": {\n');
identity(middle,'1d33f53a8ae76990456e0829980be613201a8bde6502593013bb928768a9627c','23e19be19acbca290bdad08d71f2e111b1143f1e');
const prior=inputRetirementStsFixtureSource(name,middle);
identity(prior,'7f45838670611c4c526d35cb0bb556a7f2ef0cd1e18677ba917906409a5979cb','b0cca00488f9054dc880841eed6b87ac9a48560c');
assert.throws(()=>inputRetirementStsFixtureSource(name,middle+'\n'),/fresh composed input-retirement asset ledger/);
assert.equal(inputRetirementStsFixtureSource(name,middle.replaceAll('\n','\r\n')),prior.replaceAll('\n','\r\n'));
const suite=beforeInputRetirementStsSuite(discoverJs(),(p,e)=>{
  if(p===name)return e?prior:Buffer.from(prior);
  return inputRetirementStsFixtureSource(p,readFileSync(p,e));
},inputRetirementStsWitness);
assert.throws(()=>assertStsStyleCiCurrent(suite.paths,suite.read),/fresh input retirement StS helper: tests\/helpers\/copy-integration-source-closure\.mjs/);
console.log('Exact ledger predecessor authenticated (LF, CRLF); one-byte drift rejected; next unchanged copy-helper guard remains red before gameplay.');
