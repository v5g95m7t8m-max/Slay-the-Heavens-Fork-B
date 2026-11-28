import hashlib
import json
import math
import os
import pathlib
import platform
import re
import statistics
import subprocess
import tempfile

D=pathlib.Path('experiments/runtime-perf-ui')
P=D/'hand-text-fit.patch'
F=D/'hand-text-probe.lua'
src=pathlib.Path('src/lua/abyss_battle_card_view.lua')
tmp=tempfile.TemporaryDirectory(prefix='sth-ui-perf-')
B=pathlib.Path(tmp.name)/'hand-text-fit-candidate.lua'
source=subprocess.check_output(['git','show',f'HEAD:{src}'])
assert src.read_bytes()==source,'use the exact clean baseline source; do not preapply the patch'
subprocess.run(['patch','--silent','--output',str(B),str(src),str(P)],check=True)
assert src.read_bytes()==source,'patch generation modified the baseline'
cpu=int(os.getenv('STH_UI_CPU','7'))
assert cpu in os.sched_getaffinity(0),'set STH_UI_CPU to one CPU allowed by this Linux process'
def digest(path):return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
def read(path):
    p=pathlib.Path(path)
    return p.read_text().strip() if p.is_file() else None
def run(arm,mode):
    env = os.environ.copy()
    env.pop('UI_PROBE_CANDIDATE',None)
    if arm=='B':env['UI_PROBE_CANDIDATE']=str(B)
    r=subprocess.run(['taskset','-c',str(cpu),'luatex','--luaonly',str(F),mode],env=env,text=True,capture_output=True,check=True,timeout=25)
    assert not r.stderr,r.stderr
    if mode=='negative':
        assert 'UI_NEGATIVE_PASS' in r.stdout
        return next(line for line in r.stdout.splitlines() if line.startswith('UI_NEGATIVE_PASS'))
    rows=[]
    for m in re.finditer(r'^UI_SAMPLE (\S+) (\S+) (\S+) (\d+) (\d+) (\d+) (\d+) (\S+)',r.stdout,re.M):
        stage,cpu,wall,native,writes,fits,renders,heap=m.groups()
        rows.append(dict(stage=stage,cpuMs=float(cpu),wallMs=float(wall),nativeShimCalls=int(native),shimWrites=int(writes),fullFits=int(fits),renders=int(renders),heapKiB=float(heap)))
    expect=['steady']*120+['choose','target-down','commit','settle']*3
    assert [row['stage'] for row in rows]==expect
    hwm=int(re.search(r'^UI_PROCESS (\d+) ',r.stdout,re.M)[1])
    actualSig=re.search(r'^UI_SIGNATURE (.+)$',r.stdout,re.M)[1]
    controlCount=int(actualSig.split('|',1)[0])
    return dict(rows=rows,peakProcessRssKiB=hwm,rootControlCount=controlCount,displayAndRuleSha256=hashlib.sha256(actualSig.encode()).hexdigest())
def q(a,p):return sorted(a)[math.ceil(p*len(a))-1]
def stats(a):return {'n':len(a),'p50':statistics.median(a),'p95':q(a,.95),'max':max(a)}
res=[]
for i in range(8):
    arms=('A','B') if i%2==0 else ('B','A')
    pair={arm:run(arm,'timing') for arm in arms}
    assert pair['A']['displayAndRuleSha256']==pair['B']['displayAndRuleSha256']
    res.append(dict(order=''.join(arms),arms=pair))
counts={arm:run(arm,'counts') for arm in 'AB'}
assert len({p['arms'][arm]['displayAndRuleSha256'] for p in res for arm in 'AB'} | {a['displayAndRuleSha256'] for a in counts.values()})==1
assert [{k:r[k] for k in ('stage','nativeShimCalls','shimWrites','renders')} for r in counts['A']['rows']]==[{k:r[k] for k in ('stage','nativeShimCalls','shimWrites','renders')} for r in counts['B']['rows']]
summary={}
for stage in ('steady','choose','target-down','commit','settle'):
    def readStage(p,arm):return [r for r in p['arms'][arm]['rows'] if r['stage']==stage]
    s={}
    for arm in 'AB':
        rows=[r for p in res for r in readStage(p,arm)]
        sumCounts={k:sum(r[k] for r in counts[arm]['rows'] if r['stage']==stage) for k in ('nativeShimCalls','shimWrites','fullFits','renders')}
        s[arm]={k:stats([r[k] for r in rows]) for k in ('cpuMs','wallMs','heapKiB')}|{'countsSeparateRun':sumCounts}
    for k in ('cpuMs','wallMs'):
        ds=[statistics.median(r[k] for r in readStage(p,'B'))-statistics.median(r[k] for r in readStage(p,'A')) for p in res]
        s['pairedSessionMedianDelta_'+k]=ds
    summary[stage]=s
probe=dict(
    baselineCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    identity={'src':digest('src/lua/abyss_battle_card_view.lua'),'probe':digest(F),'candidate':digest(B),'patch':digest(P),'generatedUi':digest('build/lua/abyss_ui_layout.lua'),'generatedData':digest('build/lua/abyss_data.lua')},
    environment={'machine':platform.machine(),'kernel':platform.release(),'cpuAffinity':cpu,'cpuQuota':read('/sys/fs/cgroup/cpu.max'),'memoryLimitBytes':read('/sys/fs/cgroup/memory.max'),'lua':subprocess.check_output(['luatex','--version'],text=True).splitlines()[0]},
    scope='LuaTeX offline source Host with official-assets-first generated layout. Not actual SDK+VI, GIL readback, native API, GPU, browser onset, official phone FPS or formal release pressure. Fixed traveler starter, seed 42, legal draw to 10, original small_slimes; direct target Down then Up+Click. Wall uses LuaTeX gettimeofday; no observer in timing, separate one-run metatable counters; staged elapsed excludes geometry lookup/dispatch construction.',
    samples=res,counts=counts,negative={arm:run(arm,'negative') for arm in 'AB'},summary=summary,
    rssKiB={arm:stats([p['arms'][arm]['peakProcessRssKiB'] for p in res]) for arm in 'AB'},
)
pathlib.Path(os.getenv('STH_UI_REPORT','build/hand-text-fit-ab.json')).parent.mkdir(parents=True,exist_ok=True)
pathlib.Path(os.getenv('STH_UI_REPORT','build/hand-text-fit-ab.json')).write_text(json.dumps(probe,indent=2)+'\n')
for stage,s in summary.items():
    print(stage, *[(arm,s[arm]['cpuMs'],s[arm]['wallMs'],s[arm]['countsSeparateRun']) for arm in 'AB'], 'pair CPU',s['pairedSessionMedianDelta_cpuMs'])
print('peak RSS',probe['rssKiB'])
print('signature',res[0]['arms']['A']['rootControlCount'],res[0]['arms']['A']['displayAndRuleSha256'])
