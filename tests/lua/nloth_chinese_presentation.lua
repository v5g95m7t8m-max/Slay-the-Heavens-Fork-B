package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_choice_events.lua')
local UI=dofile('tests/helpers/event_cards_native_ui.lua')
local Names=require('abyss_relic_names')
local r,m=H.fixture('nloth',function(s)assert(H.Run.obtainRelic(s,'anchor'))end)
local ui,get,_,tap=UI.setup(r,m)
local function read(path)local text=get('eventView/'..path).text;print(path..'='..text);return text end
local title,body,option=read('name'),read('body'),read('option1/description')
assert(title=='恩洛斯','[NLOTH_COPY] Chinese event title')
assert(body=='恩洛斯指着你随身的两件遗物，提出交换。','[NLOTH_COPY] Chinese intro')
assert(option=='交出所示遗物，获得恩洛斯的礼物。','[NLOTH_COPY] Chinese gift option')
assert(tap('eventView/option1',1))
local result=read('body')
assert(result=='恩洛斯转过身去，交易结束了。\n获得遗物：恩洛斯的礼物。','[NLOTH_COPY] Chinese result and actual reward')
assert(Names.get(r.data,r.nodeFlow.event.obtainedRelicId)=='恩洛斯的礼物')

local duplicate,duplicateMap=H.fixture('nloth',function(s)
    assert(H.Run.obtainRelic(s,'anchor'))
    assert(H.Run.obtainRelic(s,"Nloth's Gift"))
end)
local _,duplicateGet,_,duplicateTap=UI.setup(duplicate,duplicateMap)
local originalRelics=H.C.copy(duplicate.relics)
local originalRng=H.R.snapshot(duplicate.miscRng)
local originalCardRng=H.R.snapshot(duplicate.cardRng)
local event=duplicate.nodeFlow.event
local offered=assert(event.relicChoices[1])
assert(offered~='circlet','fixture selects an existing relic other than Circlet')
local description='已经持有礼物：获得头环，不失去所示遗物。'
assert(duplicateGet('eventView/option1/description').text==description,
    '[NLOTH_COPY] repeat gift uses the same Circlet name as settlement')
assert(duplicateTap('eventView/option1',2))
event=duplicate.nodeFlow.event
assert(event.removedRelicId==nil and event.obtainedRelicId=='circlet')
assert(Names.get(duplicate.data,event.obtainedRelicId)=='头环')
assert(duplicateGet('eventView/body').text=='恩洛斯转过身去，交易结束了。\n获得遗物：头环。')
originalRelics[#originalRelics+1]='circlet'
H.same(duplicate.relics,originalRelics,'repeat gift preserves offered relic and inventory order')
H.same(H.R.snapshot(duplicate.miscRng),originalRng,'repeat gift preserves misc RNG')
H.same(H.R.snapshot(duplicate.cardRng),originalCardRng,'repeat gift preserves card RNG')
print('LUA_NLOTH_CHINESE_PRESENTATION_PASS')
