#!/usr/bin/env node
'use strict';

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var http = require('http');
var nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

var fileName = argv._[0];
if (fileName === undefined) {
	console.log('usage: ./numClicksPost <sample-data-file>' +
		' --server=<server-name>' +
		' --port=<server-port>' +
		' --privateKey=<keyfile>');
	process.exit(1);
}

var privateKeyFile = './private.key';
var servername = 'localhost';
var serverport = 8080;
if (argv.server) servername = argv.server;
if (argv.port) serverport = argv.port;
if (argv.privateKey) privateKeyFile = argv.privateKey;

var data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
var privateKey = fs.readFileSync(privateKeyFile, 'utf8');

console.log("Start");
var whenStart = Date.now();
var count = data.length, processed = 0, responses = 0;
var timer = null;

console.log('count is ' + count);

function submitRequest(which) {
	var keyPair = nacl.sign.keyPair.fromSecretKey(nacl.util.decodeBase64(privateKey));
	var message = JSON.stringify(data[which]);
	var signature = nacl.sign.detached(nacl.util.decodeUTF8(message), keyPair.secretKey);

	var options = {
	    host: servername,
	    port: serverport,
		path: '/submit?signature=' + encodeURIComponent(nacl.util.encodeBase64(signature)) + '&data=' + JSON.stringify(data[which]),
		method: 'POST',
		headers: {
			'X-public-key': nacl.util.encodeBase64(keyPair.publicKey),
		}
	};
	var request = http.request(options, function(result) {	
		result.on('data', function() {
			responses += 1;
			processed++;
			// console.log('Received response ' + responses);
			if (processed >= count) {
				var whenEnd = Date.now();
				console.log('Sending count ' + count +' entries (' + responses +')  took ' + (whenEnd - whenStart) + ' milliseconds');
				process.exit(0);
			}
		});
		request.on('error', function(err) {
			console.log('Error submitting data ' + JSON.stringify(data[which]));
			processed++;
		});
	});
	// console.log('Submited data (' + which + ') ' + JSON.stringify(data[which]));
	request.end();
}

var REQUESTS_AT_ONCE = 10;
var REQUEST_HOLD_TIME = 50;
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
	setTimeout(submitRequests, i * REQUEST_HOLD_TIME, i);
}
