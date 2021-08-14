const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');

const { INVALID_BODY, INVALID_NODE, NO_PERMISSIONS, SUCCESS } = require('../../responses.json');
const db = require('../sql.js');
const { connectToNode } = require('../utils.js');

const router = Router();

router
	.get('/:id/edit/', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(1)) return res.status(403).render('error', { error: NO_PERMISSIONS, success: false });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([req.params.id]);
		if (!node) return res.status(403).render('error', { error: INVALID_NODE });

		const details = {
			id: node.id,
			ip: node.ip,
			port: node.port,
			publickey: node.publickey,
		};

		return res.status(200).render('node', { details });
	})
	.post('/:id/edit', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(1)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.status(400).json({ message: INVALID_BODY, success: false });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([req.params.id]);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		await db.prepare('UPDATE nodes SET ip = ?, port = ?, publickey = ? WHERE id = ?').run([ip, port, publickey, req.params.id]);

		return res.status(200).json({ message: SUCCESS, success: true });
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(4)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([req.params.id]);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		await db.prepare('DELETE FROM nodes WHERE id = ?;').run([req.params.id]);

		return res.status(200).json({ message: SUCCESS, success: true });
	})
	.post('/create', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(2)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const {
			ip,
			port,
			publickey,
		} = req.body;

		if (!ip || !port || !publickey) return res.status(400).json({ message: INVALID_BODY, success: false });

		const status = await connectToNode(ip, port, publickey);
		if (status.success == false) return res.status(400).json(status);

		await db.prepare('INSERT INTO nodes (id, ip, port, publickey) VALUES (?,?,?,?);').run([uuidv4(), ip, port, publickey]);
		return res.status(200).json({ message: SUCCESS, success: true });
	});

module.exports = router;