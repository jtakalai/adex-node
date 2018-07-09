'use strict'

const express = require('express')
const router = express.Router()

router.get('/auth-check', (req, res) => {
    if (req.user) {
        return res.send(JSON.stringify({ authenticated: true }))
    } else {
        return res.status(403).send({ error: 'Authentication required' })
    }
})

module.exports = router