'use strict'

const express = require('express')
const router = express.Router()
const ipfs = require('./../../services/ipfs/ipfs')
const Bids = require('./../../models/bids')
const redisClient = require('./../../redisInit')

router.post('/bids', (req, res) => {
    const bid = req.body

    Bids.placeBid({ bid: bid, user: req.user })
        .then((dbBid) => {
            console.log('db placeBid', dbBid)
            res.send(dbBid)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.get('/bids', (req, res) => {
    const query = req.query
    const user = req.user
    let action = null

    //NOTE: unit and slot because of adblocker
    if (query.unit) {
        action = Bids.getAdUnitBids({ user: user, adUnitId: query.unit })
    } else if (query.slot) {
        action = Bids.getSlotBids({ user: user, adSlot: query.slot })
    } else if (query.sizeAndType || query.sizeAndType === '0') {
        action = Bids.getNotAcceptedBidsBySizeAndType({ sizeAndType: query.sizeAndType, user: user })
    } else if (query.side === 'advertiser') {
        action = Bids.getAdvertiserBids({ user: user })
    } else if (query.side === 'publisher') {
        action = Bids.getPublisherBids({ user: user })
    }

    action
        .then((dbBid) => {
            if (query.tags) {
                dbBid = Bids.filterBidsByTags(dbBid, query.tags)
            }
            res.send(dbBid)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.post('/bid-state', (req, res) => {
    const query = req.query

    Bids.addUnconfirmedState({ bidId: query.bidId, state: query.state, trHash: query.trHash, user: req.user })
        .then((result) => {
            console.log('db addUnconfirmedState', result)
            res.send(result)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

const getReportsStats = (bid) => {
    return new Promise((resolve, reject) => {
        redisClient.hgetall(['time:' + bid + ':click'], (err, result) => {
            if (err) {
                return reject(err)
            }

            let clicks = 0
            Object.values(result || {}).forEach(function (element) {
                clicks += parseInt(element)
            })

            return resolve({ allClicks: clicks })
        })
    })
}

router.get('/bid-report', (req, res) => {
    const bid = req.query.bidId

    if (!bid) {
        return res.status(400).send({ error: 'Invalid bid id' })
    }

    // TODO: If this is only verification report we should first check the verified click to be equal the bid target
    const stats = [
        getReportsStats(bid),
        Bids.getBid({ id: bid })
    ]

    let report = {}

    Promise.all(stats)
        .then(([allEvents, verifiedBid]) => {
            allEvents['bidId'] = bid
            allEvents['verifiedUniqueClicks'] = verifiedBid.clicksCount
            allEvents['advertiser'] = verifiedBid._advertiser
            allEvents['publisher'] = verifiedBid._publisher
            allEvents['adUnitIpfs'] = verifiedBid._adUnit
            allEvents['adSlotIpfs'] = verifiedBid._adSlot

            report = allEvents
            return ipfs.addFileToIpfs(JSON.stringify(report))
        })
        .then((ipfsHash) => {
            let result = {
                report: report,
                ipfs: ipfsHash
            }

            res.send(result)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

module.exports = router