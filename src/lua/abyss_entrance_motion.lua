-- Match the original recurrence at 60 Hz and extend it to fractional steps.
local M = { step = 1 / 60, scale = 2 / 3 }

function M.approach(current, target, rate, snap, dt)
    if current == target then return target end
    local offset = (current - target) * (1 - rate / 60) ^ (60 * dt)
    return math.abs(offset) < snap and target or target + offset
end

function M.alphaByte(alpha)
    return math.floor(alpha * 255 + .5)
end

return M
