'use strict'

const db = require('./../mongoConnection').getDb()
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId

const itemsCollection = db.collection('items')
const itemsCollectionCollection = db.collection('items_collection')

class Items {
    getCollectionByItemType(type) {
        if (type === 'items') return itemsCollection
        if (type === 'collection') return itemsCollectionCollection
    }

    addItem(item, user) {
        let createdOn = Date.now()
        let ipfsMeta = item._meta
        ipfsMeta.createdOn = createdOn
        ipfsMeta.owner = user

        if (constants.items.ItemIpfsByTypeId[item._type]) {
            return ipfs.addFileToIpfs(JSON.stringify(ipfsMeta))
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
                _items: [],
                _meta: meta, // the _meta as in ipfs
                _ipfs: ipfs,
                sizeAndType: sizeAndType,
                _createdOn: createdOn || Date.now(),
                _modifiedOn: undefined,
                _deleted: false,
                _archived: false
            }

            this.getCollectionByItemType(constants.items.ItemTypeByTypeId[item._type])
                .insertOne(dbItem, (err, result) => {
                    if (err) {
                        console.log('insertOne err', err)
                        return reject(err)
                    }

                    return resolve(dbItem)
                })
        })
    }

    flagItemDeleted({ id, type, user }) {
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType(constants.items.ItemTypeByTypeId[type])
                .findOneAndUpdate({ user: user, _id: ObjectId(id) },
                {
                    $set: {
                        _deleted: true
                    }
                },
                { returnNewDocument: true }
                , (err, res) => {
                    if (err) {
                        console.log('flagItemDeleted', err)
                        return reject(err)
                    }

                    console.log(res)
                    return resolve(res.value || {})
                })
        })
    }

    getUserItems(user, type) {
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType(constants.items.ItemTypeByTypeId[type])
                .find({ user: user, type: parseInt(type), _deleted: false })
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

    itemToItem({ user, type, item, collection, action }) {
        let dbAction = {}

        if (action === 'add') {
            dbAction = {
                $addToSet: {
                    _items: [ObjectId(collection)]
                }
            }
        } else if (action === 'remove') {
            dbAction = {
                $pull: {
                    _items: [ObjectId(collection)]
                }
            }
        }

        return new Promise((resolve, reject) => {
            this.getCollectionByItemType('items')
                .updateOne(
                { user: user, _id: ObjectId(item) },
                dbAction,
                { returnNewDocument: true },
                (err, res) => {
                    if (err) {
                        console.log('addItemToItem', err)
                        return reject(err)
                    }

                    // console.log(res)
                    return resolve(res || {})
                })
        })
    }
}

module.exports = new Items()