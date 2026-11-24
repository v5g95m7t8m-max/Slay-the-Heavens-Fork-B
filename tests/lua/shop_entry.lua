local NativeContract = dofile('tests/lua/support/native_ui_contract.lua')
-- Real Run/Map/Nodes and generated native controls; no gameplay rules are mocked.
package.path = "src/lua/?.lua;build/lua/?.lua;" .. package.path
local UI, Nodes = require("abyss_node_ui"), require("abyss_nodes")
local Run, Map, Combat = require("abyss_run"), require("abyss_map"), require("abyss_combat")
local Data, Layout, Presentation = require("abyss_data"), require("abyss_ui_layout"), require("abyss_presentation")
local cursor = {CursorEnter="enter", CursorExit="exit", CursorDown="down", CursorUp="up", CursorEndDrag="endDrag", CursorDrag="drag"}
local function control(spec, parent, writes)
    local box = {parent=parent, visible=spec.visible~=false, children={}, listeners={},
        x=(spec.position or {})[1] or 0,y=(spec.position or {})[2] or 0,
        size=spec.size,scale={1,1,1}}
    function box:GetChild(key) return self.children[key] end
    function box:SetVisible(value) self.visible=value end
    function box:SetSizeDelta(width,height) NativeContract.sizeDelta(width,height);
        self.size={width,height};self.sizeDeltaX,self.sizeDeltaY=width,height
    end
    function box:SetLocalScale(x,y,z) self.scale={x,y,z} end
    function box:SetAnchoredPosition(x,y)
        writes[self]=(writes[self] or 0)+1
        self.x,self.y=x,y
    end
    function box:AddCursorEventListener(event, fn) NativeContract.listener(event,fn);
        assert(not self.listeners[event], "duplicate listener") self.listeners[event]=fn
    end
    for _, child in ipairs(spec.children or {}) do box.children[child.name]=control(child,box,writes) end
    local text = spec.text and spec.text.content
    setmetatable(box, {
        __index = function(_, field) if field == 'text' then return text end end,
        __newindex = function(self, field, value)
            if field == 'text' then
                text = value
                writes[self] = (writes[self] or 0) + 1
            else rawset(self, field, value) end
        end,
    })
    return box
