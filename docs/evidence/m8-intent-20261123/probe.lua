local GameUI=require('abyss_game_ui')
local create=GameUI.new
local F
GameUI.new=function(root,data,presentation,event,platform)
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local prior=getmetatable(page);local active=true
  setmetatable(page,{__index=function(c,key)if key=='active'then return active end;return prior.__index(c,key)end,
   __newindex=function(c,key,value)assert(key~='active','active is readonly');return prior.__newindex(c,key,value)end})
  page.SetActive=function(c,value)active=value;F.setEngineActive(c,value)end
 end
 platform.nativePageLifecycle=true
 return create(root,data,presentation,event,platform)
end
F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run,C,V=require('abyss_run'),require('abyss_combat'),require('abyss_battle_intent_view')
local H=dofile('tests/lua/support/battle_action_fixture.lua')
local host,ui,panel,_,actionTap,drain=H.setup({'defend'},{'automaton'})
local b=host.run.combat
assert(#b.enemies==1 and C.intent(b,1).id=='spawn_orbs')
assert(Run.obtainPotion(host.run,'fire_potion'))
host:refresh();host:update(.8)
local function control(i) return F.actorControl(panel,'enemy'..i)end
local function tap(hit,id)
 if hit.listeners.down then hit.listeners.down({touchId=id}) end
 if hit.listeners.up then hit.listeners.up({touchId=id}) end
 return hit.click({touchId=id})
end
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local before=C.copy(host.run)
local move=V.intentView(b,1)
assert(move.sourceEnum=='UNKNOWN' and move.sourceTexture=='INTENT_UNKNOWN_L' and move.worldVisible==false)
local actor=control(1)
assert(not actor:GetChild('intentIcon').visible and not actor:GetChild('intentBadge').visible,'UNKNOWN summon must not display a buff icon')
local hit=actor:GetChild('intentHit')
assert(hit.visible and hit.raycastTarget~=false)
tap(hit,410)
local detail=panel:GetChild('statusInfo')
assert(detail.visible and ui.info.kind=='intent')
local values={}
for i=1,F.Theme.layout.statusInfo.rows do
 for _,prefix in ipairs({'name','text','note','tag'})do
  local c=detail:GetChild(prefix..i)
  if c.visible then values[#values+1]=c.text end
 end
end
local text=table.concat(values,' ')
assert(text:find('浮核',1,true) and text:find('2',1,true),'detail retains true summon description: '..text)
assert(same(before,host.run),'open intent detail changed Run or RNG')
tap(detail:GetChild('hit'),411)
assert(not detail.visible and same(before,host.run),'closing intent detail changed Run or RNG')
actionTap('endTurn',412)
drain()
b=host.run.combat
assert(not ui.busy and #b.enemies==3,'pending summon must create exactly two actors')
local orbs=0;for _,e in ipairs(b.enemies)do if e.definitionId=='bronze_orb' then orbs=orbs+1 end end;assert(orbs==2,'exactly two summoned enemies must be Bronze Orbs')
print('UNKNOWN_PENDING_GREEN '..text..' actors=1->3')
local ch,cu,cp=H.setup({'defend'},{'corrupt_heart'})
assert(Run.obtainPotion(ch.run,'fire_potion'));ch:refresh();ch:update(.8)
local cb=ch.run.combat
local explained=V.intentView(cb,1)
local oldProjection='药水目标：'..cb.enemies[1].name..'；意图：'..explained.text
assert(C.intent(cb,1).id=='debilitate' and utf8.len(oldProjection)==143 and #explained.rows>=8,
 'the historical 143-character witness must match the same eight real effects')
local cf=C.copy(ch.run)
tap(F.actorControl(cp,'enemy1'):GetChild('intentHit'),420)
local ci=cp:GetChild('statusInfo')
local notice=cp:GetChild('notice')
assert(ci.visible and cu.info.kind=='intent' and notice.text=='','current detail must not use old 143-character announcement rail: '..tostring(ci.visible)..':'..tostring(cu.info and cu.info.kind)..':'..tostring(notice.text))
local pageCount=cu.info.pages
assert(pageCount>1,'long source detail must paginate')
local seen={}
for page=1,pageCount do
 local display={}
 local plate=ci:GetChild('plate')
 assert(math.abs(plate.x)+plate.sizeDeltaX/2 <= F.Theme.canvas.base[1]/2-F.Theme.canvas.safe.x+.01,'detail plate extends past safe edges')
 for i=1,F.Theme.layout.statusInfo.rows do
  local name=ci:GetChild('name'..i)
  local body=ci:GetChild('text'..i)
  if name.visible and name.text~='' then
   assert(body.visible and body.text~='','missing displayed effect body for '..name.text)
   assert(not seen[name.text],'effect repeated across pages: '..name.text)
   seen[name.text]=body.text
   display[#display+1]=name.text..'='..(body.visible and body.text or '')
   for _,row in ipairs({name,body})do
    if row.visible then
      assert(math.abs(row.x-plate.x)+row.sizeDeltaX/2 <= plate.sizeDeltaX/2+.01,'row past plate width: '..row.name)
      assert(math.abs(row.y-plate.y)+row.sizeDeltaY/2 <= plate.sizeDeltaY/2+.01,'row past plate height: '..row.name)
    end
   end
  end
 end
 print('HEART_PAGE '..page..'/'..pageCount..' '..table.concat(display,'; '))
 if page<pageCount then ci:GetChild('page').click() end
end
for _,row in ipairs(explained.rows)do assert(seen[row.name] and seen[row.name]==row.text,'unreachable or altered effect '..row.name) end
assert(same(cf,ch.run),'reading all long intent pages must not modify Run')
print('LONG_DETAIL_GREEN old_chars=143 pages='..pageCount..' effects='..#explained.rows)
local function overlap(a,b)
 return math.abs(a.x-b.x)<(a.w+b.w)/2-.001 and math.abs(a.y-b.y)<(a.h+b.h)/2-.001
end
local function box(c,x,y)
 return {x=x or c.x,y=y or c.y,w=c.sizeDeltaX*(c.localScaleX or 1),h=c.sizeDeltaY*(c.localScaleY or 1)}
end
local function crowded(width,height)
 local h,u,p=H.setup({'defend'},{'gremlin_leader','mad_gremlin','sneaky_gremlin'})
 local s=h.run.combat
 for i,m in ipairs(s.enemies[1].intents)do if m.id=='rally' then s.enemies[1].intentIndex=i end end
 assert(C.intent(s,1).id=='rally')
 h.run.combat=C.copy(s); h.run.hp=40; h.run.combat.player.hp=40
 assert(Run.obtainPotion(h.run,'blood_potion'));assert(Run.obtainPotion(h.run,'fire_potion'))
 h:resize(width,height);h:refresh();h:update(.8)
 local summon=F.actorControl(p,'enemy1')
 assert(not summon:GetChild('intentIcon').visible and summon:GetChild('intentHit').visible)
 local n=p:GetChild('notice')
 local hero=F.actorControl(p,'hero')
 local f=hero:GetChild('floating')
 assert(u:usePotion(1));assert(n.text=='药水已生效。','real use writes the potion feedback notice before feedback update')
 local L=F.Theme.layout
 local noticeRect=box(n,n.x or L.battleNotice.position[1],n.y or L.battleNotice.position[2])
 local frames,noticeFrames=0,0
 for _=1,180 do
  h:update(1/60)
  if f.visible and f.text=='＋16' then
   local float=box(f,hero.x+f.x,hero.y+f.y)
   local potion=p:GetChild('potion2')
   assert(potion.visible and (n.text=='' or n.text=='药水已生效。'),'the other potion must remain visible; never restore old detail text')
   if n.visible and n.text~='' then
    assert(not overlap(noticeRect,float),'live potion notice overlaps healing feedback')
    noticeFrames=noticeFrames+1
   end
   local pos=L.battlePotions
   local retained=box(potion,potion.x or pos.origin[1]+pos.step[1],potion.y or pos.origin[2]+pos.step[2])
   if n.visible and n.text~='' then assert(not overlap(noticeRect,retained),'notice overlaps the retained potion bounds') end
   local function clear(candidate)
    assert(not overlap(candidate,float),'potion overlaps live healing-number bounds')
   end
   clear(retained)
   local ok,why=pcall(clear,{x=float.x,y=float.y,w=retained.w,h=retained.h})
   assert(not ok and tostring(why):find('potion overlaps live healing%-number bounds'),'overlap negative control must fail at the intended assertion')
   for i=1,3 do
    local a=F.actorControl(p,'enemy'..i)
    local hit=a:GetChild('intentHit')
    assert(a.visible and hit.visible,'3-actor encounter and help surfaces must stay mounted')
    assert(not overlap(noticeRect,box(hit,a.x+hit.x,a.y+hit.y)),'reserved notice rail overlaps enemy intent touch bounds')
   end
   frames=frames+1
  end
  if not u.busy then break end
 end
 assert(frames>0 and noticeFrames>0 and h.run.hp==56 and h.run.potions[1]==nil and h.run.potions[2]=='fire_potion')
 print('CROWDED_HEAL_GREEN '..width..'x'..height..' enemies=3 concurrent_frames='..frames..' with_notice='..noticeFrames..' hp=40->56 overlap_negative=RED')
end
crowded(1280,720)
crowded(960,720)
