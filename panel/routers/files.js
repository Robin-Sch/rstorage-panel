const { Router } = require('express');

const { cleanPath } = require('../utils.js');

const PartModel = require('../mongodb/PartModel.js');

const router = Router();

router
	.get('/view', async (req, res) => {
		if (!req.session.loggedin) return res.redirect('/login');

		const path = cleanPath(req.query.path);

		const files = await PartModel.find({ path }).distinct('name');
		const directories = await PartModel.find({ 'path': { $regex: `^${path}` } }).ne('path', path).distinct('path');

		return res.status(200).render('files', { path, files, directories });
	});

module.exports = router;