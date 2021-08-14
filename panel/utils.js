const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const fetch = require('node-fetch');

const { pack, unpack } = require('./crypt.js');
const db = require('./sql.js');
const { SUCCESS, PROBLEMS_CONNECTING_NODE } = require('../responses.json');

const cleanPath = (path) => {
	if (!path) path = '/';
	if (!path.startsWith('/')) path = `/${path}`;
	if (!path.endsWith('/')) path = `${path}/`;

	return path;
};

const connectToNode = async (ip, port, publickey) => {
	try {

		const body = {
			publickey: existsSync(join(__dirname, 'keys/rsa_key.pub')) ? readFileSync(join(__dirname, 'keys/rsa_key.pub'), 'utf8') : null,
		};
		const encryptedbody = pack(publickey, body);

		const res = await fetch(`http://${ip}:${port}/init`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		});
		const encryptedjson = await res.json();
		if (!encryptedjson.encrypted && !encryptedjson.success) return { message: encryptedjson.message, success: false };
		const json = JSON.parse(unpack(encryptedjson));

		if (!json.success) return { message: json.message, success: false };
		else return { message: SUCCESS, success: true };
	} catch (e) {
		return { message: PROBLEMS_CONNECTING_NODE, success: false };
	}
};

const getNodes = async (skipNotConnected) => {
	const all = await db.prepare('SELECT * FROM nodes;').all();
	const nodes = [];

	if (!all || all.length == 0) return nodes;

	for (let i = 0; i < all.length; i++) {
		const node = all[i];
		const status = await connectToNode(node.ip, node.port, node.publickey);

		if (skipNotConnected && !status.success) continue;

		nodes.push({
			id: node.id,
			connected: status.success,
		});

		if (i == all.length - 1) {
			return nodes;
		}
	}
};

module.exports = {
	cleanPath,
	connectToNode,
	getNodes,
};