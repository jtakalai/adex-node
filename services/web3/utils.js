const sigUtil = require('eth-sig-util')
const ethereumjs = require('ethereumjs-util')
const { toBuffer, ecrecover, pubToAddress } = ethereumjs
const { web3, web3Utils } = require('./ADX')

const getAddrFromPersonalSignedMsg = ({ signature, msg }) => {
    return new Promise((resolve, reject) => {
        let user
        try {
            user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(msg), signature)
            resolve(user)
        } catch (err) {
            reject(err)
        }
    })
}

const getAddrFromEipTypedSignedMsg = ({ signature, typedData }) => {
    return new Promise((resolve, reject) => {
        let user

        try {
            user = sigUtil.recoverTypedSignature({
                data: typedData,
                sig: signature
            })
            resolve(user)
        } catch (err) {
            reject(err)
        }
    })
}

const getRsvFromSig = (sig) => {
    sig = sig.slice(2)

    var r = '0x' + sig.substring(0, 64)
    var s = '0x' + sig.substring(64, 128)
    var v = parseInt(sig.substring(128, 130), 16)

    return { r: r, s: s, v: v }
}

const getAddrFromTrezorSignedMsg = ({ signature, hash }) => {
    return new Promise((resolve, reject) => {
        let user
        try {
            let msg = web3Utils.soliditySha3('\x19Ethereum Signed Message:\n\x20', hash)
            let sig = getRsvFromSig(signature)
            let pubKey = ecrecover(toBuffer(msg), sig.v, toBuffer(sig.r), toBuffer(sig.s))
            let addr = pubToAddress(pubKey)
            addr = '0x' + addr.toString('hex')

            resolve(addr)
        } catch (err) {
            reject(err)
        }
    })
}

module.exports = {
    getAddrFromPersonalSignedMsg: getAddrFromPersonalSignedMsg,
    getAddrFromEipTypedSignedMsg: getAddrFromEipTypedSignedMsg,
    getAddrFromTrezorSignedMsg: getAddrFromTrezorSignedMsg
}
