const PredefinedTags = require('./../predefinedTags').PredefinedTags

const tagAction = (tag) => {
    return {
        updateOne: {
            filter: { _id: tag._id },
            upsert: true
        }
    }
}

const createIndexes = (db) => {
    db.collection('items').createIndex({ _deleted: 1, sizeAndType: 1 })
    db.collection('items').createIndex({ user: 1, _deleted: 1, type: 1 })
    db.collection('items').createIndex({ _ipfs: 1 })
    db.collection('items_collection').createIndex({ user: 1, _deleted: 1, type: 1 })
    db.collection('bids').createIndex({ _state: 1, _adSlotId: 1 }) //_adSlot index by ipfs?

    // TODO: make 'bids_v3' collection when ready
    db.collection('bids_v3_temp').createIndex({ _state: 1, _adUnit: 1 })

    db.collection('tags')
        .bulkWrite(
            PredefinedTags.map(tag => tagAction(tag)),
            (err, res) => {
                if (err) {
                    console.log('Insert PredefinedTags err', err)
                }

                console.log('Insert PredefinedTags res', res)
            })
}

module.exports = {
    createIndexes: createIndexes
}