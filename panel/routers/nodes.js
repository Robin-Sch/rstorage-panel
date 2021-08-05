const { Router } = require('express');

const NodeModel = require('../mongodb/NodeModel.js');

const router = Router();

router
	.get('/:id/edit/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.send('No node with that ID found!');

		const details = {
			id: node._id,
			ip: node.ip,
			port: node.port,
			publickey: node.publickey,
		};

		return res.render('edit', { details });
	})
	.post('/:id/edit', async (req, res) => {
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

		return res.json({ message: 'Node changed!', success: true });
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.json({ message: 'No node with that ID found!', success: false });

		await NodeModel.deleteOne({ _id: req.params.id });

		return res.json({ message: 'Node deleted!', success: true });
	});

module.exports = router;