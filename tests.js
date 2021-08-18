require('./src/index.js');
const createTestCafe = require('testcafe');

let testcafe = null;

createTestCafe('localhost', 1337, 1338)
	.then(async (tc) => {
		testcafe = tc;
		const runner = testcafe.createRunner();

		return runner
			.src(['./tests/files.js', './tests/login.js', './tests/nodes.js', './tests/users.js'])
			.browsers('chrome')
			.run();
	})
	.then((failed) => {
		testcafe.close();

		if (failed == 0) return process.exit(0);
		else return process.exit(1);
	})
	.catch(() => {
		return process.exit(1);
	});