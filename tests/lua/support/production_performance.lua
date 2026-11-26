-- Real Lua entry and templates cloned by the Host fixture. Formal releases load both from the archived GIL.
local F,counts,mark=...
local GameUI=require('abyss_game_ui')
local artBinding=require('abyss_monster_actor_binding')
local portraits=require('abyss_traveler_portrait_assets')
local browser=require('abyss_deck_browser_binding')
local templates=require('abyss_ui_templates')
local templateNames=require('performance_templates')
local destroy=F.monsterActors().destroy
local function bindActive(control)
    control.active=true
    function control:SetActive(value)
        self.active=value
        F.setEngineActive(self,value)
    end
end
local host,deckRoots,serial
local function start()
    deckRoots,serial=0,0
    local canvas=F.control({children=F.Layout})
    local stage=assert(canvas:GetChild('stage'))
    for _,name in ipairs({'nodePanel','choicePanel'}) do bindActive(stage:GetChild(name)) end
    local selection=stage:GetChild('characterPanel')
    local background=selection:GetChild('lumineSelectionBackground')
    bindActive(background:GetChild('figure') or background)
    bindActive(selection:GetChild('traveler'):GetChild('officialAvatar'))
    bindActive(stage:GetChild('battlePanel'):GetChild('hero'):GetChild('officialFigure'))

    local new=GameUI.new
    GameUI.new=function(root,data,presentation,event,platform)
        assert(platform.portraits and platform.nativePageLifecycle and platform.deckBrowser
            and platform.characterProfile=='production','formal profile fell back')
        host=new(root,data,presentation,event,platform)
        return host
    end
    script={object=canvas,GetParam=function(_,name)return name=='nativeBgmEnabled' end,
        EnableUpdate=function(self,active)self.updating=active end}
    Enum={ImageSource={StaticReference='static'}, ImageType={Basic='basic',Stretch='stretch'},
        ImageFillHorizontalType={Right='right'}, CursorEventType={CursorClick='click',CursorDown='down',CursorUp='up',CursorDrag='drag',CursorEndDrag='endDrag'},
        Device={Mobile='mobile',MobileController='mobileController'}}
    local function color(r,g,b,a) return {r=r,g=g,b=b,a=a} end
    Color=setmetatable({FromRGBA=color},{__call=function(_,...)return color(...)end})
    game={
        IsTestPlay=function()return false end, GetUICanvasSize=function()return 1560,720 end,
        GetDevice=function()return 'mobile' end, GetCursorUIPos=function()return 0,0 end,
        InstantiateClientUIControl=function(index,parent)
            local name=assert(templateNames[index],'unbound native template')
            local box=F.control(assert(templates[name]),parent)
            serial=serial+1
            parent.children['performanceClone'..serial]=box
            if index==browser.templateIndex then deckRoots=deckRoots+1 end
            if index==portraits.imagePrefabId or index==portraits.containerPrefabId or index==portraits.selectionHalfImagePrefabId then
                bindActive(box)
                if box.kind=='image' then
                    function box:SetFillUnused() self.fill=nil end
                    function box:SetFillHorizontal(side,amount) self.fill={side,amount} end
                end
            end
            return box
        end,
        DestroyClientUIControl=destroy,
        ServerSignal=function()return {SendSignal=function()end} end,
    }
    dofile(BASELINE_GIL and (BASELINE_GENERATED..'/abyss_ui.lua') or 'src/lua/abyss_ui.lua')
    OnStart()
    GameUI.new=new
    assert(host and script.updating,'formal startup did not install the update callback')
    host.seed=42
    return stage
end
local function ready()
    return script.updating and not host.disabled and not host.starting and not host.pageReveal:covered()
        and not host.battleUI.busy and not (host.prologue and host.prologue:covering())
end
local function settle(frameLimit)
    for frame=0,frameLimit or 240 do
        if ready() then return frame end
        OnUpdate(1/60)
    end
    error('formal page failed to become interactive: '..tostring(host.mode)..' '..tostring(host.pageReveal.error))
