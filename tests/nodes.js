const { reset } = require('../src/utils.js');

const { CA } = require('./helpers/variables.js');
const { NEWNODE, EDITNODE, RESPONSE } = require('./helpers/elements.js');
const { admin } = require('./helpers/roles.js');


// eslint-disable-next-line no-undef
fixture('Nodes')
	.page('http://localhost:3000')
	.before(async () => { await reset(); })
	.beforeEach(async (t) => { await t.useRole(admin); });

// eslint-disable-next-line no-undef
test('Add', async (t) => {
	await t.expect(NEWNODE.ip.value).eql('127.0.0.1');
	await t.expect(NEWNODE.port.value).eql('3001');

	await t.typeText(NEWNODE.ca, CA, { paste: true, replace: true });

	await t.click(NEWNODE.button);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Edit', async (t) => {
	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ip.value).eql('127.0.0.1');
	await t.expect(EDITNODE.port.value).eql('3001');
	await t.expect(EDITNODE.ca.value).eql(CA);

	await t.typeText(EDITNODE.port, '3002', { paste: true, replace: true });

	await t.click(EDITNODE.edit);

	await t.expect(RESPONSE.innerText).eql('');
	await t.expect(EDITNODE.connected.innerText).eql('false');
});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(EDITNODE.goto);

	await t.click(EDITNODE.delete);

	await t.expect(RESPONSE.innerText).eql('');
});