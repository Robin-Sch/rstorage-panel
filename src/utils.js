const fetch = require('node-fetch');
const { Readable } = require('stream');
const { Agent } = require('https');

const { db } = require('./sql.js');
const { SUCCESS, PROBLEMS_CONNECTING_NODE } = require('../responses.json');

const cleanPath = (path) => {
	if (!path) path = '/';
	if (!path.startsWith('/')) path = `/${path}`;
	if (!path.endsWith('/')) path = `${path}/`;

	return path;
};

const connectToNode = async (ip, port, ca, ckey) => {
	try {

		const body = {
			key: ckey,
		};

		const agent = new Agent({
			ca,
		});

		const res = await fetch(`https://${ip}:${port}/init`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			agent,
		});
		const json = await res.json();

		if (!json.success) return { message: json.message, success: false };
		else return { message: SUCCESS, success: true };
	} catch (e) {
		return { message: PROBLEMS_CONNECTING_NODE, success: false };
	}
};

const getNodes = async (skipNotConnected, skipConnectionDetails, skipEncryptionKey) => {
	const all = await db.prepare('SELECT * FROM nodes;').all();
	const nodes = [];

	if (!all || all.length == 0) return nodes;

	for (let i = 0; i < all.length; i++) {
		const node = all[i];
		const status = await connectToNode(node.ip, node.port, node.ca, node.ckey);

		if (skipNotConnected && !status.success) {
			if (i == all.length - 1) {
				return nodes;
			} else {
				continue;
			}
		}

		const obj = {
			id: node.id,
			connected: status.success,
		};

		if (!skipConnectionDetails) {
			obj.ip = node.ip;
			obj.port = node.port;
			obj.ca = node.ca;
			obj.ckey = node.ckey;
		}

		if (!skipEncryptionKey) {
			obj.key = node.key;
		}

		nodes.push(obj);

		if (i == all.length - 1) {
			return nodes;
		}
	}
};

const getUsers = async (skipPermissions) => {
	const all = await db.prepare('SELECT * FROM users;').all();
	const users = [];

	if (!all || all.length == 0) return users;

	for(let i = 0; i < all.length; i++) {
		const user = all[i];

		const obj = {
			id: user.id,
			username: user.username,
			email: user.email,
		};

		if (!skipPermissions) {
			obj.permissions = user.permissions;
		}

		users.push(obj);

		if (i == all.length - 1) {
			return users;
		}
	}
};

/*
    filePermissions:
    1: download files
    2: upload files
    4: delete files

    nodePermissions:
    1: edit node
    2: add node
    4: delete node

    userPermissions:
    1: edit user
    2: -
    4: delete user

    777: everything
*/
const getPermissions = (number) => {
	if (isNaN(number)) number = parseInt(number);

	const userPermission = number % 10;
	number = (number - userPermission) / 10;
	const nodePermission = number % 10;
	number = (number - nodePermission) / 10;
	const filePermission = number % 10;

	return {
		file: permissionNumberToArray(filePermission),
		node: permissionNumberToArray(nodePermission),
		user: permissionNumberToArray(userPermission),
	};
};

const permissionNumberToArray = (number) => {
	if (number == 7) return [1, 2, 4];
	if (number == 6) return [2, 4];
	if (number == 5) return [1, 4];
	if (number == 4) return [4];
	if (number == 3) return [1, 2];
	if (number == 2) return [2];
	if (number == 1) return [1];
	if (number == 0) return [];
};

const bufferToStream = (buffer) => {
	return Readable.from(buffer);
};

const reset = () => {
	db.prepare('DELETE FROM users;').run();
	db.prepare('DELETE FROM files;').run();
	db.prepare('DELETE FROM parts;').run();
	db.prepare('DELETE FROM nodes;').run();

	db.prepare('DROP TABLE users;').run();
	db.prepare('DROP TABLE files;').run();
	db.prepare('DROP TABLE parts;').run();
	db.prepare('DROP TABLE nodes;').run();
	const { init } = require('./sql.js');
	return init();
};

module.exports = {
	cleanPath,
	connectToNode,
	getNodes,
	getUsers,
	getPermissions,
	bufferToStream,
	reset,
};