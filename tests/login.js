const { reset } = require('../src/utils.js');

const { LOGIN, RESPONSE } = require('./helpers/elements.js');

// eslint-disable-next-line no-undef
fixture('Login')
	.page('http://localhost:3000')
	.before(async () => { await reset(); });

// eslint-disable-next-line no-undef
test('Register', async (t) => {
	await t.click(LOGIN.change);

	await t.expect(RESPONSE.innerText).eql('Registering is disabled! If this is your first time, please check the readme!');

	/*
		await t.typeText(REGISTER.username, 'test');
		await t.typeText(REGISTER.email, 'test@test.com');
		await t.typeText(REGISTER.password, 'test');
		await t.click(REGISTER.button);
	*/
});