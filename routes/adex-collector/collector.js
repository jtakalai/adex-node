'use strict';

const express = require('express');
var router = express.Router();
const redis = require('redis');
const scripto = require('redis-scripto');

var redisClient = require('./../../redisInit')
const { getAddrFromPersonalSignedMsg, getAddrFromEipTypedSignedMsg } = require('./../../services/web3/utils')
let { SIGN_TYPES } = require('adex-constants').exchange


var bidModel = require('./../../models/bids')

const pid = process.pid;


var scriptManager = null;
var EXPIRY_INTERVAL = 2678400;
var MSECS_IN_SEC = 1000;

redisLoadScript();
registerEndpoint();

function redisLoadScript() {
    scriptManager = new scripto(redisClient);
    scriptManager.loadFromFile('timefilter', './zcount.lua');
}

function registerEndpoint() {
    console.log('[' + pid + '] ' + 'Register endpoint /events');
    router.get('/events', function (request, response) {
        var whenStart = Date.now();
        var bid = {};

        try {
            bid = JSON.parse(request.query.bid);
        } catch (err) {
            response.status(400).send({ error: 'Invalid bid id' });
            return
        }

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
            redisClient.multi([['hget', 'time:' + bid + ':click', request.query.interval],
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
    redisClient.zadd(['bid:' + payload.bid, payload.time,
    JSON.stringify({
        'type': payload.type,
        'adunit': payload.adunit,
        'address': payload.address,
        'signature': payload.signature,
        'sigMode': payload.sigMode
    })], (err, result) => {
        if (err) {
            console.log('[zadd] Add entry failed (' + result + ') ' + err)
            response.status(500).send({ error: '[zadd] Add entry failed (' + result + ') ' + err })
        }

        response.send(JSON.stringify({ updated: result }))
    })

    if (payload.type === 'click') {
        submitClick(payload);
    }

    var timeInterval = Math.floor(payload.time / (60 * MSECS_IN_SEC));
    redisClient.hincrby(['time:' + payload.bid + ':' + payload.type, timeInterval, 1], (err, result) => {
        if (err) {
            console.log('[HINCRBY] Add entry timestamp failed (' + timeInterval + ') ' + err);
        } else {
            if (result < 2) {
                var date = new Date();
                var expiryTime = (timeInterval + 1) * 60 * MSECS_IN_SEC +
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

function submitClick(payload) {
    // special handling for clicks - verify signature and send to Mongo
    var signature = payload.signature
    var sigMode = payload.sigMode
    delete payload.signature
    delete payload.sigMode
    console.log('Click signature is ' + signature + ' mode ' + sigMode)
    console.log('payload', payload)

    var signedData = [{ type: 'string', name: 'Event', value: JSON.stringify(payload) }]
    var msgParams = { data: signedData }
    var authRes;

    switch (sigMode) {

        case SIGN_TYPES.EthPersonal.id:
            authRes = getAddrFromPersonalSignedMsg({ signature: signature, msg: JSON.stringify(payload) })
            break
        case SIGN_TYPES.Eip.id:
            // Auth Metamask
            //TEMP
            authRes = getAddrFromEipTypedSignedMsg({ signature: signature, typedData: signedData })
            break
        case SIGN_TYPES.Trezor.id:
            // Auth Trezor
            break
        default:
            break
    }

    if (!!authRes.then) {
        authRes
            .then((recoveredAddr) => {
                console.log(authRes);
                console.log(recoveredAddr);
                if (recoveredAddr.toLowerCase() === payload.address.toLowerCase()) {
                    return bidModel.addClicksToBid({ id: payload.bid })
                } else {
                    throw 'No sig match'
                }
            })
            .then((res) => {
                console.log('Successfully verified signature, writing to MongoDB', res);
            })
            .catch((err) => {
                console.log('Error verifying signature ' + err)
            });
    } else {
        console.log('Error verifying signature - no sigMode')
    }
}

router.post('/submit', function (request, response) {
    let payload = {}
    let body = request.body || {}
    if (body.signature &&
        body.sigMode !== undefined &&
        body.type &&
        body.address &&
        body.adunit &&
        body.bid
    ) {
        //adview
        payload = request.body
    }
    else {
        return response.status(404).send({ error: 'Invalid data' })
    }

    //console.log('Public key len is ' + publicKey + ', signature is ' + request.query.signature + ' data is ' + request.query.data);
    submitEntry(payload, response);
});

module.exports = router;
