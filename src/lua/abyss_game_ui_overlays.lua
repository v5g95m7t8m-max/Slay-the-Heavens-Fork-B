local number = require("abyss_numbers").integer
local PageReveal=require('abyss_page_reveal')
local Navigation=require('abyss_game_ui_navigation')
local M = {}
local function fastOverlaysBlocked(self)
    return self.mode~='menu' or self.characterOpen or self.exitOpen
        or (self.deckUI and self.deckUI.visible)
        or (self.potionUI and self.potionUI.visible) or (self.choiceUI and self.choiceUI.visible)
        or self.settlementRequested or self.settlementBusy
end
local function potionPhase(self,run)
    return (self.mode=="map" or self.mode=="battle" or self.mode=="node")
        and (run.phase=="map" or run.phase=="node" or run.phase=="reward" or run.phase=="combat")
end
local function deckBlocked(self)
    return self.disabled or self.characterOpen or self.choiceUI and self.choiceUI.visible or self.exitOpen
        or self.potionUI.visible or not self.run or self.battleUI.busy or self.settlementBusy or self.settlementRequested
end

function M.productionCompendium(data,presentation)
    return function(_)
            return require('abyss_compendium_catalog').new(data,presentation)
        end
end

function M.setFastMode(self)
    return function(_,enabled)
            if type(enabled)~='boolean' or self.disabled or self.battleUI and self.battleUI.busy then return false end
            if fastOverlaysBlocked(self) then return false end
            self.fastMode=enabled
            if self.battleUI then self.battleUI.fastMode=enabled;self.battleUI.feedback:setFastMode(enabled)end
            return true
        end
end

function M.openingCovered(self)
    return function()return self.prologue and self.prologue:covering() or false end
end

function M.canViewRoute(self,openingCovered)
    return function()
            return self.run~=nil and self.map~=nil and self.mode~='map' and not self.characterOpen and not openingCovered()
                and not self.disabled and not self.settlementRequested and not self.settlementBusy
        end
end

function M.changed(self,owner)
    return function(_, reason)
            if not owner.ready then return end
            if self.run and self.run.phase == 'act_transition' and (reason == 'continue' or reason == 'complete') then
                return self:advanceAct()
            end
            self:refresh()
        end
end

function M.inCombat(self)
    return function()
            return self.mode=="battle" and self.run~=nil and self.run.phase=="combat"
        end
end

function M.canManagePotions(openingCovered,self)
    return function(run)
            return not openingCovered() and not self.disabled and run~=nil and self.run==run and not self.exitOpen and not self.deckUI.visible
                and not (self.choiceUI and self.choiceUI.visible)
                and not self.battleUI.busy and not self.settlementBusy and not self.settlementRequested
                and potionPhase(self,run)
        end
end

function M.resourceHint(self,canManagePotions,inCombat)
    return function(kind)
            if self.potionUI.visible or not canManagePotions(self.run) then return false end
            local run=self.run
            local player=inCombat() and run.combat.player or run
            local title=kind=='hp' and '生命' or '金币'
            local text=kind=='hp' and ('当前生命 '..number(player.hp)..'/'..number(player.maxHp)..'。\n生命归零即本局失败；战斗之间不会自动回满。')
                or ('当前金币 '..number(run.gold)..'。\n可在商店购买卡牌、遗物、药水，或支付移除卡牌等服务。')
            if not self.deckUI:inspectText(run,title,text) then return false end
            self.deckUI.closeOnOutside=true;self.battleUI.selected=nil;self:refresh();return true
        end
end

function M.openPotions(self)
    return function(_,slot)
            if not self.potionUI:open(self.run,slot)then return false end
            self.battleUI.selected=nil;self:refresh();return true
        end
end

function M.closePotions(self)
    return function(_)
            if not self.potionUI:close()then return false end
            self.battleUI.suppressClick=false;self:refresh();return true
        end
end

function M.openExit(self,owner)
    return function(_)
            if self.prologue and self.prologue:covering() then return false end
            if self.disabled or self.characterOpen or self.exitOpen or self.settlementRequested or self.settlementBusy then return false end
            owner.exitGeneration = owner.exitGeneration + 1
            self.potionUI:close()
            self.exitOpen, self.exitError = true, nil
            Navigation.cancelNodeEntry(self)
            self.battleUI.selected = nil
            self:refresh()
            return true
        end
