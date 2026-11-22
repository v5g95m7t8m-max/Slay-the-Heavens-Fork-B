-- Candidate-only renderer. A generic batch supplies the default anchors,
-- pivot, scale, visibility and rectangle IDs. No drawings are loaded at mode 0.
local function packedBatchSize(record)
    local remaining=record.drawing.count-record.cursor+1
    if remaining>=60 then return 60 end
    if remaining>=10 then return 10 end
    return 1
end
local function advancePacked(record,size)
    local template=assert(record.packedTemplates[tostring(size)],'missing shared batch template')
    local group=assert(record.instantiate(template,record.pool),'shared batch creation failed')
    record.groups[#record.groups+1]={control=group,count=size}
    check(record)
    local data=record.drawing.packed
    for i=1,size do
        local image=assert(call(record,group,'GetChild','row'..i),'shared batch child missing')
        local offset=(record.cursor-1)*24
        local function read(first,last)return tonumber(data:sub(offset+first,offset+last),16)end
        local id=100000+read(1,1)
        local x,y=(read(2,4)-2048)/20,(read(5,7)-2048)/20
        local w,h,z=read(8,10)/20,read(11,13)/20,read(14,16)-180
        assert(id>=100001 and id<=100003 and w>0 and h>0 and math.abs(z)<=360,'invalid shared batch row')
        if id~=100001 then call(record,image,'SetImage',record.platform.imageSource,id)end
        call(record,image,'SetAnchoredPosition',x,y)
        call(record,image,'SetSizeDelta',w,h)
        if z~=0 then call(record,image,'SetLocalRotation',0,0,z)end
        local tint=record.platform.color(read(17,18),read(19,20),read(21,22),read(23,24))
        check(record);image.imageColor=tint;check(record)
        record.cursor=record.cursor+1
    end
    if record.cursor>record.drawing.count then
        visibility(record,true);check(record);record.ready=true
        print('ABYSS_NATIVE_ART ready card_id='..tostring(record.metadata.cardId)..' shapes='..record.drawing.count)
    end
end
