'use strict'

const express = require('express')
const multer = require('multer')
const Web3 = require('web3')
var redisClient = require('./../../redisInit')
const router = express.Router()
let web3 = new Web3()
let { SIGN_TYPES } = require('adex-constants').exchange

const authPersonal = ({ signature, authToken, userid }) => {
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

    switch (sigMode) {

        case SIGN_TYPES.Personal.id:
            authRes = authPersonal({ signature: signature, authToken: authToken, userid: userid })
            break
        case SIGN_TYPES.MetamaskTyped.id:
            // Auth MetamaskTyped
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

    // console.log('User id ' + userid + ', token ' + authToken + ' signature ' + signature)
    if (err) {
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