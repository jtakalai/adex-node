#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const headerParser = require('header-parser');
const bodyParser = require('body-parser');

var app = new express();
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'pug');
app.use(headerParser);
app.use(bodyParser.urlencoded({ extended: false }));


http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

app.use('/', require('./routes/adex-collector/collector'))