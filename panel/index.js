require('dotenv').config();

const { compare, hash } = require('bcrypt');
const express = require('express');
const session = require('express-session');
const { connect, Types } = require('mongoose');
const passport = require('passport');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const fetch = require('node-fetch')

const { generateKeys, unpack, pack } = require('./crypt.js');

const {
	MONGODB,
	PANEL_PORT,
} = process.env;

const port = PANEL_PORT || 3000;

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

let nodes = null;

app
	.use(express.json({ limit: "1000mb" }))
	.use(express.urlencoded({ limit: "1000mb", extended: true }))
	.use(session({
		secret: 'secret', 
		resave: true, 
		saveUninitialized: true 
	}))
	.use(express.static(join(__dirname, 'public')))
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/login', async (req, res) => res.render('login'))
	.get('/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (nodes == null) await fetchNodes();

		return res.render('index', { nodes, });
	})
	.get('/edit/:id', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.send('No node with that ID found!');

		const details = {
			id: node._id,
			ip: node.ip,
			port: node.port,
			publickey: node.publickey,
		}

		return res.render('edit', { details, });
	})
	.post('/edit/:id', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.json({ message: 'Missing the details!', success: false });

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		node.ip = ip;
		node.port = port;
		node.publickey = publickey;

		await node.save();
		await fetchNodes();

		return res.json({ message: 'Node changed!', success: true });
	})
	.post('/delete/:id', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		await NodeModel.deleteOne({ _id: req.params.id });
		await fetchNodes();

		return res.json({ message: 'Node deleted!', success: true });
	})
	.post('/login', async (req, res) => {
		const {
			email,
			password
		} = req.body;
		if (!email || !password) return res.send('Please enter Email and Password!');
		const user = await UserModel.findOne({ email: email });
		if (!user) return res.send('That email is not registered!');
		if (await compare(password, user.password)) {
			req.session.loggedin = true;
			req.session.username = user.username;
			return res.json({ message: 'Correct', success: true });
		} else {
			return res.json({ message: 'Incorrect Email and/or Password!', success: false });
		}
	})
	.post('/register', async (req, res) => {
		const {
			email,
			password,
			username
		} = req.body;
		if (!email || !password || !username) return res.send('Please enter Email, Username and Password!');
		const alreadyRegistered = {
			email: await UserModel.findOne({ email: email }),
			username: await UserModel.findOne({ username: username })
		}
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
			return res.json({ message: 'Correct', success: true });
		}).catch(() => {
			return res.redirect('/login');
		});
	})
	.post('/createNode', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.json({ message: 'Missing the details!', success: false });

		const status = await connectToNode(ip, port, publickey);
		if (status.success == false) return res.json(status);

		const node = new NodeModel({
			_id: new Types.ObjectId(),
			ip,
			port,
			publickey,
		});

		node.save().then(async () => {
			await fetchNodes();
			return res.json({ message: 'Connected', success: true });
		}).catch(() => {
			return res.json({ message: 'There are problems connecting to the node, please try again!', success: false });
		});
	})
	.listen(port, (err) => {
		if (err) console.log(err);
		else console.log(`Server online on port ${port}`);
	});


const fetchNodes = async () => {
	const all = await NodeModel.find();
	nodes = [];

	for (let i = 0; i < all.length; i++) {
		const node = all[i];
		const status = await connectToNode(node.ip, node.port, node.publickey);
		nodes.push({
			id: node._id,
			connected: status.success
		});

		if (i == all.length - 1) {
			return;
		}
	}
}

const connectToNode = (ip, port, publickey) => {
	return new Promise((resolve, reject) => {
		const body = {
			publickey: SERVER_PUBLIC_KEY,
		}
		const encryptedbody = pack(publickey, body);
	
		fetch(`http://${ip}:${port}/init`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				const json = JSON.parse(unpack(encryptedjson));
				
				if (!json.success) return resolve({ message: json.message, success: false });
				else resolve({ message: 'Connected', success: true });
			}).catch(() => {
				return resolve({ message: 'There are problems connecting to the node, please make sure the IP and port are correct!', success: false });
			});
	})
}