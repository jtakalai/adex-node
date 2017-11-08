local keys = redis.call("ZCOUNT", tostring(ARGV[1]), KEYS[1], KEYS[2])
return keys