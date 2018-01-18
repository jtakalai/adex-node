'use strict'

const mongoose = require('mongoose')
const AdUnitSchema = require('./../schemas/AdUnit')
const BaseSchema = require('./../schemas/BaseSchema')

class AdUnit {
    constructor() {
        this.baseSchema = BaseSchema
        this.adUnitSchema = AdUnitSchema

        let Base = mongoose.model('Base', this.baseSchema)

        this.adUnitModel = Base.discriminator('AdUnit', this.adUnitSchema)
    }

    addNewAdUnit(item, ipfs) {
        let AdUnitModel = this.adUnitModel
        let newAdUnit = new AdUnitModel({
            description: item._description || item._meta.description,
            itemObj: item,
            ipfs: ipfs,
            size: item._meta.size
        })

        newAdUnit.save()

        console.log('newAdUnit', newAdUnit)
        return newAdUnit
    }
}

module.exports = new AdUnit()