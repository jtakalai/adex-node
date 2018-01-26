'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')
const Items = require('./../../models/Items')

router.post('/bids', (req, res) => {
    let bid = req.body

    Items.placeBid({ bid: bid, user: req.user })
        .then((dbBid) => {
            console.log('db placeBid', dbBid)
            res.send(dbBid)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

module.exports = router