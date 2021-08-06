const { Router } = require('express');

const NodeModel = require('../mongodb/NodeModel.js');

const { INVALID_BODY, INVALID_NODE, SUCCESS } = require('../../responses.json');

const router = Router();

router
	.get('/:id/edit/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).render('error', { error: INVALID_NODE });

		const details = {
			id: node._id,
			ip: node.ip,
			port: node.port,
			publickey: node.publickey,
		};

		return res.status(200).render('edit', { details });
	})
	.post('/:id/edit', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.status(400).json({ message: INVALID_BODY, success: false });

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		node.ip = ip;
		node.port = port;
		node.publickey = publickey;

		await node.save();

		return res.status(200).json({ message: SUCCESS, success: true });
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const node = await NodeModel.findById(req.params.id);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		await NodeModel.deleteOne({ _id: req.params.id });

		return res.status(200).json({ message: SUCCESS, success: true });
	});

module.exports = router;