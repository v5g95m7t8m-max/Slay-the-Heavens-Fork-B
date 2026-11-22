"""Calculate 1-based visible-vertex landmarks from ACTUAL setter readback."""
import json
from pathlib import Path
import sys
import numpy as np

D=Path(sys.argv[1])
def locate(data, z_only):
    img,x,y,w,h,ax,ay,az=data
    assert img==100003
    rx,ry,rz=np.radians([0,0,az] if z_only else [ax,ay,az])
    sx,cx=np.sin(rx),np.cos(rx); sy,cy=np.sin(ry),np.cos(ry); sz,cz=np.sin(rz),np.cos(rz)
    ZX=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    XY=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
    YX=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
    q=np.array([[-w/2,-h/2],[w/2,-h/2],[0,h/2]])@(YX@XY@ZX)[:2,:2].T+[x+72,y+32]
    q[:,1]=64-q[:,1]
    return q

results={}
for mode in ['exact-fork',*sys.argv[2:]]:
    results[mode]={}
    ls=(D/(mode+'.stdout')).read_text().splitlines()
    assert ls[-1].startswith('SMOKE_PASS\t')
    for id,row,vertex,coord,ex,ez in [
        ('strike',12,0,1,45.685790628887624,68.69646490035278),
        ('bash',13,1,0,82.9447030527382,59.60137494986074),
    ]:
        data=[list(map(float, l.split()[3:])) for l in ls if l.startswith(f'ROW {id} {row} ')]
        assert data and len({tuple(v) for v in data})==1
        v,z=[float(locate(data[0],mode)[vertex,coord]) for mode in [False,True]]
        tol=.08 if mode=='packed-archive' else 1e-8
        assert abs(v-ex)<tol and abs(z-ez)<tol
        results[mode][id]=dict(row=row, visibleTriangleVertex=vertex+1, coordinate='xy'[coord],
            xyz=v, zOnlyCounterfactual=z)
(D/'landmarks.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
