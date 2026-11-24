import {historicalTest as test,readHistoricalBaselineSource} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 pr323AcceptedSourceInverse as proof,normalizePr323HistoryInput,
 requireHistoricalPr323Source,projectHistoricalPr323Source,requirePr323Source,
} from './helpers/pr323-accepted-source-inverse.mjs';

const path='config/architecture.json';
const currentPolicy=JSON.parse(readFileSync(path,'utf8'));
const source=readHistoricalBaselineSource(path).replaceAll('\r\n','\n');
const hash=text=>createHash('sha256').update(text).digest('hex');

test('architecture layout whitespace projects to the same immutable complete historical bytes',()=>{
 const policy=JSON.parse(source);
 for(const variant of [source,JSON.stringify(policy),JSON.stringify(policy,null,'\t'),source+'\n\t ',source.replaceAll('\n','\r\n')]){
  assert.deepEqual(JSON.parse(variant),policy,'production JSON.parse receives the same policy');
  const normalized=normalizePr323HistoryInput(path,variant);
  requireHistoricalPr323Source(path,normalized);
  for(const target of ['accepted','original']){
   const historical=projectHistoricalPr323Source(path,normalized,target);
   assert.equal(historical,proof.files[path][target+'Source']);
   assert.equal(hash(historical),proof.files[path][target+'Sha256']);
  }
 }
});

test('whitespace permission never hides changed tokens, duplicate keys, array order or string content',()=>{
 const policy=JSON.parse(source),key=Object.keys(policy.layers)[0];
 const changed=structuredClone(policy);changed.layers[key]=policy.layers[key]==='ui'?'core':'ui';
 const unknown=structuredClone(policy);unknown.unreviewed=true;
 const reordered=structuredClone(policy);
 assert.ok(reordered.deferredImports.length>1,'array order negative control has distinct actual entries');
 reordered.deferredImports.reverse();
 // Run scoring postdates the immutable baseline. Keep its removal/wrong-owner
 // negative controls on actual current input, rather than deleting absent keys.
 assert(Object.hasOwn(currentPolicy.layers,'abyss_run_score')&&Object.hasOwn(currentPolicy.layers,'abyss_run_scoring'));
 const missingScore=structuredClone(currentPolicy);delete missingScore.layers.abyss_run_score;
 const missingScoring=structuredClone(currentPolicy);delete missingScoring.layers.abyss_run_scoring;
 const wrongScoring=structuredClone(currentPolicy);wrongScoring.layers.abyss_run_scoring='ui';
 for(const variant of [missingScore,missingScoring,wrongScoring])assert.notEqual(JSON.stringify(variant),JSON.stringify(currentPolicy));
 const first=JSON.stringify(key),value=JSON.stringify(policy.layers[key]);
 const compact=JSON.stringify(policy);
 const variants=[JSON.stringify(changed),JSON.stringify(unknown),JSON.stringify(reordered),
  JSON.stringify(missingScore),JSON.stringify(missingScoring),JSON.stringify(wrongScoring),
  compact.replace(first+':'+value,first+':'+value+','+first+':'+value),
  compact.replace(first,JSON.stringify(key+' ')),
  compact.replace(first,first.replace('a','\\u0061')),
  compact+' invalid',compact.replace('{','{/*comment*/')];
 for(const variant of variants){
  assert.notEqual(variant,compact,'negative control changes the input');
  const normalized=normalizePr323HistoryInput(path,variant);
  assert.throws(()=>requireHistoricalPr323Source(path,normalized),/unreviewed integrated/);
  for(const target of ['accepted','original'])
   assert.equal(projectHistoricalPr323Source(path,normalized,target),variant,'unrecognized bytes remain exposed');
 }
 assert.throws(()=>requirePr323Source('data/presentation/ui_theme.json',' '+readFileSync('data/presentation/ui_theme.json','utf8')),/unreviewed integrated/,'permission stays on architecture only');
});
