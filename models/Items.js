'use strict'

const db = require('./../mongoConnection').getDb()

class Items {
    addItem(item, ipfs, user) {
        return new Promise((resolve, reject) => {
            let dbItem = {
                user: user,
                description: item._description || item._meta.description,
                itemObj: item,
                ipfs: ipfs,
                sizeAndType: item._meta.adType + item._meta.size
            }

            const collection = db.collection('items')

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
}

module.exports = new Items()