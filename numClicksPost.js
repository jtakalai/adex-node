#!/usr/bin/env node
'use strict';

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var http = require('http');
var sigUtil = require('eth-sig-util');

var fileName = argv._[0];
if (fileName === undefined) {
	console.log('usage: ./numClicksPost <sample-data-file>' +
		' --server=<server-name>' +
		' --port=<server-port>' +
		' --privateKey=<key>' +
		' --address=');
	process.exit(1);
}

var privateKeyHex = 'e466e969c24e46406a6b8bb08eebefaae67b92646dc4b8c9fa59f04e42c8ebd2';
var servername = 'localhost';
var serverport = 9710;
var address = '0x5f0ae333f96b33def7db653adec168ebb74dbe00';
if (argv.server) servername = argv.server;
if (argv.port) serverport = argv.port;
if (argv.privateKey) privateKeyHex = argv.privateKey;
if (argv.address) address = argv.address;

var data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

console.log("Start");
var whenStart = Date.now();
var count = data.length, processed = 0, responses = 0;
var timer = null;

console.log('count is ' + count);

var authToken = '1537340846634059';
var signature = '';
console.log(privateKeyHex);
var privateKey = Buffer.from(privateKeyHex, 'hex')
var sessionSignature = prepareSessionSignature(privateKey, authToken)

console.log(sessionSignature);

function prepareSessionSignature(privKey, authToken) {
	var typed = [  { type: 'uint', name: 'Auth token', value: authToken} ]
	var msgParams = { data: typed }
	var signature = sigUtil.signTypedData(privKey, msgParams)

	return signature;
}

/* Sample item
    {
        "time": "2018-02-13T11:56:44.211Z",
        "type": "click",
        "uid": 8,
        "adunit": 43,
        "bid": 42
    }
*/
function submitRequest(which) {
	var message = JSON.stringify(data[which]);
	data[which].address = address;
	var dataToSign = [  { type: 'string', name: 'Event', value: JSON.stringify(data[which]) }];
	var msgParams = { data: dataToSign }
	var signature = sigUtil.signTypedData(privateKey, msgParams);
	data[which].signature = signature;
	data[which].sigMode = 0;

	console.log(data[which]);

	var options = {
	    host: servername,
	    port: serverport,
		path: '/submit?data=' + JSON.stringify(data[which]),
		method: 'POST',
		headers: {
			'X-User-Signature': sessionSignature,
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
