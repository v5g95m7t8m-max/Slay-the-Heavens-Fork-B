from pathlib import Path
from collections import defaultdict
from statistics import median
import hashlib,json,math,subprocess
d=Path('build/perf-tx')
armNames=('base','direct')
def metrics(values):
 s=sorted(values)
 return None if not s else {'n':len(s),'p50':round(median(s),3),'p95':round(s[math.ceil(.95*len(s))-1],3),'max':round(max(s),3)}
def read(path):
 ls=path.read_text().splitlines(); assert ls.count('TX_HOST_PASS')==1,path
 result=[l.split('\t')[1:] for l in ls if l.startswith('TX_RESULT\t')]; assert len(result)==1
 rows=[json.loads(l.removeprefix('RUNTIME_BASELINE_JSON ')) for l in ls if l.startswith('RUNTIME_BASELINE_JSON ')]; assert len(rows)==1
 return result[0],rows[0]
def git(*args): return subprocess.check_output(['git',*args],text=True).strip()
raw={}
reports={}
phase_by_arm=defaultdict(list)
for trial in range(1,4):
 for arm in armNames:
  outcome,row=read(d/f'host-{trial}-{arm}.log')
  peak=row['maxRssKiB']
  timeline=[(l,i,t) for l,i,t in row['timeline']]
  phases={'targetCommitClick':[t for name,i,t in timeline if name=='click' and i in (3,5,7)],
          'targetCommitUp':[t for name,i,t in timeline if name=='up' and i in (3,5,7)],
          'pickCardClick':[t for name,i,t in timeline if name=='click' and i in (2,4,6)],
          'steadyUpdate':[t for name,i,t in timeline if name=='steady'],
          'feedbackUpdate':[t for name,i,t in timeline if name=='feedback-tick']}
  assert all(len(phases[key])==3 for key in ('targetCommitClick','targetCommitUp','pickCardClick'))
  assert len(phases['steadyUpdate'])==120
  raw[f'{trial}-{arm}']={'result':outcome,'maxRssKiB':peak,'samplesMs':phases}
  for k,values in phases.items():
   phase_by_arm[(arm,k)].extend(values)
  phase_by_arm[(arm,'maxRssKiB')].append(peak)
outcomes={tuple(v['result']) for v in raw.values()};assert len(outcomes)==1,outcomes
for arm in armNames:
 reports[arm]={k:metrics(v) for (lab,k),v in phase_by_arm.items() if lab==arm}
observer_outcome,ob=read(d/'host-observer-base.log')
assert tuple(observer_outcome) in outcomes
s=[]
for touch in (3,5,7):
 group=defaultdict(list)
 for n,i,t in ob['timeline']:
  if i==touch: group[n].append(t)
 s.append({k:list(map(lambda n:round(n,3),v)) for k,v in group.items()})
micro={}
for f in (d/'microbench.log',d/'micro-flat.log'):
 arms=defaultdict(list)
 for line in f.read_text().splitlines():
  xs=line.split()
  if xs and xs[0]=='trial': arms[xs[2]].append(float(xs[4]))
 assert all(len(v)==36 for v in arms.values())
 micro[f.name]={n:metrics(v) for n,v in arms.items()}
report={
 'baseline':git('rev-parse','HEAD'),'baselineTree':git('rev-parse','HEAD^{tree}'),
 'environment':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'runtime':'Fengari with current generated official assets Host; not SDK, frame renderer, GPU or official device','cpuPin':6,'nodeHeapMiB':768,'ramCap':'none applied','cpuQuota':'none applied','order':['A/B','B/A','A/B'],'samples':'3 fresh processes/arm'},
 'scenario':{'seed':10,'encounter':'2 Louse','permanentDeckCards':75,'startHand':10,'preStepWarmUp':30,'steadyUpdatesPerProcess':120,'playsPerProcess':3,'forcedDurabilityOfFirstEnemyHp':300,'resultFields':['hand','energy','enemy1Hp','enemy2Hp','eventsAfterFeedback','turn']},
 'aggregate':reports,'microbench':micro,'observer':{'byCommit':s,'phaseCounters':next(r for r in ob['rows'] if r['phase']=='consecutive-play')},'raw':raw,
 'sourceVariants':{n:hashlib.sha256((d/(n+'.lua')).read_bytes()).hexdigest() for n in ('base','direct','queue','flat')},
 'releaseOrDeviceEvidence':False}
(d/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ('aggregate','microbench')},indent=2))
for i,r in enumerate(s): print(i+1,{k:r.get(k) for k in ('click','capture','run-play','combat-play','battle-render','host-refresh')})
print('snapshot count in play phase',report['observer']['phaseCounters']['snapshots'])
