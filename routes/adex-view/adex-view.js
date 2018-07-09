'use strict'

const express = require('express')
const router = express.Router()
const Bids = require('./../../models/bids')
const Items = require('./../../models/items')
const ObjectId = require('mongodb').ObjectId

router.get('/view', function (req, res) {
    let slotIpfs = req.query.slotIpfs

    if (!slotIpfs) {
        return res.status(404).send('No slot ipfs id query param provided')
    }

    let bids = []

    Bids.getActiveBidsAdUnitsForSlot({ adSlot: slotIpfs })
        .then((bidsUnits) => {
            return bidsUnits.reduce((memo, bid, index) => {
                memo.adUnitsIds.push(ObjectId(bid._adUnitId))
                memo.bids.push(bid)
                return memo
            }, { adUnitsIds: [], bids: [] })

        })
        .then((mapped) => {
            bids = mapped.bids
            return Items.getItemsByIds({ ids: mapped.adUnitsIds })
        })
        .then((adUnits) => {
            //NOTE: Map the bids because we can have more than one bid for the same ad unit
            let resBids = bids.map((bid) => {
                return {
                    adUnit: adUnits[bid._adUnitId],
                    bid: bid
                }
            })

            return res.send(resBids)
        })
        .catch((err) => {
            console.log('getActiveBidsAdUnitsForSlot err', err)
            return res.status(500).send(err)
        })
})

module.exports = router