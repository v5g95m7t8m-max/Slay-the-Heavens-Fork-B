local F = dofile('tests/lua/support/game_ui_fixture.lua')
local H = dofile('tests/helpers/act2_choice_events.lua')
local advanceShop = dofile('tests/lua/support/shop_timeline.lua')
local UI = require('abyss_node_ui')
local MobileHud = F.Theme.officialAssets.mobileRunHud and require('abyss_mobile_run_hud')

local function mount(run, map, width, height, touch, enhanced)
    local hostSpec = {name='root', size={width,height}, children=F.Layout}
    local host = F.control(hostSpec)
    local stage, scale = F.Viewport.apply(host, width, height)
    local function page(name) return assert(stage:GetChild(name), name) end
    local platform = {
        imageSource='static', enhancedRooms=enhanced, touchScreen=function() return touch end,
        color=function(r,g,b,a) return {r=r,g=g,b=b,a=a} end,
        cursorEvents={CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up',CursorEndDrag='endDrag'},
    }
    if MobileHud then
        platform.mobileRunHud = MobileHud.apply(page, platform)
        assert((platform.mobileRunHud ~= nil) == touch)
    end
    local root = page('nodePanel')
    local presentation = require('abyss_character_presentation').prepare(F.Presentation, run.data)
    local ui = UI.new(root, run, map, presentation, 'click', nil, platform)
    ui:setVisible(true)

    local function check(scene)
        local boxes = {}
        local function collect(control, spec, x, y, sx, sy, path)
            if not control.visible then return end
            local position = spec.position or {0,0}
            x, y = x + (control.x or position[1])*sx, y + (control.y or position[2])*sy
            local localScale = control.scale or spec.scale or {1,1}
            sx, sy = sx*localScale[1], sy*localScale[2]
            if spec.size then
                local w, h = control.sizeDeltaX*sx/2, control.sizeDeltaY*sy/2
                boxes[path] = {x-w, y-h, x+w, y+h, text=control.text}
            end
            for _, child in ipairs(spec.children or {}) do
                collect(control:GetChild(child.name), child, x, y, sx, sy, path..'/'..child.name)
            end
            if spec.itemTemplate=='AbyssForgeCard' then
                local grid=spec.grid
                local w,h=table.unpack(grid.itemSize)
                local gapX,gapY=table.unpack(grid.spacing)
                local top,_,left=table.unpack(grid.padding)
                for i, item in pairs(control.items) do
                    local dx=-control.sizeDeltaX/2+left+w/2+(i%grid.columns)*(w+gapX)
                    local dy=control.sizeDeltaY/2-top-h/2-math.floor(i/grid.columns)*(h+gapY)
                    collect(item,F.Templates.AbyssForgeCard,x+dx*sx,y+dy*sy,sx,sy,path..'/cell'..i)
                end
            end
        end
        local stageSpec
        for _, spec in ipairs(F.Layout) do if spec.name=='stage' then stageSpec=spec end end
        for _, spec in ipairs(stageSpec.children) do
            if spec.name=='nodePanel' then collect(root,spec,0,0,scale,scale,'') end
        end
        local picker = '/pickerView/'
        local textPaths = {'/notice', picker..'empty', picker..'page', picker..'label', picker..'hint', picker..'forgePrompt/label'}
        local controls = {'/title','/back','/confirm',picker..'previous',picker..'next'}
        local faces = {'card1','card2','card3','target','before','after'}
        for _, name in ipairs(faces) do
            local path = picker..name
            controls[#controls+1] = path
            for _, part in ipairs({'name','cost','type','description','costHalo','roundShadow','glow'}) do
                controls[#controls+1] = path..'/'..part
            end
        end
        for path in pairs(boxes) do
            if path:match('^/pickerView/forge%a+/cell%d+$') then controls[#controls+1]=path end
        end
        local function disjoint(a,b)
            local r,s=boxes[a],boxes[b]
            local dx,dy=math.min(r[3],s[3])-math.max(r[1],s[1]),math.min(r[4],s[4])-math.max(r[2],s[2])
            assert(dx <= 1e-7 or dy <= 1e-7, scene..': '..a..' intersects '..b)
        end
        local visibleText = {}
        for _, path in ipairs(textPaths) do
            if boxes[path] and boxes[path].text ~= '' then
                for _, other in ipairs(controls) do if boxes[other] then disjoint(path,other) end end
                for _, other in ipairs(visibleText) do disjoint(path,other) end
                visibleText[#visibleText+1] = path
            end
        end
        for _, footer in ipairs({'/back','/confirm'}) do
            if boxes[footer] then
                for _, other in ipairs(controls) do
                    if other ~= footer and boxes[other] then disjoint(footer,other) end
                end
            end
        end
        local limit = platform.mobileRunHud and platform.mobileRunHud.contentTop*scale or height/2
        local function inContent(path)
            local r=assert(boxes[path], scene..': '..path..' hidden')
            assert(r[1]>=-width/2 and r[3]<=width/2 and r[2]>=-height/2 and r[4]<=limit, scene..': '..path..' outside content')
            return r
        end
        for _, path in ipairs(visibleText) do inContent(path) end
        for _, card in ipairs({'card1','card2','card3','target','before','after'}) do
            local path=picker..card
            if boxes[path] then
                inContent(path)
                for _, part in ipairs({'name','cost','type','description'}) do
                    assert(inContent(path..'/'..part).text~='', scene..': missing '..card..' '..part)
                end
            end
        end
    end
    return ui, root, check
end

local function room(kind)
    local run,map = H.Run.new(F.Data,42), H.Map.generate(F.Data,42)
    while true do
        local choices=H.Map.available(map)
        for _, candidate in ipairs(choices) do
            if candidate.type==kind then
                assert(H.Nodes.enter(run,map,candidate.id))
                return run,map
            end
        end
        assert(H.Map.choose(map,choices[1].id))
    end
end

for _, viewport in ipairs({{1920,1080,false},{2556,1179,true}}) do
    local width,height,touch=table.unpack(viewport)
    local suffix=' '..width..'x'..height
    local run,map=room('shop')
    run.gold=1000
    local ui,root,check=mount(run,map,width,height,touch,true)
    assert(ui:press('merchant/talk')); advanceShop(ui)
    local initial=H.snapshot(run)
    local price=ui.view.node.removePrice
    assert(ui:press('shopView/removal'))
    check('shop entry'..suffix)
    local prompt=root:GetChild('pickerView'):GetChild('empty')
    assert(prompt.text=='选择要移除的卡牌' and root:GetChild('notice').text=='')
    assert(not ui:press('confirm')); check('shop invalid confirm'..suffix)
    assert(ui:press('pickerView/next')); check('shop next page'..suffix)
    assert(ui:press('pickerView/card2')); check('shop selected'..suffix)
    assert(ui:press('pickerView/card2') and not ui.selected); check('shop deselected'..suffix)
    assert(ui:press('pickerView/card1') and ui.selected)
    assert(ui:press('back') and not root:GetChild('pickerView').visible)
    H.same(run,initial)
    assert(ui:press('shopView/removal') and ui.pickPage==1 and not ui.selected)
    check('shop re-entry'..suffix)
    assert(ui:press('pickerView/card1'))
    local uid=ui.selected
    assert(ui:press('confirm') and not ui:press('confirm'))
    assert(#run.deck==#initial.deck-1 and run.gold==initial.gold-price and run.shopRemoveCount==1)
    for _, card in ipairs(run.deck) do assert(card.uid~=uid) end
    assert(not ui:press('shopView/removal') and not root:GetChild('pickerView').visible)

    run,map=H.fixture('back_to_basics')
    assert(H.Nodes.chooseEvent(run,'elegance'))
    ui,root,check=mount(run,map,width,height,touch,false)
    check('event purge'..suffix)
    assert(ui:press('pickerView/card1')); check('event purge selected'..suffix)
    assert(ui:press('confirm'))

    run,map=H.fixture('drug_dealer')
    assert(H.Nodes.chooseEvent(run,'test_subject'))
    ui,root,check=mount(run,map,width,height,touch,false)
    check('mandatory transform'..suffix)
    assert(ui:press('pickerView/card1')); check('mandatory transform selected'..suffix)
    assert(ui:press('pickerView/card2') and ui:press('confirm'))

    for _, enhanced in ipairs({false,true}) do
        run,map=room('camp')
        ui,root,check=mount(run,map,width,height,touch,enhanced)
        assert(ui:press('campView/forge')); check('camp grid'..suffix)
        local card=enhanced and 'pickerView/forgeScroll/card1' or 'pickerView/card1'
        assert(ui:press(card)); check('camp preview'..suffix)
        assert(ui:press('confirm'))
        if not enhanced then check('camp result'..suffix) end
    end
end

print('OFFICIAL_NODE_PICKER_LAYOUT_PASS')
