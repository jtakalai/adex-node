'use strict';

const express = require('express');
const router = express.Router();
const redis = require('redis');
const scripto = require('redis-scripto');

const redisClient = require('./../../redisInit')
const { getAddrFromSignedMsg } = require('./../../services/web3/utils')

const bidsModel = require('./../../models/bids')
const { promisify } = require('util')

const pid = process.pid;

const MSECS_IN_SEC = 1000

const TIME_INTERVAL_LIVE = 5 * 60 * MSECS_IN_SEC // 5 min 
const EXPIRY_INTERVAL_LIVE = 24 * 60 * 60 * MSECS_IN_SEC // 24 hours 

const TIME_INTERVAL_HOURLY = 60 * 60 * MSECS_IN_SEC // 1 hour 
const EXPIRY_INTERVAL_HOURLY = 31 * 60 * 60 * MSECS_IN_SEC // 31 days 

const TIME_INTERVAL_DAILY = 24 * 60 * 60 * MSECS_IN_SEC // 24 hours
const EXPIRY_INTERVAL_DAILY = 0 // NO EXPIRY

var scriptManager = null


redisLoadScript();
registerEndpoint();

function redisLoadScript() {
    scriptManager = new scripto(redisClient);
    scriptManager.loadFromFile('timefilter', './zcount.lua');
}

const getLiveStats = ({ now, bid, start, end }) => {
    if (true || (now - start) < EXPIRY_INTERVAL_LIVE) {
        const startTimeInterval = Math.floor(start / TIME_INTERVAL_LIVE)
        const endIntervalTime = Math.floor(end / TIME_INTERVAL_LIVE)

        let currentInterval = startTimeInterval
        const actions = []
        const timeIntervals = []
        while (currentInterval != endIntervalTime) {
            actions.push(['hget', timeIntervalHash({ bid, type: 'click', timeType: 'live' }), currentInterval],
                ['hget', timeIntervalHash({ bid, type: 'loaded', timeType: 'live' }), currentInterval])
            timeIntervals.push(currentInterval)

            currentInterval = currentInterval + 1
        }

        // console.log('actions', actions)
        // console.log('timeIntervals', timeIntervals)

        return {
            actions: actions,
            timeIntervals: timeIntervals
        }
    }

    return {
        actions: [],
        timeIntervals: []
    }
}

const mapLiveStatsResults = ({ replies, timeIntervals, intervalType, interval }) => {
    const mapped = timeIntervals.reduce((memo, int, index) => {
        memo.push({
            timeInterval: int,
            interval: interval,
            intervalType: intervalType,
            clicks: replies[index * 2],
            loaded: replies[(index * 2) + 1]
        })

        return memo
    }, [])

    // console.log(mapped)

    return mapped
}

// TODO: Promisify 
const getEventsByPeriod = ({ bid, start, end, cb }) => {
    const now = Date.now()
    const data = getLiveStats({ now, bid, start, end })

    redisClient.multi(data.actions)
        .exec((err, replies) => {
            const res = mapLiveStatsResults({ timeIntervals: data.timeIntervals, replies: replies, intervalType: 'live', interval: TIME_INTERVAL_LIVE })
            cb(res)
        })
}

