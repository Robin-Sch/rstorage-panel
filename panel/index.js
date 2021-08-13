require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const { connect, Types } = require('mongoose');
const passport = require('passport');
const { join } = require('path');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const fetch = require('node-fetch');
const randomstring = require('randomstring');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ss = require('socket.io-stream');

const { generateKeys, unpack, pack, encrypt, decrypt } = require('./crypt.js');
const { cleanPath } = require('./utils.js');
const { INVALID_BODY, PROBLEMS_CONNECTING_NODE, ALREADY_SUCH_FILE_OR_DIR, SUCCESS } = require('../responses.json');

const NodeModel = require('./mongodb/NodeModel.js');
const PartModel = require('./mongodb/PartModel.js');

const accountsRouter = require('./routers/accounts.js');
const nodesRouter = require('./routers/nodes.js');
const filesRouter = require('./routers/files.js');

const {
	PANEL_MONGODB,
	PANEL_PORT,
	PANEL_MAX_SIZE,
	PANEL_FORCE_SPREADING,
	PANEL_DISABLE_REGISTER,
} = process.env;

let FORCE_SPREADING = false;
if (PANEL_FORCE_SPREADING.toLowerCase() == 'true') FORCE_SPREADING = true;

let DISABLE_REGISTER = true;
if (PANEL_DISABLE_REGISTER.toLowerCase() == 'false') DISABLE_REGISTER = false;

const SECRET = randomstring.generate();
const sessionHandler = session({
	secret: SECRET,
	resave: true,
	saveUninitialized: true,
});

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


