'use strict'

const MongoClient = require('mongodb').MongoClient
const PredefinedTags = require('./predefinedTags').PredefinedTags

var dbPort = process.env.MONGO_PORT || 27017;
var dbPassword = process.env.MONGO_PASSWD || 'oCeigu2thah7zaepeer8Lohhahng2iod';
var dbUser = process.env.MONGO_USER || 'admin';
var dbPrimary = process.env.MONGO_PRIMARY || 'testcluster0-shard-00-00-xy29f.mongodb.net'
var dbSecondary1 = process.env.MONGO_SECONDARY1 || 'testcluster0-shard-00-02-xy29f.mongodb.net'
var dbSecondary2 = process.env.MONGO_SECONDARY2 || 'testcluster0-shard-00-02-xy29f.mongodb.net'
var dbReplicaSet = process.env.MONGO_REPLICASET || 'TestCluster0-shard-0'

var uri = 'mongodb://' + dbUser + ':' + dbPassword + '@' + dbPrimary + ":" + dbPort + ',' +
    dbSecondary1 + ":" + dbPort + ',' + dbSecondary2 + ":" + dbPort + ',' +
    '/test?ssl=true&replicaSet=' + dbReplicaSet + '&authSource=admin'

const dbName = 'adexnode'
const Indexing = require('./models/indexing')

let db = null

function connect(cb) {
    MongoClient.connect(uri, (err, client) => {
        if (err) {
            console.log('MongoDb connection error', err)
        } else {

            console.log('Connected successfully to server')
            db = client.db(dbName)

            Indexing.createIndexes(db)

            db.collection('tags').insertMany(PredefinedTags, (err, res) => {
                if (err) {
                    console.log('Insert PredefinedTags err', err)
                }
            })
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
