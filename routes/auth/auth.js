'use strict'

const express = require('express')
const redisClient = require('./../../redisInit')
const router = express.Router()
const { getAddrFromSignedMsg } = require('./../../services/web3/utils')

const EXPIRY_INTERVAL = parseInt(process.env.AUTH_TIME || 0, 10) || (1000 * 60 * 60 * 24 * 30) // 30 days

router.get('/auth', (req, res) => {
    const token = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    return res.send(token.toString())
})

router.post('/auth', (req, res) => {
    const userid = req.body.userid,
        signature = req.body.signature,
        authToken = req.body.authToken,
        sigMode = parseInt(req.body.mode),
        typedData = req.body.typedData,
        hash = req.body.hash,
        prefixed = req.body.prefixed

    getAddrFromSignedMsg({ sigMode, signature, hash, typedData, msg: authToken, prefixed })
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
