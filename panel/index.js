require('dotenv').config();

const { compare, hash } = require('bcrypt');
const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const { connect, Types } = require('mongoose');
const passport = require('passport');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const fetch = require('node-fetch');
const speakeasy = require('speakeasy');

const { generateKeys, unpack, pack } = require('./crypt.js');

const { INVALID_BODY, PROBLEMS_CONNECTING_NODE, SUCCESS } = require('../responses.json');

const nodesRouter = require('./routers/nodes.js');
const filesRouter = require('./routers/files.js');

const {
	PANEL_MONGODB,
	PANEL_PORT,
	PANEL_DISABLE_REGISTER,
} = process.env;

let DISABLE_REGISTER = true;
if (PANEL_DISABLE_REGISTER.toLowerCase() == 'false') DISABLE_REGISTER = true;

const panel_port = PANEL_PORT || 3000;

if (!existsSync(join(__dirname, 'keys'))) mkdirSync(join(__dirname, 'keys'));
let SERVER_PRIVATE_KEY = existsSync(join(__dirname, 'keys/rsa_key')) ? readFileSync(join(__dirname, 'keys/rsa_key'), 'utf8') : null;
let SERVER_PUBLIC_KEY = existsSync(join(__dirname, 'keys/rsa_key.pub')) ? readFileSync(join(__dirname, 'keys/rsa_key.pub'), 'utf8') : null;

if (!SERVER_PRIVATE_KEY || !SERVER_PUBLIC_KEY) {
	const keys = generateKeys();

	SERVER_PRIVATE_KEY = keys.private;
	SERVER_PUBLIC_KEY = keys.public;

	writeFileSync(join(__dirname, 'keys/rsa_key'), SERVER_PRIVATE_KEY);
	writeFileSync(join(__dirname, 'keys/rsa_key.pub'), SERVER_PUBLIC_KEY);
}

const UserModel = require('./mongodb/UserModel.js');
const NodeModel = require('./mongodb/NodeModel.js');

const app = express();

connect(PANEL_MONGODB, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

app
	.use(express.json({ limit: '100mb' }))
	.use(express.urlencoded({ limit: '100mb', extended: true }))
	.use(fileUpload())
	.use(session({
		secret: 'secret',
		resave: true,
		saveUninitialized: true,
	}))
	.use(express.static(join(__dirname, 'public')))
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.use('/nodes', nodesRouter)
	.use('/files', filesRouter)
	.get('/login', async (req, res) => res.render('login', { disable_register: DISABLE_REGISTER }))
	.get('/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		const nodes = await getNodes();

		return res.render('index', { nodes });
	})
	.post('/login', async (req, res) => {
		const {
			email,
			password,
			token,
		} = req.body;
		if (!email || !password) return res.json({ message: 'Please enter Email and Password!', success: false });

		const user = await UserModel.findOne({ email: email });
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
			email: await UserModel.findOne({ email: email }),
			username: await UserModel.findOne({ username: username }),
		};
		if (alreadyRegistered.email) return res.json({ message: 'That email is already registered!', success: false });
		if (alreadyRegistered.username) return res.json({ message: 'That username is already registered!', success: false });

		let secret = undefined;
		if (totp) {
			secret = speakeasy.generateSecret({ length: 20 }).base32;
		}

		const hashedPassword = await hash(password, 10);

		const schema = new UserModel({
			_id: new Types.ObjectId(),
			username,
			email,
			password: hashedPassword,
			verified: secret ? false : true,
			secret,
		});

		schema.save().then(() => {
			if (!secret) req.session.loggedin = true;
			if (!secret) req.session.username = username;

			const json = { message: 'Correct', success: true };
			if (secret) json.secret = secret;
			return res.json(json);
		}).catch(() => {
			return res.redirect('/register');
		});
	})
	.post('/totp-verify', async (req, res) => {
		const {
			token,
			email,
		} = req.body;
		if (!token || !email) return res.json({ message: 'Please enter the token!', success: false });

		const user = await UserModel.findOne({ email: email });
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

			return res.json({ success: true });
		} else {
			return res.json({ message: 'Invalid totp code', success: false });
		}
	})
	.post('/nodes/create', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.status(400).json({ message: INVALID_BODY, success: false });

		const status = await connectToNode(ip, port, publickey);
		if (status.success == false) return res.status(400).json(status);

		const node = new NodeModel({
			_id: new Types.ObjectId(),
			ip,
			port,
			publickey,
		});

		node.save().then(async () => {
			return res.status(200).json({ message: SUCCESS, success: true });
		}).catch(() => {
			return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
		});
	})
	.listen(panel_port, (err) => {
		if (err) console.log(err);
		else console.log(`Server online on port ${panel_port}`);
	});

const connectToNode = async (ip, port, publickey) => {
	try {
		const body = {
			publickey: SERVER_PUBLIC_KEY,
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

const getNodes = async () => {
	const all = await NodeModel.find();
	const nodes = [];

	if (all.length == 0) return nodes;

	for (let i = 0; i < all.length; i++) {
		const node = all[i];
		const status = await connectToNode(node.ip, node.port, node.publickey);

		nodes.push({
			id: node._id,
			connected: status.success,
		});

		if (i == all.length - 1) {
			return nodes;
		}
	}
};