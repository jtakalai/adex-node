const redis = require('redis')
var dbPort = process.env.REDIS_PORT || 6379;
var dbHost = process.env.REDIS_HOST || '127.0.0.1';
var dbPassword = process.env.REDIS_PASSWD || 'zo4ohJao0yaav4Xah8oogiqu1Johkeig';

const redisClient = redis.createClient(dbPort, dbHost)

redisClient.auth(dbPassword, function (err) {
    if (err) throw err;
});

console.log('Redis Database server is on ' + dbHost + ', port ' + dbPort);

redisClient.on('ready', function () {
    console.log('Redis is ready')
})

redisClient.on('error', function (err) {
    console.log("Error connecting to Redis: " + err);
    process.exit(1)
})

module.exports = redisClient
