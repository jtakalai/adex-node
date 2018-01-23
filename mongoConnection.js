'use strict'

const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://admin:27017'
const dbName = 'adexnode'
const Indexing = require('./models/indexing')

let db = null

function connect(cb) {
    MongoClient.connect(url, (err, client) => {
        if (err) {
            console.log('MongoDb connection error', err)
        } else {

            console.log("Connected successfully to server")
            db = client.db(dbName)

            Indexing.ctrateIndexes(db)
        }

        return cb(err)
    })
}
function getDb(callback) {
    return db
}

module.exports = {
    connect: connect,
    getDb: getDb
}
