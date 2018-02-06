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
	app.use(bodyParser.json());
	// app.use(bodyParser.text());
	// app.use(cookieParser());

	app.use((req, res, next) => {
		//TODO: encrypted usersig?
		let usersig = req.headers['usersig']
		if (usersig) {
			redisClient.get(usersig, (err, reply) => {
				if (err) {
					console.log('redis err', err)
				}
				if (reply) {
					console.log('reply', reply.toString())
					req.signedUser = reply
				}

				return next()
			})
		} else {
			return next()
		}
	})

	app.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*")
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, useraddres, usersig")
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
		next()
	});

	app.use((req, res, next) => {
		// TODO: validation, session, ... etc.
		// TEMP!!
		// if (!req.session || !req.session.user) {
		// 	res.redirect('/login');
		// } else {
		req.user = req.headers['useraddres']
		next()
		// }
	})


	http.createServer(app).listen(app.get('port'), function () {
		console.log("Express server listening on port " + app.get('port'))
	})

	app.use('/', require('./routes/auth/auth'))

	// Not used in adexview and collector this branch
	// app.use('/', require('./routes/adex-collector/collector'))
	// app.use('/', require('./routes/adex-view/adex-view'))
	app.use('/', require('./routes/registry/items'))
	app.use('/', require('./routes/registry/exchange'))
}
