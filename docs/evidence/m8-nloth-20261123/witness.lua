package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_choice_events.lua')
local UI=dofile('tests/helpers/event_cards_native_ui.lua')
local Names=require('abyss_relic_names')
local title,intro='恩洛斯','恩洛斯指着你随身的两件遗物，提出交换。'
local ending='恩洛斯转过身去，交易结束了。'
local function state(run)
  return {relics=H.C.copy(run.relics),misc=H.R.snapshot(run.miscRng),cards=H.R.snapshot(run.cardRng),
    gold=run.gold,hp=run.hp,deck=H.C.copy(run.deck)}
end
local function readable(get, path)
  local part=get('eventView/'..path)
  assert(part.visible and part.text~='',path)
  assert(not part.text:lower():find('nloth',1,true),part.text)
  return part.text
end
local function desc(get,n)
  -- The compact official layout merges label+description into one text control.
  local path='option'..n
  local description=get('eventView/'..path..'/description')
  local text=readable(get,path..'/title')
  if description.visible then text=text..' '..readable(get,path..'/description') end
  return text
end
for index, label in ipairs({'first','second','repeat','leave'}) do
  local repeatGift=index==3
  local r,m=H.fixture('nloth',function(s)
    assert(H.Run.obtainRelic(s,'anchor'))
    assert(H.Run.obtainRelic(s,'vajra'))
    if repeatGift then assert(H.Run.obtainRelic(s,"Nloth's Gift")) end
  end)
  local ui,get,shown,tap=UI.setup(r,m)
  local e=r.nodeFlow.event
  assert(e.id=='nloth' and e.stage=='intro')
  H.eq(readable(get,'name'),title)
  H.eq(readable(get,'body'),intro)
  local before=state(r)
  for slot,id in ipairs(e.relicChoices) do
    local copy=desc(get,slot)
    assert(copy:find(Names.get(r.data,id),1,true),copy)
    local wanted=repeatGift and ('已经持有礼物：获得'..Names.get(r.data,'circlet')..'，不失去所示遗物。') or '交出所示遗物，获得恩洛斯的礼物。'
    assert(copy:find(wanted,1,true),copy)
  end
  assert(desc(get,3):find('拒绝交易。',1,true))
  local slot=index==1 and 1 or index==4 and 3 or 2
  local selected=e.relicChoices[slot]
  assert(tap('eventView/option'..slot,101+index))
  e=r.nodeFlow.event
  assert(e.stage=='result' and shown('eventView'))
  local expected=H.C.copy(before)
  if index<=2 then
    H.eq(e.removedRelicId,selected);H.eq(e.obtainedRelicId,'nloths_gift')
    for i,id in ipairs(expected.relics) do if id==selected then table.remove(expected.relics,i);break end end
    expected.relics[#expected.relics+1]='nloths_gift'
  elseif repeatGift then
    assert(e.removedRelicId==nil);H.eq(e.obtainedRelicId,'circlet')
    expected.relics[#expected.relics+1]='circlet'
  else
    assert(e.removedRelicId==nil and e.obtainedRelicId==nil)
  end
  H.same(state(r),expected,label..' settlement')
  local actual=readable(get,'body')
  if index<=3 then
    local name=Names.get(r.data,e.obtainedRelicId)
    H.eq(name,repeatGift and '头环' or '恩洛斯的礼物')
    H.eq(actual,ending..'\n获得遗物：'..name..'。')
  else H.eq(actual,ending) end
  assert(desc(get,1):find('返回路线。',1,true))
  assert(tap('eventView/option1',201+index))
  H.eq(r.phase,'map')
  H.same(state(r),expected,label..' returned')
  print('TASK_4_18 '..label..' PASS choice='..slot..' inventory='..table.concat(before.relics,',')..' > '..table.concat(expected.relics,',')..' result='..actual:gsub('\n',' / ')..' RNG unchanged')
end
print('TASK_4_18_NLOTH_NATIVE_WITNESS 4/4')
