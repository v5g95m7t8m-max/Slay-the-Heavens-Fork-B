import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const gitBlob = source => createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');

function replaceBetween(source, begin, end, replacement) {
  const start = source.indexOf(begin);
  const stop = source.indexOf(end, start + begin.length);
  assert(start >= 0 && stop > start, 'Exact GIL fixture review boundaries required');
  return source.slice(0, start) + replacement + source.slice(stop);
}

function withoutSuffix(source, testName) {
  const marker = "\n\ntest('" + testName;
  const at = source.indexOf(marker);
  assert(at >= 0 && at === source.lastIndexOf(marker), 'Single reviewed GIL test suffix required');
  return source.slice(0, at + 1);
}

const projections = {
  'tests/gil-candidate-preflight.test.mjs': source => withoutSuffix(source, 'local intake requires frozen source and independent approval'),
  'tests/gil-candidate.test.mjs': source => {
    const imports = replaceBetween(source, 'import { verifyDownloadedArtifact', 'import { encoderSha256 }',
      "import { verifyDownloadedArtifact, verifyReceipts } from '../scripts/gil-candidate.mjs';\n")
      .replace('import { execFileSync, spawnSync }', 'import { spawnSync }')
      .replace('readFileSync, realpathSync, rmSync', 'readFileSync, rmSync');
    const workflow = replaceBetween(imports, '  assert.match(workflow, /^          GIL_LOCAL_BUILD_URL:',
      '  const sourceCheckout', '  assert.equal(workflow.match(/secrets\\./g).length, 1);\n');
    return withoutSuffix(workflow, 'verify local base, intermediate, audio receipt and candidate');
  },
  'tests/release-performance-artifacts.test.mjs': source => withoutSuffix(source, 'uses approved local GIL bytes from the same archive authority'),
  'tests/helpers/fork-preflight-source.mjs': source => source
    .replace("import {beforeLocalGilFixture} from './local-gil-fixture-source.mjs';\n", '')
    .replace(
      'const source=beforeLocalGilFixture(path,beforeFormalAct2ReleaseTest(path,beforeDevelopBackflow(path,live)));',
      'const source=beforeFormalAct2ReleaseTest(path,beforeDevelopBackflow(path,live));')
    .replace(' source=beforeLocalGilFixture(path,source);\n', ''),
};

// Match the complete live fixture before reconstructing its preserved predecessor.
const identities = {
  "tests/gil-candidate-preflight.test.mjs": [["8a3af8197ecb7dc8fdacfae7284405d012ced51f3fb49c217b78bbb4004280d9", "51a2b6623d8d3eb50abef594c2539f78359fddd5"], ["7ec29cdbeaf1572fa9713d37fdc17003e4f7843479c5af5ebe3c3c8787b93068", "0f74d35afa204fee627512fa3d1f37f830ec7063"]],
  "tests/gil-candidate.test.mjs": [["a1df938f4ff37f5235db9ce697b75ea41dde06b3c25f85f608af7f854eed284a", "67eb3131bb146e83795f5751a70c20bed9bfd03c"], ["e8a08db32ea8a237575f428566093ab18cc60fd0d0ce4acb0b5e2d7e30b364de", "471b3677151b3c77a5b9961bdde8deb83b2c5c8a"]],
  "tests/release-performance-artifacts.test.mjs": [["051ee887e87aa6dec24a46fafe8b28802b46d7631f665daa31fc262f9e84646c", "6e004d6e77e246dc789f48f1d28f2407f8b88dab"], ["c1d0d51314ab0dffac68236a3f722a4a4cdb8a0ebbfc292d1ca36cd0b2b2a941", "cab79b16d18ab2adba143a938f51c0ab125a3943"]],
  "tests/helpers/fork-preflight-source.mjs": [["0599ac1c1721986d4c498c9de266fd426ab75b6d07bb762fff7a3585f8f588c6", "95ef579a761ff6cb71cc272dd6a4399afed22b68"], ["2e7dbde98502bc88f63a47eeca29d38dd6d22dc9d34b07cb2c9367c0197d8825", "8a35e56a28605202bf97b78007bf4cc67f6a5d92"]],
};

export function beforeLocalGilFixture(path, source) {
  if (typeof source !== 'string' || !Object.hasOwn(identities, path)) return source;
  const lf = source.replaceAll('\r\n', '\n');
  const [current, predecessor] = identities[path];
  if (source !== lf && source !== lf.replaceAll('\n', '\r\n')) return source;
  if (hash(lf) !== current[0] || gitBlob(lf) !== current[1]) return source;
  const prior = projections[path](lf);
  assert.deepEqual([hash(prior), gitBlob(prior)], predecessor, 'Exact GIL fixture predecessor: ' + path);
  return source === lf ? prior : prior.replaceAll('\n', '\r\n');
}
