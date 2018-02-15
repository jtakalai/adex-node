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

    if(!slotId){
        return res.status(404).send('No slot id query param provided')
    }

    Bids.getActiveBidsAdUnitsForSlot({ adSlotId: slotId })
        .then((bidsUnits) => {
            console.log('bidsUnits', bidsUnits)
            return bidsUnits.map((bid, index) => {
                return ObjectId(bid._adUnitId)
            })
        })
        .then((adUnitsIds) => {
            return Items.getItemsByIds({ ids: adUnitsIds })
        })
        .then((adUnits) => {
            return res.send(adUnits)
        })
        .catch((err) => {
            return res.status(500).send(err)
        })
})

module.exports = router