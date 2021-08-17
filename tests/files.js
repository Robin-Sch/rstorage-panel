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
	await t.click(FILES.uploadButton);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Download', async (t) => {
	await t.click(FILES.goto);

	await t.click(FILES.downloadButton);

	await t.expect(RESPONSE.innerText).eql('');
});

// eslint-disable-next-line no-undef
test('Delete', async (t) => {
	await t.click(FILES.goto);

	await t.click(FILES.deleteButton);

	await t.expect(RESPONSE.innerText).eql('');
});