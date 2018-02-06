'use strict';

const express = require('express');
var router = express.Router();
const redis = require('redis');
const scripto = require('redis-scripto');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const ed25519 = require('ed25519');

var redisClient = require('./../../redisInit')

const pid = process.pid;


var scriptManager = null;
var EXPIRY_INTERVAL = 2678400;
var MSECS_IN_SEC = 1000;
// var dbPort = process.env.DBPORT || 6379;
// var dbHost = process.env.DBHOST || '127.0.0.1';

// redisInit();
redisLoadScript();
registerEndpoint();

console.log('Database server is on ' + dbHost + ', port ' + dbPort);

// function redisInit() {
//     redisClient = redis.createClient(dbPort, dbHost);
//     redisClient.on('ready', function () {
//         console.log('Redis is ready');
//     });
//     redisClient.on('error', function () {
//         process.exit(1);
//     });
// }

function redisLoadScript() {
    scriptManager = new scripto(redisClient);
    scriptManager.loadFromFile('timefilter', './zcount.lua');
}

function registerEndpoint() {
    console.log('[' + pid + '] ' + 'Register endpoint /events');
    router.get('/events', function (request, response) {
        var whenStart = Date.now();
        var bid = JSON.parse(request.query.bid);
        // console.log('Received endpoint request, data ' + endpoints[which] +
        // ' start at ' + request.query.start + ' end at ' + request.query.end);
        if (request.query.start === undefined && request.query.end === undefined && request.query.interval == undefined) {
            redisClient.zcard(['bid:' + bid], (err, result) => {
                if (err)
                    throw err;
                var whenEnd = Date.now();
                response.json(result);
                // console.log('Zcard request took ' + (whenEnd - whenStart) + ' milliseconds');
            });
        } else if (request.query.interval !== undefined) {
            redisClient.multi([['hget', 'time:' + bid +':click', request.query.interval],
                ['hget', 'time:' + bid + ':impression', request.query.interval],
                ['hget', 'time:' + bid + ':leave', request.query.interval]
            ]).exec(function (err, replies) {
                var whenEnd = Date.now();
                var results = {
                    'click': parseInt(replies[0], 10),
                    'impression': parseInt(replies[1], 10),
                    'leave': parseInt(replies[2], 10),
                };
                response.json(results);
                console.log('hget request took ' + (whenEnd - whenStart) + ' milliseconds');
            });
        } else {
            var whenStart = Date.now();
            if (request.query.start === undefined)
                request.query.start = 0;
            if (request.query.end === undefined)
                request.query.end = Date.now();
            var keys = [request.query.start, request.query.end];
            var values = ['bid:' + bid];
            // console.log('scriptManager.run to run keys ' + keys + ' values ' + values);
            scriptManager.run('timefilter', keys, values, function (err, result) {
                if (err) {
                    console.log('scriptManager.run returned error');
                    result = 0;
                }

                var whenEnd = Date.now();
                console.log('scriptManager.run request took ' + (whenEnd - whenStart) + ' milliseconds; ' + result);
                response.json(result);
            });
        }
    });
}

function submitEntry(payload, response) {
    redisClient.zadd(['bid:' + payload.bid, Date.parse(payload.time),
    'type:'+ payload.type + ' uid:' + payload.uid + ' adunit:' + payload.adunit], (err, result) => {
        if (err) {
            console.log('[zadd] Add entry failed (' + result + ') ' + err);
        }
        response.redirect('/');
    });
    var timeInterval = Math.floor(Date.parse(payload.time) / (60 * MSECS_IN_SEC));
    redisClient.hincrby(['time:' + payload.bid + ':' + payload.type, timeInterval, 1], (err, result) => {
        if (err) {
            console.log('[HINCRBY] Add entry failed (' + timeInterval + ') ' + err);
        } else {
            if (result < 2) {
                var date = new Date();
                var expiryTime = (timeInterval + 1 ) * 60 * MSECS_IN_SEC +
                    EXPIRY_INTERVAL * MSECS_IN_SEC - date.getTime();
                var expirySeconds = Math.floor(expiryTime / 1000);
                redisClient.expire(['time:' + payload.bid + ':' + payload.type, expirySeconds], (err, res) => {
                    if (err)
                        console.log('[EXPIRE] set entry expiry time failed ' + err);
                });
            }
        }
    });
}

router.post('/submit', function (request, response) {
    var whenStart = Date.now();
    var publicKey = request.get('X-public-key');
    var signature = nacl.util.decodeBase64(request.query.signature);
    var payload = JSON.parse(request.query.data);

    //console.log('Public key len is ' + publicKey + ', signature is ' + request.query.signature + ' data is ' + request.query.data);

    if (ed25519.Verify(new Buffer(request.query.data), signature, nacl.util.decodeBase64(publicKey))) {
        var whenEnd = Date.now();
        // console.log('submit signature verification took ' + (whenEnd - whenStart) + ' milliseconds;');
        submitEntry(payload, response);
    } else {
        console.log('Received invalid signature');
        response.sendStatus(400);
    }
});

module.exports = router;