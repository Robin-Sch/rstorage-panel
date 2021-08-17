const { reset } = require('../src/utils.js');

const { LOGIN, REGISTER, RESPONSE } = require('./helpers/elements.js');

// eslint-disable-next-line no-undef
fixture('Login')
	.page('http://localhost:3000')
	.before(async () => { await reset(); });

// eslint-disable-next-line no-undef
test('Register', async (t) => {
	await t.click(LOGIN.change);
	await t.typeText(REGISTER.username, 'test');
	await t.typeText(REGISTER.email, 'test@test.com');
	await t.typeText(REGISTER.password, 'test');
	await t.click(REGISTER.button);

	await t.expect(RESPONSE.innerText).eql('');
});