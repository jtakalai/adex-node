'use strict'

const db = require('./../mongoConnection').getDb()
const ipfs = require('./../services/ipfs/ipfs')
const constants = require('adex-constants')
const ObjectId = require('mongodb').ObjectId
const { Item, Models } = require('adex-models')

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
                    return this.addItemToDb({ user: user, item: item, meta: ipfsMeta, ipfs: itemIpfs, createdOn: createdOn })
                })
        } else {
            return this.addItemToDb({ user: user, item: item, meta: ipfsMeta, createdOn: createdOn })
        }
    }

    addItemToDb({ user, item, meta, ipfs = '', createdOn }) {
        return new Promise((resolve, reject) => {
            let sizeAndType = Item.sizeAndType({ adType: meta.adType, size: meta.size })

            item._meta = meta
            let itemInst = new Models.itemClassByTypeId[item._type](item)

            let dbItem = itemInst.plainObj()
            dbItem._createdOn = createdOn
            dbItem._ipfs = ipfs
            dbItem.user = user
            dbItem.sizeAndType = itemInst.sizeAndType
            delete dbItem._id

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
        return this.updateOneItem({
            collection: this.getCollectionByItemType(constants.items.ItemTypeByTypeId[type]),
            query: { user: user, _id: ObjectId(id) },
            dbAction: {
                $set: {
                    _deleted: true
                }
            },
            returnOriginal: false
        })
    }

    getUserItems(user, type) {
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType(constants.items.ItemTypeByTypeId[type])
                .find({ user: user, _type: parseInt(type), _deleted: false })
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
        let itemsUpdate = { _items: ObjectId(collection) }

        if (action === 'add') {
            dbAction.$addToSet = itemsUpdate

        } else if (action === 'remove') {
            dbAction.$pull = itemsUpdate
        }

        return this.updateOneItem({
            collection: this.getCollectionByItemType('items'),
            query: { user: user, _id: ObjectId(item) },
            dbAction: dbAction,
            returnOriginal: false
        })
    }

    getCollectionItems({ user, type, id }) {
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType('items')
                .find({
                    user: user,
                    _items: ObjectId(id)
                })
                .toArray((err, result) => {
                    if (err) {
                        console.log('find items err', err)
                        return reject(err)
                    }

                    console.log('getCollectionByItemType result', result)
                    return resolve(result)
                })
        })
    }

    getItem({ id }) {
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType('items')
                .findOne({
                    _id: ObjectId(id)
                }, (err, item) => {
                    if (err) {
                        console.log('getItemById', err)
                        return reject(err)
                    }

                    // console.log('getItemById', item)
                    return resolve(item)
                })
        })
    }

    // TODO: make common function to call to db and make the methods just to set the query
    getItemsByIds({ ids }) {
        let items = {}
        return new Promise((resolve, reject) => {
            this.getCollectionByItemType('items')
                .find({
                    _id: { $in: ids }
                })
                .project({
                    _meta: 1,
                    _ipfs: 1
                })
                .forEach(
                    (item) => {
                        //TODO: maybe we should use _ipfs
                        items[item._id] = item
                    },
                    (err, res) => {
                        if (err) {
                            console.log('getItemsByIds err', err)
                            return reject([])
                        }

                        return resolve(items)
                    }
                )
        })

    }

    updateOneItem({ collection, query, dbAction, returnOriginal = false }) {
        return new Promise((resolve, reject) => {
            collection
                .findOneAndUpdate(
                    query,
                    dbAction,
                    { returnOriginal: returnOriginal },
                    (err, res) => {
                        if (err) {
                            console.log('updateOneItem', err)
                            return reject(err)
                        }

                        console.log('addItemToItem', res.value)
                        return resolve(res.value || {})
                    })
        })
    }
}

module.exports = new Items()