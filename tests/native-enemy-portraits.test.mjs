import test from 'node:test';
import assert from 'node:assert/strict';
import { runLua } from '../scripts/test-lua.mjs';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { buildLuaData } from '../scripts/build-lua-data.mjs';
import {loadReleaseEnemyArt} from '../scripts/lowcost-art.mjs';
import { buildUI } from '../scripts/build-ui.mjs';
import { nativeAudioBuildArgs } from '../scripts/build-native-audio-game.mjs';


test('all 42 two-act enemies use native numeric images through battle SetImage, including bosses and summons', () => {
  const result = runLua('tests/lua/native_enemy_portraits.lua');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /LUA_NATIVE_ENEMY_PORTRAITS_PASS 42 \+ summons \+ unknown fallbacks/);
});

const children = node => node?.children ?? node?.controls ?? [];
const names = node => [node.name, ...children(node).flatMap(names)];
const json = file => JSON.parse(readFileSync(file, 'utf8'));

test('formal release uses the existing enemy-only portraits, not the optional large catalogue or relic art', t => {
 const out = mkdtempSync(join(tmpdir(), 'release-enemy-art-'));
 t.after(() => rmSync(out, { recursive: true, force: true }));
 const { options: { artFeatures } } = nativeAudioBuildArgs(['--release-candidate']);
 buildUI(out, undefined, { artFeatures, releaseCandidate: true,
   sourceIdentity: { sourceCommit: 'a'.repeat(40), sourceDirty: false } });
 const templates = json(join(out, 'game-ui-templates.json'));
 const actor = templates.find(t => t.name === 'AbyssMonsterActor');
 const pool = children(actor).find(c => c.name === 'portraitArt');
 assert.ok(pool, 'the formal actor needs the existing enemy portrait pool');
 assert.equal(children(pool).length, 41);
 assert.equal(pool.raycastTarget, false);
 assert.ok(children(pool).every(shape => shape.raycastTarget === false && shape.visible === false));
 assert.equal(names(actor).includes('monsterArt'), false);
 assert.equal(templates.flatMap(names).includes('iconArt'), false);
 assert.equal(names(json(join(out, 'game-ui.json'))).includes('iconArt'), false);
 const theme = readFileSync(join(out, 'abyss_theme.lua'), 'utf8');
 assert.match(theme, /lowCostArt/);
 assert.doesNotMatch(theme, /iconArt/);
 const art = loadReleaseEnemyArt().enemy;
 assert.equal(Object.keys(art.assets).length, 42);
 assert.deepEqual(['acid_slime_s','acid_slime_m','spike_slime_s','spike_slime_m'].map(id=>art.assets[id].shapes.length), [32,41,41,41]);
 assert.ok(art.assets.spike_slime_s.shapes.some(s=>s.rx||s.ry));
 buildLuaData('data', join(out, 'abyss_data.lua'));
 const cli = createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
 const luaPath = out.replaceAll('\\', '/')+'/?.lua;./src/lua/?.lua;;';
 const result = spawnSync(process.execPath, [cli, '-e', "dofile('tests/lua/support/formal_enemy_art.lua')"], {
   encoding: 'utf8', timeout: 60000,
   env: { ...process.env, LUA_PATH: luaPath, LUA_PATH_5_3: luaPath, LUA_INIT: '', LUA_INIT_5_3: '' }
 });
 assert.ifError(result.error);
 assert.equal(result.status, 0, result.stdout+result.stderr);
 assert.match(result.stdout, /FORMAL_ENEMY_VISIBLE_PASS 56 rendered actors/);
});
