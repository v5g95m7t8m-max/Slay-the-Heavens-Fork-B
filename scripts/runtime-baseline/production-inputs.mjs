import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const productionPhases = ['begin', 'cold-start', 'selection-open', 'neow-open', 'start-map', 'first-fight', 'ten-card-hand', 'consecutive-play',
  'deck-cold-open', 'deck-close', 'deck-warm-open', 'pause-resume', 'exit', 'reenter'];
export const act2ProductionPhases = ['act2-begin', 'act2-terminal-setup', 'act2-transition', 'act2-three-enemies',
  'act2-full-hand', 'act2-overlapping-effects', 'act2-enemy-turn', 'act2-exit'];
// Visible Act II rows in the approved V3 chapter scene. Changes to the
// formal scenery update this workload contract with the reviewed layout.
export const formalAct2SceneSlots = 249;

// Build with each worktree's own production generators and source files.
export async function prepareProductionInputs(directory) {
  const modules = [
    'build-lua-data', 'build-ui', 'build-native-audio-game', 'official-portraits',
    'monster-art', 'refined-release-monsters', 'deck-ui-layout',
  ];
  const [
    {buildLuaData, toLua}, {buildUI}, {nativeAudioBuildArgs}, {bindPortraitTemplates},
    {bindMonsterActorTemplates, monsterActorTiers},
    {prepareRefinedReleaseMonsterArt, refinedReleaseMonsterRegistry},
    {deckBrowserBindingSource, deckBrowserParts, deckBrowserTemplateName},
  ] = await Promise.all(modules.map(name => import(pathToFileURL(resolve('scripts', name + '.mjs')))));
  const {options} = nativeAudioBuildArgs(['offline.gil', '--work-key=offline-performance']);
  assert(options.officialAssets && options.refinedReleaseMonsterArt && options.nativePageLifecycle,
    'Production performance requires the refined native audio build preset');
  buildLuaData('data', join(directory, 'abyss_data.lua'));
  buildUI(directory, undefined, options);

  // The generator leaves template IDs unbound until import. Use the same binding
  // writers with local IDs, backed by the actual generated template definitions.
  const names = JSON.parse(readFileSync(join(directory, 'game-ui-templates.json'), 'utf8')).map(({name}) => name);
  const indices = new Map(names.map((name, i) => [name, i + 1]));
  const binding = name => ({templateIndex: assertIndex(name)});
  function assertIndex(name) {
    const index = indices.get(name);
    assert(index, 'Generated template missing: ' + name);
    return index;
  }
  const registry = JSON.parse(readFileSync(refinedReleaseMonsterRegistry, 'utf8'));
  const {templateByDefinition} = monsterActorTiers(prepareRefinedReleaseMonsterArt(registry));
  bindMonsterActorTemplates(directory, {
    actor: binding('AbyssMonsterActor'), group: binding('AbyssReadyCardGroup'), power: binding('AbyssMonsterPower'),
    templateIndexByDefinition: Object.fromEntries(Object.entries(templateByDefinition)
      .map(([definition, name]) => [definition, assertIndex(name)])),
  });
  bindPortraitTemplates(directory, {
    image: binding('AbyssReadyCardImage'), container: binding('AbyssReadyCardGroup'),
    half: binding('AbyssSelectionHalfTriangle'),
  }, {...options.artFeatures, officialAssets: options.officialAssets});
  writeFileSync(join(directory, 'abyss_deck_browser_binding.lua'), deckBrowserBindingSource(
    assertIndex(deckBrowserTemplateName), deckBrowserParts.map(part => ({...part, templateIndex: assertIndex(part.name)}))));
  writeFileSync(join(directory, 'performance_templates.lua'), 'return ' + toLua(names) + '\n');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 3, 'provide an existing output directory');
  const options = await prepareProductionInputs(resolve(process.argv[2]));
  console.log(JSON.stringify(options));
}
