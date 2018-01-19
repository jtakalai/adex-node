function ctrateIndexes(db) {
    db.collection('items').createIndex({ user: 1, sizeAndType: 1 })
}

module.exports = {
    ctrateIndexes: ctrateIndexes
}