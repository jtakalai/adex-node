'use strict'

const db = require('./../mongoConnection').getDb()
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId
const Items = require('./items')
const { Bid } = require('adex-models')
const { getAddrFromEipTypedSignedMsg } = require('./../services/web3/utils')

const bidsCollection = db.collection('bids')
const BID_STATES = constants.exchange.BID_STATES

class Bids {
    placeBid({ bid, user }) {
        console.log('bid', bid)
        return this.addBidToDb({ user: user, bid: bid })
    }

    addBidToDb({ user, bid, createdOn }) {
        return new Promise((resolve, reject) => {
            let bidInst = new Bid(bid)
            let typedData = bidInst.typed

            getAddrFromEipTypedSignedMsg({ signature: bidInst.signature.signature, typedData: bidInst.typed })
                .then((signAddr) => {
                    console.log('signAddr', signAddr)
                    console.log('user', user)

                    if (signAddr.toLowerCase() === user.toLowerCase()) {
                        Items.getItem({ id: bidInst.adUnitId, user: user })
                            .then((unit) => {
                                if (!unit) return reject('invalid ad unit')

                                console.log('unit', unit)
                                console.log('bidInst', bidInst)

                                bidInst.state = BID_STATES.DoesNotExist.id
                                bidInst.createdOn = Date.now() // bidInst.opened ?
                                bidInst.adUnitId = ObjectId(bidInst.adUnitId)
                                bidInst.advertiser = user

                                //Db only
                                bidInst.sizeAndType = unit.sizeAndType // index

                                if (bidInst.id !== bidInst.signature.hash) {
                                    return reject('Invalid bid hash (id)')
                                }

                                let dbBid = bidInst.plainObj()

                                bidsCollection
                                    .insertOne(dbBid, (err, result) => {
                                        if (err) {
                                            console.log('addBidToDb err', err)
                                            return reject(err)
                                        }

                                        // console.log('addBidToDb dbItem', dbBid)
                                        return resolve(dbBid)
                                    })
                            })
                    }
                    else {
                        return reject('Invalid signature')
                    }
                })
                .catch((err) => {
                    return reject(err)
                })
        })
    }

    getAdUnitBids({ user, adUnitId }) {
        let query = {
            _advertiser: user,
            _adUnitId: ObjectId(adUnitId)
        }

        return this.getBids(query)
    }

    getNotAcceptedBidsBySizeAndType({ sizeAndType, user }) {
        // NOTE: we can send adSlot id, get the slot, get the size and type index but that way is faster
        let query = {
            sizeAndType: parseInt(sizeAndType),
            _state: BID_STATES.DoesNotExist.id,
            _signature: { $exists: true },
            _advertiser: { $ne: user } // TODO: keep all addresses in lower case
        }

        return this.getBids(query)
    }

    getSlotBids({ user, adSlotId }) {
        let query = {
            _publisher: user,
            _adSlotId: ObjectId(adSlotId)
        }

        return this.getBids(query)
    }

    getActiveBidsAdUnitsForSlot({ adSlotId }) {
        let query = {
            //NOTE: the query when everything works
            // _state: _state = BID_STATES.Accepted.id,
            // _adSlotId: ObjectId(adSlotId),
            // { $expr: { $lt: [ "$clicksCount" , "$_target" ] } } 

            //TEMP query
            _adSlotId: { $ne: null }
        }

        let project = {
            _adUnit: 1, // ipfs
            _adUnitId: 1
        }

        return this.getBids(query, project)
    }

    getBids(query, project = {}) {
        return new Promise((resolve, reject) => {
            bidsCollection
                .find(query)
                .project(project)
                .toArray((err, result) => {
                    if (err) {
                        // console.log('getBids err', err)
                        return reject(err)
                    }

                    return resolve(result)
                })
        })
    }

    addClicksToBid({ id, clicks = 1 }) {
        let query = { _id: id }
        let update = {
            $inc: { clicksCount: clicks }
        }

        return this.updateBid({ query: query, update: update })
    }

    addUnconfirmedState({ bidId, state, trHash, user }) {
        state = parseInt(state, 10)
        let query = {}

        switch (state) {
            case BID_STATES.Accepted.id:
                query = { _advertiser: { $ne: user } }
                break
            case BID_STATES.Canceled.id:
                query = { $or: [{ _advertiser: user }, { _publisher: user }] }
                break
            case BID_STATES.Expired.id:
                query = { _advertiser: user }
                break
            case BID_STATES.Completed.id:
                query = { $or: [{ _advertiser: user }, { _publisher: user }] }
                break
            default:
                break
        }

        query = Object.assign(query, { _id: bidId })

        console.log('query', query)
        let update = {
            $set: {
                unconfirmedStateId: state,
                unconfirmedStateTrHash: trHash,
                unconfirmedStateTime: Date.now() // TODO: set some timeout for confirmation
            }
        }

        return this.updateBid({ query: query, update: update })
    }


    updateBid({ query, update }) {
        return new Promise((resolve, reject) => {
            bidsCollection
                .updateOne(query,
                    update, (err, res) => {
                        if (err) {
                            console.log('addClicksToBid err', err)
                            return reject(err)
                        }

                        resolve(res.result)
                    })
        })
    }
}

module.exports = new Bids()