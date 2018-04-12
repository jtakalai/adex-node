'use strict'

const express = require('express')
const multer = require('multer')
var redisClient = require('./../../redisInit')
const router = express.Router()
const { getAddrFromSignedMsg } = require('./../../services/web3/utils')

const EXPIRY_INTERVAL = parseInt(process.env.AUTH_TIME || 0, 10) || (1000 * 60 * 60 * 24 * 30) // 30 days

router.get('/auth', (req, res) => {
    let token = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    //res.cookie('authToken', token)
    return res.send(token.toString())

})

router.post('/auth', (req, res) => {
    var userid = req.body.userid,
        signature = req.body.signature,
        authToken = req.body.authToken,
        sigMode = parseInt(req.body.mode),
        typedData = req.body.typedData,
        hash = req.body.hash,
        authRes = {} // NOTE: It is gonna be Promise because some recovery methods may not be synchronous 

    console.log('req.body', req.body)

    getAddrFromSignedMsg({ sigMode, signature, hash, typedData })
        .then((recoveredAddr) => {

            recoveredAddr = recoveredAddr.toLowerCase()
            console.log('recoveredAddr', recoveredAddr)
            // console.log('User id ' + userid + ', token ' + authToken + ' signature ' + signature)

            if (recoveredAddr === userid.toLowerCase()) {
                redisClient.set('session:' + signature, JSON.stringify({ 'user': recoveredAddr, 'authToken': authToken, 'sigMode': sigMode }), (err, result) => {
                    if (err != null) {
                        console.log('Error saving session data for user ' + recoveredAddr + ' :' + err);
                    } else {
                        redisClient.expire('session:' + signature, EXPIRY_INTERVAL, (err, res) => { })
                        let expiryTime = Date.now() + EXPIRY_INTERVAL
                        // TODO: return expire time (handle it on the dapp)
                        res.send(JSON.stringify({ status: 'OK', signature: signature, authToken: authToken, sigMode: sigMode, expiryTime: expiryTime }))
                        return
                    }
                })
            } else {
                return res.status(403).send('Signature unsuccessful')
            }
        })
        .catch((err) => {
            console.log('Error verifying signature ' + err)
            return res.status(401).send('Error verifying signature ' + err)
        })
})

module.exports = router
