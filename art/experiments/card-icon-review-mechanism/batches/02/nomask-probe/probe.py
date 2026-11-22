"""Offline pretransform of exactly the two reviewed 32-budget fits."""
import argparse, hashlib, importlib.util, json, math
from pathlib import Path
from itertools import permutations
import numpy as np
from PIL import Image,ImageDraw
from shapely.geometry import Polygon
from shapely.ops import unary_union
W,H=144,64
PIN = '013bdffb7d4767075d7ebcf0be9eacd275bfbe89'
SOLVER_SHA = '213ca42805a67623b58a4cebb5e27f75142374ca84bc1798534a22b157cb0002'
INPUTS = {
    'strike': (32,'bfb9fcc0a71c88a8ac379876df5c023f2f01dc78b7a059214a6ab893293c7072',
                  '38a8db41e56beaa277dd94699d53356dfb7c8d0272f38d37ada5770cd4b13bb8'),
    'bash': (31,  '7ad1f64191c5f22b6de34e3947e1aa2c67ebbb354e14469fe81b3708527dd506',
                  'f05f135f8d1ff1814658066dd75490fecaad9169c7d603ce7bd858930df65554'),
}
def placement(points,solve):
    p=np.asarray(points,float); q=p.copy(); q[:,1]=H-q[:,1]
    matches = [r for i in permutations(range(3)) if (r:=solve(*q[list(i)])) is not None and 0<min(r['w'],r['h'])<=max(r['w'],r['h'])<=240]
    return min(matches,key=lambda k: max(abs(k['rx']),abs(k['ry']))) if matches else None
def split_alt(p):
    p=np.asarray(p,float); i=max(range(3),key=lambda j: np.linalg.norm(p[(j+1)%3]-p[(j+2)%3])); a,b,c=p[i],p[(i+1)%3],p[(i+2)%3]
    v=c-b; foot=b+v*np.dot(a-b,v)/np.dot(v,v)
    return [np.array([a,b,foot]),np.array([a,foot,c])]
def controls(s, parts, solve):
    out=[]
    for p in parts:
        if Polygon(p).area < 1e-8: continue
        place=placement(p,solve)
        if place is None: return None
        row=dict(type='nativeTriangle',points=p.tolist(),placement=place,colour=s['colour'],cost=1)
        if 'opacity' in s:
            row['opacity']=s['opacity']
        out.append(row)
    return out
def row(s):
    col=[int(s['colour'][i:i+2],16) for i in (1,3,5)]+[s.get('opacity',255)]
    if s['type']=='rect':
        x,y,w,h=s['box']
        return [100001,x+w/2-W/2,H/2-y-h/2,w,h,0,0,0,*col]
    k=s['placement']
    return [100003,k['cx']-W/2,k['cy']-H/2,k['w'],k['h'],k['rx'],k['ry'],k['rz'],*col]
def points(s):
    if s['type']!='rect': return np.asarray(s['points'])
    x,y,w,h=s['box']; return np.array([[x,y],[x+w,y],[x+w,y+h],[x,y+h]])
def q(x,s):return math.floor(x*s+.5)/s
def quant(r):
    return [r[0],*(q(x,20) for x in r[1:5]),*(q(((x+180)%360)-180,10) for x in r[5:8]),*r[8:]]
def projected(row):
    # Project only sprite-visible vertices, not the transparent native quad.
    # This is the offline Unity-order model previously used in the XYZ probe.
    id,x,y,w,h,a,b,c,*_=row
    a,b,c=np.radians([a,b,c]);sx,cx=np.sin(a),np.cos(a);sy,cy=np.sin(b),np.cos(b);sz,cz=np.sin(c),np.cos(c)
    rx=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
    ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
    rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])
    ps=[[-w/2,-h/2],[w/2,-h/2],[0,h/2]] if id==100003 else [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]
    out=np.asarray(ps)@(ry@rx@rz)[:2,:2].T+np.asarray([x,y]);out[:,0]+=W/2;out[:,1]=H/2-out[:,1]
    return out
def deviation(a,b):
    return min(np.linalg.norm(a-b[list(i)],axis=1).max() for i in permutations(range(len(a))))
def bounds(parts):
    ext=[max(0,-p[:,0].min(),p[:,0].max()-W,-p[:,1].min(),p[:,1].max()-H) for p in parts]
    return dict(exceeding=sum(bool(x>1e-8) for x in ext),maxOvershootPx=max(ext))
def render(ss, ps=None,N=4):
    im=Image.new('RGBA',(W*N,H*N)); d=ImageDraw.Draw(im)
    for i, s in enumerate(ss):
        colour=tuple(int(s['colour'][i:i+2],16) for i in (1,3,5))+(s.get('opacity',255),)
        if ps is None and s['type']=='rect':
            x,y,w,h=s['box']; d.rectangle((round(N*x),round(N*y),round(N*(x+w))-1,round(N*(y+h))-1),fill=colour);continue
        p=points(s) if ps is None else ps[i]; d.polygon([tuple(c) for c in p*N],fill=colour)
    return im.resize((W,H),Image.Resampling.LANCZOS)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(a,b):
    al=np.asarray(a.getchannel('A')); bl=np.asarray(b.getchannel('A')); am=al>127; bm=bl>127
    rgbs=[Image.alpha_composite(Image.new('RGBA', im.size, '#551C24'),im).convert('RGB') for im in (a,b)]
    delta=np.abs(np.float32(rgbs[0])-np.float32(rgbs[1])).mean(axis=2)
    return dict(alphaIoU=float((am&bm).sum()/(am|bm).sum()),alphaMAE=float(np.abs(al.astype(float)-bl).mean()),
                rgbCompositeMAE=float(delta.mean()),pixelsOver24=int((delta>24).sum()))
