const { workerData, parentPort } = require('worker_threads');
const fetch = require('node-fetch');
const { join } = require('path');
const { createReadStream, createWriteStream, unlinkSync } = require('fs');
const { randomBytes, createCipheriv, createDecipheriv } = require('crypto');
const FormData = require('form-data');
const { Agent } = require('https');

const { db } = require('./sql.js');
const { bufferToStream } = require('./utils.js');

const tempDir = join(__dirname, '../', 'files');

const upload = async ({ dataForThisLoop, nodeForThisLoop, fileID, partID, curloop, loops, path, name }) => {
	parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) encrypting` });

	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-ctr', nodeForThisLoop.key, iv);

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

		parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) encrypted` });

		const formData = new FormData();
		formData.append('file', createReadStream(`${tempDir}/${partID}`));
		formData.append('key', nodeForThisLoop.ckey);

		const agent = new Agent({
			ca: nodeForThisLoop.ca,
		});

		parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) uploading to node` });

		fetch(`https://${nodeForThisLoop.ip}:${nodeForThisLoop.port}/files/upload`, {
			method: 'POST',
			body: formData,
			agent,
		}).then(res2 => res2.json())
			.then(async json => {
				if (!json.success) {
					// TODO: delete all uploaded parts, and throw error?
					return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) failed` });
				} else {
					await db.prepare('INSERT INTO parts (id, file, node, iv, i) VALUES (?,?,?,?,?);').run([partID, fileID, nodeForThisLoop.id, iv, curloop]);
					await unlinkSync(`${tempDir}/${partID}`);

					parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) uploaded to node` });

					if(curloop == loops - 1) {
						// TODO: io.sockets.emit('reload', 'files');
						return parentPort.postMessage({ event: 'reload', 'data': 'files' });
					}
				}
			}).catch(() => {
				// TODO: delete all uploaded parts, and throw error?
				return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[upload] [server-side] ${path}${name} (${curloop + 1}/${loops}) failed` });
			});
	});
};

const download = async ({ parts, path, name }) => {
	const buffers = {};

	for(let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const curloop = i;

		const partID = part.id;

		const node = await db.prepare('SELECT * FROM nodes WHERE id = ?;').get([part.node]);

		const body = {
			id: partID,
			key: node.ckey,
		};

		const agent = new Agent({
			ca: node.ca,
		});

		parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] [server-side] ${path}${name} (${curloop + 1}/${parts.length}) downloading from node` });

		fetch(`https://${node.ip}:${node.port}/files/download`, {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
			agent,
		}).then(async res => {
			if (res.status !== 200) throw new Error((await res.json()).message);

			parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] [server-side] ${path}${name} (${curloop + 1}/${parts.length}) downloaded from node` });
			parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] [server-side] ${path}${name} (${curloop + 1}/${parts.length}) decrypting` });

			const partBuffer = [];

			const iv = part.iv;
			const cipher = createDecipheriv('aes-256-ctr', node.key, iv);

			res.body.on('data', (data) => {
				const buff = Buffer.from(cipher.update(data), 'binary');
				return partBuffer.push(buff);
			});

			res.body.on('end', async () => {
				const buff = Buffer.from(cipher.final('binary'), 'binary');
				if(buff.length !== 0) partBuffer.push(buff);


				buffers[part.i] = partBuffer;
				parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] [server-side] ${path}${name} (${curloop + 1}/${parts.length}) decrypted` });

				if (Object.keys(buffers).length == parts.length) {
					const ordered = Object.keys(buffers)
						.sort()
						.reduce((obj, keya) => {
							obj[keya] = buffers[keya];
							return obj;
						}, {});

					const buffer = [].concat(...Object.values(ordered));
					const content = Buffer.concat(buffer);

					return parentPort.postMessage({ toUser: true, event: 'download', 'data': { content, name, path } });
				}
			});
		}).catch(() => {
			return parentPort.postMessage({ toUser: true, event: 'message', 'data': `[download] [server-side] ${path}${name} (${curloop + 1}/${parts.length}) failed` });
		});
	}
};

if (workerData.task == 'upload') return upload(workerData);
if (workerData.task == 'download') return download(workerData);