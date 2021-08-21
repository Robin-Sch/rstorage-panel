const { reset } = require('../src/utils.js');

const { EDITUSER, RESPONSE } = require('./helpers/elements.js');
const { admin } = require('./helpers/roles.js');
const { INVALID_BODY } = require('../responses.json');


// eslint-disable-next-line no-undef
fixture('Users')
	.page('http://localhost:3000')
	.before(async () => { await reset(); })
	.beforeEach(async (t) => { await t.useRole(admin); });

// eslint-disable-next-line no-undef
test('Edit without username', async (t) => {
	await t.click(EDITUSER.goto);

	await t.click(EDITUSER.username);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITUSER.edit);

	await t.expect(RESPONSE.innerText).eql(INVALID_BODY);
});

// eslint-disable-next-line no-undef
test('Edit without email', async (t) => {
	await t.click(EDITUSER.goto);

	await t.click(EDITUSER.email);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITUSER.edit);

	await t.expect(RESPONSE.innerText).eql(INVALID_BODY);
});

// eslint-disable-next-line no-undef
test('Edit without permissions', async (t) => {
	await t.click(EDITUSER.goto);

	await t.click(EDITUSER.permissions);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITUSER.edit);

	await t.expect(RESPONSE.innerText).eql(INVALID_BODY);
});

// eslint-disable-next-line no-undef
test('Edit', async (t) => {
	await t.click(EDITUSER.goto);

	await t.typeText(EDITUSER.permissions, '775', { paste: true, replace: true });
	await t.click(EDITUSER.edit);
	await t.expect(RESPONSE.innerText).eql('');

	await t.click(EDITUSER.goto);

	await t.expect(EDITUSER.permissions.value).eql('775');

});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(EDITUSER.goto);

	await t.click(EDITUSER.delete);

	await t.expect(RESPONSE.innerText).eql('');
});