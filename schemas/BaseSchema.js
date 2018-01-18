'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema

let BaseSchema = new Schema({
    user: String,
    itemObj: Object,
    ipfs: String,
    description: String,
    updated: Number
})

module.exports = BaseSchema