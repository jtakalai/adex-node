#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const redis = require('redis');
const headerParser = require('header-parser');
const bodyParser = require('body-parser');
const scripto = require('redis-scripto');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const ed25519 = require('ed25519');

const pid = process.pid;

var redisClient = null;
var scriptManager = null;
var endpoints = ['impression', 'click', 'leave'];

var app = new express();
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'pug');
app.use(headerParser);
app.use(bodyParser.urlencoded({ extended: false }));

redisInit();
redisLoadScript();

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

endpoints.forEach(function(element, index) {
	registerEndpoint(index);
});

function redisInit() {
	redisClient = redis.createClient();
	redisClient.on('ready',function() {
		console.log('Redis is ready');
	});
	redisClient.on('error',function(err) {
		if (err) console.error(err);
		process.exit(1);
	});
}

function redisLoadScript()
{
	scriptManager = new scripto(redisClient);
	scriptManager.loadFromFile('timefilter', './zcount.lua');
}

function registerEndpoint(which) {
	console.log('[' + pid + '] ' + 'Register endpoint ' + which + ' /' + endpoints[which]);
	app.get('/' + endpoints[which], function(request, response) {
		var whenStart = Date.now();
		var bid = JSON.parse(request.query.bid);
		// console.log('Received endpoint request, data ' + endpoints[which] +
		// ' start at ' + request.query.start + ' end at ' + request.query.end);
		if (request.query.start === undefined && request.query.end === undefined) {
			redisClient.zcard([bid + ':' + endpoints[which]], (err, result) => {
				if (err)
					throw err;
				var whenEnd = Date.now();
				response.json(result);
				// console.log('Zcard request took ' + (whenEnd - whenStart) + ' milliseconds');
			});
		} else {
			var whenStart = Date.now();
				if (request.query.start === undefined)
					request.query.start = 0;
				if (request.query.end === undefined)
					request.query.end = Date.now();
			var keys = [ request.query.start, request.query.end ];
			var values = [ bid + ':' + endpoints[which] ];
			// console.log('scriptManager.run to run keys ' + keys + ' values ' + values);
			scriptManager.run('timefilter', keys, values, function(err, result) {
				if (err) {
					console.log('scriptManager.run returned error');
					result = 0;
				}

				var whenEnd = Date.now();
				console.log('scriptManager.run request took ' + (whenEnd - whenStart) + ' milliseconds; ' + result);
				response.json(result);
			});
		}
	});
}

function submitEntry(payload, response) {
	redisClient.zadd([payload.bid + ':' + payload.type, Date.parse(payload.time),
	    'uid:' + payload.uid + ' adunit:' + payload.adunit], (err, result) => {
		if (err || result < 1) {
			console.log('Add entry failed (' + result + ') ' + err);
		}
	  response.redirect('/');
  });
}

app.post('/submit', function(request, response) {
	var whenStart = Date.now();
	var publicKey = request.get('X-public-key');
	var signature = nacl.util.decodeBase64(request.query.signature);
	var payload = JSON.parse(request.query.data);

	//console.log('Public key len is ' + publicKey + ', signature is ' + request.query.signature + ' data is ' + request.query.data);

	if (ed25519.Verify(new Buffer(request.query.data), signature, nacl.util.decodeBase64(publicKey))) {
		var whenEnd = Date.now();
		// console.log('submit signature verification took ' + (whenEnd - whenStart) + ' milliseconds;');
		submitEntry(payload, response);
	} else {
		console.log('Received invalid signature');
		response.sendStatus(400);
	}
});
