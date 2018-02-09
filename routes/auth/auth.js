'use strict'

const express = require('express')
const multer = require('multer')
const Web3 = require('web3')
var redisClient = require('./../../redisInit')
const router = express.Router()
let web3 = new Web3()
let { SIGN_TYPES } = require('adex-constants').exchange
const sigUtil = require('eth-sig-util')

const authPersonal = ({ signature, authToken }) => {
    return new Promise((resolve, reject) => {
        let error = null,
            user
        try {
            user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(authToken), signature)
            resolve(user)
        } catch (err) {
            reject(err)
        }
    })
}

const authMetamaskTyped = ({ signature, authToken, typedData }) => {
    return new Promise((resolve, reject) => {
        let error = null,
            user

        try {
            user = sigUtil.recoverTypedSignature({
                data: typedData,
                sig: signature
            })
            resolve(user)
        } catch (err) {
            error = err
            reject(err)
        }
    })
}

router.post('/auth', (req, res) => {
    var userid = req.body.userid,
        signature = req.body.signature,
        authToken = req.body.authToken,
        sigMode = parseInt(req.body.mode),
        typedData = req.body.typedData,
        authRes = {} // NOTE: It is gonna be Promise because some recovery methods may not be synchronous 

    console.log('req.body', req.body)

    switch (sigMode) {

        case SIGN_TYPES.Personal.id:
            authRes = authPersonal({ signature: signature, authToken: authToken })
            break
        case SIGN_TYPES.Metamask.id:
            // Auth Metamask
            //TEMP
            authRes = authMetamaskTyped({ signature: signature, authToken: authToken, typedData: typedData })
            break
        case SIGN_TYPES.Trezor.id:
            // Auth Trezor
            break
        case SIGN_TYPES.Ledger.id:
            // Auth Ledger
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
                    redisClient.set('session:' + signature, JSON.stringify({ 'user': user, 'authToken': authToken }), (err, result) => {
                        if (err != null) {
                            console.log('Error saving session data for user ' + user + ' :' + err);
                        } else {
                            redisClient.expire('session:' + signature, 2678400 /* var EXPIRY_INTERVAL = */, (err, res) => { })
                            // TODO: return expire time (handle it on the dapp)
                            res.send('OK')
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