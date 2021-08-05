/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const nodeCreate = async () => {
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
			if (!json.success) {
				return error(true, json.message);
			} else {
				return window.location.href = '/';
			}
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

const nodeEdit = async (id) => {
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
			if (!json.success) {
				return error(true, json.message);
			} else {
				return window.location.href = '/';
			}
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

const nodeDelete = async (id) => {
	fetch(`/nodes/${id}/delete`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) {
				return error(true, json.message);
			} else {
				return window.location.href = '/';
			}
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
};

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
	if (errorBool) {
		document.getElementById('response').innerHTML = msg;
	} else {
		document.getElementById('response').innerHTML = '';
	}
};