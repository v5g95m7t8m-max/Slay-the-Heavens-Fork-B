local monsterControl=dofile('tests/lua/support/monster_control_fixture.lua')
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/lua/support/battle_action_fixture.lua')
local host,ui,panel,emit,tap,drain=H.setup({'strike'},{'red_louse','green_louse'})
local C=H.F.Combat;local s=host.run.combat;local first,second=monsterControl(panel,'enemy1'),monsterControl(panel,'enemy2')
local definition=assert(s.catalog.statuses.curl_up,'Curl power must be described');local amount,other=s.enemies[1].statuses.curl_up,s.enemies[2].statuses.curl_up
local inspect=dofile('tests/lua/support/status_detail_fixture.lua')
local function details(key)
    tap(key,61)
    return inspect(ui,panel)
end
assert(details("enemy1"):find(definition.name..' '..string.format('%.0f',amount),1,true),'first Curl amount visible')
assert(details("enemy2"):find(definition.name..' '..string.format('%.0f',other),1,true),'independent second Curl amount visible')
local function same(a,b)if type(a)~='table'then assert(a==b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local before=C.copy(s);host:refresh();tap('enemy1',2);same(s,before)
local info=panel:GetChild('statusInfo');assert(info.visible,'read-only enemy tap opens real details')
inspect(ui,panel);assert(not info.visible,'close details before the next deliberate card input')
tap('card1',3);tap('enemy1',3);drain()
assert(s.enemies[1].block==amount and s.enemies[1].statuses.curl_up==0,'real controls grant once and remove')
assert(not details("enemy1"):find(definition.name,1,true),'spent passive hidden')
assert(details("enemy2"):find(definition.name..' '..string.format('%.0f',other),1,true),'other passive retained')
assert(first:GetChild('block').text==string.format('%.0f',amount),'granted Block visible')
print('CURL_UP_GENERATED_UI_PASS passive/amount/read-only/real-card/block/removal')