def single_fit(id, base, out, solve):
    count, source_hash, geometry_hash=INPUTS[id]
    source=base/'01'/(id+'.png')
    p=base/'02'/'fits'/id/'32.json'
    if sha(source)!=source_hash or sha(p)!=geometry_hash:
        raise ValueError(f'Unreviewed input bytes: {id}')
    j=json.loads(p.read_text()); orig=j['controls']; new=[]; replace=[]
    assert j['sourceSha256']==source_hash and j['nativeImages']==count and j['canvas']==[W,H]
    for i,s in enumerate(orig):
        if s['type']!='polygon': new.append(s);continue
        # The exact two fits need two full controls for each former two-half facet.
        # Call solve directly, not place: place expands edges on the first pass.
        ps=points(s); repl=controls(s,split_alt(ps),solve)
        if not repl or len(repl)!=2:
            raise RuntimeError((id,i,s))
        error=Polygon(ps).symmetric_difference(unary_union([Polygon(points(r)) for r in repl])).area
        assert error<1e-7
        replace.append(dict(index=i,fullyProjectedTriangles=len(repl),vectorXorArea=error))
        new.extend(repl)
    assert len(new)==count
    rawrows=list(map(row,new)); qrows=list(map(quant,rawrows))
    proj=list(map(projected,rawrows)); qproj=list(map(projected,qrows))
    raw_bounds, quantized_bounds=bounds(proj), bounds(qproj)
    assert raw_bounds['exceeding']==quantized_bounds['exceeding']==0, 'Projected sprite aperture overflow'
    origim=render(orig); newim=render(new); qnewim=render(new,qproj)
    rawerr=max(deviation(points(s),a) for s,a in zip(new,proj))
    assert rawerr<1e-7
    assert all(r[3]>0 and r[4]>0 and max(r[3],r[4])<204.8 and all(-102.4<=v<102.4 for v in r[1:3])
               and all(-180<=v<180 for v in r[5:8]) for r in qrows), 'XYZ probe precision row overflow'
    candidate=out/(id+'-geometry.json')
    candidate.write_text(json.dumps(dict(id=id,canvas=[W,H],nativeImages=count,sourceSha256=source_hash,
      approvedGeometrySha256=geometry_hash,
      plan=dict(method='exact-longest-edge-altitude-to-full-atlas-triangles',retainedFit=j['plan']),
      scope='offline placement, not production/live',controls=new),indent=2)+'\n')
    result=dict(sourceSha256=source_hash,approvedGeometrySha256=geometry_hash,candidateGeometrySha256=sha(candidate),
     nativeImages=len(new),halfMaskImages=0,axesXYImages=sum(a[5]!=0 or a[6]!=0 for a in rawrows),
     replaced=replace,rawVsApproved=metrics(origim,newim),quantizedVsApproved=metrics(origim,qnewim),
     nativeReconstructionVertexMaxPx=rawerr,quantizationVertexMaxPx=max(deviation(a,b) for a,b in zip(proj,qproj)),
     rawBounds=raw_bounds,quantizedBounds=quantized_bounds,
     outsideRows=[i for i,p in enumerate(qproj) if bounds([p])['exceeding']])
    return result,[origim,newim,qnewim]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',type=Path,required=True,help=f'Slay-the-Heavens checkout at {PIN} (solver bytes hash-checked)')
    parser.add_argument('--batches',type=Path,required=True,help='Existing card art checkpoint batches directory with 01/ and 02/')
    parser.add_argument('--out',type=Path,required=True,help='New directory for geometry, receipt, and 1x board')
    a=parser.parse_args()
    p=a.repo/'scripts/art/native-triangle-placement.py'
    if sha(p)!=SOLVER_SHA:
        raise ValueError(f'Wrong native-triangle solver bytes; expected {SOLVER_SHA}')
    spec=importlib.util.spec_from_file_location('native',p)
    native=importlib.util.module_from_spec(spec); spec.loader.exec_module(native)
    a.out.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGB',(505,342),'#242833'); draw=ImageDraw.Draw(sheet)
    for j, label in enumerate(['Approved geometry','Full triangles','Full triangles XYZ grid']):
        draw.text((8+j*165,9),label,fill='white')
    receipt={}
    for i,id in enumerate(INPUTS):
        receipt[id],images=single_fit(id,a.batches,a.out,native.solve)
        for j,im in enumerate(images):
            draw.text((8+j*165,27+i*154),id.upper(),fill='white')
            for k,bg in enumerate(['#551C24','#ADB5BE']):
                comp=Image.alpha_composite(Image.new('RGBA',(144,64),bg),im).convert('RGB')
                sheet.paste(comp,(8+j*165,42+i*154+k*66))
    sheet.save(a.out/'comparison-1x.png')
    (a.out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))

if __name__=='__main__':
    main()
