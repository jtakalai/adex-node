'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')
const Items = require('./../../models/Items')

router.post('/image', upload.single('image'), (req, res) => {
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

router.post('/items', (req, res) => {
    //NOTE: request body is text here if use bodyParser.text()
    //TODO: decide what body data type to use
    let item = req.body

    Items.addItem(item, req.user)
        .then((itm) => {
            console.log('db item', itm)
            res.send(itm)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.get('/items', (req, res) => {
    Items.getUserItems(req.user, req.query.type)
        .then((items) => {
            res.send(items)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.delete('/items', (req, res) => {
    Items.flagItemDeleted({ id: req.query.id, user: req.user, type: req.query.type })
        .then((items) => {
            res.send(items)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

router.post('/add-to-item', (req, res) => {
    Items.addItemToItem({ item: req.query.item, user: req.user, type: req.query.type, collection: req.query.collection })
        .then((items) => {
            res.send(items)
        })
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
})

module.exports = router