const redis = require('redis')
const tls = require('tls')
const fs = require('fs')

var dbPort = process.env.REDIS_PORT || 6379;
var dbHost = process.env.REDIS_HOST || '127.0.0.1';
var dbPassword = process.env.REDIS_PASSWD || 'zo4ohJao0yaav4Xah8oogiqu1Johkeig';
var dbUseSSL = process.env.REDIS_SSL || false;
var dbKeyFile = process.env.REDIS_KEY || '';
var dbCertFile = process.env.REDIS_CERT || '';
var dbCaFile = process.env.REDIS_CA || '';

var redisClient = {};
if (dbUseSSL) {
    var ssl = {
        servername: dbHost,
        port: dbPort,
        key: fs.readFileSync(dbKeyFile, encoding='ascii'),
        cert: fs.readFileSync(dbCertFile, encoding='ascii'),
        ca: [ fs.readFileSync(dbCaFile, encoding='ascii'), ]
    };
    redisClient = redis.createClient(dbPort, dbHost, {tls: ssl})
} else {
    redisClient = redis.createClient(dbPort, dbHost)
}

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
