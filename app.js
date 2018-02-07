#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const session = require('express-session');
const headerParser = require('header-parser');
const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
const mongodb = require('./mongoConnection')
// const RedisStore = require('connect-redis')(session);
var redisClient = require('./redisInit')

const Web3 = require('web3');
var web3 = new Web3();

//TODO: fix db connection
mongodb.connect((err) => {
	initApp()
})

const initApp = () => {
	var app = new express();
	app.set('port', process.env.PORT || 9710);
	app.set('view engine', 'pug');
	app.use(headerParser);
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json())

	app.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*")
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, usersignature, authtoken")
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
		next()
	})

	const signatureCheck = ((req, res, next) => {
		let usersig = req.headers['usersignature']

		if (usersig) {
			redisClient.get('session:' + usersig, (err, reply) => {

				if (err) {
					console.log('redis err', err)
					res.status(500).send('Internal error');
				}
				if (reply) {
					console.log('reply:', reply.toString())
					req.user = reply.toString()
					return next()
				} else {
					res.status(401).send('Authentication failed');
				}
			})
		} else {
			console.log('UserSignature header missing');
			res.status(403).send('Authentication required');
		}
	})

	http.createServer(app).listen(app.get('port'), function () {
		console.log("Express server listening on port " + app.get('port'))
	})

	// Not used in adexview and collector this branch
	// app.use('/', require('./routes/adex-collector/collector'))
	// app.use('/', require('./routes/adex-view/adex-view'))
	app.use('/', require('./routes/auth/auth'))
	app.use('/', signatureCheck, require('./routes/registry/items'))
	app.use('/', signatureCheck, require('./routes/registry/exchange'))
}
