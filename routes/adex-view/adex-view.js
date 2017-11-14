'use strict';

const express = require('express');
var router = express.Router();

router.get('/adexview', function (request, response) {
    let jsonp = request.query.callback
    console.log('jsonp', jsonp)

    let result = {
        imgSrc: 'http://adex.network/adex/adex-logo-w-txt.png'
    }

    let resStr = JSON.stringify(result)

    response.send(jsonp + '(' + resStr + ')')
});

module.exports = router;