end

function M.openMenu(self,owner)
    return function(_)
            if self.prologue and self.prologue:covering() then return false end
            if self.disabled or self.easterEggOpen or self.exitOpen or self.settlementRequested or self.settlementBusy then return false end
            owner.exitGeneration = owner.exitGeneration + 1
            self.exitOpen, self.menuOpen, self.exitError = true, true, nil
            Navigation.cancelNodeEntry(self)
            self:refresh()
            return true
        end
end

function M.closeExit(self,owner)
    return function(_)
            if not self.exitOpen or self.settlementRequested or self.settlementBusy then return false end
            owner.exitGeneration = owner.exitGeneration + 1
            if self.routeOpen then
                self.routeOpen = false
                -- Route preview returns directly to its caller, not a hidden parent menu.
            end
            self.exitOpen, self.menuOpen, self.exitError = false, false, nil
            self.battleUI.suppressClick = false
            self.navigationAction=nil
            if self.pageReveal then self.pageReveal:retryPreparation()end
            self:refresh()
            return true
        end
end

function M.confirmExit(self,owner)
    return function(_)
            if self.disabled then return false,"ui_disabled" end
            if self.menuOpen or self.routeOpen then return false,"menu_open" end
            if not self.exitOpen then return false, "exit_not_open" end
            if self.navigationAction then return self:confirmNavigation() end
            -- Voluntary departure never changes combat HP, awards a victory, or
            -- fakes a defeated Run. An already-earned victory keeps its outcome.
            return owner.requestSettlement(self.mode == "victory")
        end
end

local function canOpenDeck(openingCovered,self)
    return not openingCovered() and not deckBlocked(self)
        and (self.mode=='map' or self.mode=='battle' or self.mode=='node')
end
local function openCardFocus(self,read)
    if self.mode~='battle' then return false end
    local function current()
        return self.battleUI:cardHelpReady(read,self.deckUI.focusRead==read)
    end
    return current() and self.deckUI:openCardFocus(self.run,read,current)
end
function M.openDeck(openingCovered,self)
    return function(_,pileKind,read)
            if not canOpenDeck(openingCovered,self) then return false end
            if read then
                if not openCardFocus(self,read) then return false end
            elseif pileKind then
                if self.mode~='battle' or not self.deckUI:openPile(self.run,pileKind)then return false end
            elseif not self.deckUI:open(self.run)then return false end
            self.battleUI.selected = nil
            self:refresh()
            return true
        end
end

function M.openStarterDeck(openingCovered,self,platform,owner)
    return function(_)
            if openingCovered() or self.disabled or not self.characterOpen or self.starting or self.exitOpen
                or self.settlementRequested or self.settlementBusy or self.deckUI.visible or not self.characterSelection.info then return false end
            PageReveal.registerSource(platform,'deckPanel')
            local ok,reason=self.deckUI:openPreview(self.characterSelection.info)
            if not ok then return false,reason end
            owner.exitGeneration=owner.exitGeneration+1;owner.menuGeneration=owner.menuGeneration+1
            self.characterSelection.deckOpen=true;self:refresh();return true
        end
end
function M.openRelics(self,openingCovered,platform)
    return function(_,index)
            if self.deckUI.visible or not canOpenDeck(openingCovered,self) then return false end
            PageReveal.registerSource(platform,'deckPanel')
            if not self.deckUI:inspectRelics(self.run,self.relicUI,index) then return false end
            self.battleUI.selected=nil
            self:refresh();return true
        end
end

function M.closeDeck(self)
    return function(_)
            if self.exitOpen or self.settlementRequested then return false end
            if self.deckUI.choiceToken then return false,"card_choice_pending" end
            local preview=self.deckUI.previewInfo~=nil
            if not self.deckUI:close() then return false end
            if preview then self.characterSelection.deckOpen=false end
            -- Resume click-only hosts; pointer-capable card input still requires its
            -- own fresh Down/Up identity. Closing an overlay cannot revive old clicks.
            self.battleUI.suppressClick = false
            self:refresh()
            return true
        end
end

return M
