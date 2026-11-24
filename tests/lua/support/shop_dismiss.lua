local advanceShop = dofile('tests/lua/support/shop_timeline.lua')
-- Actual generated node controls + Run/Map/Nodes; input events only are emulated.
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local UI=require('abyss_node_ui')
local Run,Map=require('abyss_run'),require('abyss_map')
local cursor={CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up',CursorDrag='drag',CursorEndDrag='endDrag'}
local function same(a,b)
    if type(a)~='table' then assert(a==b,'outside tap changed run');return end
    assert(type(b)=='table')
    for k,v in pairs(a)do same(v,b[k])end
    for k in pairs(b)do assert(a[k]~=nil,'outside tap added run state')end
end
local function find(list,name)
    for _,spec in ipairs(list)do
        if spec.name==name then return spec end
        local child=spec.children and find(spec.children,name)
        if child then return child end
    end
end
local function setup(touch, clickOnly)
    local run,map=Run.new(F.Data,42),Map.generate(F.Data,42)
    run.relicPool=require('abyss_relic_pool').new('2',run.data.relicSource)
    while not run.nodeFlow do
        local available=Map.available(map);assert(#available>0)
        for _,node in ipairs(available)do if node.type=='shop'then assert(F.Nodes.enter(run,map,node.id));break end end
        if not run.nodeFlow then assert(Map.choose(map,available[1].id))end
    end
    run.gold=10000 -- funded scenario; production offers/prices and commands remain intact.
    local spec=assert(find(F.Layout,'nodePanel'))
    local root=F.control(spec)
    local blocked=false
    local ui=UI.new(root,run,map,F.Presentation,'click',nil,{cursorEvents=cursor,
        pointerBlocked=function()return blocked end,color=function(r,g,b,a)return {r=r,g=g,b=b,a=a}end,touchScreen=function()return touch end})
    ui:setVisible(true)
    assert(root:GetChild("merchant"):GetChild("talk"):GetChild("hit").click());advanceShop(ui)
    local function get(path)
        path = path:gsub('^shopView/(%a+)', function(name)
            return (name:match('^relic') or name:match('^potion') or name:match('^removal'))
                and 'shopView/goods/'..name or 'shopView/'..name
        end)
        local control=root
        for key in path:gmatch('[^/]+')do control=assert(control:GetChild(key),path)end
        return control
    end
    local function emit(path,kind,id)
        local box=get(path);if box.kind~='cursorArea'then box=assert(box:GetChild('hit'))end
        return assert(box.listeners[kind],path..' missing '..kind)({touchId=id})
    end
    local function tap(path,id)emit(path,'down',id);emit(path,'up',id);return emit(path,'click',id)end
    return ui,get,emit,tap,spec,function(value)blocked=value end
end
local count=0
local function test(name,fn)fn();count=count+1;print('ok shop dismiss - '..name)end
test('mobile blank tap closes only current detail, then supports another item, purchase and leave',function()
    local ui,get,emit,tap=setup(true)
    assert(tap('shopView/relic3',1));assert(get('shopView/detail').visible)
    local before=F.Combat.copy(ui.run)
    assert(tap('shopDismiss',2));assert(not get('shopView/detail').visible)
    same(before,ui.run);emit('shopDismiss','click',2);same(before,ui.run)
    assert(tap('shopView/potion1',3));assert(get('shopView/detail').visible)
    local price=ui.run.nodeFlow.potions[1].price;local gold=ui.run.gold
    assert(tap('confirm',4));assert(ui.run.gold==gold-price and Run.potionCount(ui.run)==1)
    assert(tap('back',5));assert(not ui.run.nodeFlow.complete)
    ui:update(.7);assert(tap('back',6) and ui.run.nodeFlow.complete,'leaving shop stopped working')
end)
test('desktop hover and selected focus are both removed by outside dismissal',function()
    local ui,get,emit,tap=setup(false)
    emit('shopView/relic3','enter',1);ui:update(.2)
    assert(get('shopView/detail').visible)
    assert(tap('shopView/relic3',1));assert(tap('shopDismiss',2));ui:update(.2)
    assert(not get('shopView/detail').visible,'old hover survived cancellation')
    emit('shopView/potion1','enter',3);ui:update(.2);assert(get('shopView/detail').visible)
    emit('shopView/potion1','exit',3);ui:update(.2);assert(not get('shopView/detail').visible)
end)
test('foreign, cancelled and stale outside pointers do not cancel a newer item',function()
    local ui,get,emit,tap=setup(true)
    assert(tap('shopView/relic3',1))
    emit('shopDismiss','down',2);emit('shopDismiss','up',3);emit('shopDismiss','click',3)
    assert(get('shopView/detail').visible)
    emit('shopDismiss','up',2)
    assert(tap('shopView/potion1',4));local name=get('shopView/detail/name').text
    emit('shopDismiss','click',2);assert(get('shopView/detail').visible and get('shopView/detail/name').text==name)
    for _,kind in ipairs({'drag','exit','endDrag'})do
        emit('shopDismiss','down',5);emit('shopDismiss',kind,5)
        emit('shopDismiss','up',5);emit('shopDismiss','click',5)
        assert(get('shopView/detail').visible,kind..' must not turn into a dismissal')
    end
    assert(tap('shopDismiss',6));assert(not get('shopView/detail').visible)
end)
test('hidden page and pre-dismiss purchase callbacks cannot act on the next selection',function()
    local ui,get,emit,tap=setup(true)
    assert(tap('shopView/relic3',1));local oldBuy=ui.actions.confirm.handler
    emit('shopDismiss','down',2);emit('shopDismiss','up',2)
    ui:setVisible(false);ui:setVisible(true);ui:render()
    assert(tap('shopView/potion1',3));local before=F.Combat.copy(ui.run)
    emit('shopDismiss','click',2);assert(get('shopView/detail').visible);same(before,ui.run)
    assert(tap('shopDismiss',4));assert(not oldBuy());same(before,ui.run)
end)
test('click-only outside input remains usable, footer cancellation stays available',function()
    local ui,get=setup(true,true)
    assert(get('shopView/relic3/hit').click());assert(get('shopView/detail').visible)
    assert(get('shopDismiss').click());assert(not get('shopView/detail').visible)
    assert(ui:press('shopView/potion1'));assert(ui:press('back'))
    assert(not get('shopView/detail').visible)
end)
test('foreground and background callbacks in either order keep the new item and never buy',function()
    for _,backgroundFirst in ipairs({true,false})do
        local ui,get,emit,tap=setup(true)
        assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
        local expected
        for _,potion in ipairs(ui.run.data.potions.potions)do
            if potion.id==ui.run.nodeFlow.potions[1].id then expected=potion.name end
        end
        assert(expected,'scenario needs a named potion offer')
        local first=backgroundFirst and 'shopDismiss' or 'shopView/potion1'
        local second=backgroundFirst and 'shopView/potion1' or 'shopDismiss'
        for _,kind in ipairs({'down','up','click'})do emit(first,kind,2);emit(second,kind,2)end
        assert(get('shopView/detail').visible,'background stole item pointer')
        assert(get('shopView/detail/name').text==expected,'foreground item selection did not win')
        same(before,ui.run)
        assert(tap('shopDismiss',2));assert(not get('shopView/detail').visible,'fresh reused touch must dismiss')
    end
end)
test('busy and publication barriers reject outside ownership until a fresh ready tap',function()
    for _,field in ipairs({'busy','presentationBusy'})do
        local ui,get,emit,tap=setup(true)
        assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
        emit('shopDismiss','down',2);ui[field]=true
        emit('shopDismiss','up',2);emit('shopDismiss','click',2)
        assert(get('shopView/detail').visible,field..' bypassed')
        ui[field]=false;emit('shopDismiss','click',2);assert(get('shopView/detail').visible)
        ui[field]=true;emit('shopDismiss','down',3);ui[field]=false
        emit('shopDismiss','up',3);emit('shopDismiss','click',3)
        assert(get('shopView/detail').visible,'blocked Down became live after publication')
        assert(tap('shopDismiss',4));assert(not get('shopView/detail').visible);same(before,ui.run)
    end
end)
test('identified Down and Up accept only an unambiguous anonymous Click',function()
    for _,emptyTable in ipairs({true,false})do
        local ui,get,emit,tap=setup(true)
        assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
        emit('shopDismiss','down',2);emit('shopDismiss','up',2)
        get('shopDismiss').click(emptyTable and {} or nil)
        assert(not get('shopView/detail').visible,'missing Click touchId lost owned dismissal')
        same(before,ui.run)
    end
    local ui,get,emit,tap=setup(true)
    assert(tap('shopView/relic3',1))
    emit('shopDismiss','down',2);emit('shopDismiss','down',3);emit('shopDismiss','up',2)
    get('shopDismiss').click({});assert(get('shopView/detail').visible,'anonymous Click stole another active touch')
    emit('shopDismiss','up',3);get('shopDismiss').click({});assert(not get('shopView/detail').visible)
end)
test('foreground anonymous Click and interleaved fingers cannot fall through to background',function()
    for _,emptyTable in ipairs({true,false})do
        local ui,get,emit,tap=setup(true)
        assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
        emit('shopView/potion1','down',2);emit('shopView/potion1','up',2)
        get('shopView/potion1/hit').click(emptyTable and {} or nil)
        local name=get('shopView/detail/name').text
        get('shopDismiss').click(emptyTable and {} or nil)
        assert(get('shopView/detail').visible and get('shopView/detail/name').text==name,'anonymous foreground Click dismissed its own item')
        same(before,ui.run)
    end
    local ui,get,emit,tap=setup(true)
    assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
    emit('shopView/potion1','down',2);emit('shopView/potion2','down',3)
    emit('shopDismiss','down',2);emit('shopDismiss','up',2)
    get('shopDismiss').click({});emit('shopDismiss','click',2)
    assert(get('shopView/detail').visible,'second foreground finger lost first pointer claim')
    emit('shopView/potion1','up',2);emit('shopView/potion1','click',2)
    emit('shopView/potion2','up',3);emit('shopView/potion2','click',3)
    emit('shopDismiss','click',2);assert(get('shopView/detail').visible);same(before,ui.run)
    assert(tap('shopDismiss',2));assert(not get('shopView/detail').visible)
end)
test('covered shop consumes old releases and allows fresh footer clicks',function()
    local ui,get,emit,tap,_,block=setup(true)
    assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
    emit('shopDismiss','down',2);emit('shopDismiss','up',2)
    block(true);emit('shopDismiss','click',2)
    block(false);emit('shopDismiss','click',2)
    assert(get('shopView/detail').visible,'cover-blocked release revived')
    block(true);emit('shopDismiss','down',3)
    block(false);emit('shopDismiss','up',3);emit('shopDismiss','click',3)
    assert(get('shopView/detail').visible,'blocked Down revived after cover release')
    assert(tap('shopDismiss',4));assert(not get('shopView/detail').visible);same(before,ui.run)
    assert(ui:press('shopView/relic3'));assert(tap('back',5))
    assert(not get('shopView/detail').visible);same(before,ui.run)
end)
test('all foreground terminal paths reject old background tokens and permit a fresh tap',function()
    for _,kind in ipairs({'up','exit','endDrag','click','hide','render'})do
        local ui,get,emit,tap=setup(true)
        assert(tap('shopView/relic3',1));local before=F.Combat.copy(ui.run)
        emit('shopDismiss','down',2);emit('shopView/potion1','down',2)
        if kind=='hide' then ui:setVisible(false);ui:setVisible(true);ui:render();assert(tap('shopView/relic3',3))
        elseif kind=='render' then ui:render()
        elseif kind=='click' then emit('shopView/potion1','up',2);emit('shopView/potion1','click',2)
        else emit('shopView/potion1',kind,2) end
        emit('shopDismiss','up',2);emit('shopDismiss','click',2)
        assert(get('shopView/detail').visible,kind..' revived the old background pointer')
        assert(tap('shopDismiss',4));assert(not get('shopView/detail').visible,kind..' left an orphan foreground claim')
        same(before,ui.run)
    end
end)
test('generated dismiss hit stays below item hits and the footer, without replacing item actions',function()
    local ui,get,emit,tap,spec=setup(true)
    local background=assert(find(spec.children,'shopDismiss'))
    assert(background.focusable==false,'background must remain a plain hit area')
    assert(get('shopDismiss').sizeDeltaX==F.Theme.canvas.base[1])
    assert(tap('shopView/relic3',1));assert(get('shopView/detail').visible,'item click fell through to dismissal')
    assert(tap('shopView/potion1',2));assert(get('shopView/detail').visible,'changing item was intercepted')
    local shopIndex,confirmIndex
    for i,child in ipairs(spec.children)do if child.name=='shopView'then shopIndex=i elseif child.name=='confirm'then confirmIndex=i end end
    assert(confirmIndex>shopIndex and spec.children[1].name=='backdrop','bottom surface would cover purchase/leave')
end)
print('SHOP_DISMISS_PASS '..count)
