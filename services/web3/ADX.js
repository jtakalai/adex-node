const Web3 = require('web3')

const tokenAbi = require('./abi/ADXToken')
const exchangeAbi = require('./abi/ADXExchange')
const web3Utils = Web3.utils

const testrpcCfg = {
    node: 'https://ropsten.infura.io/metamask',

    addr: {
        token: '0xD06632e3916776e781d66A7A08ffBb77271742F7',
        exchange: '0x6387622bd50fddda242384e34cf4cd45f535a2ef'
    }
}

const mainnetCfg = {
    node: process.env.WEB3_NODE || 'https://parity.wings.ai',
    addr: {
        token: process.env.ADX_TOKEN_ADDR || '0x4470BB87d77b963A013DB939BE332f927f2b992e',
        exchange: process.env.ADX_EXCHANGE_ADDR || '0x912b8f85E28B9ec196b48228159E2f13546836e6'
    }
}

let cfg

if (process.env.NODE_ENV === 'production') {
    cfg = mainnetCfg
} else {
    cfg = mainnetCfg
}

let provider = new Web3.providers.HttpProvider(cfg.node)
let web3 = new Web3(provider)

let token = new web3.eth.Contract(tokenAbi, cfg.addr.token)
let exchange = new web3.eth.Contract(exchangeAbi, cfg.addr.exchange)

console.log(process.env.NODE_ENV + ': ' + process.env.ADX_EXCHANGE_ADDR + ', ' + cfg.addr.exchange)

module.exports = {
    web3: web3,
    cfg: cfg,
    token: token,
    exchange: exchange,
    web3Utils: web3Utils
}
