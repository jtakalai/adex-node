const redis = require('redis')
var dbPort = process.env.DBPORT || 6379;
var dbHost = process.env.DBHOST || '127.0.0.1';

const redisClient = redis.createClient(dbPort, dbHost)

console.log('Redis Database server is on ' + dbHost + ', port ' + dbPort);

redisClient.on('ready', function () {
    console.log('Redis is ready')
})

redisClient.on('error', function () {
    process.exit(1)
})

module.exports = redisClient