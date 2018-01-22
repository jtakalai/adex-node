'use strict'

const db = require('./../mongoConnection').getDb()
const collection = db.collection('items')
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')

class Items {
    addItem(item, user) {
        let createdOn = Date.now()
        let ipfsMeta = item._meta
        ipfsMeta.createdOn = createdOn
        ipfsMeta.owner = user

        if (constants.ItemIpfsByType) {
            ipfs.addFileToIpfs(JSON.stringify(ipfsMeta))
                .then((itemIpfs) => {
                    return this.addItemToDb({ user: user, item: item, meta: ipfsMeta, itemIpfs, createdOn: createdOn })
                })
        } else {
            return this.addItemToDb({ user: user, item: item, meta: ipfsMeta, createdOn: createdOn })
        }
    }

    addItemToDb({ user, item, meta, ipfs = '', createdOn }) {
        return new Promise((resolve, reject) => {
            let sizeAndType = 0

            if (item._meta.adType && item._meta.size) {
                // TODO: potential bug if more than 9 ad types
                sizeAndType = parseInt(item._meta.adType + '' + item._meta.size)
            }

            let dbItem = {
                type: item._type, //unit / slot 
                user: user,
                _description: item._description, //Field only users info not in ipfs
                _meta: meta, // the _meta as in ipfs
                _ipfs: ipfs,
                sizeAndType: sizeAndType,
                _createdOn: createdOn || Date.now(),
                _modifiedOn: undefined,
                _deleted: false,
                _archived: false
            }

            collection.insertOne(dbItem, (err, result) => {
                if (err) {
                    console.log('insertOne err', err)
                    return reject(err)
                }

                return resolve(dbItem)
            })
        })
    }

    getUserItems(user, type) {
        return new Promise((resolve, reject) => {

            collection.find({ user: user, type: parseInt(type), _deleted: false })
                .project({
                    type: 1,
                    _description: 1,
                    _meta: 1,
                    _ipfs: 1,
                    _createdOn: 1,
                    _archived: 1
                })
                .toArray((err, result) => {
                    if (err) {
                        console.log('find items err', err)
                        return reject(err)
                    }

                    return resolve(result)
                })
        })
    }

    ctrateIndexes(db) {
        db.collection.createIndex({ user: String, sizeAndType: Number })
    }
}

module.exports = new Items()