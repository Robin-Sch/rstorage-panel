const crypto = require('crypto');
const aesjs = require('aes-js');
const NodeRSA = require('node-rsa');
const randomstring = require('randomstring');
const { readFileSync } = require('fs');
const { join } = require('path');

const SECURITY_LEVEL = 4096;

const generateRandomKey = function() {
	return crypto.createHash('md5').update(randomstring.generate()).digest('hex');
};

const aes = {
	encrypt: function(secret, text) {
		const secretHash = crypto.createHash('md5').update(secret).digest('hex');
		const key = aesjs.utils.utf8.toBytes(secretHash);
		const textBytes = aesjs.utils.utf8.toBytes(text);
		const aesCtr = new aesjs.ModeOfOperation.ctr(key);
		const encryptedBytes = aesCtr.encrypt(textBytes);
		return encryptedBytes;
	},

	decrypt: function(secret, encryptedBytes) {
		const secretHash = crypto.createHash('md5').update(secret).digest('hex');
		const key = aesjs.utils.utf8.toBytes(secretHash);
		const aesCtr = new aesjs.ModeOfOperation.ctr(key);
		const decryptedBytes = aesCtr.decrypt(encryptedBytes);
		return aesjs.utils.utf8.fromBytes(decryptedBytes);
	},
};

const rsa = {
	encrypt: function(clientPublicKey, message) {
		const buffer = Buffer.from(message);

		const encrypted = crypto.publicEncrypt({
			key: clientPublicKey,
			padding: crypto.constants.RSA_PKCS1_PADDING,
		},
		buffer,
		);
		return encrypted.toString('base64');
	},
	decrypt: function(message) {
		const buffer = Buffer.from(message, 'base64');

		const decrypted = crypto.privateDecrypt({
			// process.env.SERVER_PRIVATE_KEY
			key: readFileSync(join(__dirname, 'keys/rsa_key'), 'utf8'),
			padding: crypto.constants.RSA_PKCS1_PADDING,
		},
		buffer,
		);
		return decrypted.toString('utf8');
	},
};

const generateKeys = function() {
	const key = new NodeRSA({ b: SECURITY_LEVEL });

	return {
		'private': key.exportKey('pkcs1-private-pem'),
		'public': key.exportKey('pkcs8-public-pem'),
	};
};

const pack = function(clientPublicKey, data) {
	const packedData = {};
	const aesKey = generateRandomKey();
	packedData.key = rsa.encrypt(clientPublicKey, aesKey);
	packedData.encrypted = aes.encrypt(aesKey, JSON.stringify(data));
	return packedData;
};

const unpack = function(data) {
	const aesKey = rsa.decrypt(data.key);
	const encryptedData = [];
	const keys = Object.keys(data.encrypted);
	for (let i = 0; i < keys.length; i++) {
		encryptedData[i] = data.encrypted[keys[i]];
	}
	return aes.decrypt(aesKey, new Uint8Array(encryptedData));
};

module.exports = {
	pack,
	unpack,
	generateKeys,
};