const socket = io();

socket.on('message', (msg) => {
	return document.getElementById('messages').innerHTML = msg + '<br>' + document.getElementById('messages').innerHTML;
});

socket.on('reload', () => {
	return window.location.reload();
});

socket.on('download', (data) => {
	return prepareAndDownload(data.name, data.content);
});

socket.on('error', (err) => {
	return document.getElementById('response').innerHTML = err;
});

socket.on('upload-percentage', (percentage) => {
	const el = document.getElementById('percentage-upload');
	if (el) el.innerHTML = `${percentage}%`;
});