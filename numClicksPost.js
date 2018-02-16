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

var privateKeyHex = '115bf6cba62647bb6bea5b5be252ff1ac04ab359a1e614dbb1f8055792b7fe8b';
var servername = 'localhost';
var serverport = 9710;
var address = '0x28772520c5336134e2d2a5fb329ea23ae310f3da';
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

var authToken = '5821593231639345';
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
        "adunit": 43,
        "bid": 42,
	"address" : "0x5f0ae333f96b33def7db653adec168ebb74dbe00"
    }
*/
function submitRequest(which) {
	var message = JSON.stringify(data[which]);
	delete data[which].uid;
	data[which].address = address;
	var timestamp = Date.parse(data[which].time);
	data[which].time = timestamp;
	var dataToSign = [  { type: 'string', name: 'Event', value: JSON.stringify(data[which]) }];
	var msgParams = { data: dataToSign }
	var signature = sigUtil.signTypedData(privateKey, msgParams);
	data[which].signature = signature;
	data[which].sigMode = 0;

	console.log(data[which]);

	var options = {
	    host: servername,
	    port: serverport,
		path: '/submit',
		method: 'POST',
		headers: {
			'X-User-Signature': sessionSignature,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data[which])
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
