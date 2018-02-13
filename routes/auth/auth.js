'use strict'

const express = require('express')
const multer = require('multer')
var redisClient = require('./../../redisInit')
const router = express.Router()
let { SIGN_TYPES } = require('adex-constants').exchange
const { getAddrFromPersonalSignedMsg, getAddrFromEipTypedSignedMsg } = require('./../../services/web3/utils')

const EXPIRY_INTERVAL = 1000 * 60 * 60 * 24 * 1 // 1 Day //TODO: 30?

router.post('/auth', (req, res) => {
    var userid = req.body.userid,
        signature = req.body.signature,
        authToken = req.body.authToken,
        sigMode = parseInt(req.body.mode),
        typedData = req.body.typedData,
        authRes = {} // NOTE: It is gonna be Promise because some recovery methods may not be synchronous 

    console.log('req.body', req.body)

    switch (sigMode) {

        case SIGN_TYPES.EthPersonal.id:
            authRes = getAddrFromPersonalSignedMsg({ signature: signature, msg: authToken })
            break
        case SIGN_TYPES.Eip.id:
            // Auth Metamask
            //TEMP
            authRes = getAddrFromEipTypedSignedMsg({ signature: signature, typedData: typedData })
            break
        case SIGN_TYPES.Trezor.id:
            // Auth Trezor
            break

        default:
            break
    }

    if (!!authRes.then) {

        authRes
            .then((recoveredAddr) => {

                console.log('recoveredAddr', recoveredAddr)
                // console.log('User id ' + userid + ', token ' + authToken + ' signature ' + signature)

                if (recoveredAddr.toLowerCase() === userid.toLowerCase()) {
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
    }
})

module.exports = router