end
local function decoded(art)
    local count=0
    for _,asset in pairs(art.assets) do
        if rawget(asset,'slots')~=nil then count=count+1 end
    end
    return count
end
local function expectMenu(stage)
    assert(host.mode=='menu' and not host.run and stage:GetChild('menuPanel').visible,'formal menu missing')
end

local stage=start()
local coldFrames=settle()
expectMenu(stage)
local art=assert(package.loaded.abyss_monster_art_data,'formal monster catalogue was never loaded')
local total=0
assert(art.status=='refined-release' and artBinding.enabled)
for id,key in pairs(art.bindings) do
    assert(art.assets[key] and artBinding.templateIndexByDefinition[id],'missing formal monster tier: '..id)
    total=total+1
end
assert(total==42,'expected 42 formal monster bindings')
local coldDecoded=decoded(art)
local coldLookups=assert(counts.mapGroupLookups,'map group queries were not observed')
assert(coldDecoded==0,'FORMAL_EAGER_MONSTERS '..coldDecoded..'/'..total)
-- Five groups plus the independent background lookup. The old binder did
-- another lookup for each map node scanned and reached hundreds.
assert(coldLookups<=6,'FORMAL_MAP_LOOKUPS '..coldLookups)
if not BASELINE_ACT2 then mark('cold-start') end

local function click(panel,button)
    local accepted=F.click(stage,panel,button)
    assert(accepted,'native input rejected: '..panel..'/'..button)
    return settle()
end
local function tap(box,touchId,awaitPresentation)
    local hit=assert(box.click and box or box:GetChild('hit'))
    assert(hit.raycastTarget,'native combat or card control cannot accept input')
    local event={touchId=touchId,GetUIPos=function()return 780+(box.x or 0),360+(box.y or 0) end}
    if hit.listeners.down then hit.listeners.down(event) end
    if hit.listeners.up then hit.listeners.up(event) end
    hit.click(event)
    if awaitPresentation~=false then settle() end
end
local retiredSelection={deckTitle=true,deckSummary=true,deckRule=true,deckOpen=true,deckView=true}
local function assertSelectionDetails(node)
    for _,control in ipairs(node:GetChildren()) do
        assert(not retiredSelection[control.name],'FORMAL_RETIRED_SELECTION_CONTROL '..control.name)
        assertSelectionDetails(control)
    end
end
local function enterMap(measureEntry)
    click('menuPanel','start')
    if not host.characterSelection.info then click('characterPanel','traveler') end
    local details=stage:GetChild('characterPanel'):GetChild('details')
    assertSelectionDetails(details)
    if measureEntry then mark('selection-open') end
    click('characterPanel','confirm')
    assert(host.run.runSeed=='42' and host.run.nodeFlow.event.id=='neow')
    if measureEntry then mark('neow-open') end
    for _,option in ipairs({1,2,1}) do click('nodePanel','eventView/option'..option) end
    assert(host.run.phase=='map' and host.mapUI.navigationEnabled)
end
local function chapterScene(panel)
    local scene=panel:GetChild('chapterBattleScene')
    local dataPath=package.searchpath('abyss_chapter_battle_scene_data',package.path)
    if BASELINE_ACT2_EXPECTED_SLOTS then
        assert(scene and dataPath,'formal candidate Act II requires its chapter scene and paint data')
    end
    assert((scene~=nil)==(dataPath~=nil),'Act II scene and its packaged paint data disagree')
    -- The published v2.1.1 arm has a shared background instead of a chapter pool.
    assert(not package.loaded.abyss_chapter_battle_scene_data,'Act II assets loaded before battle')
    return scene
end

local function sceneWrites()
    return counts.chapterImages or 0
end

