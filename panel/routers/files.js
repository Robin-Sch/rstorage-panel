const { Router } = require('express');
const fetch = require('node-fetch');

const { unpack, pack } = require('../crypt.js');
const NodeModel = require('../mongodb/NodeModel.js');

const router = Router();

router
	.get('/:id/view/:path?', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		const body = {
			path: req.params.path || '.',
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/view`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.json({ message: json.message, success: false });
				else res.render('files', { path: body.path, files: json.files, directories: json.directories, node: node._id });
			}).catch(() => {
				return res.json({ message: 'There are problems connecting to the node, please make sure the IP and port are correct!', success: false });
			});
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		if (!req.body.file || !req.body.isDir) return res.json({ message: 'No file specified!' });

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		const body = {
			file: req.body.file,
			path: req.body.path || '.',
			isDir: req.body.isDir,
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/delete`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.json({ message: json.message, success: false });
				else return res.json({ message: 'File uploaded!', success: true });
			}).catch(() => {
				return res.json({ message: 'There are problems connecting to the node, please make sure the IP and port are correct!', success: false });
			});
	})
	.post('/:id/upload', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		if (!req.files || !req.files.upload) return res.json({ message: 'No file selected!', success: false });

		const body = {
			file: JSON.stringify(req.files.upload),
			path: req.body.path || '.',
		};
		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/upload`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(res2 => res2.json())
			.then(encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) return res.json({ message: encryptedjson.message, success: false });
				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) return res.json({ message: json.message, success: false });
				else return res.json({ message: 'File uploaded!', success: true });
			}).catch(() => {
				return res.json({ message: 'There are problems connecting to the node, please make sure the IP and port are correct!', success: false });
			});
	});

module.exports = router;