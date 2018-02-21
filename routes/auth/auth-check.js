'use strict'

const express = require('express')
const router = express.Router()

router.get('/auth-check', (req, res) => {
    if (req.user) {
        res.send(true)
    } else {
        res.status(403).send({ error: 'Authentication required' })
    }
})

module.exports = router