const constants = require('adex-constants')
const { helpers } = require('adex-models')
const { web3, cfg, token, exchange, web3Utils } = require('./ADX')
const redisClient = require('./../../redisInit')
const { BID_STATES, BidStatesEventNames } = constants.exchange
const Bids = require('./../../models/bids')
const { promisify } = require('util')

const LAST_BLOCK_KEY = 'lastEthBlockSynced-'
let eventsLoop = null

const getLastSyncedBlock = () => {
    return promisify(redisClient.get)
        .bind(redisClient)(LAST_BLOCK_KEY + cfg.addr.exchange)
        .then((res) => res || 0)
}

const setLastSyncedBlock = (blockNumber) => {
    return promisify(redisClient.set)
        .bind(redisClient)(LAST_BLOCK_KEY + cfg.addr.exchange, blockNumber)
}

const syncEvents = () => {
    let getSynced = getLastSyncedBlock()
    let getLatest = web3.eth.getBlockNumber()
    let prevSynced = 0
    let latestSynced = 0

    return Promise.all([getSynced, getLatest])
        .then(([synced, latest]) => {
            console.log('synced latest', synced, latest)
            synced = parseInt(synced, 10)
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
}

const syncEventsLoop = () => {
    if (eventsLoop) {
        clearTimeout(eventsLoop)
        eventsLoop = null
    }

    eventsLoop = setTimeout(checkEvents, 30 * 1000)
}

const checkEvents = () => {
    syncEvents()
        .then(() => {
            syncEventsLoop()
        })
        .catch((err) => {
            console.log('err', err)
            syncEventsLoop()
        })
}

const init = () => {
    web3.eth.net.isListening()
        .then(() => {
            console.log('is connected')
            checkEvents()
        })
        .catch((err) => console.log('web3 isListening err', err))
}

// TODO: move this functions to the bids
// event LogBidAccepted(uint bidId, address advertiser, bytes32 adunit, address publisher, bytes32 adslot, uint acceptedTime);
const mapLogBidAccepted = (ev) => {
    let returnValues = ev.returnValues

    return {
        updateOne: {
            filter: { _id: returnValues.bidId },
            update: {
                $set: {
                    _state: BID_STATES.Accepted.id,
                    _publisher: returnValues.publisher.toLowerCase(),
                    _adSlot: helpers.from32BytesHexIpfs(returnValues.adslot), //It come in hex from ipfs hash, TODO: keep the hex value for the adunit in the db as it is on the contract? 
                    _acceptedTime: parseInt(returnValues.acceptedTime, 10)
                },
                $addToSet: {
                    confirmedEvents: ev
                }
            }
        }
    }
}

// event LogBidCanceled(uint bidId);
const mapLogBidCanceled = (ev) => {
    let returnValues = ev.returnValues

    return {
        updateOne: {
            filter: { _id: returnValues.bidId },
            update: {
                $set: {
                    _state: BID_STATES.Canceled.id
                },
                $addToSet: {
                    confirmedEvents: ev
                }
            }
        }
    }
}

// event LogBidExpired(uint bidId);
const mapLogBidExpired = (ev) => {
    let returnValues = ev.returnValues

    return {
        updateOne: {
            filter: { _id: returnValues.bidId },
            update: {
                $set: {
                    _state: BID_STATES.Expired.id
                },
                $addToSet: {
                    confirmedEvents: ev
                }
            }
        }
    }
}

// event LogBidCompleted(uint bidId, bytes32 advReport, bytes32 pubReport);
const mapLogBidCompleted = (ev) => {
    let returnValues = ev.returnValues

    return {
        updateOne: {
            filter: { _id: returnValues.bidId },
            update: {
                $set: {
                    _state: BID_STATES.Completed.id,
                    _publisherConfirmation: helpers.from32BytesHexIpfs(returnValues.pubReport),
                    _advertiserConfirmation: helpers.from32BytesHexIpfs(returnValues.advReport)
                },
                $addToSet: {
                    confirmedEvents: ev
                }
            }
        }
    }
}

// event LogBidConfirmed(bytes32 bidId, address advertiserOrPublisher, bytes32 report);
const mapLogBidConfirmed = (ev) => {
    const returnValues = ev.returnValues
    const advertiserOrPublisher = returnValues.advertiserOrPublisher.toLowerCase()
    const report = helpers.from32BytesHexIpfs(returnValues.report)

    return operation = [
        {
            updateOne: {
                filter: { _id: ev.returnValues.bidId, _publisher: advertiserOrPublisher },
                update: {
                    $set: {
                        _publisherConfirmation: report
                    },
                    $addToSet: {
                        confirmedEvents: ev
                    }
                }
            }
        },
        {
            updateOne: {
                filter: { _id: returnValues.bidId, _advertiser: advertiserOrPublisher },
                update: {
                    $set: {
                        _advertiserConfirmation: report
                    },
                    $addToSet: {
                        confirmedEvents: ev
                    }
                }
            }
        }
    ]
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
        case 'LogBidConfirmed': // TEMP: Add it to constants 
            return mapLogBidConfirmed(ev)

        default:
            return null
    }
}

const updateDbBids = (events = []) => {
    let bulkWriteEvents = events.reduce((memo, ev) => {

        // NOTE: In meinnet thre are some undefined events
        if (ev && ev.event && ev.returnValues && typeof ev.returnValues === 'object') {
            let event = {
                address: ev.address,
                blockNumber: ev.blockNumber,
                transactionHash: ev.transactionHash,
                transactionIndex: ev.transactionIndex,
                logIndex: ev.logIndex,
                removed: ev.removed,
                id: ev.id,
                event: ev.event,
                returnValues: Object.keys(ev.returnValues).reduce((memo, key) => {
                    if (isNaN(key)) {
                        memo[key] = ev.returnValues[key]
                    }
                    return memo
                }, {})
            }

            let operation = mapEventToDbOperations(event)

            if (operation) {
                if (Array.isArray(operation)) {
                    memo = memo.concat(operation)
                } else {
                    memo.push(operation)
                }
            }
        }

        return memo
    }, [])

    // console.log('bulkWriteEvents', bulkWriteEvents)

    return Bids.bulkWriteBids(bulkWriteEvents)
}

module.exports = init