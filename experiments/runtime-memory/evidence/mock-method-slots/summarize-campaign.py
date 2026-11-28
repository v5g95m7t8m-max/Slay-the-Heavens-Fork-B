import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
rows = {}
receipts = {}
for arm in ('original', 'inherited'):
    log = (root / (arm + '.log')).read_text().splitlines()
    raw = lambda pfx: [x for x in log if x.startswith(pfx)]
    seq = lambda pfx: [x[len(pfx):] for x in raw(pfx)]
    digest = lambda vals: hashlib.sha256(('\n'.join(vals)+'\n').encode()).hexdigest()
    mem = [json.loads(x) for x in seq('SOAK_MEMORY ')]
    actions = seq('CAMPAIGN_ACTION ')
    checks = seq('CAMPAIGN_CHECKPOINT ')
    rooms = seq('CAMPAIGN_ROOM ')
    result = seq('CAMPAIGN_RESULT ')
    assert log.count('OFFICIAL_CAMPAIGN_PASS') == 1, arm
    assert len(actions) == 1090 and len(checks) == 37 and len(rooms) == 34, arm
    assert len(mem) == 38 and mem[-1]['label'] == 'restart-neow', arm
    assert len(result) == 1 and result[0].startswith('victory floor=34 hp=30.0 actions=1090'), arm
    rows[arm] = dict(
        nActions=len(actions), actionsSha256=digest(raw('CAMPAIGN_ACTION ')), nCheckpoints=len(checks),
        checkpointsSha256=digest(raw('CAMPAIGN_CHECKPOINT ')), nRooms=len(rooms), roomsSha256=digest(raw('CAMPAIGN_ROOM ')),
        result=result[0], resultSha256=digest(raw('CAMPAIGN_RESULT ')), phaseKeys=[(m['label'],m['act'],m['floor'],m['actions']) for m in mem],
        rssPeakMiB=round(max(m['peakRssKiB'] for m in mem)/1024,3),
        heapUsedSamplePeakMiB=round(max(m['memory']['heapUsed'] for m in mem)/1024**2,3),
        startRssMiB=round(mem[0]['memory']['rss']/1024**2,3), restartNeowRssMiB=round(mem[-1]['memory']['rss']/1024**2,3),
        startHeapUsedMiB=round(mem[0]['memory']['heapUsed']/1024**2,3),
        restartNeowHeapUsedMiB=round(mem[-1]['memory']['heapUsed']/1024**2,3),
        runtimeWallMs=round(mem[-1]['wallMs'],2),
    )
    receipts[arm] = json.loads((root / arm / 'identity.json').read_text())
assert receipts['original'] == receipts['inherited'], 'generated data, driver or runtime changed'
for key in ('actionsSha256', 'checkpointsSha256', 'roomsSha256', 'resultSha256','phaseKeys'):
    assert rows['original'][key] == rows['inherited'][key], key
for row in rows.values():
    del row['phaseKeys']
hosted = json.loads(pathlib.Path(__file__).with_name('hosted-reference-inputs.json').read_text())
hosted_fixture_without_node = {k: v for k, v in hosted['fixtureIdentity'].items() if k != 'node'}
local_fixture_without_node = {k: v for k, v in receipts['original'].items() if k != 'node'}
assert hosted_fixture_without_node == local_fixture_without_node, 'hosted fixture bytes or driver drift'
for k in ('actions', 'checkpoints', 'result'):
    assert hosted['sameWorkloadAsPriorUncappedMock'][k]['sha256'] == rows['original'][k+'Sha256'], k
print(json.dumps(dict(sameRawTraces=True,sameHostedFixtureBytesAndTraces=True,hardCapsVerified=False,
                     oldSpaceMiB=768,forceGc=False,receipts=receipts,arms=rows), indent=2))
