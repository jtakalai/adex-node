'use strict'

const express = require('express')
const multer = require('multer')
const Web3 = require('web3')
var redisClient = require('./../../redisInit')
const router = express.Router()
let web3 = new Web3()

router.post('/auth', (req, res) => {
    var userid = req.query.userid,
        signature = req.query.signature,
        authToken = req.query.authToken

    // console.log('User id ' + userid + ', token ' + authToken + ' signature ' + signature)

    try {
        var user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(authToken), signature)
    } catch (err) {
        console.log('Error verifying signature ' + err)
        res.status(401).send('Error verifying signature ' + err)
        return
    }

    if (user === userid) {
        redisClient.set(signature, user)
        res.send('OK')
    } else {
        res.redirect('/auth')
    }
})

module.exports = router