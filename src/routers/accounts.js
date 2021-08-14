const { Router } = require('express');
const speakeasy = require('speakeasy');
const { compare, hash } = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = require('../sql.js');

const {
	PANEL_DISABLE_REGISTER,
} = process.env;


let DISABLE_REGISTER = true;
if (PANEL_DISABLE_REGISTER.toLowerCase() == 'false') DISABLE_REGISTER = false;

const router = Router();

router
	.post('/login', async (req, res) => {
		const {
			email,
			password,
			token,
		} = req.body;
		if (!email || !password) return res.json({ message: 'Please enter Email and Password!', success: false });

		const user = await db.prepare('SELECT * FROM users WHERE email = ?;').get([email]);
		if (!user) return res.json({ message: 'Incorrect Email and/or Password!', success: false });

		// if (!user.verified) return res.json({ message: 'Please reregister, you haven\'t verified your 2fa!', success: false });
		if (user.secret && !token) return res.json({ message: 'Please enter 2fa code!', success: false });
		if (user.secret && token) {
			const valid = speakeasy.totp.verify({
				secret: user.secret,
				encoding: 'base32',
				token,
				window: 1,
			});

			if (!valid) return res.json({ message: 'Invalid 2fa code!', success: false });
		}

		if (await compare(password, user.password)) {
			req.session.loggedin = true;
			req.session.username = user.username;
			req.session.userID = user.id;

			return res.json({ message: 'Correct', success: true });
		} else {
			return res.json({ message: 'Incorrect Email and/or Password!', success: false });
		}
	})
	.post('/register', async (req, res) => {
		if (DISABLE_REGISTER) return res.json({ message: 'Registering is disabled! If this is your first time, please check the readme!', success: false });

		const {
			email,
			password,
			username,
			totp,
		} = req.body;
		if (!email || !password || !username || totp == undefined) return res.json({ message: 'Please enter Email, Username and Password!', success: false });

		const alreadyRegistered = {
			email: await db.prepare('SELECT * FROM users WHERE email = ?;').get([email]),
			username: await db.prepare('SELECT * FROM users WHERE username = ?;').get([username]),
		};
		if (alreadyRegistered.email) return res.json({ message: 'That email is already registered!', success: false });
		if (alreadyRegistered.username) return res.json({ message: 'That username is already registered!', success: false });

		let secret = undefined;
		if (totp) {
			secret = speakeasy.generateSecret({ length: 20 }).base32;
		}

		const hashedPassword = await hash(password, 10);
		const id = uuidv4();
		const verified = secret ? 'false' : 'true';

		await db.prepare('INSERT INTO users (id, username, email, password, verified, secret) VALUES (?,?,?,?,?,?);').run([id, username, email, hashedPassword, verified, secret]);

		if (!secret) req.session.loggedin = true;
		if (!secret) req.session.username = username;
		if (!secret) req.session.userID = id;

		const json = { message: 'Correct', success: true };
		if (secret) json.secret = secret;
		return res.json(json);
	})
	.post('/totp-verify', async (req, res) => {
		const {
			token,
			email,
		} = req.body;
		if (!token || !email) return res.json({ message: 'Please enter the token!', success: false });

		const user = await db.prepare('SELECT * FROM users WHERE email = ?;').get([email]);
		if (!user) return res.json({ message: 'That email is not registered!', success: false });

		const verified = speakeasy.totp.verify({
			secret: user.secret,
			encoding: 'base32',
			token,
			window: 1,
		});

		if (verified) {
			user.verified = true;
			await user.save();

			req.session.loggedin = true;
			req.session.username = user.username;
			req.session.userID = user.id;

			return res.json({ success: true });
		} else {
			return res.json({ message: 'Invalid totp code', success: false });
		}
	});

module.exports = router;