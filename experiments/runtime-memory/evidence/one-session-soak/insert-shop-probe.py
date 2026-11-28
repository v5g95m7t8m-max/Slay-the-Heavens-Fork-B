"""Inject only a bounded floor-28 forensic observation into the original replay."""
import argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('driver',type=Path);p.add_argument('out',type=Path);a=p.parse_args()
s=a.driver.read_text()
k="local function press(key)\n action('node:'..key,function()return h.nodeUI:press(key)end)"
src=Path(__file__).with_name('shop-readonly-probe.lua').read_text();assert s.count(k)==1
a.out.write_text(s.replace(k,src+"""local function press(key)
 action('node:'..key,function()
  local ctx=removeProbe('before',key)
  local ok,reason=h.nodeUI:press(key)
  if ctx then
   print('SHOP_PROBE original_press '..tostring(ok)..' '..tostring(reason))
   removeProbe('rejected',key)
   if not ok then
    for i=1,60 do
     h.nodeUI:update(1/60)
     if i==1 or i==5 or i==10 or i==60 then removeProbe('wait-'..i,key)end
    end
   end
  end
  return ok,reason
 end)"""))
