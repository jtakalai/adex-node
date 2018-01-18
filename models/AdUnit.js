'use strict'

const mongoose = require('mongoose')
const AdUnitSchema = require('./../schemas/AdUnit')
const BaseSchema = require('./../schemas/BaseSchema')
const Base = require('./Base')

class AdUnit extends Base {
    constructor() {
        super()
        this.adUnitSchema = AdUnitSchema
        let Base = mongoose.model('Base', this.baseSchema)
        this.adUnitModel = this.baseModel.discriminator('AdUnit', this.adUnitSchema)
    }

    get adUnitModel() { return this._adUnitModel }
    set adUnitModel(value) { this._adUnitModel = value }

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
        let respItem = { ...newAdUnit.itemObj }
        respItem._id = newAdUnit.itemObj

        return respItem
    }
}

module.exports = new AdUnit()