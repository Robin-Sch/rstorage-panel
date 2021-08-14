const { Router } = require('express');

const { cleanPath } = require('../utils.js');
const db = require('../sql.js');

const router = Router();

router
	.get('/view', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const path = cleanPath(req.query.path);

		const files = await db.prepare('SELECT DISTINCT(name) FROM files WHERE path = ?;').all([path]) || [];
		// TODO AND NOT path like "?%" or something like that?
		const directories = await db.prepare('SELECT DISTINCT(path) FROM files WHERE NOT path = ?;').all([path]) || [];

		return res.status(200).render('files', { path, files, directories });
	});

module.exports = router;