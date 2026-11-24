-- Read-only permanent card candidates. Commands and transactions stay with Run.
local C = require('abyss_copy')
local M = {}
local protected = {Necronomicurse=true,CurseOfTheBell=true,AscendersBane=true,
    necronomicurse=true,curse_of_the_bell=true,ascenders_bane=true}
local function purgeable(run,card)
    local context=run.transformContext
    local source=context and context.cards and context.cards[card.cardId]
    local sourceId=source and source.sourceId or card.cardId
    return not protected[sourceId] and not protected[card.cardId]
        and not card.inBottleFlame and not card.inBottleLightning and not card.inBottleTornado
end
function M.purgeCards(run)
    local rows={}
    for _,card in ipairs(run.deck) do
        -- Source addToTop is group.add(c), preserving masterDeck order.
        if purgeable(run,card) then rows[#rows+1]=C.copy(card) end
    end
    return rows
end
function M.any(run)
    for _,card in ipairs(run.deck) do if purgeable(run,card) then return true end end
    return false
end

return M
