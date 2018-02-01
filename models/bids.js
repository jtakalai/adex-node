'use strict'

const db = require('./../mongoConnection').getDb()
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId
const Items = require('./items')
const { Bid } = require('adex-models')

const bidsCollection = db.collection('bids')

class Bids {
    placeBid({ bid, user }) {
        let createdOn = Date.now()

        bid.createdOn = createdOn

        return this.addBidToDb({ user: user, bid: bid })
    }

    addBidToDb({ user, bid, createdOn }) {
        return new Promise((resolve, reject) => {
            Items.getItem({ id: bid.adUnit })
                .then((unit) => {
                    let createdOn = Date.now()
                    let bidInst = new Bid(bid)
                    bid.state = constants.exchange.BID_STATES.DoesNotExist.id
                    bidInst.createdOn = createdOn
                    bidInst.adUnit = ObjectId(bid.adUnit)
                    bidInst.advertiser = user

                    //Db only
                    bidInst.sizeAndType = unit.sizeAndType // index

                    let dbBid = bidInst.plainObj()
                    
                    // NOTE: to be sure that mongo will give the id
                    delete dbBid._id

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
        })
    }

    getAdUnitBids({ user, adUnit }) {
        let query = {
            _advertiser: user,
            _adUnit: ObjectId(adUnit)
        }

        return this.getBids(query)
    }

    getNotAcceptedBidsBySizeAndType({ sizeAndType }) {
        // NOTE: we can send adSlot id, get the slot, get the size and type index but that way is faster
        let query = {
            sizeAndType: parseInt(sizeAndType),
            _state: constants.exchange.BID_STATES.DoesNotExist.id
        }

        return this.getBids(query)
    }

    getSlotBids({ user, adSlot }) {
        let query = {
            _publisher: user,
            _adSlot: ObjectId(adSlot)
        }

        return this.getBids(query)
    }

    getBids(query) {
        return new Promise((resolve, reject) => {
            bidsCollection
                .find(query)
                .toArray((err, result) => {
                    if (err) {
                        console.log('getBids err', err)
                        return reject(err)
                    }

                    return resolve(result)
                })
        })
    }
}

module.exports = new Bids()