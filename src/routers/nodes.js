const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { generate } = require('randomstring');
const fetch = require('node-fetch');
const { Agent } = require('https');

const { PROBLEMS_CONNECTING_NODE, INVALID_BODY, INVALID_NODE, NO_PERMISSIONS, SUCCESS } = require('../../responses.json');
const { db } = require('../sql.js');
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
			ca: node.ca,
		};

		return res.status(200).render('node', { details });
	})
	.post('/:id/edit', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(1)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const {
			ip,
			port,
			ca,
		} = req.body;

		if (!ip || !port || !ca) return res.status(400).json({ message: INVALID_BODY, success: false });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([req.params.id]);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		const body = {
			key: node.ckey,
		};

		const agent = new Agent({
			ca: node.ca,
		});

		return fetch(`https://${node.ip}:${node.port}/deinit`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			agent,
		}).then(async () => {
			await db.prepare('UPDATE nodes SET ip = ?, port = ?, ca = ? WHERE id = ?').run([ip, port, ca, req.params.id]);

			return res.status(200).json({ message: SUCCESS, success: true });
		}).catch(() => {
			return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
		});
	})
	.post('/:id/delete', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(4)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([req.params.id]);
		if (!node) return res.status(403).json({ message: INVALID_NODE, success: false });

		const body = {
			key: node.ckey,
		};

		const agent = new Agent({
			ca: node.ca,
		});

		return fetch(`https://${node.ip}:${node.port}/deinit`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			agent,
		}).then(async () => {
			await db.prepare('DELETE FROM nodes WHERE id = ?;').run([req.params.id]);

			return res.status(200).json({ message: SUCCESS, success: true });
		}).catch(() => {
			return res.status(500).json({ message: PROBLEMS_CONNECTING_NODE, success: false });
		});
	})
	.post('/create', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');
		if (!req.session.permissions.node.includes(2)) return res.status(403).json({ message: NO_PERMISSIONS, success: false });

		const {
			ip,
			port,
			ca,
		} = req.body;

		if (!ip || !port || !ca) return res.status(400).json({ message: INVALID_BODY, success: false });

		const key = generate(32);
		const ckey = generate(1280);

		const status = await connectToNode(ip, port, ca, ckey);
		if (status.success == false) return res.status(400).json(status);

		await db.prepare('INSERT INTO nodes (id, ip, port, ca, key, ckey) VALUES (?,?,?,?,?,?);').run([uuidv4(), ip, port, ca, key, ckey]);
		return res.status(200).json({ message: SUCCESS, success: true });
	});

module.exports = router;