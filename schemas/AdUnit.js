'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

// TODO: extend base schema
let AdUnitSchema = new Schema({
    user: String,
    itemObj: Object,
    ipfs: String,
    size: String, // TODO: At the moment is string 
    description: String,
    updated: Number
})

module.exports = AdUnitSchema