require('dotenv').config();

const express = require('express');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } = require('fs');

const { generateKeys, unpack, pack } = require('./crypt.js');

const { NOT_ENCRYPTED_REQUEST, ALREADY_CONNECTED_TO_PANEL, NOT_CONNECTED_TO_PANEL, NO_SUCH_FILE_OR_DIR, ALREADY_SUCH_FILE_OR_DIR, INVALID_BODY, SUCCESS } = require('../responses.json');

const {
	NODE_PORT,
} = process.env;

const port = NODE_PORT || 3001;

if (!existsSync(join(__dirname, 'keys'))) mkdirSync(join(__dirname, 'keys'));
if (!existsSync(join(__dirname, 'files'))) mkdirSync(join(__dirname, 'files'));
let NODE_PRIVATE_KEY = existsSync(join(__dirname, 'keys/rsa_key')) ? readFileSync(join(__dirname, 'keys/rsa_key'), 'utf8') : null;
let NODE_PUBLIC_KEY = existsSync(join(__dirname, 'keys/rsa_key.pub')) ? readFileSync(join(__dirname, 'keys/rsa_key.pub'), 'utf8') : null;
let SERVER_PUBLIC_KEY = existsSync(join(__dirname, 'keys/server_rsa_key.pub')) ? readFileSync(join(__dirname, 'keys/server_rsa_key.pub'), 'utf8') : null;

if (!NODE_PRIVATE_KEY || !NODE_PUBLIC_KEY) {
	const keys = generateKeys();

	NODE_PRIVATE_KEY = keys.private;
	NODE_PUBLIC_KEY = keys.public;

	writeFileSync(join(__dirname, 'keys/rsa_key'), NODE_PRIVATE_KEY);
	writeFileSync(join(__dirname, 'keys/rsa_key.pub'), NODE_PUBLIC_KEY);
}

const app = express();

app
	.use(express.json({ limit: '2000mb' }))
	.use(express.urlencoded({ limit: '2000mb', extended: true }))
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/', async (req, res) => {
		if (!SERVER_PUBLIC_KEY) {
			res.status(200).render('index', {
				publickey: NODE_PUBLIC_KEY,
			});
		} else {
			return res.status(403).send('Please use the panel!');
		}
	})
	.post('/init', (req, res) => {
		if (!req.body || !req.body.encrypted || !req.body.key) return res.status(400).json({ message: NOT_ENCRYPTED_REQUEST, success: false });

		const encryptedbody = req.body;
		const body = JSON.parse(unpack(encryptedbody));

		const newPublicServerKey = body.publickey;

		if (SERVER_PUBLIC_KEY && SERVER_PUBLIC_KEY !== newPublicServerKey) {
			const json = {
				message: ALREADY_CONNECTED_TO_PANEL,
				success: false,
			};

			const encryptedjson = pack(newPublicServerKey, json);
			return res.status(403).json(encryptedjson);
		}

		SERVER_PUBLIC_KEY = newPublicServerKey;
		writeFileSync(join(__dirname, 'keys/server_rsa_key.pub'), newPublicServerKey);

		const json = {
			message: SUCCESS,
			success: true,
		};

		const encryptedjson = pack(newPublicServerKey, json);
		return res.status(200).json(encryptedjson);
	})
	.post('/files/delete', async (req, res) => {
		if (!req.body || !req.body.encrypted || !req.body.key) return res.status(400).json({ message: NOT_ENCRYPTED_REQUEST, success: false });
		if (!SERVER_PUBLIC_KEY) return res.status(400).json({ message: NOT_CONNECTED_TO_PANEL, success: false, reconnect: true });

		const encryptedbody = req.body;
		const body = JSON.parse(unpack(encryptedbody));

		if (!body.id) {
			const json = {
				message: INVALID_BODY,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		const dir = join(__dirname, 'files');

		if (!existsSync(`${dir}/${body.id}`)) {
			const json = {
				message: NO_SUCH_FILE_OR_DIR,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		unlinkSync(`${dir}/${body.id}`);

		const json = {
			message: SUCCESS,
			success: true,
		};

		const encryptedjson = pack(SERVER_PUBLIC_KEY, json);
		return res.status(200).json(encryptedjson);
	})
	.post('/files/upload', async (req, res) => {
		if (!req.body || !req.body.encrypted || !req.body.key) return res.status(400).json({ message: NOT_ENCRYPTED_REQUEST, success: false });
		if (!SERVER_PUBLIC_KEY) return res.status(400).json({ message: NOT_CONNECTED_TO_PANEL, success: false, reconnect: true });

		const encryptedbody = req.body;
		const body = JSON.parse(unpack(encryptedbody));


		if (!body.id || !body.content) {
			const json = {
				message: INVALID_BODY,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		const dir = join(__dirname, 'files');

		if (existsSync(`${dir}/${body.id}`)) {
			const json = {
				message: ALREADY_SUCH_FILE_OR_DIR,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		writeFileSync(`${dir}/${body.id}`, Buffer.from(body.content.data), 'binary');

		const json = {
			message: SUCCESS,
			success: true,
		};

		const encryptedjson = pack(SERVER_PUBLIC_KEY, json);
		return res.status(200).json(encryptedjson);
	})
	.post('/files/download', async (req, res) => {
		if (!req.body || !req.body.encrypted || !req.body.key) return res.status(400).json({ message: NOT_ENCRYPTED_REQUEST, success: false });
		if (!SERVER_PUBLIC_KEY) return res.status(400).json({ message: NOT_CONNECTED_TO_PANEL, success: false, reconnect: true });

		const encryptedbody = req.body;
		const body = JSON.parse(unpack(encryptedbody));

		if (!body.id) {
			const json = {
				message: INVALID_BODY,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		const dir = join(__dirname, 'files');

		if (!existsSync(`${dir}/${body.id}`)) {
			const json = {
				message: NO_SUCH_FILE_OR_DIR,
				success: false,
			};
			const encryptedjson = pack(SERVER_PUBLIC_KEY, json);

			return res.status(400).json(encryptedjson);
		}

		const content = readFileSync(`${dir}/${body.id}`);

		const json = {
			content,
			message: SUCCESS,
			success: true,
		};

		const encryptedjson = pack(SERVER_PUBLIC_KEY, json);
		return res.status(200).json(encryptedjson);
	})
	.listen(port, (err) => {
		if (err) console.log(err);
		else console.log(`Server online on port ${port}`);
	});