import json,hashlib,gzip,subprocess
from pathlib import Path
base='af77fb2461c548f0faf104761d107397f75dca08'
files=['.github/workflows/quality.yml','tests/ci-summary-runners.test.mjs','tests/helpers/release-capacity-preflight-source.mjs','tests/helpers/release-preflight-union-source.mjs','tests/quick-feedback.test.mjs','tests/release-selection-map-source.test.mjs']
p={'baseCommit':base,'normalization':'LF','files':{}}
for f in files:
 b=subprocess.check_output(['git','show',base+':'+f]);s=b.decode();assert '\r' not in s
 p['files'][f]={'currentSha256':hashlib.sha256(Path(f).read_bytes()).hexdigest(),'before':{'source':s,'sha256':hashlib.sha256(b).hexdigest(),'gitBlob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()}}
b=gzip.compress(json.dumps(p,ensure_ascii=False,separators=(',',':')).encode(),mtime=0)
Path('tests/helpers/hosted-runner-fallback-source.json.gz').write_bytes(b)
f=Path('tests/helpers/hosted-runner-fallback-source.mjs');s=f.read_text();import re;s=re.sub("sha='(?:PACKET_SHA|[a-f0-9]{64})'","sha='"+hashlib.sha256(b).hexdigest()+"'",s);f.write_text(s)
print(len(b),hashlib.sha256(b).hexdigest())