end
local function setup(touchScreen)
    local run,map=Run.new(Data,42),Map.generate(Data,42)
    -- Frozen independent relic stream used by the existing membership-card fixture.
    run.relicPool=require('abyss_relic_pool').new('2',run.data.relicSource)
    while not run.nodeFlow do
        local choices=Map.available(map) assert(#choices>0)
        for _,node in ipairs(choices) do
            if node.type=="shop" then assert(Nodes.enter(run,map,node.id)) break end
        end
        if not run.nodeFlow then assert(Map.choose(map,choices[1].id)) end
    end
    run.gold=10000 -- funding fixture only; original cards, prices and rules are unchanged
    local function find(list)
        for _,spec in ipairs(list) do
            if spec.name=="nodePanel" then return spec end
            local found=spec.children and find(spec.children) if found then return found end
        end
    end
    local writes,cues={},{}
    local root=control(assert(find(Layout)),nil,writes)
    local ui=UI.new(root,run,map,Presentation,"click",nil,{cursorEvents=cursor,color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,touchScreen=function() return touchScreen==true end,
        sound=function(cue)cues[#cues+1]=cue end})
    ui:setVisible(true)
    local function get(key)
        key = key:gsub('^shopView/(%a+)', function(name)
            return (name:match('^relic') or name:match('^potion') or name:match('^removal'))
                and 'shopView/goods/'..name or 'shopView/'..name
        end)
        local box=root for part in key:gmatch("[^/]+") do box=assert(box:GetChild(part),key) end
        return box
    end
    local function emit(key,event,id,payload)
        local fn=get(key.."/hit").listeners[event]
        if fn then
            if payload=="nil" then return fn() end
            if payload=="empty" then return fn({}) end
            return fn({touchId=id})
        end
    end
    local function tap(key,id,payload)
        local box=get(key) while box do assert(box.visible,"hidden physical target "..key) box=box.parent end
        emit(key,"down",id) emit(key,"up",id) return emit(key,"click",id,payload)
    end
    local function picker()
        assert(tap("shopView/removal",22)) assert(tap("pickerView/card1",22))
        assert(ui.mode=="picker" and ui.selected)
    end
    return ui,get,emit,tap,picker,run,writes,cues
end

local function near(value, expected, limit)
    assert(math.abs(value-expected) <= limit, tostring(value)..' ~= '..tostring(expected))
end
local function reference(value, target, k, snap)
    value = value + (target-value)*k/60
    return math.abs(value-target) < snap and target or value
end

for _,hz in ipairs({30,60,120}) do
    local ui,get,_,tap,_,_,writes=setup(false)
    ui:resize(1920,1080)
    local rug,goods,back,shade=get('shopView'),get('shopView/goods'),get('back'),get('shopShade')
    local face=get('shopView/card1/name')
    local resting=math.min(back.x,-510)
    assert(tap('merchant/talk',1))
    local x,p,previous=-400,1080,1080
    x=reference(x,0,9,1)
    near(rug.y,720,.0001)
    near((back.x-resting)*1.5,x,.1)
    assert(shade.imageColor.a==math.floor(2/60*255+.5))
    assert(not goods.visible and not get('shopView/card1').visible)
    local initialCopies=writes[face]
    local sample=0
    for frame=1,hz*1.5 do
        ui:update(1/hz)
        local sourceFrame=frame*60/hz
        if sourceFrame%1==0 then
            for _=sample+1,sourceFrame do
                previous,p=p,reference(p,0,5,.5)
                x=reference(x,0,9,1)
            end
            sample=sourceFrame
            near(rug.y*1.5,p,.1)
            near((rug.y+goods.y)*1.5,previous,.1)
            near((back.x-resting)*1.5,x,.1)
            near(shade.imageColor.a,math.floor(math.min(.85,(sample+1)*2/60)*255+.5),1)
        end
    end
    assert(p==0 and x==0 and previous==0 and get('shopRoom').visible)
    assert(writes[face]==initialCopies and goods.visible)
    print('SHOP_TIMING '..hz..'Hz rugWrites='..writes[rug]..' goodsWrites='..writes[goods]..' cardNameWrites='..initialCopies)
end

for _,mobile in ipairs({false,true}) do
    local ui,get,emit,tap,picker,run,writes,cues=setup(mobile)
    local room,shelf,shade=get('shopRoom'),get('shopView'),get('shopShade')
    local face=get('shopView/card1/name')
    assert(room.visible and not shelf.visible and writes[face]==1,'cold room must prepare before input')
    local gold,view,cardAction=run.gold,ui.view,ui.actions['shopView/card1']
    assert(not ui:press('shopView/card1') and run.gold==gold)
    emit('merchant/talk','down',99);ui:setVisible(false);ui:setVisible(true)
    emit('merchant/talk','up',99)
    assert(not emit('merchant/talk','click',99),'stale merchant tap survived hide/show')
    emit('merchant/talk','down',11)
    for _,event in ipairs({'up','drag','endDrag','exit'})do emit('merchant/talk',event,12) end
    emit('merchant/talk','up',11)
    for _,event in ipairs({'drag','endDrag','exit'})do emit('merchant/talk',event,12) end
    assert(not emit('merchant/talk','click',12),'foreign click accepted')
    assert(emit('merchant/talk','click',11),'foreign click swallowed the valid merchant click')
    assert(shelf.visible and shelf.y==720 and not ui.shopBusy and room.visible)
    assert(not get('merchant/talk').visible and not get('shopView/card1').visible)
    assert(not ui:press('shopView/card1') and not emit('merchant/talk','click'))
    ui:update(1/60)
    assert(not emit('shopView/card1','click',11),'merchant tap leaked through')
    assert(get('shopView/card1').visible)
    for _=2,18 do ui:update(1/60) end

    -- Explicit settled renders still reconcile art ownership without rewriting
    -- the quote's card copy or price.
    local stable={}
    for _,path in ipairs({'shopView/card1/name','shopView/card1/description','shopView/card1/cost','shopView/price1/value'})do
        local box=get(path);stable[box]=writes[box] or 0
    end
    ui:render()
    for box,count in pairs(stable)do assert((writes[box] or 0)==count,'settled quote rewrote copy or price')end

    -- A warm close/open survives during both tails and preserves the live view.
    view,cardAction=ui.view,ui.actions['shopView/card1']
    local copies=writes[face]
    local oldAlpha=shade.imageColor.a
    assert(tap('back',13) and not shelf.visible and room.visible and not run.nodeFlow.complete)
    assert(shade.imageColor.a<oldAlpha and shade.imageColor.a>0)
    assert(tap('merchant/talk',14) and shelf.y==720 and shade.imageColor.a>0)
    assert(ui.view==view and ui.actions['shopView/card1']==cardAction and writes[face]==copies)
    assert(#cues==2 and cues[1]=='shop_open' and cues[2]=='shop_open')
    assert(tap('back',21) and not shelf.visible)
    run.nodeFlow.cards[1]=Combat.copy(run.nodeFlow.cards[1])
    assert(tap('merchant/talk',22))
    assert(ui.view~=view and ui.actions['shopView/card1']~=cardAction and writes[face]==copies)
    for _=1,18 do ui:update(1/60) end

    local offer=run.nodeFlow.cards[1]
    assert(shelf.y>0 and tap('shopView/card1',15))
    local selectedX=get('back').x
    ui:update(1/60)
    assert(get('back').x==selectedX,'ordinary cancel overwrote the secondary layout')
    assert(tap('confirm',16) and run.gold==gold-offer.price and run.nodeFlow.cards[1].sold)
    assert(get('merchant/line').text=='谢啦！' and get('merchant/bubble').visible)
    ui:update(3)
    assert(not get('merchant/bubble').visible)
    ui:update(20)
    assert(not get('merchant/bubble').visible,'unprompted idle dialogue returned')
    picker();assert(tap('confirm',17));assert(ui.mode=='main')
    assert(tap('back',18));assert(not run.nodeFlow.complete and room.visible)
    assert(not tap('back',18),'closing click carried through to leave')
    ui:update(.7)
    assert(tap('back',19) and run.nodeFlow.complete)
    assert(not shelf.visible and not ui:holding())
end
print('SHOP_ENTRY_PASS mouse/touch room, first render, reference phase, warm cache, tail buy, purge, leave')
