const nodeCreate = () => {
	error(false);
	const ip = document.getElementById('ip').value;
	const port = document.getElementById('port').value;
	const ca = document.getElementById('ca').value;

	const valid = validate(ip, port, ca);
	if (!valid.success) return alert(valid.message);

	const body = {
		ip,
		port,
		ca,
	};

	fetch('/nodes/create', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = '/';
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

let forceNodeEdit = false;

const nodeEdit = (id) => {
	error(false);
	const ip = document.getElementById('ip').value;
	const port = document.getElementById('port').value;
	const ca = document.getElementById('ca').value;

	const valid = validate(ip, port, ca);
	if (!valid.success) return alert(valid.message);

	const body = {
		ip,
		port,
		ca,
		force: forceNodeEdit,
	};

	fetch(`/nodes/${id}/edit`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) {
				forceNodeEdit = true;
				document.getElementById('edit-node').innerText = 'Force save';
				return error(true, json.message);
			}
			else return window.location.href = '/';
		}).catch(() => {
			forceNodeEdit = true;
			document.getElementById('edit-node').innerText = 'Force save';
			return error(true, 'There are problems connecting to the server!');
		});
};

let forceNodeDelete = false;

const nodeDelete = (id) => {
	error(false);

	const body = {
		force: forceNodeDelete,
	};

	fetch(`/nodes/${id}/delete`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) {
				forceNodeDelete = true;
				document.getElementById('delete-node').innerText = 'Force delete';
				return error(true, json.message);
			}
			else return window.location.href = '/';
		}).catch(() => {
			forceNodeDelete = true;
			document.getElementById('delete-node').innerText = 'Force delete';
			return error(true, 'There are problems connecting to the server!');
		});
};

const userEdit = (id) => {
	error(false);
	const username = document.getElementById('username').value;
	const email = document.getElementById('email').value;
	const password = document.getElementById('password').value;
	const permissions = document.getElementById('permissions').value;

	const body = {
		username,
		email,
		password,
		permissions,
	};

	fetch(`/accounts/${id}/edit`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = '/';
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
}

const userDelete = (id) => {
	error(false);
	fetch(`/accounts/${id}/delete`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = '/';
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
}

const fileDelete = (path, name) => {
	error(false);
	return socket.emit('delete', { path, name });
};

const fileUpload = () => {
	error(false);
	const file = document.getElementById('file').files[0];
	if (!file) return;

	const key = document.getElementById('file-key').value;
	if (!key) return alert('You need to enter a encryption key.');
	document.getElementById('file-key').value = '';

	const name = file.name;
	const params = new URLSearchParams(window.location.search)
	const path = params.get('path');

	document.getElementById('percentage-upload').innerHTML = '0%';
	showMessage(`[upload] [client-side] ${path}${name} encrypting`);

	const reader = new FileReader();
	reader.readAsBinaryString(file);
	reader.onload = (e) => {
		const encrypted = CryptoJS.AES.encrypt(e.target.result, key);
		const encryptedFile = new File([encrypted], name, { type: 'text/plain' });

		showMessage(`[upload] [client-side] ${path}${name} encrypted`);

		const stream = ss.createStream();
		const blobStream = ss.createBlobReadStream(encryptedFile);

		ss(socket).emit('upload', stream, { size: encryptedFile.size, path, name });
		return blobStream.pipe(stream);
	}
}

const fileDownload = (path, name) => {
	error(false);
	return socket.emit('download', { path, name });
};

const dirCreate = () => {
	error(false);
	const name = document.getElementById('createDirectory').value || '/';

	return window.location = window.location.pathname + replaceQueryParam('path', name, window.location.search);
}

const moveoneback = () => {
	let newParam = window.location.search.split('path=')[1].split('&')[0].replace(/\/$/, '').split('/').slice(0, -1).join('/');
	if (newParam.length == 0) newParam = '/'
	return window.location = window.location.pathname + replaceQueryParam('path', newParam, window.location.search);
}

const replaceQueryParam = (param, newval, search) => {
    var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    var query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
} 

const validate = (ip, port, ca) => {
	if (!ip) {
		return { success: false, message: 'Missing the ip!' };
	} else if (!port) {
		return { success: false, message: 'Missing the port!' };
	}  else if (!ca) {
		return { success: false, message: 'Missing the certificate!' };
	} else if (!ca.startsWith('-----BEGIN CERTIFICATE-----')) {
		return { success: false, message: 'Invalid certificate (make sure to include the -----BEGIN CERTIFICATE-----)!' };
	} else if (!ca.endsWith('-----END CERTIFICATE-----')) {
		return { success: false, message: 'Invalid certificate (make sure to include the -----END CERTIFICATE-----)!' };
	} else {
		return { success: true };
	}
};

const error = (errorBool, msg) => {
	if (errorBool) document.getElementById('response').innerHTML = msg;
	else document.getElementById('response').innerHTML = '';
};

const showMessage = (msg) => {
	return document.getElementById('messages').innerHTML = msg + '<br>' + document.getElementById('messages').innerHTML;
}

// const prepareAndDownload = (name, buffer) => {
// 	const arr = new Uint8Array(buffer);
// 	let str = '';
// 	for (let i = 0; i < arr.length; i++) {
// 		str += String.fromCharCode(arr[i]);

// 		if (i == arr.length - 1) {
// 			return download(str, name);
// 		}
// 	}
// }