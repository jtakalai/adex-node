'use strict';

const express = require('express')
var router = express.Router()
const Bids = require('./../../models/bids')
const Items = require('./../../models/items')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId

router.get('/a-d-e-x-view', function (req, res) {
    // let jsonp = request.query.callback
    // console.log('jsonp', jsonp)

    // let result = {
    //     imgSrc: 'http://adex.network/adex/adex-logo-w-txt.png'
    // }

    // let resStr = JSON.stringify(result)

    // response.send(jsonp + '(' + resStr + ')')

    let slotId = req.query.slotId

    if (!slotId) {
        return res.status(404).send('No slot id query param provided')
    }

    let bids = []

    //NOTE
    Bids.getActiveBidsAdUnitsForSlot({ adSlotId: slotId })
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