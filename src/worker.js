const { workerData, parentPort } = require('worker_threads');
const fetch = require('node-fetch');
const { join } = require('path');
const { existsSync, mkdirSync, writeFileSync, readFileSync, createReadStream, createWriteStream, unlinkSync } = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');

const db = require('./sql.js');
const { unpack } = require('./crypt.js');

const tempDir = join(__dirname, '../', 'files');

if (!existsSync(join(__dirname, '../', 'keys'))) mkdirSync(join(__dirname, '../', 'keys'));
if (!existsSync(join(__dirname, '../', 'keys/key'))) {
	const key = crypto.randomBytes(32);
	writeFileSync(join(__dirname, '../', 'keys/key'), key);
}
const key = readFileSync(join(__dirname, '../', 'keys/key'));

const upload = async ({ nodeForThisLoop, fileID, partID, curloop, loops, path, name }) => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

	const inputStream = createReadStream(`${tempDir}/plain_${partID}`);
	const outputStream = createWriteStream(`${tempDir}/${partID}`);

	inputStream.on('data', (data) => {
		const buff = Buffer.from(cipher.update(data), 'binary');
		return outputStream.write(buff);
	});

	inputStream.on('end', async () => {
		const buff = Buffer.from(cipher.final('binary'), 'binary');
		outputStream.write(buff);
		outputStream.end();

		await unlinkSync(`${tempDir}/plain_${partID}`);

		const formData = new FormData();
		formData.append('file', createReadStream(`${tempDir}/${partID}`));

		fetch(`http://${nodeForThisLoop.ip}:${nodeForThisLoop.port}/files/upload`, {
			method: 'POST',
			body: formData,
		}).then(res2 => res2.json())
			.then(async encryptedjson => {
				if (!encryptedjson.encrypted && !encryptedjson.success) {
				// TODO: delete all uploaded parts, and throw error?
					return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] ${path}${name} failed (${curloop + 1}/${loops})` });
				}

				const json = JSON.parse(unpack(encryptedjson));

				if (!json.success) {
				// TODO: delete all uploaded parts, and throw error?
					return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] ${path}${name} failed (${curloop + 1}/${loops})` });
				} else {
					await db.prepare('INSERT INTO parts (id, file, node, iv, i) VALUES (?,?,?,?,?);').run([partID, fileID, nodeForThisLoop.id, iv, curloop]);
					await unlinkSync(`${tempDir}/${partID}`);

					parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] ${path}${name} done (${curloop + 1}/${loops})` });

					if(curloop == loops - 1) {
						parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] ${path}${name} done everything` });
						// io.sockets.emit('reload', 'files');
						return parentPort.postMessage({ event: 'reload', 'data': 'files' });
					}
				}
			}).catch(() => {
			// TODO: delete all uploaded parts, and throw error?
				return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] ${path}${name} failed (${curloop + 1}/${loops})` });
			});
	});
};

if (workerData.task == 'upload') return upload(workerData);