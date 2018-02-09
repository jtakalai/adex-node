const sigUtil = require('eth-sig-util')
const Web3 = require('web3')
let web3 = new Web3()

const getAddrFromPersonalSignedMsg = ({ signature, msg }) => {
    return new Promise((resolve, reject) => {
        let error = null,
            user
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

module.exports = {
    getAddrFromPersonalSignedMsg: getAddrFromPersonalSignedMsg,
    getAddrFromEipTypedSignedMsg: getAddrFromEipTypedSignedMsg
}
