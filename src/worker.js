const { workerData, parentPort } = require('worker_threads');
const fetch = require('node-fetch');
const { join } = require('path');
const { existsSync, mkdirSync, writeFileSync, readFileSync, createReadStream, createWriteStream, unlinkSync } = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');

const db = require('./sql.js');
const { unpack, pack } = require('./crypt.js');
const { bufferToStream } = require('./utils.js');

const tempDir = join(__dirname, '../', 'files');

if (!existsSync(join(__dirname, '../', 'keys'))) mkdirSync(join(__dirname, '../', 'keys'));
if (!existsSync(join(__dirname, '../', 'keys/key'))) {
	const key = crypto.randomBytes(32);
	writeFileSync(join(__dirname, '../', 'keys/key'), key);
}
const key = readFileSync(join(__dirname, '../', 'keys/key'));

const upload = async ({ dataForThisLoop, nodeForThisLoop, fileID, partID, curloop, loops, path, name }) => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

	// TODO: a Transform stream here maybe? I tried but I couldn't get it to work tho
	const plainStream = bufferToStream(Buffer.from(dataForThisLoop));
	const encryptedStream = createWriteStream(`${tempDir}/${partID}`);

	plainStream.on('data', (data) => {
		const buff = Buffer.from(cipher.update(data), 'binary');
		return encryptedStream.write(buff);
	});

	plainStream.on('end', async () => {
		const buff = Buffer.from(cipher.final('binary'), 'binary');
		encryptedStream.write(buff);
		encryptedStream.end();

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

const download = async ({ parts, path, name }) => {
	const buffers = {};

	for(let i = 0; i < parts.length; i++) {
		const part = parts[i];

		const partID = part.id;

		const body = {
			id: partID,
		};

		parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} preparing (${i + 1}/${parts.length})` });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([part.node]);

		const encryptedbody = pack(node.publickey, body);

		fetch(`http://${node.ip}:${node.port}/files/download`, {
			method: 'POST',
			body: JSON.stringify(encryptedbody),
			headers: { 'Content-Type': 'application/json' },
		}).then(async res => {
			if (res.status !== 200) throw new Error((await res.json()).message);
			const partBuffer = [];

			const iv = part.iv;
			const cipher = crypto.createDecipheriv('aes-256-ctr', key, iv);

			res.body.on('data', (data) => {
				const buff = Buffer.from(cipher.update(data), 'binary');
				return partBuffer.push(buff);
			});

			res.body.on('end', async () => {
				const buff = Buffer.from(cipher.final('binary'), 'binary');
				if(buff.length !== 0) partBuffer.push(buff);

				parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} decrypting (${i + 1}/${parts.length})` });

				buffers[part.id] = partBuffer;
				parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} done (${i + 1}/${parts.length})` });

				if (i == parts.length - 1) {
					const buffer = [].concat(...Object.values(buffers));
					const content = Buffer.concat(buffer);

					parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} decrypting everything` });
					return parentPort.postMessage({ toUser: true, event: 'download', 'data': { content, name } });
				}
			});
		}).catch(() => {
			return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} failed (${i + 1}/${parts.length})` });
		});
	}
};

if (workerData.task == 'upload') return upload(workerData);
if (workerData.task == 'download') return download(workerData);