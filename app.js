#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const session = require('express-session');
const headerParser = require('header-parser');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongodb = require('./mongoConnection')
const RedisStore = require('connect-redis')(session);

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
	app.use(cookieParser());

	app.use(session({
		store: new RedisStore({
			host: 'adex-redis',
			logErrors: true
		}),
		key: 'userid',
		secret: 'ooShaethophai8to',
		resave: false,
		saveUninitialized: false,
		cookie: {
			expires: 600000
		}
	}));

	// TODO: Do we origin * ?
	app.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*")
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, useraddres")
		res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
		next()
	});

	// route for user Login
	app.route('/login')
		.get((req, res) => {
			res.cookie('authToken', Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
			res.sendFile(__dirname + '/login.html');
		})
		.post((req, res) => {
			var userid = req.body.userid,
				signature = req.body.signature;

			// console.log('User id ' + req.body.userid + ', token ' + req.cookies.authToken + ' signature ' + req.body.signature);

			if (req.session === undefined) {
				res.status(500).send('Internal error');
				return;
			}

			try {
				var user = web3.eth.accounts.recover(web3.eth.accounts.hashMessage(req.cookies.authToken), signature);
			} catch (err) {
				console.log('Error verifying signature ' + err);
				res.status(401).send('Error verifying signature ' + err);
				return;
			}

			if (user === userid) {
				req.session.user = user;
				res.redirect('/');
			} else {
				res.redirect('/login');
			}
		});

	app.use((req, res, next) => {
		// TODO: validation, session, ... etc.
		// TEMP!!
		if (!req.session || !req.session.user) {
			res.redirect('/login');
		} else {
		    req.user = req.headers['useraddres']
		    next()
		}
	})


	http.createServer(app).listen(app.get('port'), function () {
		console.log("Express server listening on port " + app.get('port'));
	});

	// Not used in adexview and collector this branch
	// app.use('/', require('./routes/adex-collector/collector'))
	// app.use('/', require('./routes/adex-view/adex-view'))
	app.use('/', require('./routes/registry/items'))
	app.use('/', require('./routes/registry/exchange'))
}
