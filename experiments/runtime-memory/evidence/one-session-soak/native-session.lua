-- Differential interpreter: exactly the pure mode generated files and driver,
-- in one system Lua VM without calling collectgarbage('collect') or stopping GC.
local generated,driver,seed=assert(arg[1]),assert(arg[2]),tonumber(arg[3])
assert(seed and seed%1==0 and seed>=0)
package.path=generated..'/?.lua;src/lua/?.lua;'..package.path
local modules={'abyss_data','abyss_original_v4_data'}
if arg[4] then modules={};for i=4,#arg do modules[#modules+1]=arg[i]end end
for _,name in ipairs(modules)do
 package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))
end
M3_SEED=seed; OFFICIAL_CAMPAIGN_SEED=seed; OFFICIAL_CAMPAIGN_CAPTURE=false
local begin=os.clock()
function SOAK_MONITOR(label,act,floor,actions,phase)
 local f=assert(io.open('/proc/self/status'));local status=f:read('*a');f:close()
 local rss=status:match('\nVmRSS:%s+(%d+)');local hwm=status:match('\nVmHWM:%s+(%d+)')
 print(string.format('SOAK_NATIVE_MEMORY {"label":"%s","act":%d,"floor":%d,"actions":%d,"phase":"%s","cpuMs":%.2f,"luaAllocatedKB":%.3f,"rssKiB":%s,"peakRssKiB":%s}',label,act,floor,actions,phase,(os.clock()-begin)*1000,collectgarbage('count'),rss or 'null',hwm or 'null'))
end
print('SOAK_NATIVE_VM '.._VERSION)
dofile(driver)