local function assertAct2Scene(scene)
    if not scene then return 0 end
    local chapter=assert(package.loaded.abyss_chapter_battle_scene_data,'Act II art did not load')
    local rows=assert(chapter.rows[2])
    local visible=0
    for first=1,chapter.slotCount,chapter.batchSize do
        -- Inspect the Host fixture state without including audit-only lookups
        -- in the newly painted scene's native operation counts.
        local batch=assert(scene.children['paintBatch'..(1+math.floor((first-1)/chapter.batchSize))])
        for index=first,math.min(chapter.slotCount,first+chapter.batchSize-1) do
            local row=rows[index]
            local control=assert(batch.children['paintSlot'..index],'missing imported Act II paint slot '..index)
            assert(control.visible==(row~=false and row~=nil),'Act II slot visibility disagrees with the packaged scene')
            if row then
                assert(control.imageId==row[1] and control.x==row[2] and control.y==row[3] and
                    control.sizeDeltaX==row[4] and control.sizeDeltaY==row[5] and
                    control.pivot[1]==row[6] and control.pivot[2]==row[7] and
                    control.localScaleX==row[8] and control.localScaleY==row[9] and control.rotation[3]==row[10],
                    'Act II paint geometry differs from the packaged scene')
                local ink=control.imageColor
                assert(control.enableMask==(row[11]==1) and ink.r==row[12] and ink.g==row[13] and ink.b==row[14] and
                    ink.a==row[15],'Act II paint properties differ from the packaged scene')
                visible=visible+1
            end
        end
    end
    assert(scene.visible and visible>0 and sceneWrites()==visible,'Act II did not paint one complete scene')
    if BASELINE_ACT2_EXPECTED_SLOTS then
        assert(visible==BASELINE_ACT2_EXPECTED_SLOTS,'formal candidate Act II scene differs from approved slot count')
    end
    return visible
end

local function enterAct2()
    local Map=require('abyss_map')
    local Acts=require('abyss_acts')
    local run,map=host.run,host.map
    -- Use the existing controlled Act I terminal room. Continue and combat entry
    -- below are real UI actions, with the real campaign and encounter queues.
    local available=Map.available(map)
    while #available>0 do
        assert(Map.choose(map,available[1].id))
        available=Map.available(map)
    end
    run.floor,run.phase=Acts.get(1).last,'node'
    run.nodeFlow={id=map.currentNodeId,floor=run.floor,type='treasure',roomKind='boss_treasure',
        mapSeed=map.seed,mapSignature=map.sourceSignature,complete=false,reward={relics={}}}
    assert(F.Nodes.claimBossTreasure(run,0))
    host:refresh();settle()
    assert(run.phase=='act_transition','controlled terminal room did not reach native Continue')
    mark('act2-terminal-setup')
    click('nodePanel','confirm')
    assert(host.run==run and host.map==map and run.act==2 and run.phase=='map','Act II transition lost the run')
    mark('act2-transition')
    return run,map
end

