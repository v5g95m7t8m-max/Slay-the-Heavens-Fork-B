-- Advance both the rug and its previous-reference-step product layer to rest.
return function(ui)
    for _ = 1, 45 do ui:update(1 / 30) end
end
