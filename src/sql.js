const sqlite3 = require('better-sqlite3');
const { join } = require('path');
const db = sqlite3(join(__dirname, 'database.db'));

db.prepare('CREATE TABLE if not exists users (id TEXT, username TEXT, email TEXT, password TEXT, verified BOOL, secret TEXT);').run();


db.prepare('CREATE TABLE if not exists nodes (id TEXT, ip TEXT, port INTEGER, publickey TEXT);').run();
db.prepare('CREATE TABLE if not exists files (id TEXT, name TEXT, path TEXT);').run();
db.prepare('CREATE TABLE if not exists parts (id TEXT, file TEXT, node TEXT, i INTEGER);').run();

module.exports = db;