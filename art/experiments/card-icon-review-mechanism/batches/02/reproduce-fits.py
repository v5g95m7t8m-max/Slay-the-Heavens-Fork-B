from pathlib import Path
import argparse, hashlib,json,importlib.util,runpy
import numpy as np,cv2,shapely,vtracer
from shapely.geometry import Polygon,GeometryCollection,box
from shapely import affinity
from PIL import Image,ImageDraw,ImageOps,ImageColor
parser=argparse.ArgumentParser(description="Recreate the two exact offline fit ladders.")
parser.add_argument("--repo",type=Path,required=True,help="Checkout of FurinyaWorks/Slay-the-Heavens at 013bdffb7d4767075d7ebcf0be9eacd275bfbe89")
parser.add_argument("--out",type=Path,required=True,help="Output directory outside the tracked evidence")
args=parser.parse_args()
P=args.out.resolve()
R=args.repo.resolve()
SRC=Path(__file__).resolve().parent.parent/'01'
cv2.setNumThreads(1)
def mod(path,name):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
place=mod(R/'scripts/art/native-triangle-placement.py','plate').place
fitter=mod(R/'scripts/art/segment-lowpoly.py','native').regions
polys=runpy.run_path(str(R/'experiments/menu-red-fit/stack-fit.py'))['polygons']
rects=runpy.run_path(str(R/'scripts/art/build-performance-pack.py'))['rectangles']
W,H=144,64
tiers=[16,24,32,40,48,64]
case={c:(c,'#551C24') for c in ('strike','bash')}
def poly_parts(g):
 if g.geom_type=='Polygon':
  if g.area>=.65:yield g
 elif hasattr(g,'geoms'):
  for x in g.geoms:yield from poly_parts(x)
