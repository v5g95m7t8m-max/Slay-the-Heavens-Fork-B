import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildLuaData } from '../scripts/build-lua-data.mjs';
import { buildUiTheme } from '../scripts/build-ui-theme.mjs';
import { buildMapLayout } from '../scripts/map-ui-layout.mjs';
import { runLua } from '../scripts/test-lua.mjs';
import { assertDevelopBackflowCurrent, authenticateDevelopBackflow, beforeDevelopBackflow } from './helpers/develop-release-backflow-source.mjs';

test('native ink circles preserve four states, official icons, full hits and legal mouse and touch choices after repaint', () => {
  buildLuaData();
  buildUiTheme();
  buildMapLayout();
  const result = runLua('tests/lua/map_node_visuals.lua');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /MAP_NODE_VISUALS_PASS 4 states/);
});

test('map rendering continues the frozen Develop source and rejects stale or changed bytes', () => {
  const path = 'src/lua/abyss_map_ui.lua';
  const source = readFileSync(path, 'utf8');
  const archive = readFileSync(new URL('./fixtures/develop-map-render-source.json.gz', import.meta.url));
  const predecessor = JSON.parse(gunzipSync(archive)).files[path].before.source;
  const previous = beforeDevelopBackflow(path, predecessor);
  assert.notEqual(previous, predecessor);
  assertDevelopBackflowCurrent(path, source);
  assert.equal(authenticateDevelopBackflow(path, source, readOwner), previous);
  assert.equal(authenticateDevelopBackflow(path, source.replaceAll('\n', '\r\n'), readOwner), previous.replaceAll('\n', '\r\n'));
  assert.throws(() => assertDevelopBackflowCurrent(path, predecessor), /fresh current production owner/);
  assert.throws(() => authenticateDevelopBackflow(path, source, () => predecessor), /changed during Develop backflow validation|combined linked owner identity: src\/lua\/abyss_map_ui\.lua during input retirement validation/);
  const changed = source + '\n-- drift';
  assert.throws(() => assertDevelopBackflowCurrent(path, changed), /fresh current production owner/);
  assert.equal(beforeDevelopBackflow(path, changed), changed);
});

function readOwner(path) {
  return readFileSync(path, 'utf8');
}
