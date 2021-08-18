const { reset } = require('../src/utils.js');

const { EDITUSER, RESPONSE } = require('./helpers/elements.js');
const { admin } = require('./helpers/roles.js');


// eslint-disable-next-line no-undef
fixture('Users')
	.page('http://localhost:3000')
	.before(async () => { await reset(); })
	.beforeEach(async (t) => { await t.useRole(admin); });

// eslint-disable-next-line no-undef
test('Edit', async (t) => {
	await t.click(EDITUSER.goto);

	await t.expect(EDITUSER.username.value).eql('admin');
	await t.expect(EDITUSER.email.value).eql('admin');
	await t.expect(EDITUSER.password.value).eql('');
	await t.expect(EDITUSER.permissions.value).eql('777');

	await t.typeText(EDITUSER.permissions, '775', { paste: true, replace: true });

	await t.click(EDITUSER.edit);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(EDITUSER.goto);

	await t.click(EDITUSER.delete);

	await t.expect(RESPONSE.innerText).eql('');
});