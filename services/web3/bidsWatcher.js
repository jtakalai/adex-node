const constants = require('adex-constants')
const { helpers } = require('adex-models')
const { web3, cfg, token, exchange, web3Utils } = require('./ADX')
const redisClient = require('./../../redisInit')
const { BID_STATES, BidStatesEventNames } = constants.exchange
const Bids = require('./../../models/bids')

const LAST_BLOCK_KEY = 'lastEthBlockSynced'

// event LogBidAccepted(uint bidId, address advertiser, bytes32 adunit, address publisher, bytes32 adslot, uint acceptedTime);
// event LogBidCanceled(uint bidId);
// event LogBidExpired(uint bidId);
// event LogBidCompleted(uint bidId, bytes32 advReport, bytes32 pubReport);

const getLastSyncedBlock = () => {
    return new Promise((resolve, reject) => {
        redisClient.get(LAST_BLOCK_KEY, (err, reply) => {
            if (err) {
                return reject(err)
            }

            return resolve(reply || 0)
        })
    })
}

const setLastSyncedBlock = (blockNumber) => {
    return new Promise((resolve, reject) => {
        redisClient.set(LAST_BLOCK_KEY, blockNumber, (err, reply) => {
            if (err) {
                return reject(err)
            }

            return resolve(blockNumber)
        })
    })
}

const checkEvents = () => {
    setTimeout(syncEvents, 30 * 1000)
}

const syncEvents = () => {

    let getSynced = getLastSyncedBlock()
    let getLatest = web3.eth.getBlockNumber()
    let prevSynced = 0
    let latestSynced = 0

    Promise.all([getSynced, getLatest])
        .then(([synced, latest]) => {
            synced = parseInt(synced, 10)
            console.log('sync]ed latest', synced, latest)
            prevSynced = synced
            latestSynced = latest

            // We assume that the events are already synced and dont need to update the bids again
            // TODO: check it!
            if (synced === latest) {
                return []
            } else {
                return exchange.getPastEvents('allEvents', { fromBlock: synced, toBlock: latest })
            }
        })
        .then((events) => {
            console.log('allEvents events', events)

            return updateDbBids(events)
        })
        .then(() => {
            return setLastSyncedBlock(latestSynced)
        })
        .then(() => {
            checkEvents()
        })
        .catch((err) => {
            console.log('allEvents err', err)
            return checkEvents()
        })
}

const init = () => {
    web3.eth.net.isListening()
        .then(() => {
            console.log('is connected')
            syncEvents()
        })
        .catch((err) => console.log('web3 isListening err', err))
}

// TODO: move this functions to the bids
const mapLogBidAccepted = (ev) => {
    let returnValues = ev.returnValues

    return {
        updateOne: {
            filter: { _id: returnValues.bidId },
            update: {
                $set: {
                    _publisher: returnValues.publisher,
                    _adSlot: helpers.from32BytesHexIpfs(returnValues.adslot), //It come in hex from ipfs hash, TODO: keep the hex value for the adunit in the db as it is on the contract? 
                    _acceptedTime: parseInt(returnValues.acceptedTime, 10),
                    _state: BID_STATES.Accepted.id
                },
                $push: {
                    confirmedEvents: ev
                }
            }
        }
    }
}

const mapLogBidCanceled = (ev) => {
    return {}
    //TODO:
}

const mapLogBidExpired = (ev) => {
    return {}
    //TODO:
}

const mapLogBidCompleted = (ev) => {
    return {}
    //TODO:
}

const mapEventToDbOperations = (ev) => {
    switch (ev.event) {
        case BID_STATES.Accepted.eventName:
            return mapLogBidAccepted(ev)
        case BID_STATES.Canceled.eventName:
            return mapLogBidCanceled(ev)
        case BID_STATES.Expired.eventName:
            return mapLogBidExpired(ev)
        case BID_STATES.Completed.eventName:
            return mapLogBidCompleted(ev)

        default:
            return null
    }
}

const updateDbBids = (events = []) => {
    let bulkWriteEvents = events.map((ev) => {
        delete ev.raw
        delete ev.signature
        delete ev.blockHash
        delete ev.returnValues[0]
        delete ev.returnValues[1]
        delete ev.returnValues[2]
        delete ev.returnValues[3]
        delete ev.returnValues[4]
        delete ev.returnValues[5]

        return mapEventToDbOperations({ ...ev })

    })

    // console.log('bulkWriteEvents', bulkWriteEvents)

    return Bids.bulkWriteBids(bulkWriteEvents)
}

module.exports = init

/**
 * allEvents result
 * events [ { address: '0x6387622BD50fDDDA242384e34CF4CD45F535a2eF',
    blockNumber: 2666766,
    transactionHash: '0xfb22ce2eee959ee08cabfd1735477c61936112e97e8debe1a7d2f61a9232411f',
    transactionIndex: 8,
    blockHash: '0xa58a46754b4961472598a63c307711f472a5fcbb7cc6e7391e539195b3ff88b1',
    logIndex: 15,
    removed: false,
    id: 'log_4ebc6ad4',
    returnValues:
     Result {
       '0': '0xc48bb5bdba62c4e3696957230266e62ae20d2913b036fc285fe316340831f459',
       '1': '0xB13Bf2A078Bf328B6C72D53129cdC61c940f4642',
       '2': '0xd2bc7c63b8b22e152c184b21c7da70fee87a6e15428332171b7fe552485248f3',
       '3': '0x0f8302dFA3FAedc5736d2094691F054b9D7Cbf99',
       '4': '0xc69caaa4c7e45f848b14a900f242dd10e7e0b9cc75cb2ef1f3e7879a7c5b7772',
       '5': '1518824437',
       bidId: '0xc48bb5bdba62c4e3696957230266e62ae20d2913b036fc285fe316340831f459',
       advertiser: '0xB13Bf2A078Bf328B6C72D53129cdC61c940f4642',
       adunit: '0xd2bc7c63b8b22e152c184b21c7da70fee87a6e15428332171b7fe552485248f3',
       publisher: '0x0f8302dFA3FAedc5736d2094691F054b9D7Cbf99',
       adslot: '0xc69caaa4c7e45f848b14a900f242dd10e7e0b9cc75cb2ef1f3e7879a7c5b7772',
       acceptedTime: '1518824437' },
    event: 'LogBidAccepted',
    signature: '0xba7607bfc80a9f9b722cc2275ac9dcd8578ce60c42b34bb7f435a020692f6741',
    raw:
     { data: '0xc48bb5bdba62c4e3696957230266e62ae20d2913b036fc285fe316340831f459000000000000000000000000b13bf2a078bf328b6c72d53129cdc61c940f4642d2bc7c63b8b22e152c184b21c7da70fee87a6e15428332171b7fe552485248f30000000000000000000000000f8302dfa3faedc5736d2094691f054b9d7cbf99c69caaa4c7e45f848b14a900f242dd10e7e0b9cc75cb2ef1f3e7879a7c5b7772000000000000000000000000000000000000000000000000000000005a876bf5',
 */