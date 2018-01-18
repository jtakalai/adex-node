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
}

module.exports = Base