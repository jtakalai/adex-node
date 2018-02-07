'use strict'

const express = require('express')
const multer = require('multer')
const Web3 = require('web3')
var redisClient = require('./../../redisInit')
const router = express.Router()
let web3 = new Web3()
let { SIGN_TYPES } = require('adex-constants').exchange

const authPersonal = ({ signature, authToken }) => {
    let error = null,
        user

    try {
        user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(authToken), signature)
    } catch (err) {
        error = err
    }

    return {
        user: user,
        err: error
    }
}

router.post('/auth', (req, res) => {
    var userid = req.query.userid,
        signature = req.query.signature,
        authToken = req.query.authToken,
        sigMode = parseInt(req.query.mode),
        err = null,
        user = null,
        authRes = {}

        console.log('req.query', req.query)

    switch (sigMode) {

        case SIGN_TYPES.Personal.id:
            authRes = authPersonal({ signature: signature, authToken: authToken })
            break
        case SIGN_TYPES.Metamask.id:
            // Auth Metamask
            //TEMP
            authRes = authPersonal({ signature: signature, authToken: authToken })
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

    err = authRes.err
    user = authRes.user

    console.log('authRes', authRes)
    // console.log('User id ' + userid + ', token ' + authToken + ' signature ' + signature)
    if (err) {
        console.log('Error verifying signature ' + err)
        res.status(401).send('Error verifying signature ' + err)
        return
    }

    if (user.toLowerCase() === userid.toLowerCase()) {
        redisClient.set('session:' + signature, JSON.stringify({ 'user': user, 'authToken': authToken }), (err, result) => {
            if (err != null) {
                console.log('Error saving session data for user ' + user + ' :' + err);
            } else {
                res.send('OK')
                redisClient.expire('session:' + signature, 2678400 /* var EXPIRY_INTERVAL = */, (err, res) => { })
            }
        })
    } else {
        res.send('ERR')
    }

    return
})

module.exports = router