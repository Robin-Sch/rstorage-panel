require('dotenv').config();

const { compare, hash } = require('bcrypt');
const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const { connect, Types } = require('mongoose');
const passport = require('passport');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const fetch = require('node-fetch');

const { generateKeys, unpack, pack } = require('./crypt.js');

const { INVALID_BODY, PROBLEMS_CONNECTING_NODE, SUCCESS } = require('../responses.json');

const nodesRouter = require('./routers/nodes.js');
const filesRouter = require('./routers/files.js');

const {
	MONGODB,
	PANEL_PORT,
} = process.env;

const panel_port = PANEL_PORT || 3000;

let SERVER_PRIVATE_KEY = existsSync(join(__dirname, 'rsa_key')) ? readFileSync(join(__dirname, 'rsa_key'), 'utf8') : null;
let SERVER_PUBLIC_KEY = existsSync(join(__dirname, 'rsa_key.pub')) ? readFileSync(join(__dirname, 'rsa_key.pub'), 'utf8') : null;

if (!SERVER_PRIVATE_KEY || !SERVER_PUBLIC_KEY) {
	const keys = generateKeys();

	SERVER_PRIVATE_KEY = keys.private;
	SERVER_PUBLIC_KEY = keys.public;

	writeFileSync(join(__dirname, 'rsa_key'), SERVER_PRIVATE_KEY);
	writeFileSync(join(__dirname, 'rsa_key.pub'), SERVER_PUBLIC_KEY);
}

const UserModel = require('./mongodb/UserModel.js');
const NodeModel = require('./mongodb/NodeModel.js');

const app = express();

connect(MONGODB, {
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
	.use(express.json({ limit: '1000mb' }))
	.use(express.urlencoded({ limit: '1000mb', extended: true }))
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
	.get('/login', async (req, res) => res.render('login'))
	.get('/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		const nodes = await getNodes();

		return res.render('index', { nodes });
	})
	.post('/login', async (req, res) => {
		const {
			email,
			password,
		} = req.body;
		if (!email || !password) return res.send('Please enter Email and Password!');
		const user = await UserModel.findOne({ email: email });
		if (!user) return res.send('That email is not registered!');
		if (await compare(password, user.password)) {
			req.session.loggedin = true;
			req.session.username = user.username;
			return res.status(200).json({ message: 'Correct', success: true });
		} else {
			return res.status(401).json({ message: 'Incorrect Email and/or Password!', success: false });
		}
	})
	.post('/register', async (req, res) => {
		const {
			email,
			password,
			username,
		} = req.body;
		if (!email || !password || !username) return res.send('Please enter Email, Username and Password!');
		const alreadyRegistered = {
			email: await UserModel.findOne({ email: email }),
			username: await UserModel.findOne({ username: username }),
		};
		if (alreadyRegistered.email) return res.send('That email is already registered!');
		if (alreadyRegistered.username) return res.send('That username is already registered!');
		const hashedPassword = await hash(password, 10);
		const schema = new UserModel({
			_id: new Types.ObjectId(),
			username: username,
			email: email,
			password: hashedPassword,
		});
		schema.save().then(() => {
			req.session.loggedin = true;
			req.session.username = username;
			return res.status(200).json({ message: 'Correct', success: true });
		}).catch(() => {
			return res.status(500).redirect('/login');
		});
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