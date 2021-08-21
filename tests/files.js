const { reset } = require('../src/utils.js');

const { FILES, RESPONSE } = require('./helpers/elements.js');
const { addNode } = require('./helpers/roles.js');
// eslint-disable-next-line no-undef
fixture('Files')
	.page('http://localhost:3000')
	.before(async () => { await reset(); })
	.beforeEach(async (t) => { await t.useRole(addNode); });

// eslint-disable-next-line no-undef
test('Upload', async (t) => {
	await t.click(FILES.goto);

	await t.setFilesToUpload(FILES.upload, ['./uploads/test.txt']);
	await t.typeText(FILES.encrypt, 'test', { paste: true, replace: true });
	await t.click(FILES.uploadButton);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Upload without key', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'You need to enter a encryption key.':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(FILES.goto);

	await t.setFilesToUpload(FILES.upload, ['./uploads/test.txt']);
	await t.click(FILES.uploadButton);
});

// eslint-disable-next-line no-undef
test('Download', async (t) => {
	await t.click(FILES.goto);

	await t.click(FILES.downloadButton);

	await t.typeText(FILES.decrypt, 'test', { paste: true, replace: true });
	await t.click(FILES.decryptButton);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Download without key', async (t) => {
	await t.setNativeDialogHandler((type, text) => {
		switch(type) {
		case 'alert':
			switch(text) {
			case 'You need to enter a decryption key.':
				return true;
			default:
				throw 'Unexpected alert dialog!';
			}
		default:
			throw 'Unexpected dialog!';
		}
	});

	await t.click(FILES.goto);

	await t.click(FILES.downloadButton);

	await t.click(FILES.decryptButton);
});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(FILES.goto);

	await t.click(FILES.deleteButton);

	await t.expect(RESPONSE.innerText).eql('');
});