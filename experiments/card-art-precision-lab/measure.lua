-- Real CardDisplay and candidate runtime, with the existing strict control fixture.
local F=dofile('tests/lua/support/bounded_native_art_fixture.lua')
local Display=require('abyss_card_display')
local Runtime=require('abyss_card_art_runtime')
print=function() end
local emit=io.write
local ids={'strike','defend','bash','whirlwind','barricade','demon_form','armaments','cleave','heavy_blade','anger'}
local n=assert(tonumber(os.getenv('PRECISION_LAB_TIER')))

local function run(mode,count,repeated,round,order)
    F.created={};F.destroyed={}
    local templates,metadata,faces={},{},{}
    for i,id in ipairs(ids)do
        local template=200+i
        templates[template]=n
        if mode=='prefab'then
            metadata[i]={runtime=true,cardId=id,precisionTemplateIndex=template,precisionCount=n}
        elseif mode=='legacy'then metadata[i]=F.metadata(id,n) end
    end
    local function instantiate(index,parent)
        local count=templates[index]
        if not count then return F.instantiate(index,parent)end
        local root=F.control('container',parent)
        parent.children[#parent.children+1]=root;F.created[#F.created+1]=root
        for offset=1,count,60 do
            local group=F.control('container',root)
            root.children[#root.children+1]=group
            for _=offset,math.min(offset+59,count)do group.children[#group.children+1]=F.control('image',group)end
        end
        if order=='cancel'then Display.clearNativeArt(parent.parent)end
        return root
    end
    if mode~='off'then
        Runtime.configure({instantiate=instantiate,destroy=F.destroy,imageTemplateIndex=41,containerTemplateIndex=73})
    else Runtime.configure(nil)end
    for i=1,count do faces[i]=F.face()end
    local function bind(i,uid)
        local face=faces[i]
        local target=repeated and 1 or i
        return Display.writeNativeArt(face,{id=ids[target]},metadata[target],F.platform,face:GetChild('art'),uid)
    end
    local function ready()
        local visible=0
        for _,face in ipairs(faces)do if face:GetChild('artSamples').visible then visible=visible+1 end end
        return visible
    end
    local before=os.clock()
    for i=1,count do bind(i,i)end
    local bindMs=(os.clock()-before)*1000
    local callbacks,first,peak,peakCreates,updateMs=0,0,0,0,0
    local wait=mode~='off' and count or 0
    while ready()<wait and callbacks<100 do
        local tick=os.clock()
        Runtime.update()
        updateMs=updateMs+(os.clock()-tick)*1000
        callbacks=callbacks+1
        local stats=Runtime.status()
        peak=math.max(peak,stats.liveControls)
        peakCreates=math.max(peakCreates,stats.createdLastUpdate)
        if first==0 and ready()>0 then first=callbacks end
        if order=='cancel'then break end
    end
    if order=='cancel'then assert(ready()==0 and Runtime.status().liveControls==0 and #F.destroyed==1)
    else assert(ready()==wait,'Art did not become ready')end
    local created=#F.created
    local warm=os.clock()
    if order~='cancel'then
        for i=1,count do bind(i,i+10)end
        Runtime.update()
    end
    local warmMs=(os.clock()-warm)*1000
    assert(#F.created==created,'same artwork/host reallocated')
    local drag=os.clock()
    for i=1,count do faces[i]:SetAnchoredPosition(i*12,0)end
    local dragMs=(os.clock()-drag)*1000
    assert(#F.created==created,'parent motion reallocated')
    local stop=os.clock()
    for i=1,count do Display.clearNativeArt(faces[i])end
    Runtime.update()
    local destroyMs=(os.clock()-stop)*1000
    assert(Runtime.status().liveControls==0 and ready()==0,'released artwork leaked or republished')
    emit(table.concat({mode,n,count,tostring(repeated),round,order,callbacks,first,peak,peakCreates,created,
        bindMs,updateMs,warmMs,dragMs,destroyMs},',')..'\n')
end
emit('mode,budget,hand,repeated,round,order,callbacksAll,callbacksFirst,peakDynamicControls,peakCallsPerCallback,createdCalls,bindCpuMs,updateCpuMs,warmCpuMs,parentMotionCpuMs,destroyCpuMs\n')
for round=1,10 do
    for _,mode in ipairs({'off','legacy','prefab'})do
        for _,count in ipairs({0,1,5,10})do run(mode,count,false,round,'normal')end
        run(mode,10,true,round,'normal')
    end
end
run('prefab',1,false,1,'cancel')
