'use strict'

const db = require('./../mongoConnection').getDb()
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId
const Items = require('./items')

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

                    //TODO: make adex-models package
                    let dbBid = {
                        state: 0, //TODO: fix it
                        adUnit: ObjectId(bid.adUnit),
                        advertiser: user,
                        amount: bid.amount,
                        target: bid.target,
                        timeout: bid.timeout,
                        sizeAndType: unit.sizeAndType,
                        acceptedTime: null,
                        publisherConfirmation: false,
                        advertiserConfirmation: false
                    }

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
}

module.exports = new Bids()