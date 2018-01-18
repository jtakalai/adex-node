'use strict'

const mongoose = require('mongoose')
const AdUnitSchema = require('./../schemas/AdUnit')

class AdUnit {
    constructor() {
        this.adUnitSchema = AdUnitSchema
        this.adUnitModel = mongoose.model('AdUnit', this.adUnitSchema)
    }

    getAdUnitSchema() {
        return this.adUnitSchema
    }

    getAdUnitModel() {
        return this.adUnitModel
    }

    addNewAdUnit(item, ipfs) {
        let AdUnitModel = this.getAdUnitModel()
        let newAdUnit = new AdUnitModel({
            description: item._description || item._meta.description,
            itemObj: item,
            ipfs: ipfs,
            size: item._meta.size
        })

        newAdUnit.save()

        return newAdUnit
    }
}

module.exports = new AdUnit()