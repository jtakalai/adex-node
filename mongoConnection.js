'use strict'

const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017')

const mongodb = mongoose.connection

mongodb.on('error', console.error.bind(console, 'connection error:'))
mongodb.once('open', () => {
    console.log('mongo db connection ready')
})

module.exports = mongodb