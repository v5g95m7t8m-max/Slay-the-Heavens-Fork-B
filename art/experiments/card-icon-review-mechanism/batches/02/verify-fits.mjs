import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

assert(process.argv[2], 'Pass the checkout at 013bdffb7d4767075d7ebcf0be9eacd275bfbe89');
const {nativeShape} = await import(pathToFileURL(resolve(process.argv[2], 'scripts/v25-battle-scene.mjs')));
const root = dirname(fileURLToPath(import.meta.url));
const results = {};
for (const id of ['strike', 'bash']) {
  results[id] = [];
  const hash = createHash('sha256').update(readFileSync(resolve(root,'../01',id+'.png'))).digest('hex');
  for (const budget of [16,24,32,40,48,64]) {
    const j = JSON.parse(readFileSync(resolve(root,'fits',id,budget+'.json'),'utf8'));
    assert.equal(j.id,id);
    assert.equal(j.sourceSha256,hash);
    assert.deepEqual(j.canvas,[144,64]);
    let fallback = 0;
    const sizes = j.controls.flatMap((s,i) => {
      if (s.type === 'rect') return [s.box.slice(2)];
      if (s.type === 'nativeTriangle') {
        const {cx,cy,w,h,rx,ry,rz} = s.placement;
        assert([cx,cy,rx,ry,rz].every(Number.isFinite));
        return [[w,h]];
      }
      assert.equal(s.type, 'polygon');
      const ar = nativeShape({...s,name:id+'-'+i,points:s.points.map(([x,y])=>[x+568,y+306]),opacity:1},{image:{rect:100001}});
      fallback += ar.length;
      return ar.map(x=>x.size);
    });
    assert.equal(sizes.length,j.nativeImages);
    assert.ok(sizes.length <= budget);
    assert.ok(sizes.flat().every(x=>Number.isFinite(x)&&x>0&&x<=660));
    results[id].push({budget, images:sizes.length, fallbackImages:fallback,
      maxDimension:Number(Math.max(...sizes.flat()).toFixed(4)), silhouetteIoU:j.silhouetteIoU, error:j.error});
  }
}
console.log(JSON.stringify({scope:'Offline native placement only; no runtime integration or device result',results},null,2));
