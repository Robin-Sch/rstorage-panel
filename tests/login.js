const { reset } = require('../src/utils.js');

const { LOGIN, RESPONSE } = require('./helpers/elements.js');
const { REGISTERING_DISABLED } = require('../responses.json');

// eslint-disable-next-line no-undef
fixture('Login')
	.page('http://localhost:3000')
	.before(async () => { await reset(); });

// eslint-disable-next-line no-undef
test('Login', async (t) => {
	await t.typeText(LOGIN.email, 'admin', { paste: true, replace: true });
	await t.typeText(LOGIN.password, 'admin', { paste: true, replace: true });
	await t.click(LOGIN.button);
});

// eslint-disable-next-line no-undef
test('Login wrong email', async (t) => {
	await t.typeText(LOGIN.email, 'test', { paste: true, replace: true });
	await t.typeText(LOGIN.password, 'admin', { paste: true, replace: true });
	await t.click(LOGIN.button);

	await t.expect(RESPONSE.innerText).eql('Incorrect Email and/or Password!');
});

// eslint-disable-next-line no-undef
test('Login wrong password', async (t) => {
	await t.typeText(LOGIN.email, 'admin', { paste: true, replace: true });
	await t.typeText(LOGIN.password, 'test', { paste: true, replace: true });
	await t.click(LOGIN.button);

	await t.expect(RESPONSE.innerText).eql('Incorrect Email and/or Password!');
});

// eslint-disable-next-line no-undef
test('Login without email', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing your email!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.typeText(LOGIN.password, 'admin', { paste: true, replace: true });
	await t.click(LOGIN.button);
});

// eslint-disable-next-line no-undef
test('Login without password', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing your password!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.typeText(LOGIN.email, 'admin', { paste: true, replace: true });
	await t.click(LOGIN.button);
});

// eslint-disable-next-line no-undef
test('Register', async (t) => {
	await t.click(LOGIN.change);

	await t.expect(RESPONSE.innerText).eql(REGISTERING_DISABLED);

	/*
		await t.typeText(REGISTER.username, 'test', { paste: true, replace: true });
		await t.typeText(REGISTER.email, 'test@test.com', { paste: true, replace: true });
		await t.typeText(REGISTER.password, 'test', { paste: true, replace: true });
		await t.click(REGISTER.button);
	*/
});