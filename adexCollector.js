#!/usr/bin/env node
'use strict';

const http = require('http');
const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');
const scripto = require('redis-scripto');

const pid = process.pid;

var app = new express();
app.set('port', process.env.PORT || 8080);
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));

var redisClient = null;
var scriptManager = null;

var endpoints = ['impression', 'click', 'leave'];
for (var i in endpoints)
	registerEndpont(i);

function registerEndpont(which) {
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
	var signature = request.query.signature;
	// XXX: TODO - verify signature is valid
    var payload = JSON.parse(request.query.data);
    // console.log('Received request from ' + signature + ', data ' + JSON.stringify(payload));
	submitEntry(payload, response);
});

app.get('/', function(request, response) {
    response.send('Nothing here');
});

redisInit();
redisLoadScript();

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

function redisLoadScript()
{
	scriptManager = new scripto(redisClient);
	scriptManager.loadFromFile('timefilter', './zcount.lua');
}
