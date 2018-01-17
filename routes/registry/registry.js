'use strict'

const express = require('express')
const multer = require('multer')
const web3 = require('web3')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const ipfs = require('./../../services/ipfs/ipfs')



router.post('/registeritem', upload.single('image'), function (request, response) {
    //TODO: request user and validation
    let item = JSON.parse(request.body.meta)

    // TODO: check if no image
    ipfs.addFileToIpfs(request.file.buffer)
        .then((imgIpfs) => {
            item._meta.img.ipfs = imgIpfs
            item._meta.createdOn = Date.now()
        })
        .then(() => {
            //TODO: make good id (hash)
            let itemId = web3.utils.soliditySha3(item._name, item._meta.createdOn, JSON.stringify(item._meta))
            item._id = itemId

            return ipfs.addFileToIpfs(JSON.stringify(item))
        })
        .then((itemIpfs) => {
            console.log('item', item)
            item._ipfs = itemIpfs

            //TODO: add to node db

            return item
        })
        .then((itm) => {
            response.send(itm)
        })
        .catch((err) => {
            console.log(err)
            response.status(500).json(err)
        })

})

module.exports = router;