local function playCleave(battle,panel)
    local handIndex
    for i,card in ipairs(battle.hand) do if card.cardId=='cleave' then handIndex=i;break end end
    local card=assert(battle.hand[assert(handIndex,'Cleave not drawn')])
    assert(F.Combat.canPlay(battle,card.uid,nil),'controlled Cleave was not playable')
    local prior={battle.enemies[1].hp,battle.enemies[2].hp,battle.enemies[3].hp}
    tap(panel:GetChild('card'..handIndex),41)
    assert(host.battleUI.selected==card.uid,'Cleave was not picked by native input')
    tap(panel:GetChild('playArea'),42,false)
    local feedback=host.battleUI.feedback
    assert(host.battleUI.busy and feedback.busy,'Cleave did not enter feedback')
    local peak=0
    for _=1,240 do
        if not host.battleUI.busy then break end
        OnUpdate(1/60)
        local active=0
        for _,enemy in ipairs(battle.enemies) do
            if feedback.effects[enemy.id] then active=active+1 end
        end
        peak=math.max(peak,active)
    end
    assert(ready() and host.run.combat==battle and #battle.hand==9,'Cleave playback did not settle in the same fight')
    for i,enemy in ipairs(battle.enemies) do
        assert(enemy.hp>0 and enemy.hp<prior[i],'Cleave did not hit all three living opponents')
    end
    assert(peak==3,'Cleave did not produce three overlapping target effects')
end

local function act2Workload()
    enterMap()
    local act2Panel=stage:GetChild('battlePanel')
    local act2Scene=chapterScene(act2Panel)
    local run,map=enterAct2()
    assert(sceneWrites()==0,'Act II scene painted before combat')

    -- Start a legal three-enemy formation. The controlled fixture advances the
    -- seeded encounter queue, rather than replacing actors or monster art.
    local encounter='3 Raven Adepts'
    for _=1,7 do table.remove(run.encounters.normal,1) end
    assert(run.encounters.normal[1]==encounter,'seed 42 is missing the Act II formation')
    local Run=require('abyss_run')
    assert(Run.obtainCard(run,'cleave'))
    local node=assert(F.Nodes.available(run,map)[1])
    local nodeSlot
    for i,id in pairs(host.mapUI.slots) do if id==node.id then nodeSlot=i;break end end
    click('mapPanel','node'..assert(nodeSlot))
    local act2Battle=assert(run.combat)
    assert(run.encounterSource==encounter and #act2Battle.enemies==3,'expected a legal Act II three-enemy encounter')
    local act2Surfaces=require('abyss_monster_surfaces').get(act2Panel)
    for _,enemy in ipairs(act2Battle.enemies) do
        local actor=assert(act2Surfaces:find(enemy.id))
        assert(actor:GetChild('monsterArt').visible and not actor:GetChild('portrait').visible,'Act II actor rendered a fallback')
    end
    local sceneSlots=assertAct2Scene(act2Scene)
    mark('act2-three-enemies')

    F.Combat.draw(act2Battle,10-#act2Battle.hand)
    assert(#act2Battle.hand==10,'Act II never reached a full hand')
    host.battleUI:render()
    for _=1,180 do OnUpdate(1/60) end
    assert(ready() and sceneWrites()==sceneSlots,'steady Act II repainted the scene pool')
    mark('act2-full-hand')

    playCleave(act2Battle,act2Panel)
    assert(sceneWrites()==sceneSlots,'Act II effects repainted the scene pool')
    mark('act2-overlapping-effects')

    local turn,health=act2Battle.turn,act2Battle.player.hp
    tap(act2Panel:GetChild('endTurn'),43,false)
    local openingFrames=settle(360)
    assert(run.combat==act2Battle and act2Battle.turn==turn+1,'Act II opening enemy turn did not commit')
    -- Three sequential enemy attacks include the full existing intent and hit animations.
    tap(act2Panel:GetChild('endTurn'),44,false)
    local attackFrames=settle(360)
    assert(run.combat==act2Battle and act2Battle.turn==turn+2 and act2Battle.player.hp<health,
        'Act II enemy turn did not commit damage in the same encounter')
    assert(sceneWrites()==sceneSlots,'Act II enemy turn repainted the scene pool')
    mark('act2-enemy-turn')
    destroy(script.object)
    OnDestroy()
    assert(not script.updating,'Act II exit left the scheduler active')
    mark('act2-exit')

    if BASELINE_GIL then BASELINE_ART_FEATURES(require('abyss_art_features').flags) end
    print('PRODUCTION act2Enemies=3 act2Hand=10 act2OverlappingEffects=3 act2SceneSlots='..sceneSlots
        ..' act2OpeningTurnFrames='..openingFrames..' act2AttackTurnFrames='..attackFrames)
    print('ACT2_PRODUCTION_HOST_PASS seed=42')
end

if BASELINE_ACT2 then return act2Workload() end
enterMap(true)
assert(decoded(art)==0,'monster drawings were decoded before the first fight')
local starter={table.unpack(host.run.deck)}
for i=1,75 do
    local card=F.Combat.copy(starter[(i-1)%#starter+1]);card.uid=1000+i
    host.run.deck[i]=card
end
mark('start-map')

local first=assert(F.Nodes.available(host.run,host.map)[1])
local slot
for i,id in pairs(host.mapUI.slots) do if id==first.id then slot=i;break end end
click('mapPanel','node'..assert(slot))
local battle=assert(host.run.combat,'first map hit did not start combat')
local firstDecoded=decoded(art)
assert(firstDecoded>0 and firstDecoded<=#battle.enemies,'formal first battle did not lazily paint its own monsters')
local surfaces=require('abyss_monster_surfaces').get(stage:GetChild('battlePanel'))
for _,enemy in ipairs(battle.enemies) do
    local actor=assert(surfaces:find(enemy.id))
    assert(actor:GetChild('monsterArt').visible and not actor:GetChild('portrait').visible,'first battle rendered a fallback monster')
end
mark('first-fight')

F.Combat.draw(battle,10-#battle.hand)
assert(#battle.hand==10,'ten-card load missing')
host.battleUI:render()
for _=1,60 do OnUpdate(1/60) end
mark('ten-card-hand')

battle.energy=10
local enemy=battle.enemies[1]
enemy.hp,enemy.maxHp=300,300
local battlePanel=stage:GetChild('battlePanel')
for play=1,3 do
    local playable
    for i,card in ipairs(battle.hand) do
        if F.Combat.canPlay(battle,card.uid,1) then playable=i;break end
    end
    local card=assert(battle.hand[assert(playable)])
    tap(battlePanel:GetChild('card'..playable),play*2)
    assert(host.battleUI.selected==card.uid,'the native hand did not select the card')
    local untargeted=F.Combat.canPlay(battle,card.uid,nil)
    local actor=assert(surfaces:find(enemy.id))
    tap(untargeted and battlePanel:GetChild('playArea') or actor,play*2+1)
end
assert(#battle.hand==7 and host.run.combat==battle,'three plays did not commit to one battle')
mark('consecutive-play')

local panel=stage:GetChild('deckPanel')
local function openDeck()
    local frames=click('deckEntry','open')
    assert(host.deckUI.paged and not host.deckUI.pendingGrid and panel.visible,'formal deck page did not publish')
    local painted,firstCard=0,nil
    for _,card in ipairs(panel:GetChild('pileGrid'):GetChildren()) do
        if card.name==templateNames[browser.templateIndex] and card.visible then
            assert(card:GetChild('face'):GetChild('name').text~='','visible deck card was not painted')
            assert(card:GetChild('hit').raycastTarget==true,'visible deck card did not accept input')
            painted=painted+1
            firstCard=firstCard or card
        end
    end
    assert(painted==10,'formal deck first page did not publish all ten cards')
    return frames,firstCard
end
assert(deckRoots==0,'deck preallocated before its first open')
local coldOpen,firstCard=openDeck()
assert(deckRoots==10,'cold deck did not allocate exactly one page')
mark('deck-cold-open')
tap(firstCard,30)
assert(host.deckUI.cardDetail,'formal deck card did not open its details')
click('deckPanel','pileReturn')
assert(panel.visible and not host.deckUI.cardDetail,'detail return did not restore the deck page')
click('deckPanel','pileReturn')
assert(not panel.visible and host.run.combat==battle)
mark('deck-close')
local warmOpen=openDeck()
assert(deckRoots==10,'warm deck reallocated cached card faces')
mark('deck-warm-open')
click('deckPanel','pileReturn')
click('exitEntry','open')
click('runMenu','mainMenu')
assert(host.mode=='menu' and host.sessionPaused and host.run.combat==battle,'title lost the in-progress battle')
click('menuPanel','continueRun')
assert(host.mode=='battle' and not host.sessionPaused and host.run.combat==battle,'resume lost the in-progress battle')
mark('pause-resume')

local oldHost=host
destroy(script.object)
OnDestroy()
assert(not script.updating,'exit left the old scheduler active')
mark('exit')
host=nil
stage=start()
settle()
expectMenu(stage)
assert(host~=oldHost,'reentry kept the exited Host')
enterMap()
assert(host.run and not host.run.combat,'reentry revived the old battle')
destroy(script.object)
OnDestroy()
assert(not script.updating,'destroy left the old scheduler active')
mark('reenter')
if BASELINE_GIL then BASELINE_ART_FEATURES(require('abyss_art_features').flags) end
print('PRODUCTION coldFrames='..coldFrames..' mapGroupLookups='..coldLookups..' monsterDecodes='..coldDecoded..'/'..firstDecoded
    ..' deckColdFrames='..coldOpen..' deckWarmFrames='..warmOpen)
print('PRODUCTION_HOST_PASS seed=42')
