const { Role } = require('testcafe');

const { CA } = require('./variables.js');
const { NEWNODE, LOGIN } = require('./elements.js');

const admin = Role('http://localhost:3000', async t => {
	await t.typeText(LOGIN.email, 'admin');
	await t.typeText(LOGIN.password, 'admin');
	await t.click(LOGIN.button);
}, { preserveUrl: true });

const addNode = Role('http://localhost:3000', async t => {
	await t.typeText(LOGIN.email, 'admin', { paste: true, replace: true });
	await t.typeText(LOGIN.password, 'admin', { paste: true, replace: true });
	await t.click(LOGIN.button);

	await t.typeText(NEWNODE.ca, CA, { paste: true, replace: true });
	await t.click(NEWNODE.button);
}, { preserveUrl: true });

module.exports = { admin, addNode };