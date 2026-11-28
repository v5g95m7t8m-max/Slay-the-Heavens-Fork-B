import copy, hashlib, json, pathlib, sys
source=pathlib.Path(sys.argv[1]); li=source/'game-ui.json'; ti=source/'game-ui-templates.json'
tree=json.loads(li.read_bytes()); templates={t['name']:t for t in json.loads(ti.read_bytes())}
def children(n):return n.get('children',n.get('controls',[]))
def at(n,path):
 for item in path:n=next(ch for ch in children(n) if ch['name']==item)
 return n
def count(n):return 1+sum(map(count,children(n)))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
root=['stage','nodePanel','shopView']
slotList=['card'+str(i) for i in range(1,8)]
chrome='stsReferenceChrome'
link=[(['banner'],'AbyssDeckBrowserBanner')]+[(['frame',f'batch{i}'],f'AbyssDeckBrowserFrame{i}') for i in range(3)]
result=copy.deepcopy(tree)
for slot in slotList:
 sourceBox=at(tree,root+[slot]); targetBox=at(result,root+[slot])
 for relPath,tn in link:
  sourceLayer=at(sourceBox,[chrome]+relPath); targetLayer=at(targetBox,[chrome]+relPath); template=templates[tn]
  assert sourceLayer['children']==template['children'] and sourceLayer['size']==template['size']
  assert template.get('position')==[0,0] and sourceLayer.get('position')==[0,0]
  assert set(template)-{'name','children','position','size','kind'}==set()
  targetLayer['children']=[]
 # Source-leaf parity after stripping ONLY newly introduced synthetic wrapper.
 flat=copy.deepcopy(targetBox)
 for relPath,tn in link:
  layer=at(flat,[chrome]+relPath);layer['children']=copy.deepcopy(children(templates[tn]))
 assert flat==sourceBox
assert count(tree)-count(result)==7*212
data={
 'scope':'read-only offline layout feasibility, no native template instantiation or rendering',
 'layoutSha256':sha(li),'templatesSha256':sha(ti),
 'before':{'staticControls':count(tree)-1,'shop':count(at(tree,root))},
 'coldPrototype':{'staticControls':count(result)-1,'shop':count(at(result,root)),'removed':count(tree)-count(result)},
 'warmPrototype':{'wrapperOverhead':7*len(link),'shop':count(at(tree,root))+7*len(link),'newDefinitions':0},
 'slots':slotList,'nativePaths':[{ 'anchor': '/'.join([chrome]+path), 'reuseTemplate':tn,'instanceNodes':count(templates[tn])}for path,tn in link],
 'literalOldTreeRestoredByFlatten':True,'identicalTopLevelSlotOrder':True,
}
print(json.dumps(data,indent=2))
