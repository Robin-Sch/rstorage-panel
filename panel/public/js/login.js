/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const login = async () => {
	const email = document.getElementById('Lemail').value;
	const password = document.getElementById('Lpassword').value;

	const valid = validate(email, password);
	if (!valid.success) return alert(valid.message);

	const body = {
		email,
		password,
	};

	fetch('/login', {
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
const register = async () => {
	const email = document.getElementById('Remail').value;
	const username = document.getElementById('Rusername').value;
	const password = document.getElementById('Rpassword').value;

	const valid = validate(username, password, email);
	if (!valid.success) return alert(valid.message);

	const body = {
		email,
		username,
		password,
	};

	fetch('/register', {
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

const validate = (username, password, email) => {
	if (!username) {
		return { success: false, message: 'Missing your username!' };
	} else if (username.length < 1 || username.length > 32) {
		return { success: false, message: 'Your username can\'t be longer than 32 characters' };
	} else if (!password) {
		return { success: false, message: 'Missing your password!' };
	} else {
		return { success: true };
	}
};

const change = (block) => {
	error(false);
	const other = block == 'login' ? 'register' : 'login';
	document.getElementById(block).style = 'display: block';
	document.getElementById(other).style = 'display: none';
};

const error = (errorBool, msg) => {
	if (errorBool) document.getElementById('response').innerHTML = msg;
	else document.getElementById('response').innerHTML = '';
};