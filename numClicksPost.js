#!/usr/bin/env node
'use strict';

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var http = require('http');

var fileName = argv._[0];
if (fileName === undefined) {
	console.log('usage: ./numClicksPost <sample-data-file>' +
		' --signature=<valid-signature>' +
		' --server=<server-name>' +
		' --port=<server-port>');
	process.exit(1);
}

var data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

var signature = 'ababababababa';
var servername = 'localhost';
var serverport = 8080;
if (argv.signature) signature = argv.signature;
if (argv.server) servername = argv.server;
if (argv.port) serverport = argv.port;

console.log("Start");
var whenStart = Date.now();
var count = data.length, processed = 0, responses = 0;
var timer = null;

console.log('count is ' + count);

function submitRequest(which) {
	var options = {
	    host: servername,
	    port: serverport,
		path: '/submit?signature=' + signature + '&data=' + JSON.stringify(data[which]),
		method: 'POST',
	};
	var request = http.request(options, function(result) {	
		result.on('data', function() {
			responses += 1;
			processed ++;
			// console.log('Received response ' + responses);
		});
		request.on('error', function(err) {
			console.log('Error submitting data ' + JSON.stringify(data[which]));
			processed ++;
		});
	});
	// console.log('Submited data (' + which + ') ' + JSON.stringify(data[which]));
	request.end();
}

var REQUESTS_AT_ONCE = 200;
var iterations = Math.ceil(count / REQUESTS_AT_ONCE);

function submitRequests(loop) {
	for (var j = 0; j < REQUESTS_AT_ONCE; j++) {
		if (loop * REQUESTS_AT_ONCE + j >= count) {
			break;
		}
		submitRequest(loop * REQUESTS_AT_ONCE + j);
	}
}

for (var i = 0; i < iterations; i++) {
	setTimeout(submitRequests, i * 100, i);
}

// Only exit when all requests have been responded to
setInterval(() => {
	if (processed >= count) {
		var whenEnd = Date.now();
		console.log('Sending count ' + count +' entries (' + responses +')  took ' + (whenEnd - whenStart) + ' milliseconds');
		process.exit(0);
	}
}, 100);
