'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')
const Items = require('./../../models/Items')

let tempDb = []

router.post('/uploadimage', upload.single('image'), (req, res) => {
    ipfs.addFileToIpfs(req.file.buffer)
        .then((imgIpfs) => {
            //TODO: send the additional meta (mime etc..) or assume that the client keeps it before send it here
            res.json({ ipfs: imgIpfs })
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.post('/registeritem', function (req, res) {
    //NOTE: request body is text here if use bodyParser.text()
    //TODO: decide what body data type to use
    let item = req.body

    ipfs.addFileToIpfs(item)
        .then((itemIpfs) => {
            item = JSON.parse(item)
            item._ipfs = itemIpfs
            item._id = tempDb.length

            return Items.addItem(item, itemIpfs, req.user)
        })
        .then((itm) => {
            console.log('db item', itm)
            res.send(itm)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

module.exports = router