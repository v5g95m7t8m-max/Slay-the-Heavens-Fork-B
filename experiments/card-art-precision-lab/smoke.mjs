import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {bridge} from '../art-tech-lab/rpc.mjs';

const dir=resolve(process.argv[2]??'build/precision-projected');
const b=bridge();
const unpack=result=>result.structuredContent??JSON.parse(result.content.find(c=>c.type==='text').text);
const save=(name,data)=>writeFileSync(join(dir,name+'.json'),JSON.stringify(data,null,2)+'\n');
try {
  await b.request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'precision-lab',version:'1'}});
  const opened=unpack(await b.call('qxqy_project_open',{path:relative(process.cwd(),join(dir,'precision-lab.save.json'))}));
  const {handle}=opened;
  assert(handle);
  const start=performance.now();
  const snapshot=unpack(await b.call('qxqy_studio_play',{handle,action:'start'}));
  const startMs=performance.now()-start;
  save('startup',snapshot);
  const identity=JSON.parse(readFileSync(join(dir,'adapter-receipt.json')));
  assert(snapshot.running && !snapshot.mountError);
  assert(snapshot.logs.some(row=>row.text==='ABYSS_BUILD '+identity.buildId),'Wrong build started');
  assert(snapshot.logs.some(row=>row.text==='ABYSS_UI ready'),'Production UI did not reach ready');
  const picture=performance.now();
  const shot=await b.call('qxqy_studio_play_screenshot',{handle});
  const softwareScreenshotMs=performance.now()-picture;
  const png=shot.content.find(x=>x.type==='image');
  assert(png,'Simulator returned no image');
  writeFileSync(join(dir,'startup.png'),Buffer.from(png.data,'base64'));
  const summary={startMs,softwareScreenshotMs,scope:'Simulator RPC and software screenshot',mode:0};
  save('screenshot-receipt',shot.content.filter(x=>x.type!=='image'));
  save('smoke',summary);
  console.log(JSON.stringify(summary));
} finally {
  b.close();
}
