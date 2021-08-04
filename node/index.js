require('dotenv').config();

const express = require('express');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const { generateKeys, unpack, pack } = require('./crypt.js');

const {
	NODE_PORT,
} = process.env;

const port = NODE_PORT || 3001;

let NODE_PRIVATE_KEY = existsSync(join(__dirname, 'rsa_key')) ? readFileSync(join(__dirname, 'rsa_key'), 'utf8') : null;
let NODE_PUBLIC_KEY = existsSync(join(__dirname, 'rsa_key.pub')) ? readFileSync(join(__dirname, 'rsa_key.pub'), 'utf8') : null;
let SERVER_PUBLIC_KEY = null;

if (!NODE_PRIVATE_KEY || !NODE_PUBLIC_KEY) {
	const keys = generateKeys();

	NODE_PRIVATE_KEY = keys.private;
	NODE_PUBLIC_KEY = keys.public;

	writeFileSync(join(__dirname, 'rsa_key'), NODE_PRIVATE_KEY);
	writeFileSync(join(__dirname, 'rsa_key.pub'), NODE_PUBLIC_KEY);
}

const app = express();

app
	.use(express.json({ limit: '1000mb' }))
	.use(express.urlencoded({ limit: '1000mb', extended: true }))
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/', async (req, res) => {
		if (!SERVER_PUBLIC_KEY) {
			res.render('index', {
				publickey: NODE_PUBLIC_KEY,
			});
		} else {
			return res.send('Please use the panel!');
		}
	})
	.post('/init', (req, res) => {
		if (!req.body || !req.body.encrypted || !req.body.key) return res.json({ message: 'Missing the message!', success: false });

		const encryptedbody = req.body;
		const body = JSON.parse(unpack(encryptedbody));

		let newPublicServerKey = body.publickey;

		if (SERVER_PUBLIC_KEY && SERVER_PUBLIC_KEY !== newPublicServerKey) {
			const json = {
				message: 'Node is already connected to different panel!',
				success: false,
			}

			const encryptedjson = pack(newPublicServerKey, json)
			return res.json(encryptedjson);
		}

		SERVER_PUBLIC_KEY = newPublicServerKey;

		const json = {
			message: 'Connected',
			success: true,
		}

		const encryptedjson = pack(newPublicServerKey, json)
		return res.json(encryptedjson);
	})
	.listen(port, (err) => {
		if (err) console.log(err);
		else console.log(`Server online on port ${port}`);
	});