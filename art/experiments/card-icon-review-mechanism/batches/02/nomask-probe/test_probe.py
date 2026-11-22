"""Targeted offline acceptance of the exact saved geometry and 1× raster."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image
from probe import INPUTS, sha


def verify_pair(batches, reference, actual):
    expected=json.loads((reference/'receipt.json').read_text())
    observed=json.loads((actual/'receipt.json').read_text())
    assert expected==observed, 'Reproduction receipt differs'
    for card, (count, source_hash, fit_hash) in INPUTS.items():
        original_file=batches/'02'/'fits'/card/'32.json'
        original=json.loads(original_file.read_text())
        placed_file=actual/(card+'-geometry.json')
        placed=json.loads(placed_file.read_text())
        receipt=observed[card]
        assert sha(batches/'01'/(card+'.png'))==source_hash==placed['sourceSha256']==receipt['sourceSha256']
        assert sha(original_file)==fit_hash==placed['approvedGeometrySha256']==receipt['approvedGeometrySha256']
        assert sha(reference/placed_file.name)==sha(placed_file)==receipt['candidateGeometrySha256']
        assert len(placed['controls'])==placed['nativeImages']==original['nativeImages']==count
        assert placed['canvas']==[144,64] and receipt['halfMaskImages']==0
        assert receipt['axesXYImages']>0, 'Stock Z-only no longer distinguishes this test'
        assert receipt['rawBounds']==receipt['quantizedBounds']=={'exceeding':0,'maxOvershootPx':0}
        assert not receipt['outsideRows']
        controls=iter(placed['controls'])
        fallbacks=[]
        for i,s in enumerate(original['controls']):
            if s['type']!='polygon':
                assert next(controls)==s, 'Retained shape or its paint order changed'
                continue
            assert s.get('opacity',255)==255, 'Exact experiment assumes opaque fallback facets'
            fallbacks.append(i)
            for _ in range(2):
                repl=next(controls)
                assert repl['type']=='nativeTriangle' and repl['cost']==1
                assert repl['colour']==s['colour'] and repl.get('opacity',255)==255
                assert {'pivot','scale','mask','fill'}.isdisjoint(repl), 'Non-default transform field unexpectedly required'
        assert next(controls,None) is None
        assert fallbacks==[r['index'] for r in receipt['replaced']]
        assert all(r['fullyProjectedTriangles']==2 and r['vectorXorArea']<1e-7 for r in receipt['replaced'])
        assert receipt['nativeReconstructionVertexMaxPx']<1e-7
        assert receipt['quantizationVertexMaxPx']<=.06
        raw=receipt['rawVsApproved']
        assert raw['alphaIoU']==1 and raw['rgbCompositeMAE']<=.03 and raw['pixelsOver24']==0
        grid=receipt['quantizedVsApproved']
        assert grid['alphaIoU']>=.99 and grid['rgbCompositeMAE']<=.2 and grid['pixelsOver24']<=12
    with Image.open(actual/'comparison-1x.png') as b, Image.open(reference/'comparison-1x.png') as a:
        assert a.mode==b.mode=='RGB' and a.size==b.size==(505,342) and a.tobytes()==b.tobytes()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo',type=Path,required=True)
    p.add_argument('--batches',type=Path,required=True)
    a=p.parse_args()
    here=Path(__file__).resolve().parent
    with tempfile.TemporaryDirectory(prefix='strike-bash-nomask-repro-') as tmp:
        cmd=[sys.executable,'-B',str(here/'probe.py'),'--repo',str(a.repo),'--batches',str(a.batches),'--out',tmp]
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)
        verify_pair(a.batches,here,Path(tmp))
    print('PASS: 2 exact fits, unchanged paint/count, no masks or overflow, raw and XYZ-grid 1x raster gates; reproduction exact')


if __name__=='__main__':
    main()
