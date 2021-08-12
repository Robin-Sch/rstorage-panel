const { Router } = require('express');
const fetch = require('node-fetch');
const { Types } = require('mongoose');

const { unpack, pack, encrypt, decrypt } = require('../crypt.js');
const NodeModel = require('../mongodb/NodeModel.js');
const PartModel = require('../mongodb/PartModel.js');

const { INVALID_BODY, ALREADY_SUCH_FILE_OR_DIR, PROBLEMS_CONNECTING_NODE, SUCCESS } = require('../../responses.json');

const { PANEL_MAX_SIZE, PANEL_FORCE_SPREADING } = process.env;

let FORCE_SPREADING = false;
if (PANEL_FORCE_SPREADING.toLowerCase() == 'true') FORCE_SPREADING = true;

const router = Router();

router
	.get('/view', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const path = cleanPath(req.query.path);

		const files = await PartModel.find({ path }).distinct('name');
		const directories = await PartModel.find({ 'path': { $regex: `^${path}` } }).ne('path', path).distinct('path');

		return res.status(200).render('files', { path, files, directories });
	})
	.post('/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		if (!req.body.name) return res.status(400).json({ message: INVALID_BODY });

		const path = cleanPath(req.body.path);
		const name = req.body.name;

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
					if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).json({ message: encryptedjson.message, success: false });
					const json = JSON.parse(unpack(encryptedjson));

					if (!json.success) {
						return res.status(502).json({ message: json.message, success: false });
					} else if (i == parts.length - 1) {
						await PartModel.deleteOne({ _id: part._id });

						return res.status(200).json({ message: SUCCESS, success: true });
					} else {
						return PartModel.deleteOne({ _id: part._id });
					}
				}).catch(() => {
					return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
				});
		}
	})
	.post('/upload', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const nodes = await NodeModel.find({ });

		if (!req.files || !req.files.upload) return res.status(400).render('error', { error: INVALID_BODY, success: false });

		const path = cleanPath(req.query.path);
		const name = req.files.upload.name || 'undefined';

		const exists = await PartModel.findOne({ path, name });
		if (exists) return res.status(400).render('error', { error: ALREADY_SUCH_FILE_OR_DIR, success: false });

		let loops = Math.ceil(req.files.upload.data.length / 1000 / 1000 / PANEL_MAX_SIZE);
		if (FORCE_SPREADING && loops < nodes.length) loops = nodes.length;

		const amountPerLoop = Math.floor(req.files.upload.data.length / loops);
		const remaining = req.files.upload.data.length % loops;

		for(let i = 0; i < loops; i++) {
			const extra = i == loops - 1 ? remaining : 0;

			const nodeForThisLoop = nodes[Math.floor(Math.random() * nodes.length)];
			const dataForThisLoop = req.files.upload.data.slice(i * amountPerLoop, (i + 1) * amountPerLoop + extra);

			const content = encrypt(dataForThisLoop);

			const id = new Types.ObjectId();

			const body = {
				content,
				id,
			};

			const encryptedbody = pack(nodeForThisLoop.publickey, body);

			const temp = await fetch(`http://${nodeForThisLoop.ip}:${nodeForThisLoop.port}/files/upload`, {
				method: 'POST',
				body: JSON.stringify(encryptedbody),
				headers: { 'Content-Type': 'application/json' },
			});

			const encryptedjson = await temp.json();
			if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).render('error', { error: encryptedjson.message });
			const json = JSON.parse(unpack(encryptedjson));

			if (!json.success) {
				return res.status(502).render('error', { error: json.message });
			} else {
				const part = new PartModel({
					_id: id,
					node: nodeForThisLoop._id,
					name,
					path,
					index: i,
				});

				await part.save();

				if(i == loops - 1) {
					return res.status(200).redirect(`/files/view?path=${path}`);
				}
			}
		}
	})
	.post('/download', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		if (!req.body.name) return res.status(400).json({ message: INVALID_BODY });

		const path = cleanPath(req.body.path);
		const name = req.body.name;

		const buffers = [];

		const parts = await PartModel.find({ path, name }).sort('index');

		for(let i = 0; i < parts.length; i++) {
			const part = parts[i];

			const body = {
				id: part._id,
			};

			const node = await NodeModel.findById(part.node);

			const encryptedbody = pack(node.publickey, body);

			fetch(`http://${node.ip}:${node.port}/files/download`, {
				method: 'POST',
				body: JSON.stringify(encryptedbody),
				headers: { 'Content-Type': 'application/json' },
			}).then(res2 => res2.json())
				.then(async encryptedjson => {
					if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).json({ message: encryptedjson.message, success: false });
					const json = JSON.parse(unpack(encryptedjson));

					if (!json.success) {
						return res.status(502).json({ message: json.message, success: false });
					} else if (i == parts.length - 1) {
						buffers.push(decrypt(Buffer.from(json.content)));

						const content = Buffer.concat(buffers);

						return res.status(200).json({ content, name, message: SUCCESS, success: true });
					} else {
						return buffers.push(decrypt(Buffer.from(json.content)));
					}
				}).catch(() => {
					return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
				});
		}
	});

module.exports = router;

const cleanPath = (path) => {
	if (!path) path = '/';
	if (!path.startsWith('/')) path = `/${path}`;
	if (!path.endsWith('/')) path = `${path}/`;

	return path;
};