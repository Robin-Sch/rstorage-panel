const nodeCreate = () => {
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

const nodeEdit = (id) => {
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

	fetch(`/nodes/${id}/edit`, {
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

const nodeDelete = (id) => {
	fetch(`/nodes/${id}/delete`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = '/';
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

const userEdit = (id) => {
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
	return socket.emit('delete', { path, name });
};

const fileUpload = () => {
	const file = document.getElementById('file').files[0];
	if (!file) return;

	const key = prompt('Please enter an encryption key (this is used to encrypt your file). If you forget this key, you can\'t download the file!');
	if (!key) return alert('You need to enter a encryption key.');

	document.getElementById('percentage-upload').innerHTML = '0%';

	const name = file.name;

	const params = new URLSearchParams(window.location.search)
	const path = params.get('path');

	const reader = new FileReader();
	reader.readAsBinaryString(file);
	reader.onload = (e) => {
		const encrypted = CryptoJS.AES.encrypt(e.target.result, key);
		const encryptedFile = new File([encrypted], name, { type: 'text/plain' });

		const stream = ss.createStream();
		const blobStream = ss.createBlobReadStream(encryptedFile);

		ss(socket).emit('upload', stream, { size: encryptedFile.size, path, name });
		return blobStream.pipe(stream);
	}
}

const fileDownload = (path, name) => {
	return socket.emit('download', { path, name });
};

const dirCreate = () => {
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