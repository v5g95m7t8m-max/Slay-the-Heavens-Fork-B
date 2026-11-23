import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const [checkout = fileURLToPath(new URL('../../../', import.meta.url))] = process.argv.slice(2);
const root = resolve(checkout);
const require = createRequire(resolve(root, 'package.json'));
const { buildUI } = await import(pathToFileURL(resolve(root, 'scripts/build-ui.mjs')));
const { buildLuaData, luaString } = await import(pathToFileURL(resolve(root, 'scripts/build-lua-data.mjs')));
const witness = fileURLToPath(new URL('./probe.lua', import.meta.url)).replaceAll('\\', '/');
const dir = mkdtempSync(resolve(tmpdir(), 'enemy-tip-build-')).replaceAll('\\', '/');
process.chdir(root);
try {
  buildLuaData('data', dir + '/abyss_data.lua');
  buildUI(dir, undefined, { officialAssets: true, refinedReleaseMonsterArt: true, nativePageLifecycle: true });
  const preload = readdirSync(dir).filter(name => name.endsWith('.lua')).map(name =>
    `package.preload[${luaString(name.slice(0,-4))}]=assert(loadfile(${luaString(dir+'/'+name)}))`,
  ).join('\n');
  const script = "package.path='./src/lua/?.lua;'..package.path\n" + preload + '\ndofile(' + luaString(witness) + ')';
  const result = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', script], {
    encoding: 'utf8', timeout: 90000, env: { ...process.env, LUA_INIT: '', LUA_INIT_5_3: '' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
