'use strict'

const mongoose = require('mongoose')
const BaseSchema = require('./../schemas/BaseSchema')

class Base {
    constructor() {
        this.baseSchema = BaseSchema
        this.baseModel = mongoose.model('Base', this.baseSchema)
    }

    get baseModel() { return this._baseModel }
    set baseModel(value) { this._baseModel = value }

    //TODO: Make Item class if needed
    getBaseParams(item, ipfs) {
        let baseParams = {
            description: item._description || item._meta.description,
            itemObj: item,
            ipfs: ipfs,
        }

        return baseParams
    }

    getResponseItem(item) {
        let respItem = { ...item.itemObj }
        respItem._id = item._id

        return respItem
    }
}

module.exports = Base