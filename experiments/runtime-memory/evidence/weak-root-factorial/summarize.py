from pathlib import Path
from collections import defaultdict
import json
import statistics
p = Path(__file__).parent
samples = []
trace = defaultdict(list)
by_name = {}
MIB = 1024**2
for i, arm in enumerate(('active','neither','alive','both','both','alive','neither','active'),1):
    path = p / f'{i}-{arm}.log'
    if not path.exists(): continue
    txt = path.read_text()
    records = [json.loads(row.split(' ',1)[1]) for row in txt.splitlines() if row.startswith('RUNTIME_BASELINE_JSON ')]
    if not records: continue
    assert len(records)==1 and 'PRODUCTION_HOST_PASS seed=42' in txt
    assert (p/f'{i}-{arm}-negative.log').read_text().strip()=='DESTROYED_NATIVE_NEGATIVE_PASS'
    result = records[0]
    rows = {row['phase']:row for row in result['rows']}
    sample = {'n':i,'arm':arm,'peakRssMiB':round(result['maxRssKiB']/1024,2)}
    for phase in ('pause-resume','exit','reenter'):
        row = rows[phase]
        sample[phase] = {
            'rssMiB':round(row['memory']['rss']/MIB,2),
            'heapMiB':round(row['memory']['heapUsed']/MIB,2),
            'ms':round(row['elapsedMs'],2),
            **{key:row[key] for key in ('requireCalls','nativeCalls','propertyWrites','snapshots')}}
    for name,row in rows.items():
        trace[name].append({key:v for key,v in row.items() if key not in ('elapsedMs','memory')})
    by_name[i] = sample
    samples.append(sample)
pairs = {}
for key, nums in {'engineActiveOnly':[(2,1),(7,8)],'bothVsAliveOnly':[(3,4),(6,5)],'bothVsNeither':[(2,4),(7,5)]}.items():
    data=[]
    for before,after in nums:
        if before not in by_name or after not in by_name: continue
        a,b=by_name[before],by_name[after]
        delta=lambda x,y: round(y-x,2)
        data.append({'before':before,'after':after,'peakRssMiB':delta(a['peakRssMiB'],b['peakRssMiB']),
                     'preExitHeapMiB':delta(a['pause-resume']['heapMiB'],b['pause-resume']['heapMiB']),
                     'exitHeapMiB':delta(a['exit']['heapMiB'],b['exit']['heapMiB']),
                     'reenterHeapMiB':delta(a['reenter']['heapMiB'],b['reenter']['heapMiB']),
                     'reenterMinusPreExitHeapMiB':delta(a['reenter']['heapMiB']-a['pause-resume']['heapMiB'],b['reenter']['heapMiB']-b['pause-resume']['heapMiB']),
                     'reenterMs':delta(a['reenter']['ms'],b['reenter']['ms'])})
    pairs[key]=data
print(json.dumps({'samples':samples,'deltaAfterMinusBefore':pairs,
                  'phasesWithWorkCounterDifferences':[k for k,v in trace.items() if any(w!=v[0] for w in v[1:])],
                  'limits':'taskset CPU 5, no hard memory cap; no explicit GC; Fengari, not official client'},indent=2))
