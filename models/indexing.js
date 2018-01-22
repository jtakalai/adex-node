function createIndexes(db) {
    db.collection('items').createIndex({ _deleted: 1, sizeAndType: 1 })
    db.collection('items').createIndex({ user: 1, _deleted: 1, type: 1 })
    db.collection('items_collection').createIndex({ user: 1, _deleted: 1, type: 1 })
}

module.exports = {
    createIndexes: createIndexes
}