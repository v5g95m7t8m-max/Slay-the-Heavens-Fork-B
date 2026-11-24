-- Card-facing definitions use the existing status catalog and printed terminology.
local M={}
local traits={
    {'exhaust','消耗','打出后移出本场战斗，不进入弃牌堆。'},
    {'ethereal','虚无','回合结束时若仍在手中，将被消耗。'},
    {'innate','先天','战斗开始时优先出现在起始手牌中。','固有'},
    {'selfRetain','保留','回合结束时不弃掉这张牌。'},
}
local function addTip(results,text,name,body,alias)
    local first,last=text:find(name,1,true)
    if not first and alias then first,last=text:find(alias,1,true) end
    if first and body and body~='' then results[#results+1]={name=name,body=body,first=first,last=last} end
end
local commonKeywords={'vulnerable','weak','frail','strength','dexterity','poison','artifact','intangible','thorns','mantra'}
local function effectKeywords(effects,ids)
    for _,effect in ipairs(effects)do
        if effect.status then ids[effect.status]=true end
        if effect.kind then ids[effect.kind]=true end
        if effect.op=='gainDevotion' then ids.devotion=true end
        if effect["then"] then effectKeywords(effect["then"],ids) end
    end
end
function M.cardTips(statuses,definition,upgraded,text)
    text=text:gsub('<[^>]+>','')
    local matches,rows,seen={},{},{}
    if definition.originalV4 then
        local copy=require('abyss_original_v4_display').keywordDefinitions(definition,upgraded)
        for name,body in copy:gmatch('([^\n]-)：([^\n]+)')do addTip(matches,text,name,body) end
    end
    for _,trait in ipairs(traits)do
        if definition[trait[1]] then addTip(matches,text,trait[2],trait[3],trait[4]) end
    end
    if definition.cost==-2 then
        local alias=text:find('无法打出',1,true) and '无法打出' or '不可打出'
        addTip(matches,text,'不能打出','这张牌不能主动打出。',alias)
    end
    local ids={}
    for _,id in ipairs(commonKeywords)do ids[id]=true end
    effectKeywords(definition.effects or {},ids)
    for id in pairs(ids)do
        local status=statuses and statuses[id]
        if status then addTip(matches,text,status.name,status.description) end
    end
    table.sort(matches,function(a,b)
        if a.first~=b.first then return a.first<b.first end
        if a.last~=b.last then return a.last>b.last end
        if a.name~=b.name then return a.name<b.name end
        return a.body<b.body
    end)
    local last=0
    for _,tip in ipairs(matches) do
        if tip.first>last and not seen[tip.name] then
            rows[#rows+1]=tip
            seen[tip.name],last=true,tip.last
        end
    end
    if #rows>0 then return rows end
end

return M
