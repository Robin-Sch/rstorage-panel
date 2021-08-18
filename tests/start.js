require('../src/index.js');
const createTestCafe = require('testcafe');

(async () => {
	const testCafe = await createTestCafe('localhost', 1337, 1338);

	try {
		const runner = testCafe.createRunner();
		await runner
			.src(['./tests/files.js', './tests/login.js', './tests/nodes.js', './tests/users.js'])
			.browsers('chrome')
			.run();
	} finally {
		await testCafe.close();
	}
})();