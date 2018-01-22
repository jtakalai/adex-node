function createIndexes(db) {
    db.collection('items').createIndex({ sizeAndType: 1, _deleted: 1 })
    db.collection('items').createIndex({ user: 1, type: 1, _deleted: 1 })
}

module.exports = {
    createIndexes: createIndexes
}