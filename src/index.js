require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');
const fetch = require('node-fetch');
const { generate: generateRandomstring } = require('randomstring');
const { v4: uuidv4 } = require('uuid');
const { Worker } = require('worker_threads');
const { Agent } = require('https');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ss = require('socket.io-stream');

const { cleanPath, getNodes, getUsers } = require('./utils.js');
const { db } = require('./sql.js');
const { ALREADY_SUCH_FILE_OR_DIR, NO_SUCH_FILE_OR_DIR, NO_NODES, NO_PERMISSIONS } = require('../responses.json');

const accountsRouter = require('./routers/accounts.js');
const nodesRouter = require('./routers/nodes.js');
const filesRouter = require('./routers/files.js');

const {
	PANEL_PORT,
	PANEL_MAX_SIZE,
	PANEL_FORCE_SPREADING,
	PANEL_DISABLE_REGISTER,
} = process.env;

let FORCE_SPREADING = false;
if (PANEL_FORCE_SPREADING.toLowerCase() == 'true') FORCE_SPREADING = true;

let DISABLE_REGISTER = true;
if (PANEL_DISABLE_REGISTER.toLowerCase() == 'false') DISABLE_REGISTER = false;

const SECRET = generateRandomstring();
const sessionHandler = session({
	secret: SECRET,
	resave: true,
	saveUninitialized: true,
});

const panel_port = PANEL_PORT || 3000;

if (!existsSync(join(__dirname, '../', 'files'))) mkdirSync(join(__dirname, '../', 'files'));

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

	socket.on('downloading', (value) => {
		return socket.handshake.session.downloading = value;
	});

	ss(socket).on('upload', async (stream, data) => {
		if (!data || !data.size || !data.path || !data.name) return;
		if (!socket.handshake.session.permissions.file.includes(2)) return socket.nsp.to(userID).emit('error', NO_PERMISSIONS);

		const path = cleanPath(data.path);
		const name = data.name;
		const size = data.size;
		let received = Buffer.from('');
		let receivedAmount = 0;

		const exists = await db.prepare('SELECT DISTINCT(name) FROM files WHERE path = ? AND name = ?;').get([path, name]);
		if (exists) return socket.nsp.to(userID).emit('error', ALREADY_SUCH_FILE_OR_DIR);

		const nodes = await getNodes(true, false, false);
		if (!nodes || nodes.length == 0) return socket.nsp.to(userID).emit('error', NO_NODES);

		const fileID = uuidv4();
		await db.prepare('INSERT INTO files (id, name, path) VALUES (?,?,?);').run([fileID, name, path]);

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
			const partID = uuidv4();

			const extra = curloop == loops - 1 ? remaining : 0;
			const rest = received.length - amountPerLoop - extra;
			const dataForThisLoop = rest == 0 ? received : received.slice(0, -rest);
			received = rest == 0 ? Buffer.from('') : received.slice(-rest);

			const workerData = { task: 'upload', dataForThisLoop, nodeForThisLoop, fileID, partID, curloop, loops, path, name };

			const worker = new Worker(join(__dirname, './worker.js'), { workerData });

			worker.on('message', (msg) => {
				if (msg.toUser) socket.nsp.to(userID).emit(msg.event, msg.data);
				else io.sockets.emit(msg.event, msg.data);
			});
			return;
		});
	});

	socket.on('download', async (data) => {
		if (!data.path || !data.name) return;
		if (!socket.handshake.session.permissions.file.includes(1)) return socket.nsp.to(userID).emit('error', NO_PERMISSIONS);

		if (socket.handshake.session.downloading) return socket.nsp.to(userID).emit('error', 'You\'re already downloading a file!');
		socket.handshake.session.downloading = true;

		const path = cleanPath(data.path);
		const name = data.name;

		const file = await db.prepare('SELECT * FROM files WHERE path = ? AND name = ?;').get([path, name]);
		if (!file) return socket.nsp.to(userID).emit('error', NO_SUCH_FILE_OR_DIR);

		const parts = await db.prepare('SELECT * FROM parts WHERE file = ? ORDER BY i;').all(file.id);
		if (!parts || parts.length == 0) return socket.nsp.to(userID).emit('error', NO_SUCH_FILE_OR_DIR);

		const workerData = { task: 'download', parts, path, name };

		const worker = new Worker(join(__dirname, './worker.js'), { workerData });

		worker.on('message', (msg) => {
			if (msg.toUser) socket.nsp.to(userID).emit(msg.event, msg.data);
			else io.sockets.emit(msg.event, msg.data);
		});
		return;
	});

	socket.on('delete', async (data) => {
		if (!data.name) return;
		if (!socket.handshake.session.permissions.file.includes(4)) return socket.nsp.to(userID).emit('error', NO_PERMISSIONS);

		const path = cleanPath(data.path);
		const name = data.name;

		const file = await db.prepare('SELECT * FROM files WHERE path = ? AND name = ?;').get([path, name]);
		if (!file) return socket.nsp.to(userID).emit('error', NO_SUCH_FILE_OR_DIR);

		const parts = await db.prepare('SELECT * FROM parts WHERE file = ? ORDER BY i;').all(file.id);
		if (!parts || parts.length == 0) {
			await db.prepare('DELETE FROM files WHERE id = ?;').run([file.id]);
			socket.nsp.to(userID).emit('message', `[delete] [server-side] ${path}${name} deleted`);
			return io.sockets.emit('reload', 'files');
		}

		const done = [];

		for(let i = 0; i < parts.length; i++) {
			const part = parts[i];

			const body = {
				id: part.id,
			};

			const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([part.node]);

			const agent = new Agent({
				ca: node.ca,
			});

			fetch(`https://${node.ip}:${node.port}/files/delete`, {
				method: 'POST',
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' },
				agent,
			}).then(res2 => res2.json())
				.then(async json => {
					if (!json.success) {
						// TODO: mark as deleted, and try again later?
						return socket.nsp.to(userID).emit('message', `[delete] [server-side] ${path}${name} (${i + 1}/${parts.length}) failed`);
					} else {
						await db.prepare('DELETE FROM parts WHERE id = ?;').run([part.id]);
						done.push(part.id);

						if (done.length == parts.length) {
							await db.prepare('DELETE FROM files WHERE id = ?;').run([file.id]);
							socket.nsp.to(userID).emit('message', `[delete] [server-side] ${path}${name} deleted`);
							return io.sockets.emit('reload', 'files');
						}
					}
				}).catch(() => {
					// TODO: mark as deleted, and try again later?
					return socket.nsp.to(userID).emit('message', `[delete] [server-side] ${path}${name} (${i + 1}/${parts.length}) failed`);
				});
		}
	});
});

app
	.use(express.json({ limit: '100mb' }))
	.use(express.urlencoded({ limit: '100mb', extended: true }))
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
		const nodes = await getNodes(false, true, false);
		const users = await getUsers(false);

		return res.render('index', { nodes, users });
	});

http.listen(panel_port, (err) => {
	if (err) console.log(err);
	else console.log(`Server online on port ${panel_port}`);
});