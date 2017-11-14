#!/usr/bin/env node
'use strict';

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');


var fileName = argv._[0];

if (fileName == undefined) {
	console.log('usage: ./genEd25519Key <key-file>');
	process.exit(1);
}

console.log("Start");

if (fs.existsSync(fileName)) {
	console.log(fileName + ' already exists, exiting ...')
	process.exit(1)
}

var keyPair = nacl.sign.keyPair();
fs.writeFileSync(fileName, nacl.util.encodeBase64(keyPair.secretKey));
console.log('Private key written to file ' + fileName);

