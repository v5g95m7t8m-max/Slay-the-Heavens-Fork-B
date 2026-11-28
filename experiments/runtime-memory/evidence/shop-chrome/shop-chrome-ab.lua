local NativeContract = dofile('tests/lua/support/native_ui_contract.lua')
-- Real Run/Map/Nodes and generated native controls; no gameplay rules are mocked.
package.path = "src/lua/?.lua;build/lua/?.lua;" .. package.path
local UI, Nodes = require("abyss_node_ui"), require("abyss_nodes")
local Run, Map, Combat = require("abyss_run"), require("abyss_map"), require("abyss_combat")
local Data, Layout, Presentation = require("abyss_data"), require("abyss_ui_layout"), require("abyss_presentation")
local cursor = {CursorEnter="enter", CursorExit="exit", CursorDown="down", CursorUp="up", CursorEndDrag="endDrag", CursorDrag="drag"}

local phase='construct'
local treeCount,requestCount,selectedCount=0,0,0
local perPhase={}
local function controls(box)
    local count=1
    for _,node in pairs(box.children) do count=count+controls(node) end
    return count
end
local function control(spec, parent, writes)
    treeCount=treeCount+1

    local box = {name=spec.name,assetId=type(spec.image)=='table' and spec.image.id or spec.image or 0,kind=spec.kind or "",parent=parent, visible=spec.visible~=false, children={}, listeners={},
        x=(spec.position or {})[1] or 0,y=(spec.position or {})[2] or 0,
        size=spec.size,scale={1,1,1}}
    
    local held
    function box:GetChild(key)
        if key=='stsReferenceChrome' and self.parent and self.parent.name=='shopView' and self.name:match('^card%d+$') then
            requestCount=requestCount+1
            if held then
               local before=treeCount
               self.children[key]=control(held,self,writes);held=nil
               perPhase[phase]=(perPhase[phase] or 0)+treeCount-before
            end
        end
        return self.children[key]
    end

    function box:GetChildren() local a={};for _,x in pairs(self.children)do a[#a+1]=x end;return a end
    function box:SetLocalRotation(x,y,z)self.rotation={x,y,z}end
    function box:SetActive(value)self.active=value end
    function box:SetFillHorizontal(o,v)self.fillAmount=v end
    function box:SetFillVertical(o,v)self.fillAmount=v end
    function box:SetFillUnused()self.fillAmount=nil end
    function box:SetAsLastSibling() end
    function box:SetImage(...) self.imageId=select(2,...) or (...) end
    function box:SetAnchorMin(x,y) end
    function box:SetAnchorMax(x,y) end
    function box:SetPivot(x,y) end
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
    
    for _, child in ipairs(spec.children or {}) do
        local target=child.name=='stsReferenceChrome' and parent and parent.name=='shopView' and spec.name:match('^card%d+$')
        if target then selectedCount=selectedCount+1 end
        if target and os.getenv('DEFER_CHROME')=='1' then held=child
        else box.children[child.name]=control(child,box,writes) end
    end

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
    
    phase='construct';treeCount,requestCount,selectedCount=0,0,0;perPhase={}
    local root=control(assert(find(Layout)),nil,writes)
    assert(selectedCount==7,'expected seven shop cards in production-model layout')
    local resident=controls(root)
    print('STH_AB constructed '..resident..' authoredSpecShopCards '..selectedCount)
    phase='new controller'

    local ui=UI.new(root,run,map,Presentation,"click",nil,{deferHiddenShopProducts=true,cursorEvents=cursor,color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,touchScreen=function() return touchScreen==true end,
        sound=function(cue)cues[#cues+1]=cue end})
    phase='room setVisible'
    ui:setVisible(true)
    print('STH_AB room-ready '..controls(root)..' requested '..requestCount)
    phase='merchant click'

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
        if key=='merchant/talk' then phase='merchant click' end

        local box=get(key) while box do assert(box.visible,"hidden physical target "..key) box=box.parent end
        
        emit(key,'down',id);emit(key,'up',id);local ok,reason=emit(key,'click',id,payload)
        if key=='merchant/talk' then
            print('STH_AB after-merchant '..controls(root)..' requests '..requestCount)
            phase='merchant updates'
        end
        return ok,reason

    end
    local function picker()
        assert(tap("shopView/removal",22)) assert(tap("pickerView/card1",22))
        assert(ui.mode=="picker" and ui.selected)
    end
    
    local selfFirstVisible
    local function check(at)
        local shop=get('shopView')
        local visibleCards=0
        local function projection(node,path,p)
            local row={path,node.kind,node.assetId,node.imageId or 0,node.visible and 1 or 0,node.x,node.y,node.text or '',node.active==false and 0 or 1}
            for _,v in ipairs(node.size or {}) do row[#row+1]=v end
            for _,v in ipairs(node.scale or {}) do row[#row+1]=v end
            for _,v in ipairs(node.rotation or {}) do row[#row+1]=v end
            local color=node.imageColor
            if type(color)=='table' then for _,name in ipairs({'r','g','b','a'}) do row[#row+1]=color[name] or 0 end end
            p[#p+1]=table.concat(row,',')
            local names={}
            for name in pairs(node.children) do names[#names+1]=name end
            table.sort(names)
            for _,name in ipairs(names) do projection(node.children[name],path..'/'..name,p)end
        end
        local tags={}
        for i=1,7 do
            local card=shop.children['card'..i]
            if card.visible then
                assert(card.children.stsReferenceChrome,'VISUAL EMPTY FRAME '..at..' card'..i)
                visibleCards=visibleCards+1
                if (not selfFirstVisible and os.getenv('CHECK_PHASE')==at) or at=='settled' or at=='warm' then
                   local tag={}
                   projection(card,'card'..i,tag)
                   tags[#tags+1]=table.concat(tag,'|')
                end
            end
        end
        if #tags>0 then print('STH_AB PROJECTION '..at..' '..table.concat(tags,'||')) end
        if visibleCards>0 and not selfFirstVisible then
            selfFirstVisible=true
            print('STH_AB first-visible '..at..' '..controls(root)..' visibleCards '..visibleCards)
        end
    end
    for _,m in ipairs({'update'})do
        local base=ui[m];ui[m]=function(self,dt)
            local out=base(self,dt)
            check('after-update')
            return out
        end
    end
    return ui,get,emit,tap,picker,run,writes,cues,check

end


for _,mobile in ipairs({false,true}) do
 local ui,get,emit,tap,picker,run,writes,cues,check=setup(mobile)
 assert(get('shopRoom').visible and not get('shopView').visible)
 local offer=run.nodeFlow.cards[1]
 local gold=run.gold
 assert(tap('merchant/talk',11))
 for i=1,80 do
    ui:update(1/60)
    local shop=get('shopView')
    local names={}
    for j=1,7 do local card=shop.children['card'..j];if shop.visible and card.visible then names[#names+1]=j end end
    print('STH_AB TIMELINE '..i..' '..shop.y..' '..table.concat(names,','))
 end
 assert(get('shopView/card1').visible);check('settled')
 assert(tap('back',13) and not get('shopView').visible)
 assert(tap('merchant/talk',14))
 for i=1,40 do ui:update(1/60) end;check('warm')
 assert(tap('shopView/card1',15))
 assert(tap('confirm',16) and run.gold==gold-offer.price and run.nodeFlow.cards[1].sold)
 print('STH_AB BUY '..tostring(mobile)..' '..run.gold..' '..offer.price)
end
print('SHOP_CHROME_AB_PASS')
