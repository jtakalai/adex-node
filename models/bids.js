'use strict'

const db = require('./../mongoConnection').getDb()
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId
const Items = require('./items')
const { Bid } = require('adex-models')
const { getAddrFromSignedMsg } = require('./../services/web3/utils')

const bidsCollection = db.collection('bids')
const { BID_STATES } = constants.exchange

class Bids {
    placeBid({ bid, user }) {
        console.log('bid', bid)
        return this.addBidToDb({ user: user, bid: bid })
    }

    addBidToDb({ user, bid }) {
        return new Promise((resolve, reject) => {
            let bidInst = new Bid(bid)
            const signature = bidInst.signature

            getAddrFromSignedMsg({ sigMode: signature.sig_mode, signature: signature.signature, typedData: bidInst.typed, hash: signature.hash })
                .then((signAddr) => {

                    if (signAddr.toLowerCase() === user.toLowerCase()) {
                        Items.getItem({ id: bidInst.adUnitId, user: user })
                            .then((unit) => {
                                if (!unit) return reject('invalid ad unit')

                                console.log('unit', unit)
                                console.log('bidInst', bidInst)

                                bidInst.state = BID_STATES.DoesNotExist.id
                                bidInst.createdOn = Date.now() // bidInst.opened ?
                                bidInst.adUnitId = ObjectId(bidInst.adUnitId)
                                bidInst.advertiser = user.toLowerCase()
                                /*  NOTE: Ensure integer or string values
                                *   Maybe is safer as strings but that way some queries will be much faster 
                                *   The amount will be string
                                *   This should be done by models but the moment they are used for updating the dapp input fields
                                *   and that checks causes some problems.
                                * */
                                bidInst.target = parseInt(bidInst.target, 10)
                                bidInst.timeout = parseInt(bidInst.timeout, 10) // in seconds
                                bidInst.amount = bidInst.amount.toString()

                                //Db only
                                bidInst.sizeAndType = unit.sizeAndType // index
                                bidInst.clicksCount = 0 // Ensure it is 0 on creation 

                                if (bidInst.id !== bidInst.signature.hash) {
                                    return reject('Invalid bid hash (id)')
                                }

                                let dbBid = bidInst.plainObj()

                                //Only db props (not needed in the modedl yet)
                                dbBid.unconfirmedStateId = BID_STATES.DoesNotExist.id
                                dbBid.unconfirmedStateTrHash = null
                                dbBid.unconfirmedStateTime = 0 // TODO: set some timeout for confirmation
                                dbBid.confirmedEvents = []

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
            _advertiser: user.toLowerCase(),
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
            _advertiser: { $ne: user }, // TODO: keep all addresses in lower case
            // unconfirmedStateId: BID_STATES.Accepted.id
            // TODO: Maybe some timeout from  unconfirmedStateTime
        }

        return this.getBids(query)
    }

    getSlotBids({ user, adSlot }) {
        // NOTE: Select by adslot ipfs because it is set by exchange event LogBidAccepted
        // TODO: maybe we need to get the mongo _id when set but now this is set by bulkWrite and look good
        let query = {
            _publisher: user,
            _adSlot: adSlot
        }

        return this.getBids(query)
    }

    // Bids for adslot adview (iframe)
    getActiveBidsAdUnitsForSlot({ adSlot }) {
        let query = {
            _state: BID_STATES.Accepted.id,
            _adSlot: adSlot, // SLOT ipfs from web3 event
            $expr: { $lt: ["$clicksCount", "$_target"] }
        }

        let project = {
            _adUnit: 1, // ipfs
            _adUnitId: 1
        }

        return this.getBids(query, project)
    }

    getPublisherBids({ user }) {
        const query = {
            _publisher: user
        }

        return this.getBids(query)
    }

    getAdvertiserBids({ user }) {
        const query = {
            _advertiser: user
        }

        return this.getBids(query)
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

        // console.log('query', query)
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

    bulkWriteBids(bulk = []) {
        return new Promise((resolve, reject) => {
            if (!bulk.length) {
                return resolve('bulkWriteBids nothing to update')
            }

            bidsCollection
                .bulkWrite(bulk, (err, res) => {
                    if (err) {
                        console.log('bulkWriteBids err', err)
                        return reject(err)
                    }

                    // console.log('bulkWriteBids res', res)

                    resolve(res.result)
                })
        })
    }

    getBid({ id }) {
        return new Promise((resolve, reject) => {
            bidsCollection
                .findOne({
                    _id: id
                }, (err, item) => {
                    if (err) {
                        console.log('getBid', err)
                        return reject(err)
                    }

                    if (!item) {
                        reject('Bid with id: ' + id + ' not found!')
                    }

                    // console.log('getItemById', item)
                    return resolve(item)
                })
        })
    }
}

module.exports = new Bids()