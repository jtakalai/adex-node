'use strict'

const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://localhost:27017'
const dbName = 'adexnode'

let db = null

function connect(cb) {
    MongoClient.connect(url, (err, client) => {
        if (err) {
            console.log('MongoDb connection error', err)
        }

        console.log("Connected successfully to server")
        db = client.db(dbName)

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