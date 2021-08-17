const sqlite3 = require('better-sqlite3');
const { join } = require('path');
const { v4: uuidv4 } = require('uuid');
const { hash } = require('bcrypt');

const db = sqlite3(join(__dirname, 'database.db'));

const init = () => {
	db.prepare('CREATE TABLE if not exists users (id TEXT, username TEXT, email TEXT, password TEXT, verified BOOL, secret TEXT, permissions TEXT);').run();
	(async () => {
		const adminUser = await db.prepare('SELECT * FROM users WHERE username = ?;').get(['admin']);
		if (!adminUser) {
			const username = 'admin';
			const email = 'admin';
			const password = 'admin';
			const hashedPassword = await hash(password, 10);
			const id = uuidv4();
			const verified = 'true';
			const secret = undefined;
			const permissions = '777';
			await db.prepare('INSERT INTO users (id, username, email, password, verified, secret, permissions) VALUES (?,?,?,?,?,?,?);').run([id, username, email, hashedPassword, verified, secret, permissions]);
		}
	})();

	db.prepare('CREATE TABLE if not exists nodes (id TEXT, ip TEXT, port INTEGER, ca TEXT);').run();
	db.prepare('CREATE TABLE if not exists files (id TEXT, name TEXT, path TEXT);').run();
	db.prepare('CREATE TABLE if not exists parts (id TEXT, file TEXT, node TEXT, iv TEXT, i INTEGER);').run();
};

init();

module.exports = { db, init };