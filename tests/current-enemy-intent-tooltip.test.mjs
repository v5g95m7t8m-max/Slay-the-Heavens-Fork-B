import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLuaData } from '../scripts/build-lua-data.mjs';
import { buildUI } from '../scripts/build-ui.mjs';
import { runLua } from '../scripts/test-lua.mjs';

test('existing intent icon reads the shown actor snapshot, not the selected forecast', () => {
  buildLuaData();
  buildUI();
  const result = runLua('tests/lua/current_enemy_intent_tooltip.lua');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS mouse$/m);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS touch$/m);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS legacy_unequal$/m);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS source_multi$/m);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS spawn_orbs$/m);
  assert.match(result.stdout, /^CURRENT_ENEMY_INTENT_UI_PASS inferno$/m);
});
