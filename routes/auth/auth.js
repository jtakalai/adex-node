'use strict'

const express = require('express')
const multer = require('multer')
const Web3 = require('web3')
var redisClient = require('./../../redisInit')
const router = express.Router()
let web3 = new Web3()

router.get('/auth', (req, res) => {
    let token = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    res.cookie('authToken', token)
    return res.send(token.toString())

})

router.post('/auth', (req, res) => {
    var userid = req.query.userid,
        signature = req.query.signature,
        authToken = req.query.authToken

    // console.log('User id ' + req.body.userid + ', token ' + req.cookies.authToken + ' signature ' + req.body.signature);

    if (req.session === undefined) {
        res.status(500).send('Internal error')
        return;
    }

    try {
        var user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(authToken), signature);
    } catch (err) {
        console.log('Error verifying signature ' + err)
        res.status(401).send('Error verifying signature ' + err)
        return;
    }

    if (user === userid) {
        redisClient.hset(signature, user, authToken)
        res.send('OK')
    } else {
        res.redirect('/auth')
    }
})

module.exports = router