io.use((socket, next) => {
	const req = socket.handshake;
	req.originalUrl = '/';
	return sessionHandler(req, {}, next);
});
io.on('connection', (socket) => {
	if (!socket.handshake.session.loggedin) return;

	const userID = socket.handshake.session.userID;
	socket.join(userID);

	ss(socket).on('upload', async (stream, data) => {
		if (!data || !data.size || !data.path || !data.name) return;

		const path = cleanPath(data.path);
		const name = data.name;
		const size = data.size;
		let received = Buffer.from('');
		let receivedAmount = 0;

		const exists = await PartModel.findOne({ path, name });
		if (exists) return socket.nsp.to(userID).emit('error', ALREADY_SUCH_FILE_OR_DIR);

		const nodes = await NodeModel.find({ });

		let loops = Math.ceil(size / 1000 / 1000 / PANEL_MAX_SIZE);
		if (FORCE_SPREADING && loops < nodes.length) loops = nodes.length;

		const amountPerLoop = Math.floor(size / loops);
		const remaining = size % loops;

		let i = 0;

		stream.on('data', async (chunk) => {
			received = Buffer.concat([received, chunk]);
			receivedAmount += chunk.length;

			const percentage = (receivedAmount / size) * 100;
			socket.emit('upload-percentage', percentage.toFixed(1));

			if (received.length < amountPerLoop) return;
			const curloop = i;
			i++;

			const nodeForThisLoop = nodes[Math.floor(Math.random() * nodes.length)];

			const extra = curloop == loops - 1 ? remaining : 0;
			const rest = received.length - amountPerLoop - extra;
			const dataForThisLoop = rest == 0 ? received : received.slice(0, -rest);
			received = rest == 0 ? Buffer.from('') : received.slice(-rest);

			await socket.nsp.to(userID).emit('message', `[upload] ${path}${name} encrypting (${curloop + 1}/${loops})`);

			const content = encrypt(dataForThisLoop);
			const id = new Types.ObjectId();

			const body = {
				content,
				id,
			};

			const encryptedbody = pack(nodeForThisLoop.publickey, body);

			fetch(`http://${nodeForThisLoop.ip}:${nodeForThisLoop.port}/files/upload`, {
				method: 'POST',
				body: JSON.stringify(encryptedbody),
				headers: { 'Content-Type': 'application/json' },
			}).then(res2 => res2.json())
				.then(async encryptedjson => {
					if (!encryptedjson.encrypted && !encryptedjson.success) {
						// TODO: delete all uploaded parts, and throw error?
						return socket.nsp.to(userID).emit('message', `[upload] ${path}${name} failed (${curloop + 1}/${loops})`);
					}

					const json = JSON.parse(unpack(encryptedjson));

					if (!json.success) {
						// TODO: delete all uploaded parts, and throw error?
						return socket.nsp.to(userID).emit('message', `[upload] ${path}${name} failed (${curloop + 1}/${loops})`);
					} else {
						const part = new PartModel({
							_id: id,
							node: nodeForThisLoop._id,
							name,
							path,
							index: curloop,
						});

						await part.save();
						socket.nsp.to(userID).emit('message', `[upload] ${path}${name} done (${curloop + 1}/${loops})`);

						if(curloop == loops - 1) {
							socket.nsp.to(userID).emit('message', `[upload] ${path}${name} done everything`);
							return io.sockets.emit('reload', 'files');
						}
					}
				}).catch(() => {
					// TODO: delete all uploaded parts, and throw error?
					return socket.nsp.to(userID).emit('message', `[upload] ${path}${name} failed (${curloop + 1}/${loops})`);
				});
		});
	});

	socket.on('download', async (data) => {
		if (!data.path || !data.name) return;

		const path = cleanPath(data.path);
		const name = data.name;

		const buffers = [];

		const parts = await PartModel.find({ path, name }).sort('index');

		for(let i = 0; i < parts.length; i++) {
			const part = parts[i];

			const body = {
				id: part._id,
			};

			await socket.nsp.to(userID).emit('message', `[download] ${path}${name} preparing (${i + 1}/${parts.length})`);

			const node = await NodeModel.findById(part.node);

			const encryptedbody = pack(node.publickey, body);

			fetch(`http://${node.ip}:${node.port}/files/download`, {
				method: 'POST',
				body: JSON.stringify(encryptedbody),
				headers: { 'Content-Type': 'application/json' },
			}).then(res2 => res2.json())
				.then(async encryptedjson => {
					if (!encryptedjson.encrypted && !encryptedjson.success) return socket.nsp.to(userID).emit('message', `[download] ${path}${name} failed (${i + 1}/${parts.length})`);
					const json = JSON.parse(unpack(encryptedjson));

					if (!json.success) {
						return socket.nsp.to(userID).emit('message', `[download] ${path}${name} failed (${i + 1}/${parts.length})`);
					} else {
						await socket.nsp.to(userID).emit('message', `[download] ${path}${name} decrypting (${i + 1}/${parts.length})`);

						buffers.push(decrypt(Buffer.from(json.content)));
						socket.nsp.to(userID).emit('message', `[download] ${path}${name} done (${i + 1}/${parts.length})`);

						if (i == parts.length - 1) {
							const content = Buffer.concat(buffers);

							socket.nsp.to(userID).emit('message', `[download] ${path}${name} done everything`);
							return socket.nsp.to(userID).emit('download', { content, name });
						}
					}
				}).catch(() => {
					return socket.nsp.to(userID).emit('message', `[download] ${path}${name} failed (${i + 1}/${parts.length})`);
				});
		}
	});

	socket.on('delete', async (data) => {
		if (!data.name) return;

		const path = cleanPath(data.path);
		const name = data.name;

		const parts = await PartModel.find({ path, name });

		for(let i = 0; i < parts.length; i++) {
			const part = parts[i];

			const body = {
				id: part._id,
			};

			const node = await NodeModel.findById(part.node);

			const encryptedbody = pack(node.publickey, body);

			fetch(`http://${node.ip}:${node.port}/files/delete`, {
				method: 'POST',
				body: JSON.stringify(encryptedbody),
				headers: { 'Content-Type': 'application/json' },
			}).then(res2 => res2.json())
				.then(async encryptedjson => {
					if (!encryptedjson.encrypted && !encryptedjson.success) {
						// TODO: mark as deleted, and try again later?
						return socket.nsp.to(userID).emit('message', `[delete] ${path}${name} failed (${i + 1}/${parts.length})`);
					}
					const json = JSON.parse(unpack(encryptedjson));

					if (!json.success) {
						// TODO: mark as deleted, and try again later?
						return socket.nsp.to(userID).emit('message', `[delete] ${path}${name} failed (${i + 1}/${parts.length})`);
					} else if (i == parts.length - 1) {
						await PartModel.deleteOne({ _id: part._id });

						socket.nsp.to(userID).emit('message', `[delete] ${path}${name} done`);
						return io.sockets.emit('reload', 'files');
					} else {
						return PartModel.deleteOne({ _id: part._id });
					}
				}).catch(() => {
					// TODO: mark as deleted, and try again later?
					return socket.nsp.to(userID).emit('message', `[delete] ${path}${name} failed (${i + 1}/${parts.length})`);
				});
		}
	});
});

app
	.use(express.json({ limit: '100mb' }))
	.use(express.urlencoded({ limit: '100mb', extended: true }))
	.use(fileUpload())
	.use(sessionHandler)
	.use(express.static(join(__dirname, 'public')))
	.set('views', join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.use((req, res, next) => { req.io = io; return next(); })
	.use('/accounts', accountsRouter)
	.use('/nodes', nodesRouter)
	.use('/files', filesRouter)
	.get('/login', async (req, res) => res.render('login', { disable_register: DISABLE_REGISTER }))
	.get('/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		const nodes = await getNodes();

		return res.render('index', { nodes });
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
	});

http.listen(panel_port, (err) => {
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