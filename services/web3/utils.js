const sigUtil = require('eth-sig-util')
const ethereumjs = require('ethereumjs-util')
const { toBuffer, ecrecover, pubToAddress } = ethereumjs
const { web3, web3Utils } = require('./ADX')
let { SIGN_TYPES } = require('adex-constants').exchange

const getAddrFromPersonalSignedMsg = ({ signature, hash, msg }) => {
    return new Promise((resolve, reject) => {
        // NOTE: When we use LEDGER we sign typed data and the 'hash' from it
        // Currently we use personalMessahe hash for adview signature and it comes as msg
        // TODO: make it consistent
        const recoverFrom = hash || web3.eth.accounts.hashMessage(msg)
        let user
        try {
            user = web3.eth.accounts.recover(recoverFrom, signature)
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

getAddrFromSignedMsg = ({ sigMode, signature, hash, typedData, msg }) => {
    switch (sigMode) {

        case SIGN_TYPES.EthPersonal.id:
            // Ledger
            return getAddrFromPersonalSignedMsg({ signature: signature, hash: hash, msg })
        case SIGN_TYPES.Eip.id:
            // Metamask
            return getAddrFromEipTypedSignedMsg({ signature: signature, typedData: typedData })
        case SIGN_TYPES.Trezor.id:
            // Trezor
            return getAddrFromTrezorSignedMsg({ signature: signature, hash: hash })
        default:
            return Promise.reject('Invalid signature mode!')
    }
}
module.exports = {
    getAddrFromSignedMsg: getAddrFromSignedMsg
}
