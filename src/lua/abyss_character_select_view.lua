-- Native selection presentation. All numbers and deck entries come from loadouts.
local Theme=require('abyss_theme')
local Select=require('abyss_character_select')
local number=require('abyss_numbers').integer
local Motion=require('abyss_character_entrance')
local M={}
-- The legacy layout lists cards in type order.
local typeOrder={attack=1,skill=2,power=3,status=4,curse=5}
local function sortedDeck(info)
    local cards={}
    for i,card in ipairs(info.deck)do cards[i]=card end
    table.sort(cards,function(a,b)
        local x,y=typeOrder[a.type] or 9,typeOrder[b.type] or 9
        if x~=y then return x<y end
        if a.count~=b.count then return a.count>b.count end
        return a.id<b.id
    end)
    return cards
end
-- The legacy selection summary shares no card faces with the deck browser.
local function renderStarterDeck(details,info)
    local parts={}
    for _,card in ipairs(sortedDeck(info))do parts[#parts+1]=card.name..'×'..number(card.count)end
    details:GetChild('deckTitle').text='初始牌组 · '..number(info.deckSize)..' 张'
    details:GetChild('deckSummary').text=table.concat(parts,'  ')
end
local function paintLegacyDeck(panel,details,info)
    panel:GetChild('deckView'):SetVisible(false)
    if info and details:GetChild('deckSummary') then renderStarterDeck(details,info) end
end
local function selected(box,value)
    box:GetChild('selected'):SetVisible(value)
end
local function paintBust(box,entry,platform)
    if not entry or not platform.imageSource then return end
    local hit=box:GetChild('hit')
    for _,state in ipairs({'normal','hover','pressed','disabled'}) do
        local face=hit:GetChild(state)
        local bust=face and face:GetChild('bust')
        if bust then bust:SetImage(platform.imageSource,entry.id) end
    end
end
local function largeSlot(character,element)
    local slots=Theme.icon.heroSlots
    if character=='traveler' then return slots.large.traveler[element or 'ironclad'], slots.bust.traveler[element or 'ironclad'] end
    return slots.large[character], slots.bust[character]
end
local function paintPortraits(details,state,platform)
    local large=largeSlot(state.character,state.element)
    local portraits=details:GetChild('portraits')
    local key=state.character=='traveler' and ('traveler_'..(state.element or 'ironclad')) or state.character
    for _,id in ipairs(Select.characters)do
        if id=='traveler' then
            for _,element in ipairs(Select.elements)do
                portraits:GetChild('traveler_'..element):SetVisible(key=='traveler_'..element)
            end
        else portraits:GetChild(id):SetVisible(id==key) end
    end
    if platform.imageSource and large then portraits:GetChild(key):SetImage(platform.imageSource,large.id) end
    return large,key,portraits
end
local function paintPortraitNote(details,info,platform,large,key,portraits)
    local note=info.name
    local native=platform.portraits and platform.portraits.status and platform.portraits:status().selection
    if key=='traveler_ironclad' and native then portraits:GetChild(key):SetVisible(false)end
    if (not large or large.status=='placeholder') and not native then note=note..' · 肖像待补' end
    if large and large.playable==false then note=note..' · 非本次正式角色' end
    details:GetChild('portraitNote').text=note
end
local function paintCharacterButtons(panel,state,platform,originalSts,open,hideSelection)
    for i,id in ipairs(Select.characters)do
        local box=panel:GetChild(i==5 and 'traveler' or 'character'..i)
        local allowed=(originalSts or open>1 or id=='traveler') and state:allowsCharacter(id)
        if box.visible~=allowed then box:SetVisible(allowed)end
        selected(box,not hideSelection and state.character==id)
        local _,bust=largeSlot(id,id=='traveler' and (state.element or 'ironclad') or nil)
        if not originalSts or id~='traveler' then paintBust(box,bust,platform)end
    end
end
local function paintThemesAndElements(panel,state,platform,elementsOpen)
    local traveler=state.character=='traveler'
    -- Theme layers are prebuilt per character/element; only visibility changes.
    local theme=traveler and state.element or state.character
    for _,layer in ipairs({'themes'})do
        local group=panel:GetChild(layer)
        for _,id in ipairs(Select.characters)do if id~='traveler' then group:GetChild(id):SetVisible(id==theme)end end
        for _,id in ipairs(Select.elements)do group:GetChild(id):SetVisible(id==theme)end
    end
    panel:GetChild('elements'):SetVisible(traveler and elementsOpen>1)
    for i,id in ipairs(Select.elements)do
        local box=panel:GetChild('elements'):GetChild('element'..i)
        local allowed=state:allowsElement(id)
        if box.visible~=allowed then box:SetVisible(allowed)end
        selected(box,state.element==id)
        paintBust(box,Theme.icon.heroSlots.bust.traveler[id],platform)
    end
end
local function paintInfo(details,info,nativeV25)
    details:GetChild('name').text=info.name
    details:GetChild('stats').text=(nativeV25 and '生命：' or '生命  ')..number(info.maxHp)..(nativeV25 and '/' or ' / ')..number(info.maxHp)
    details:GetChild('gold').text=(nativeV25 and '金币：' or '金币  ')..number(info.gold)
    local relics,texts={},{}
    for _,r in ipairs(info.relics)do relics[#relics+1]=r.name;if r.text and r.text~='' then texts[#texts+1]=r.text end end
    details:GetChild('relic').text=#relics>0 and table.concat(relics,'、') or '无'
    details:GetChild('relicText').text=table.concat(texts,' ')
end
local function paintFigure(details,state,platform,originalSts,info)
    local large,key,portraits=paintPortraits(details,state,platform)
    if originalSts then portraits:SetVisible(false)end
    paintPortraitNote(details,info,platform,large,key,portraits)
    return not originalSts and portraits:GetChild(key) or nil
end
local function countAllowed(ids,allows)
    local count=0
    for _,id in ipairs(ids)do if allows(id)then count=count+1 end end
    return count
end
local function officialPanel(panel)
    return Theme.presentationProfile=='official-assets-first'
        and (panel:GetChild('stsCharacter')~=nil or panel:GetChild('v25Roster')~=nil)
end
function M.prepare(panel,state,platform)
    local roster=panel:GetChild('v25Roster')
    local open=countAllowed(Select.characters,function(id)return state:allowsCharacter(id)end)
    if roster then roster:SetVisible(open==1) end
    paintCharacterButtons(panel,state,platform,panel:GetChild('stsCharacter')~=nil,open,true)
end
function M.motion(panel,platform)
    local nativeV25=officialPanel(panel)
    return Motion.new(panel,platform,function(control,info)paintInfo(control,info,nativeV25)end)
end
local function paintPublished(panel,details,state,platform,motion,info,originalSts,nativeV25)
    local portrait
    if info then
        if not motion then paintInfo(details,info,nativeV25) end
        portrait=paintFigure(details,state,platform,originalSts,info)
    end
    if motion then
        local portraits=platform.portraits
        local native=portraits and portraits.status and portraits:status().selection
        motion:show(info,info and info.id=='ironclad' and native and native.phase=='ready',portrait)
    else panel:GetChild('confirm'):SetVisible(info~=nil) end
    local confirm=panel:GetChild('confirm'):GetChild('hit')
    local enabled=state:canConfirm()
    confirm.interactable,confirm.raycastTarget=enabled,enabled
end
function M.render(panel,state,platform,published,motion)
    local info=state.info
    if published==false then info=nil end
    local originalSts=Theme.presentationProfile=='official-assets-first' and panel:GetChild('stsCharacter')~=nil
    local nativeV25=officialPanel(panel)
    panel:GetChild('hint').text=state.notice or (nativeV25 and '' or (info and '查看初始信息，确认后开始冒险。' or '点击下方角色查看详情，再确认出发。'))
    -- 只剩一个可选角色/元素时不摆假选择钮（Pan 2026-10-31：单角色发版）。
    local open=countAllowed(Select.characters,function(id)return state:allowsCharacter(id)end)
    local elementsOpen=countAllowed(Select.elements,function(id)return state:allowsElement(id)end)
    paintCharacterButtons(panel,state,platform,originalSts,open)
    paintThemesAndElements(panel,state,platform,elementsOpen)
    local details=panel:GetChild('details');details:SetVisible(info~=nil)
    local roster=panel:GetChild('v25Roster')
    if nativeV25 and roster then
        roster:SetVisible(open==1)
        panel:GetChild('title'):SetVisible(info==nil)
        roster:GetChild('selected'):GetChild('selection'):SetVisible(info~=nil)
        panel:GetChild('traveler'):GetChild('selected'):SetVisible(false)
    else
        paintLegacyDeck(panel,details,info)
    end
    paintPublished(panel,details,state,platform,motion,info,originalSts,nativeV25)
end
return M
