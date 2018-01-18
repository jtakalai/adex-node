'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

// TODO: extend base schema
let AdUnitSchema = new Schema({
    size: String, // TODO: At the moment is string
})

module.exports = AdUnitSchema