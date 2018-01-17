#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const headerParser = require('header-parser');
const bodyParser = require('body-parser');

var app = new express();
app.set('port', process.env.PORT || 7878);
app.set('view engine', 'pug');
app.use(headerParser);
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
app.use(bodyParser.text());

// TODO: Do we origin * ?
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});


http.createServer(app).listen(app.get('port'), function () {
	console.log("Express server listening on port " + app.get('port'));
});

// Not used in adexview and collector this branch
// app.use('/', require('./routes/adex-collector/collector'))
// app.use('/', require('./routes/adex-view/adex-view'))
app.use('/', require('./routes/registry/registry'))
