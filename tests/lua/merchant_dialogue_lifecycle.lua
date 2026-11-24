local advanceShop = dofile('tests/lua/support/shop_timeline.lua')
local _,control=dofile('tests/lua/support/node_ui_cases.lua')(math.huge,math.huge)
local UI,Run,Map,Nodes=require('abyss_node_ui'),require('abyss_run'),require('abyss_map'),require('abyss_nodes')
local data,Layout=require('abyss_data'),require('abyss_ui_layout')
local Theme,Narrative=require('abyss_theme'),require('abyss_narrative')
local function find(nodes,name)for _,n in ipairs(nodes)do if n.name==name then return n end local v=n.children and find(n.children,name);if v then return v end end end
local function setup()
 local run,map=Run.new(data,42),Map.generate(data,42)
 while not run.nodeFlow do
  local choices=Map.available(map);local chosen
  for _,node in ipairs(choices)do if node.type=='shop'then chosen=node;break end end
  if chosen then assert(Nodes.enter(run,map,chosen.id))else assert(Map.choose(map,choices[1].id))end
 end
 run.gold=10000
 local root=control(find(Layout,'nodePanel'))
 local presentation=require('abyss_character_presentation').prepare(require('abyss_presentation'),run.data)
 local ui=UI.new(root,run,map,presentation,'click',nil,{color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end,imageSource='static'})
 ui:setVisible(true)
 return ui,root
end

for _,action in ipairs({'hide','resize','restart'})do
 local ui,root=setup()
 local tap=root:GetChild('merchant'):GetChild('talk'):GetChild('hit').click
 assert(ui.merchant.current==nil and tap())
 ui:update(.1);assert(not ui.shopBusy and root:GetChild('shopView').y>0)
 if action=='hide' then ui:setVisible(false);assert(not tap());ui:update(5);ui:setVisible(true)
 elseif action=='resize' then ui:resize(1920,1080)
 else
  local replacement=setup();ui.run,ui.map=replacement.run,replacement.map;ui:render()
  assert(not ui.shopOpen and not root:GetChild('shopView').visible)
  assert(tap());advanceShop(ui)
 end
 assert(not ui.shopBusy,'cancelled entry retained input lock')
 assert(ui:press('shopView/card1') and ui:press('confirm'))
 assert(ui.merchant.current.kind=='buy' and root:GetChild('merchant'):GetChild('bubble').visible)
 local current=ui.merchant.current
 ui:setVisible(false);ui:update(10);assert(current.hold==0)
 ui:setVisible(true);ui:update(2)
 assert(not root:GetChild('merchant'):GetChild('bubble').visible)
 ui:render();ui:update(30);assert(ui.merchant.current==current)
 assert(root:GetChild('shopRoom').visible)
 assert(ui:press('back'));ui:update(.1);ui:setVisible(false);ui:setVisible(true)
 assert(not ui.shopBusy and not ui.run.nodeFlow.complete,'cancelled exit committed in background')
 assert(ui:press('back'));ui:update(.31);assert(ui.run.nodeFlow.complete)
 print('ok merchant lifecycle '..action)
end
