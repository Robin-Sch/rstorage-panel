const { readFileSync } = require('fs');
const { join } = require('path');

const cert = join(__dirname, '../', '../', 'node.cert');

const CA = readFileSync(cert, 'utf8').split('\r\n').join('\n');

const fakeCA = `-----BEGIN CERTIFICATE-----
fake fake very fake
-----END CERTIFICATE-----`;

module.exports = {
	CA,
	fakeCA,
};