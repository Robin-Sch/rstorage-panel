const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const cert = join(__dirname, '../', '../', 'node.cert');

const CA = existsSync(cert) ? readFileSync(cert, 'utf8').split('\r\n').join('\n') : `-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----`;

module.exports = {
	CA,
};