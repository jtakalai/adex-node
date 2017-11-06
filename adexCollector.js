#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');

const pid = process.pid;

var app = new express();
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));

var redisClient = null;

var endpoints = ['impression', 'click', 'leave'];
for (var i in endpoints)
	registerEndpont(i);

function registerEndpont(which) {
	console.log('[' + pid + '] ' + 'Register endpoint ' + which + ' /' + endpoints[which]);
	app.get('/' + endpoints[which], function(request, response) {
		var bid = JSON.parse(request.query.bid);
		console.log('Received endpoint request, data ' + endpoints[which] +
		 ' start at ' + request.query.start + ' end at ' + request.query.end);
		if (request.query.start === undefined && request.query.end === undefined) {
			redisClient.scard([bid + ':' + endpoints[which]], (err, result) => {
				if (err)
					throw err;
				response.json(result);
			});
		} else {
			redisClient.smembers([bid + ':' + endpoints[which]], (err, result) => {
				if (err)
					throw err;

				var sresults = 0;
				if (request.query.start === undefined)
					request.query.start = 0;
				if (request.query.end === undefined)
					request.query.end = Date.now();

				for (var which in result) {
					var entry = JSON.parse(result[which]);
					var when = Date.parse(entry.time);
					if (Math.floor(when/1000) >= request.query.start &&
					  Math.floor(when/1000) <= request.query.end) {
						sresults += 1;
					}
				}
				response.json(sresults);
			});
		}
	});
}

function submitEntry(payload, response) {
	var jsonPayload = {
		uid: payload.uid,
		time: payload.time,
		adunit: payload.adunit
	}
	redisClient.sadd([payload.bid + ':' + payload.type, JSON.stringify(jsonPayload)],
	 (err, result) => {
		if (err || result != 1) {
			console.log('Add entry failed (' + result + ') ' + err);
			console.log('Failed ' + JSON.stringify(payload));
		}
	  response.redirect('/');
  });
}

app.post('/submit', function(request, response) {
	var signature = request.query.signature;
	// XXX: TODO - verify signature is valid
    var payload = JSON.parse(request.query.data);
    console.log('Received request from ' + signature + ', data ' + JSON.stringify(payload));
	submitEntry(payload, response);
});

app.get('/', function(request, response) {
    response.send('Nothing here');
});

redisInit();
http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

function redisInit() {
	redisClient = redis.createClient();
	redisClient.on('ready',function() {
		console.log('Redis is ready');
	});
	redisClient.on('error',function() {
		process.exit(1);
	});
}
