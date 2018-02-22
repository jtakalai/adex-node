const Web3 = require('web3')

const tokenAbi = require('./abi/ADXToken')
const exchangeAbi = require('./abi/ADXExchange')
const web3Utils = Web3.utils

const cfg = {
    node: process.env.WEB3_NODE || 'https://parity.wings.ai',
    addr: {
        token: process.env.ADX_TOKEN_ADDR || '0x4470BB87d77b963A013DB939BE332f927f2b992e',
        exchange: process.env.ADX_EXCHANGE_ADDR || '0x67c9232f2F449f7Acd4dd784cC1F20395Af5baAe'
    }
}

let provider = new Web3.providers.HttpProvider(cfg.node)
let web3 = new Web3(provider)

let token = new web3.eth.Contract(tokenAbi, cfg.addr.token)
let exchange = new web3.eth.Contract(exchangeAbi, cfg.addr.exchange)

module.exports = {
    web3: web3,
    cfg: cfg,
    token: token,
    exchange: exchange,
    web3Utils: web3Utils
}