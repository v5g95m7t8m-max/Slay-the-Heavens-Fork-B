"""Read evidence from uninterrupted separate Host and rules-only sessions."""
import hashlib, json, sys, re
from pathlib import Path
root=Path(sys.argv[1])
files={
'host-original':('host-2.log','host-2.err','SOAK_MEMORY ','host-2/identity.json'),
'host-count-boss-treasure':('host-count-2.log','host-count-2.err','SOAK_MEMORY ','host-count-2/identity.json'),
'host-final-fengari':('host-final-2.log','host-final-2.err','SOAK_MEMORY ','host-final-2/identity.json'),
'host-final-lua53':('native-host-final-2.log','native-host-final-2.err','SOAK_NATIVE_MEMORY ','host-final-2/identity.json'),
'host-lua53':('native-host-2.log','native-host-2.err','SOAK_NATIVE_MEMORY ','host-count-2/identity.json'),
'pure-fengari':('pure-2.raw.log','pure-2.err','SOAK_MEMORY ','pure-2/identity.json'),
'pure-lua53':('native-pure-strict-2.raw.log','native-pure-strict-2.err','SOAK_NATIVE_MEMORY ','pure-2/identity.json'),
}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def lines(p):return p.read_text().splitlines()
all_metrics={};ledgers={};host_actions={}
for mode,(f,e,mem,i) in files.items():
    errors=(root/e).read_text()
    xs=lines(root/f)
    data=[json.loads(x[len(mem):]) for x in xs if x.startswith(mem)]
    result=[x for x in xs if x.startswith(('M3_SUMMARY ','CAMPAIGN_RESULT ','OFFICIAL_CAMPAIGN_PASS'))]
    special=[x for x in xs if x.startswith('CAMPAIGN_ROOM ') and 'boss' in x]
    if mode.startswith('pure-'):
        ledgers[mode]=[json.loads(s[len('SOAK_LEDGER '):]) for s in xs if s.startswith('SOAK_LEDGER ')]
    if mode.startswith('host-'):host_actions[mode]=[re.sub(r'(\d)\.0\b',r'\1',x) for x in xs if x.startswith('CAMPAIGN_ACTION ')]
    checkpoints=[json.loads(s[len('CAMPAIGN_CHECKPOINT '):]) for s in xs if s.startswith('CAMPAIGN_CHECKPOINT ')]
    all_metrics[mode]=dict(marks=data,checkpoints=checkpoints,result=result,milestones=special,stderr=errors,
        stdoutHash=sha(root/f),stderrHash=sha(root/e),identity=json.loads((root/i).read_text()))
ret={'runs':all_metrics,'pureSameActionAndStateLedger':ledgers['pure-fengari']==ledgers['pure-lua53'],
    'pureActionCountCompared':[len(ledgers[k]) for k in ('pure-fengari','pure-lua53')]}
ret['hostCommonCheckpointsSemanticEqual']=all_metrics['host-count-boss-treasure']['checkpoints'][:min(map(lambda k:len(all_metrics[k]['checkpoints']),('host-count-boss-treasure','host-lua53')))]==all_metrics['host-lua53']['checkpoints'][:min(map(lambda k:len(all_metrics[k]['checkpoints']),('host-count-boss-treasure','host-lua53')))]
ret['finalHostBothPassed']=all('OFFICIAL_CAMPAIGN_PASS' in all_metrics[key]['result'] for key in ('host-final-fengari','host-final-lua53'))
a,b=('host-final-fengari','host-final-lua53')
ret['finalHostActionEqual']=host_actions[a]==host_actions[b]
ret['finalHostActionCount']=[len(host_actions[a]),len(host_actions[b])]
ret['finalHostCheckpointsEqual']=all_metrics[a]['checkpoints']==all_metrics[b]['checkpoints']
print(json.dumps(ret,ensure_ascii=False,indent=2))
