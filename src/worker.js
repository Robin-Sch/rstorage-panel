const { workerData, parentPort } = require('worker_threads');
const fetch = require('node-fetch');
const { join } = require('path');
const { createReadStream, createWriteStream, unlinkSync } = require('fs');
const { randomBytes, createCipheriv, createDecipheriv } = require('crypto');
const FormData = require('form-data');
const { Agent } = require('https');

const db = require('./sql.js');
const { bufferToStream, getKey } = require('./utils.js');

const tempDir = join(__dirname, '../', 'files');

const key = getKey();

const upload = async ({ dataForThisLoop, nodeForThisLoop, fileID, partID, curloop, loops, path, name }) => {
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-ctr', key, iv);

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

		const agent = new Agent({
			ca: nodeForThisLoop.ca,
		});

		fetch(`https://${nodeForThisLoop.ip}:${nodeForThisLoop.port}/files/upload`, {
			method: 'POST',
			body: formData,
			agent,
		}).then(res2 => res2.json())
			.then(async json => {
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
		const curloop = i;

		const partID = part.id;

		const body = {
			id: partID,
		};

		parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} preparing (${curloop + 1}/${parts.length})` });

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([part.node]);

		const agent = new Agent({
			ca: node.ca,
		});

		fetch(`https://${node.ip}:${node.port}/files/download`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			agent,
		}).then(async res => {
			if (res.status !== 200) throw new Error((await res.json()).message);
			const partBuffer = [];

			const iv = part.iv;
			const cipher = createDecipheriv('aes-256-ctr', key, iv);

			res.body.on('data', (data) => {
				const buff = Buffer.from(cipher.update(data), 'binary');
				return partBuffer.push(buff);
			});

			res.body.on('end', async () => {
				const buff = Buffer.from(cipher.final('binary'), 'binary');
				if(buff.length !== 0) partBuffer.push(buff);

				parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} decrypting (${curloop + 1}/${parts.length})` });

				buffers[part.id] = partBuffer;
				parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} done (${curloop + 1}/${parts.length})` });

				if (curloop == parts.length - 1) {
					// console.log(Object.keys(buffers));
					// sometimes this messes up, and doesn't download all parts?
					const buffer = [].concat(...Object.values(buffers));
					const content = Buffer.concat(buffer);

					parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} decrypting everything` });
					return parentPort.postMessage({ toUser: true, event: 'download', 'data': { content, name } });
				}
			});
		}).catch(() => {
			return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] ${path}${name} failed (${curloop + 1}/${parts.length})` });
		});
	}
};

if (workerData.task == 'upload') return upload(workerData);
if (workerData.task == 'download') return download(workerData);