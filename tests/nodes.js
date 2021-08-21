const { reset } = require('../src/utils.js');

const { CA, fakeCA } = require('./helpers/variables.js');
const { NEWNODE, EDITNODE, RESPONSE } = require('./helpers/elements.js');
const { admin } = require('./helpers/roles.js');
const { PROBLEMS_CONNECTING_NODE } = require('../responses.json');


// eslint-disable-next-line no-undef
fixture('Nodes')
	.page('http://localhost:3000')
	.before(async () => { await reset(); })
	.beforeEach(async (t) => { await t.useRole(admin); });

// eslint-disable-next-line no-undef
test('Add without IP', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the ip!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(NEWNODE.ip);
	await t.pressKey('ctrl+a delete');

	await t.click(NEWNODE.button);
});

// eslint-disable-next-line no-undef
test('Add without port', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the port!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(NEWNODE.port);
	await t.pressKey('ctrl+a delete');

	await t.click(NEWNODE.button);
});

// eslint-disable-next-line no-undef
test('Add without CA', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the certificate!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(NEWNODE.ca);
	await t.pressKey('ctrl+a delete');

	await t.click(NEWNODE.button);
});

// eslint-disable-next-line no-undef
test('Add wrong IP', async (t) => {
	await t.expect(NEWNODE.ip.value).eql('127.0.0.1');
	await t.expect(NEWNODE.port.value).eql('3001');

	await t.typeText(NEWNODE.ip, '1.1.1.1', { paste: true, replace: true });
	await t.typeText(NEWNODE.ca, CA, { paste: true, replace: true });

	await t.click(NEWNODE.button);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);
});

// eslint-disable-next-line no-undef
test('Add wrong port', async (t) => {
	await t.expect(NEWNODE.ip.value).eql('127.0.0.1');
	await t.expect(NEWNODE.port.value).eql('3001');

	await t.typeText(NEWNODE.port, '3002', { paste: true, replace: true });
	await t.typeText(NEWNODE.ca, CA, { paste: true, replace: true });

	await t.click(NEWNODE.button);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);
});

// eslint-disable-next-line no-undef
test('Add wrong CA', async (t) => {
	await t.expect(NEWNODE.ip.value).eql('127.0.0.1');
	await t.expect(NEWNODE.port.value).eql('3001');

	await t.typeText(NEWNODE.ca, fakeCA, { paste: true, replace: true });

	await t.click(NEWNODE.button);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);
});

// eslint-disable-next-line no-undef
test('Add', async (t) => {
	await t.expect(NEWNODE.ip.value).eql('127.0.0.1');
	await t.expect(NEWNODE.port.value).eql('3001');

	await t.typeText(NEWNODE.ca, CA, { paste: true, replace: true });

	await t.click(NEWNODE.button);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Edit without IP', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the ip!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(EDITNODE.goto);

	await t.click(EDITNODE.ip);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITNODE.edit);
});

// eslint-disable-next-line no-undef
test('Edit without port', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the port!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(EDITNODE.goto);

	await t.click(EDITNODE.port);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITNODE.edit);
});

// eslint-disable-next-line no-undef
test('Edit without CA', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'Missing the certificate!':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(EDITNODE.goto);

	await t.click(EDITNODE.ca);
	await t.pressKey('ctrl+a delete');

	await t.click(EDITNODE.edit);
});

// eslint-disable-next-line no-undef
test('Edit wrong IP', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.ip, '1.1.1.1', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ip.value).eql('1.1.1.1');
	await t.typeText(EDITNODE.ip, '127.0.0.1', { paste: true, replace: true });

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('true');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ip.value).eql('127.0.0.1');
});

// eslint-disable-next-line no-undef
test('Edit wrong port', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.port, '3002', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.port.value).eql('3002');
	await t.typeText(EDITNODE.port, '3001', { paste: true, replace: true });

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('true');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.port.value).eql('3001');
});

// eslint-disable-next-line no-undef
test('Edit wrong CA', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.ca, fakeCA, { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ca.value).eql(fakeCA);
	await t.typeText(EDITNODE.ca, CA, { paste: true, replace: true });

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('true');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ca.value).eql(CA);
});

// eslint-disable-next-line no-undef
test('Edit', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.ip, '127.0.0.1', { paste: true, replace: true });
	await t.typeText(EDITNODE.port, '3001', { paste: true, replace: true });
	await t.typeText(EDITNODE.ca, CA, { paste: true, replace: true });

	await t.click(EDITNODE.edit);

	await t.expect(RESPONSE.innerText).eql('');
	await t.expect(EDITNODE.connected.innerText).eql('true');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ip.value).eql('127.0.0.1');
	await t.expect(EDITNODE.port.value).eql('3001');
	await t.expect(EDITNODE.ca.value).eql(CA);
});

// eslint-disable-next-line no-undef
test('Delete wrong IP', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.ip, '1.1.1.1', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ip.value).eql('1.1.1.1');
	await t.click(EDITNODE.delete);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);

	await t.typeText(EDITNODE.ip, '127.0.0.1', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Delete wrong port', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.port, '3002', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.port.value).eql('3002');
	await t.click(EDITNODE.delete);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);

	await t.typeText(EDITNODE.port, '3001', { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Delete wrong CA', async (t) => {
	await t.click(EDITNODE.goto);

	await t.typeText(EDITNODE.ca, fakeCA, { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with new config)');

	await t.click(EDITNODE.edit);
	await t.expect(EDITNODE.connected.innerText).eql('false');

	await t.click(EDITNODE.goto);

	await t.expect(EDITNODE.ca.value).eql(fakeCA);
	await t.click(EDITNODE.delete);

	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE);

	await t.typeText(EDITNODE.ca, CA, { paste: true, replace: true });
	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql(PROBLEMS_CONNECTING_NODE + ' (with old config)');

	await t.click(EDITNODE.edit);
	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(EDITNODE.goto);

	await t.click(EDITNODE.delete);
	await t.expect(RESPONSE.innerText).eql('');
});