def masks(a):
 cs,hi=cv2.findContours((a>=118).astype('uint8'),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 result=[]
 for i,c in enumerate(cs):
  if len(c)<3 or hi[0][i][3]!=-1:continue
  inner=[];j=hi[0][i][2]
  while j!=-1:
   if len(cs[j])>=3:inner.append(cs[j][:,0,:]/2)
   j=hi[0][j][0]
  result.extend(poly_parts(shapely.make_valid(Polygon(c[:,0,:]/2,inner))))
 return shapely.union_all(result)
def geometry(parts,eps,soft=False):
 parts=[(g,col) for g,col in parts if not g.is_empty]
 seen=GeometryCollection(); layer=[]
 for poly,col in reversed(parts):
  # Simplification already made upon source region/alpha clipping.
  for p in poly_parts(poly):
   if p.difference(seen).area<.15:continue
   seen=seen.union(p)
   if p.equals(p.envelope):
    x,y,x1,y1=p.bounds;layer.append([dict(type='rect',box=[x,y,x1-x,y1-y],colour=col,cost=1)]);continue
   queue=[]
   for t in shapely.constrained_delaunay_triangles(p).geoms:
    # Fully hidden facets do not affect the composition. Deliberately avoid trimming at a budget cutoff.
    raw=list(t.exterior.coords)[:-1]
    try: pro=place(raw,H)
    except place.Unavailable: pro=[]
    if not pro or any(max(k['w'],k['h'])>240 for _,k in pro):
     queue.append(dict(type='polygon',points=raw,colour=col,cost=2))
    else:
     queue.extend(dict(type='nativeTriangle',points=xy,placement=k,colour=col,cost=1) for xy,k in pro)
   layer.append(queue)
 return [s for grp in reversed(layer) for s in grp]
def render(sh):
 p=Image.new('RGBA',(W*4,H*4));d=ImageDraw.Draw(p)
 for s in sh:
  c=ImageColor.getrgb(s['colour'])+(s.get('opacity',255),)
  if s['type']=='rect':
   x,y,w,h=s['box'];d.rectangle((round(4*x),round(4*y),round(4*(x+w))-1,round(4*(y+h))-1),fill=c)
  else: d.polygon([(4*x,4*y) for x,y in s['points']],fill=c)
 return p.resize((W,H),Image.Resampling.LANCZOS)
def composite(im,bg):return Image.alpha_composite(Image.new('RGBA',im.size,bg),im).convert('RGB')
def fit(id):
 nm,matte=case[id]; src=SRC/(nm+'.png')
 output=P/id;output.mkdir(parents=True,exist_ok=True)
 raw=Image.open(src).convert('RGBA')
 hi=Image.new('RGBA',(2*W,2*H)); sm=ImageOps.contain(raw,hi.size,Image.Resampling.LANCZOS); hi.alpha_composite(sm,((hi.width-sm.width)//2,0))
 srcsmall=hi.resize((W,H),Image.Resampling.LANCZOS);srcsmall.save(output/'source.png');composite(srcsmall,matte).save(output/'source-matte.png')
 hival=np.array(hi); silhouette=masks(hival[:,:,3]); hival[hival[:,:,3]<118,:3]=[255,0,255]
 hi=Image.fromarray(hival[:,:,:3]);hi.save(output/'trace-input.png')
 srcA=np.array(srcsmall.getchannel('A')).astype('float32')/255
 rgbA=[np.asarray(composite(srcsmall,m)).astype('float32') for m in (matte,'#ADB5BE')]
 edge=np.hypot(*np.gradient(srcA)); weight=1+srcA*1.0+np.minimum(edge*3,1)
 best={}
 def choose(shapes,tag):
  n=sum(s['cost'] for s in shapes); 
  if not shapes or n>max(tiers):return
  im=render(shapes);al=np.asarray(im.getchannel('A')).astype('float32')/255
  real=srcA>.5; got=al>.5; iou=float(np.sum(real&got)/np.sum(real|got))
  err=np.mean([float((np.abs(np.asarray(composite(im,bg)).astype('float32')-rr).mean(2)*weight).sum()/weight.sum()) for bg,rr in zip((matte,'#ADB5BE'),rgbA)])
  ne=np.mean(np.abs(al-srcA));score=err+13*ne
  for t in tiers:
   if n<=t and (t not in best or score<best[t][0]):best[t]=(score,n,err,iou,shapes,tag,im)
 # Project rectangle baseline uses actual alpha and bounded per-cell merges.
 for x in range(8,33):
  for y in {max(4,int(x/2.25)+j) for j in [-1,0,1]}:
   rr,_=rects(srcsmall,(x,y),(W,H),True)
   ss=[]
   for r in rr:
    _,cx,cy,w,h,*_=r;ss.append(dict(type='rect',box=[cx+W/2-w/2,H/2-cy-h/2,w,h],colour='#%02X%02X%02X'%tuple(r[-4:-1]),opacity=r[-1],cost=1))
   choose(ss,{'method':'repo-alpha-rectangle','grid':[x,y]})
 for diff in [12,24,44,62,86]:
  for speckle in [5,14,28,45]:
   dest=output/'trace.svg'
   vtracer.convert_image_to_svg_py(str(output/'trace-input.png'),str(dest),colormode='color',hierarchical='stacked',mode='polygon',filter_speckle=speckle,color_precision=5,layer_difference=diff,corner_threshold=57,length_threshold=4,max_iterations=10,path_precision=2)
   base=polys(dest)
   loc=[]
   for poly,col in base:
    rr,gg,bb=ImageColor.getrgb(col)
    if rr>145 and bb>145 and gg<85 and abs(rr-bb)<85:continue
    loc.append((affinity.scale(poly,.5,.5,origin=(0,0)),col))
   for eps in (.68,1.05,1.6,2.25,3.1,4.25,5.5):
    eligible=silhouette.simplify(max(.45,eps*.68),preserve_topology=True)
    parts=[(po.simplify(eps,preserve_topology=True).intersection(eligible),co) for po,co in loc]
    shapes=geometry(parts,eps)
    choose(shapes,{'method':'alpha-clip-native-stacked','diff':diff,'speckle':speckle,'epsilon':eps})
 d={}
 for tier,(score,n,err,iou,shapes,tag,im) in best.items():
  im.save(output/f'{tier}-alpha.png'); composite(im,matte).save(output/f'{tier}.png')
  rec=dict(id=id,canvas=[W,H],nativeImages=n,sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),plan=tag,score=round(score,3),error=round(err,3),silhouetteIoU=round(iou,4),bgCompositeOnly=matte)
  (output/f'{tier}.json').write_text(json.dumps(dict(**rec,controls=shapes),separators=(',',':'))+'\n');d[tier]=rec
 (output/'results.json').write_text(json.dumps(d,indent=2)+'\n');print(id,[(t,r['nativeImages'],r['plan']['method'],r['silhouetteIoU'])for t,r in sorted(d.items())],flush=True)
if __name__=='__main__':
 for card_id in case:
  fit(card_id)
