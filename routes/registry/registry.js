'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')
const AdUnit = require('./../../models/AdUnit')

let tempDb = []

router.post('/uploadimage', upload.single('image'), (request, response) => {
    ipfs.addFileToIpfs(request.file.buffer)
        .then((imgIpfs) => {
            //TODO: send the additional meta (mime etc..) or assume that the client keeps it before send it here
            response.json({ ipfs: imgIpfs })
        })
        .catch((err) => {
            console.log(err)
            response.status(500).send(err)
        })
})

router.post('/registeritem', function (request, response) {
    //NOTE: request body is text here if use bodyParser.text()
    //TODO: decide what body data type to use
    let item = request.body

    ipfs.addFileToIpfs(item)
        .then((itemIpfs) => {
            item = JSON.parse(item)
            item._ipfs = itemIpfs
            item._id = tempDb.length

            return AdUnit.addNewAdUnit(item, itemIpfs)
        })
        .then((itm) => {
            // console.log('db item', itm)
            response.send(itm)
        })
        .catch((err) => {
            console.log(err)
            response.status(500).send(err)
        })
})

module.exports = router