function registerEndpoint() {
    console.log('[' + pid + '] ' + 'Register endpoint /events');
    router.get('/events', function (request, response) {
        var whenStart = Date.now();
        var bid = request.query.bid;

        if (!bid) {
            return response.status(400).send({ error: 'Invalid bid id' })
        }

        // console.log('Received endpoint request, data ' + endpoints[which] +
        // ' start at ' + request.query.start + ' end at ' + request.query.end);
        if ((request.query.start === undefined) && (request.query.end === undefined) && (request.query.interval == undefined)) {
            redisClient.zcard(['bid:' + bid], (err, result) => {
                if (err) {
                    res.status(401).send({ error: 'Internal server error' });
                    console.log('Redis zcard error: ' + err);
                } else {
                    var whenEnd = Date.now();
                    response.json(result);
                }
                // console.log('Zcard request took ' + (whenEnd - whenStart) + ' milliseconds');
            });
        } else if (request.query.interval !== undefined) {
            redisClient.multi([['hget', 'time:' + bid + ':click', request.query.interval],
            ['hget', 'time:' + bid + ':loaded', request.query.interval],
            ['hget', 'time:' + bid + ':leave', request.query.interval]
            ]).exec(function (err, replies) {
                if (err) {
                    res.status(401).send({ error: 'Internal server error' });
                    console.log('Redis request error: ' + err);
                } else {
                    let whenEnd = Date.now();
                    // console.log('hget request replies: ' + replies)
                    let results = {
                        'click': parseInt(replies[0], 10),
                        'loaded': parseInt(replies[1], 10),
                        'leave': parseInt(replies[2], 10),
                    };
                    response.json(results);
                    console.log('hget request took ' + (whenEnd - whenStart) + ' milliseconds');
                }
            });
        } else if (request.query.start && request.query.end) {
            getEventsByPeriod({
                bid: bid, start: request.query.start, end: request.query.end, cb: (res) => {
                    let whenEnd = Date.now();
                    console.log('getEventsByPeriod request took ' + (whenEnd - whenStart) + ' milliseconds');
                    response.json(res)
                }
            })

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

const timeIntervalHash = ({ bid, type, timeType }) => {
    return 'time:' + bid + ':' + type + ':' + timeType
}

const timeIntervalAction = ({ time, interval, bid, type, timeType, expInterval }) => {
    const hash = timeIntervalHash({ bid, type, timeType })
    const timeInterval = Math.floor(time / interval)

    return ['hincrby', hash, timeInterval, 1]
}

const timeIntervalExpireAction = ({ time, interval, bid, type, timeType, expInterval }) => {
    const hash = timeIntervalHash({ bid, type, timeType })
    const expirySeconds = Math.floor((interval + expInterval) / MSECS_IN_SEC)

    return ['expire', hash, expirySeconds]
}

const addAllByInterval = (data) => {
    const actions = data.map(action => {
        return timeIntervalAction(action)
    })

    redisClient.multi(actions)
        .exec((err, replies) => {
            if (err) {
                console.log('[HINCRBY] Add multi entries timestamp failed:' + err)
            } else {
                const expireActions = replies.reduce((memo, rep, index) => {
                    const actionData = data[index]

                    if (actionData.expInterval && rep < 2) {
                        memo.push(timeIntervalExpireAction(actionData))
                    }

                    return memo
                }, [])

                redisClient.multi(expireActions)
                    .exec((err, replies) => {
                        if (err) {
                            console.log('[EXPIRE] multi set entry expiry time failed ' + err)
                        }
                    })
            }
        })

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
            return
        } else {
            response.send(JSON.stringify({ updated: result }))
        }
    })

    if (payload.type === 'click') {
        submitClick(payload);
    }

    const intervalRedisTxData = [
        { time: payload.time, interval: TIME_INTERVAL_LIVE, bid: payload.bid, type: payload.type, timeType: 'live', expInterval: EXPIRY_INTERVAL_LIVE },
        { time: payload.time, interval: TIME_INTERVAL_HOURLY, bid: payload.bid, type: payload.type, timeType: 'hourly', expInterval: EXPIRY_INTERVAL_HOURLY },
        { time: payload.time, interval: TIME_INTERVAL_DAILY, bid: payload.bid, type: payload.type, timeType: 'daily', expInterval: EXPIRY_INTERVAL_DAILY }
    ]

    addAllByInterval(intervalRedisTxData)
}

function submitClick(payload) {
    // special handling for clicks - verify signature and send to Mongo
    var signature = payload.signature
    var sigMode = payload.sigMode
    delete payload.signature
    delete payload.sigMode

    var signedData = [{ type: 'string', name: 'Event', value: JSON.stringify(payload) }]
    var msgParams = { data: signedData }
    var authRes

    getAddrFromSignedMsg({ sigMode, signature, typedData: signedData, msg: JSON.stringify(payload) })
        .then((recoveredAddr) => {
            if (recoveredAddr.toLowerCase() === payload.address.toLowerCase()) {
                /* Additional entry in redis */
                redisClient.hset(['bid:' + payload.bid + ':users', payload.address, payload.time], (err, result) => {
                    if (err) {
                        console.log('[HSET] Add user entry failed failed ' + err);
                    }
                    if (result > 0)
                        return bidsModel.addClicksToBid({ id: payload.bid });
                    else
                        console.log('Click event from ' + payload.address + ' already in DB');
                })
            } else {
                throw 'No sig match'
            }
        })
        .then((res) => {
            console.log('Successfully verified signature, writing to MongoDB', res);
        })
        .catch((err) => {
            console.log('Error verifying signature ' + err)
        })
}

router.post('/submit', function (request, response) {
    let payload = {}
    let body = request.body || {}
    console.log('submit body', body)
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
