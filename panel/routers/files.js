const { Router } = require('express');
const fetch = require('node-fetch');

const { unpack, pack } = require('../crypt.js');
const NodeModel = require('../mongodb/NodeModel.js');

const { INVALID_BODY, INVALID_NODE, PROBLEMS_CONNECTING_NODE, SUCCESS } = require('../../responses.json');

const router = Router();

router
	.get('/:id/view', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).render('error', { error: INVALID_NODE });

		let path = req.query.path;
		if (!path) path = '/';
		if (!path.startsWith('/')) path = `/${path}`;
		if (!path.endsWith('/')) path = `${path}/`;

		const body = {
			path,
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/view`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).render('error', { error: encryptedjson.message });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.status(502).render('error', { error: json.message });
				else res.status(200).render('files', { path: body.path, files: json.files, directories: json.directories, node: node._id });
			}).catch(() => {
				return res.status(500).render('error', { error: PROBLEMS_CONNECTING_NODE });
			});
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		if (!req.body.file || !req.body.isDir == undefined) return res.status(400).json({ message: INVALID_BODY });

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		const body = {
			file: req.body.file,
			path: req.body.path || '/',
			isDir: req.body.isDir,
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/delete`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.status(502).json({ message: json.message, success: false });
				else return res.status(200).json({ message: SUCCESS, success: true });
			}).catch(() => {
				return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
			});
	})
	.post('/:id/upload', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		if (!req.files || !req.files.upload) return res.status(400).render('error', { error: INVALID_BODY, success: false });

		const body = {
			file: JSON.stringify(req.files.upload),
			path: req.body.path || '/',
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/upload`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).render('error', { error: encryptedjson.message });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.status(502).render('error', { error: json.message });
				else return res.status(200).redirect(`/files/${req.params.id}/view${body.path}`);
			}).catch(() => {
				return res.status(500).render('error', { message: PROBLEMS_CONNECTING_NODE, success: false });
			});
	})
	.post('/:id/download', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		if (!req.body.file) return res.status(400).json({ message: INVALID_BODY, success: false });

		const body = {
			file: req.body.file,
			path: req.body.path || '/',
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/download`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.status(502).json({ message: json.message, success: false });
				else return res.status(200).json({ buffer: json.buffer, name: json.name, message: SUCCESS, success: true });
			}).catch(() => {
				return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
			});
	})
	.post('/:id/create', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		const body = {
			name: req.body.name || '/',
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/create`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.status(502).json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.status(502).json({ message: json.message, success: false });
				else return res.status(200).json({ buffer: json.buffer, name: json.name, message: SUCCESS, success: true });
			}).catch(() => {
				return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
			});
	});

module.exports = router;