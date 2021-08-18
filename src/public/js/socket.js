const socket = io();

socket.on('message', (msg) => {
	return document.getElementById('messages').innerHTML = msg + '<br>' + document.getElementById('messages').innerHTML;
});

socket.on('reload', () => {
	return window.location.reload();
});

socket.on('download', (data) => {
	const content = new TextDecoder('utf-8').decode(new Uint8Array(data.content));
	const key = window.prompt(`Please enter the decryption key for ${data.name}.`);
	if (!key) return;
	const decrypted = CryptoJS.AES.decrypt(content, key).toString(CryptoJS.enc.Utf8);
	return download(decrypted, data.name);
});

socket.on('error', (err) => {
	return document.getElementById('response').innerHTML = err;
});

socket.on('upload-percentage', (percentage) => {
	const el = document.getElementById('percentage-upload');
	if (el) el.innerHTML = `${percentage}%`;
});