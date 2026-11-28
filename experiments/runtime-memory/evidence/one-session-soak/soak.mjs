import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
const [root0,out0,mode='host',seed0='2']=process.argv.slice(2),root=resolve(root0),out=resolve(out0),seed=Number(seed0);
if(!['host','host-count-chest','host-settled','pure','pure-ledger'].includes(mode)||!Number.isInteger(seed)||seed<0||seed>=2**31)throw Error('usage soak.mjs <repo> <unique output dir> <host|host-count-chest|host-settled|pure|pure-ledger> <seed>');
const head=spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
if(head!=='32a15219aecd145c59cb1b2fcf477e5556766e5d')throw Error('unexpected develop baseline '+head);
mkdirSync(out);
process.chdir(root);
const req=createRequire(join(root,'package.json'));
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=req('fengari');const vm=lauxlib.luaL_newstate();lualib.luaL_openlibs(vm); // One VM, no explicit GC.
const sha=b=>createHash('sha256').update(b).digest('hex');
const gen=join(out,'generated');mkdirSync(gen);
const mod=p=>import(pathToFileURL(join(root,'scripts',p)));
const {buildLuaData,luaString,toLua}=await mod('build-lua-data.mjs');
buildLuaData('data',join(gen,'abyss_data.lua'));
if(mode.startsWith('host')){const {buildUI}=await mod('build-ui.mjs');buildUI(gen,undefined,{officialAssets:true,nativePageLifecycle:true});}
const files=readdirSync(gen).filter(n=>n.endsWith('.lua')).sort();
const driverPath=mode.startsWith('host')?'scripts/official-assets-campaign.lua':'scripts/m3-normal-campaign.lua';
let driver=readFileSync(driverPath,'utf8');
const originalSHA=sha(driver);
function exact(a,b){if(driver.split(a).length!==2)throw Error('probe anchor changed: '+a);driver=driver.replace(a,b);}
if(mode.startsWith('host')){
 exact('local function checkpoint(label)\n','local function checkpoint(label)\n SOAK_MONITOR(label,run.act,run.floor,actions,run.phase)\n');
 exact("capture('restart-neow')",(mode==='host-settled'?"run,map=nil,nil -- previous owner verified above, no strong diagnostic references at sample\n":"")+"SOAK_MONITOR('restart-neow',h.run.act,h.run.floor,actions,h.run.phase)\ncapture('restart-neow')");
 if(mode==='host-count-chest'||mode==='host-settled'){
  exact(" local ok,why=fn();assert(ok~=false,label..': '..tostring(why));drain()",
    ` local previousFloor=run.floor
 local ok,why=fn();assert(ok~=false,label..': '..tostring(why));drain()
 if run.floor~=previousFloor and not label:match('^enter:')then
  assert(label=='battle:continue' and run.floor==previousFloor+1
   and run.nodeFlow and run.nodeFlow.type=='treasure' and run.nodeFlow.roomKind=='boss_treasure',
   'unexpected automatic room entry: '..label)
  rooms=rooms+1
  assert(run.floor==rooms,'automatic boss treasure must be next recorded floor')
  checkpoint('auto-boss-treasure')
  print('CAMPAIGN_ROOM '..rooms..' floor='..run.floor..' type=auto-boss-treasure hp='..run.hp)
 end`);
 }
 if(mode==='host-settled'){
  const anchor="local function press(key)\n action('node:'..key,function()return h.nodeUI:press(key)end)";
  exact(anchor,`local function press(key)
 if key:match('^shopView/') and h.nodeUI.shopOpen then
  local n=h.nodeUI;local ctx
  for i=1,40 do local name,value=debug.getupvalue(n.press,i)
   if name=='ctx' then ctx=value;break end;if name==nil then break end
  end
  assert(ctx and ctx.shopGoodsVisible,'shop admission instrumentation drift')
  local frames=0
  while not ctx.shopGoodsVisible() and frames<60 do
   h.nodeUI:update(1/60);frames=frames+1
  end
  assert(ctx.shopGoodsVisible(),'settled shop goods were never admitted')
  if frames>0 then print('SOAK_SHOP_ADMISSION '..frames..' frames floor='..run.floor..' action='..key)end
 end
 action('node:'..key,function()return h.nodeUI:press(key)end)`);
 exact("elseif plan.method=='leaveShop'then press('back')", `elseif plan.method=='leaveShop'then
   if h.nodeUI.shopOpen then
    local before=run.nodeFlow
    press('back') -- genuine close of goods, not a gameplay action
    assert(run.nodeFlow==before and not before.complete and not h.nodeUI.shopOpen,'close changed shop transaction')
    local frames=0;local back=h.nodeUI.actions.back
    while (not back or not back.enabled) and frames<240 do
     h.nodeUI:update(1/60);frames=frames+1;back=h.nodeUI.actions.back
    end
    assert(back and back.enabled,'closed shop did not settle for leave')
    print('SOAK_SHOP_EXIT_ADMISSION '..frames..' frames floor='..run.floor)
   end
   press('back') -- existing policy exact single domain leave
  `);
 }
}else{
 exact('local coverage,done={},{}','local coverage,done={},{};SOAK_MONITOR("start",run.act,run.floor,0,run.phase);local sampleCount=0');
 exact("if label=='enter'then print(", "sampleCount=sampleCount+1\n  if label=='enter' or label=='advance_act' then SOAK_MONITOR(label,run.act,run.floor,sampleCount,run.phase) end\n  if label=='enter'then print(");
 exact('report.final=snap(run,map)','SOAK_MONITOR("end",run.act,run.floor,sampleCount,run.phase)\n report.final=snap(run,map)');
 if(mode==='pure'){
  // Keep all issued public commands/route and compute identical trace data:
  // stream each complete ledger entry rather than retaining all for a final print.
  exact('report.actions[#report.actions+1]={label=label,details=details,ok=ok,reason=reason,before=before,after=snap(run,map)}',
      "print('SOAK_LEDGER '..json({label=label,details=details,ok=ok,reason=reason,before=before,after=snap(run,map)}))");
  exact('actions=#report.actions,ending','actions=sampleCount,ending');
 }
}
writeFileSync(join(out,'driver.lua'),driver);
writeFileSync(join(out,'identity.json'),JSON.stringify({seed,mode,head,driverPath,originalSHA,diagnosticSHA:sha(driver),node:process.version,fengari:req('fengari/package.json').version,generatedHashes:Object.fromEntries(files.map(n=>[n,sha(readFileSync(join(gen,n)))])),forceGC:false,physicalDevice:false,mockSDK:mode.startsWith('host')},null,2)+'\n');
let marks=0; const start=performance.now();
lua.lua_pushjsfunction(vm,L=>{
 const str=i=>to_jsstring(lua.lua_tostring(L,i)); const int=i=>lua.lua_tointeger(L,i);
 const memory=process.memoryUsage();
 process.stdout.write('SOAK_MEMORY '+JSON.stringify({mark:++marks,label:str(1),act:int(2),floor:int(3),actions:int(4),phase:str(5),wallMs:performance.now()-start,memory,peakRssKiB:process.resourceUsage().maxRSS})+'\n');
 return 0;
});
lua.lua_setglobal(vm,to_luastring('SOAK_MONITOR'));
const prelude=`local generated=${luaString(gen)}\npackage.path=generated..'/?.lua;src/lua/?.lua'\nfor _,n in ipairs(${toLua(files.map(n=>n.slice(0,-4)))})do package.preload[n]=assert(loadfile(generated..'/'..n..'.lua'))end\nOFFICIAL_CAMPAIGN_SEED=${seed}; OFFICIAL_CAMPAIGN_CAPTURE=false; M3_SEED=${seed}\ndofile(${luaString(join(out,'driver.lua'))})`;
if(lauxlib.luaL_dostring(vm,to_luastring(prelude))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(vm,-1)));
