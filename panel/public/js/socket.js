const socket = io();

socket.on('message', (msg) => {
	document.getElementById('messages').innerHTML = msg + '<br>' + document.getElementById('messages').innerHTML;
});

socket.on('reload', () => {
	window.location.reload();
});

socket.on('download', (data) => {
	return prepareAndDownload(data.name, data.content);
});

socket.on('error', (err) => {
	document.getElementById('response').innerHTML = err;
});

socket.on('upload-percentage', (percentage) => {
	const el = document.getElementById('percentage-upload');
	if (el) el.innerHTML = `${percentage}%`;
});