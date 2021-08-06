const nodeCreate = () => {
	const ip = document.getElementById('ip').value;
	const port = document.getElementById('port').value;
	const publickey = document.getElementById('publickey').value;

	const valid = validate(ip, port, publickey);
	if (!valid.success) return alert(valid.message);

	const body = {
		ip,
		port,
		publickey,
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
	const publickey = document.getElementById('publickey').value;

	const valid = validate(ip, port, publickey);
	if (!valid.success) return alert(valid.message);

	const body = {
		ip,
		port,
		publickey,
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

const fileDelete = (nodeID, path, file, isDir) => {
	const body = {
		file,
		path,
		isDir,
	};

	fetch(`/files/${nodeID}/delete`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = `/files/${nodeID}/view${body.path}`;
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

const fileDownload = (nodeID, path, file) => {
	const body = {
		file,
		path,
	};

	fetch(`/files/${nodeID}/download`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return prepareAndDownload(json.name, json.buffer.data)
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

const dirCreate = (nodeID) => {
	const name = document.getElementById('createDirectory').value || '/';

	const body = {
		name,
	};

	fetch(`/files/${nodeID}/create`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) return error(true, json.message);
			else return window.location.href = `/files/${nodeID}/view${body.name}`;
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
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

const validate = (ip, port, publickey) => {
	if (!ip) {
		return { success: false, message: 'Missing the ip!' };
	} else if (!port) {
		return { success: false, message: 'Missing the port!' };
	} else if (!publickey) {
		return { success: false, message: 'Missing the public key!' };
	} else {
		return { success: true };
	}
};

const error = (errorBool, msg) => {
	if (errorBool) document.getElementById('response').innerHTML = msg;
	else document.getElementById('response').innerHTML = '';
};

const prepareAndDownload = (name, buffer) => {
	const arr = new Uint8Array(buffer);
	let str = '';
	for (let i = 0; i < arr.length; i++) {
		str += String.fromCharCode(arr[i]);

		if (i == arr.length - 1) {
			return download(str, name);
		}
	}
}