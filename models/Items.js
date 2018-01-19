'use strict'

const db = require('./../mongoConnection').getDb()
const collection = db.collection('items')

class Items {
    addItem(item, ipfs, user) {
        return new Promise((resolve, reject) => {
            let sizeAndType = 0

            if (item._meta.adType && item._meta.size) {
                sizeAndType = parseInt(item._meta.adType + item._meta.size)
            }

            let dbItem = {
                type: item._type, //unit / slot 
                user: user,
                description: item._description || item._meta.description, //Field only users info not in ipfs
                itemObj: item,
                ipfs: ipfs,
                sizeAndType: sizeAndType || 0
                //TODO: indexing, createdon, updatedon etc.
            }

            collection.insertOne(dbItem, (err, result) => {
                if (err) {
                    console.log('insertOne err', err)
                    return reject(err)
                }

                let responseItem = { ...result.ops[0].itemObj }
                responseItem._id = result.ops[0]._id

                return resolve(responseItem)

            })
        })
    }

    getUserItems(user, type) {
        return new Promise((resolve, reject) => {

            collection.find({ user: user, type: parseInt(type) }).project({ itemObj: 1, description: 1 }).toArray((err, result) => {
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