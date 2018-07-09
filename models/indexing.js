function createIndexes(db) {
    db.collection('items').createIndex({ _deleted: 1, sizeAndType: 1 })
    db.collection('items').createIndex({ user: 1, _deleted: 1, type: 1 })
    db.collection('items').createIndex({ _ipfs: 1 })
    db.collection('items_collection').createIndex({ user: 1, _deleted: 1, type: 1 })
    db.collection('bids').createIndex({ _state: 1, _adSlotId: 1 }) //_adSlot index by ipfs?
}

module.exports = {
    createIndexes: createIndexes
}