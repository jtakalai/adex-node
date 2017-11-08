local keys = redis.call("HKEYS", tostring(ARGV[1]))
-- local newkeys = {}
local j = 0
for i,v in ipairs(keys) do
     if (v >= KEYS[1] and v <= KEYS[2]) then
        j = j + 1
        -- newkeys[j] = v
    end
end
-- return newkeys
return j