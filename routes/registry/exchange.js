'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')
const Bids = require('./../../models/bids')
const redisClient = require('./../../redisInit')

router.post('/bids', (req, res) => {
    let bid = req.body

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
    let bid = req.body
    let query = req.query
    let user = req.user
    let action = null

    //NOTE: unit and slot because of adblocker
    if (query.unit) {
        action = Bids.getAdUnitBids({ user: user, adUnitId: query.unit })
    } else if (query.slot) {
        action = Bids.getSlotBids({ user: user, adSlot: query.slot })
    } else if (query.sizeAndType || query.sizeAndType === '0') {
        action = Bids.getNotAcceptedBidsBySizeAndType({ sizeAndType: query.sizeAndType, user: user })
    }

    action
        .then((dbBid) => {
            // console.log('db getBids', dbBid)
            res.send(dbBid)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.post('/bid-state', (req, res) => {
    let bid = req.body
    let query = req.query

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

            var clicks = 0
            Object.values(result || {}).forEach(function (element) {
                clicks += parseInt(element)
            })

            return resolve({ allClicks: clicks })
        })
    })
}

router.get('/bid-report', function (req, res) {
    const bid = req.query.bidId

    if (!bid) {
        return res.status(400).send({ error: 'Invalid bid id' })
    }

    const stats = [
        getReportsStats(bid),
        Bids.getBid({ id: bid })
    ]

    let report = {}

    Promise.all(stats)
        .then(([allEvents, verifiedBid]) => {
            allEvents['verifiedClicks'] = verifiedBid.clicksCount

            report = JSON.stringify(allEvents)
            return ipfs.addFileToIpfs(report)
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
            res.status(400).send(err)
        })
})

module.exports = router