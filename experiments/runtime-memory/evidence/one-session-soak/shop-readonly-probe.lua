local function removeProbe(stage,key)
 if run.floor~=28 or key~='shopView/removal'then return end
 local n=h.nodeUI;local f=run.nodeFlow;local node=n.view and n.view.node or {};local a=n.actions[key]
 local ctx
 for i=1,40 do local name,val=debug.getupvalue(n.press,i);if name=='ctx'then ctx=val;break end;if name==nil then break end end
 local shop=ctx and ctx.child('shopView');local goods=shop and shop:GetChild('goods');local elapsed,closing
 if ctx then for i=1,40 do local name,val=debug.getupvalue(ctx.shopGoodsVisible,i);if name=='elapsed'then elapsed=val end;if name==nil then break end end end
 local step=n.shopOpen and ctx and ctx.shopGoodsVisible()
 local purge=require('abyss_purge_candidates').purgeCards(run)
 local plan=Policy.suggestNodeAction(run,map,coverage,done);local uid=plan and plan.uid
 print(string.format("SHOP_PROBE %s floor=%d key=%s entry=%s enabled=%s reason=%s poor=%s flow.removeAvailable=%s flow.removalUsed=%s view.removeAvailable=%s view.removalUsed=%s view.purgeCards=%s exactPurgeCards=%d uid=%s gold=%s quote=%s viewQuote=%s uiMode=%s visible=%s shopOpen=%s elapsed=%s busy=%s presentationBusy=%s shopBusy=%s visualsReady=%s goodsAdmission=%s goodsVisible=%s panelY=%s quoteCurrent=%s revealCover=%s",
 stage,run.floor,key,a and'table'or'nil',tostring(a and a.enabled),tostring(a and a.reason),tostring(a and a.poor),tostring(f.removeAvailable),tostring(f.removalUsed),tostring(node.removeAvailable),tostring(node.removalUsed),tostring(node.purgeCards and #node.purgeCards),#purge,tostring(uid),tostring(run.gold),tostring(require('abyss_shop').removePrice(run)),tostring(node.removePrice),tostring(n.mode),tostring(n.visible),tostring(n.shopOpen),tostring(elapsed),tostring(n.busy),tostring(n.presentationBusy),tostring(n.shopBusy),tostring(ctx and ctx.shopVisualsReady()),tostring(step),tostring(goods and goods.visible),tostring(shop and shop.y),tostring(ctx and ctx.shopQuoteCurrent()),tostring(h.pageReveal and h.pageReveal:covered())))
 if stage=='before' and uid then
  local c=C.copy(run,{[run.data]=run.data});local cost=run.gold;local size=#run.deck
  local ret,cause=Nodes.removeCard(c,uid)
  print(string.format('SHOP_PROBE exact_detached_public removeCard=%s reason=%s cloneGold=%d cloneSize=%d cloneUsed=%s originalGold=%d originalSize=%d originalUsed=%s',tostring(ret),tostring(cause),c.gold,#c.deck,tostring(c.nodeFlow.removalUsed),run.gold,#run.deck,tostring(run.nodeFlow.removalUsed)))
  assert(cost==run.gold and size==#run.deck and not run.nodeFlow.removalUsed)
 end
 return ctx
end
