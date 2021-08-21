const login = async () => {
	const email = document.getElementById('Lemail').value;
	const password = document.getElementById('Lpassword').value;
	const token = document.getElementById('Ltoken').value;
	
	const valid = validate(email, password);
	if (!valid.success) return alert(valid.message);

	const body = {
		email,
		password,
		token,
	};

	fetch('/accounts/login', {
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
}
const register = async () => {
	

	const email = document.getElementById('Remail').value;
	const username = document.getElementById('Rusername').value;
	const password = document.getElementById('Rpassword').value;
	const totp = document.getElementById('Rtotp').checked;

	const valid = validate(email, password, username);
	if (!valid.success) return alert(valid.message);

	const body = {
		email,
		username,
		password,
		totp,
	};

	fetch('/accounts/register', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) {
				return error(true, json.message)
			} else {
				if(totp && json.secret) {

					new QRCode(document.getElementById("qrcode"), 
					`otpauth://totp/R-storage%20Panel?secret=${json.secret}`
					);
					
					document.getElementById('Tsecret').innerText = `Your secret is: ${json.secret}`;
					document.getElementById('Temail').value = email;
					document.getElementById('register').style = 'display: none;';
					return document.getElementById('verify-totp').style = 'display: block;';
				}
				return window.location.href = '/';
			}
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
}

const verify = () => {
	const email = document.getElementById('Temail').value;
	const token = document.getElementById('Ttoken').value;

	const body = {
		email,
		token,
	};

	fetch('/accounts/totp-verify', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	}).then(res => res.json())
		.then(json => {
			if (!json.success) {
				return error(true, json.message)
			} else {
				return window.location.href = '/';
			}
		}).catch(() => {
			return error(true, 'There are problems connecting to the server!');
		});
}

const validate = (email, password, username) => {
	if (!email) {
		return { success: false, message: 'Missing your email!' };
	} else if (!password) {
		return { success: false, message: 'Missing your password!' };
	} else if (username && (username.length < 1 || username.length > 32)) {
		return { success: false, message: 'Your username can\'t be longer than 32 characters' };
	} else {
		return { success: true };
	}
}

const change = (block, disabled) => {
	if (disabled && disabled.toLowerCase() == 'true') return error(true, 'Registering is disabled! If this is your first time, please check the readme!')
	error(false);
	const other = block == 'login' ? 'register' : 'login';
	document.getElementById(block).style = 'display: block';
	document.getElementById(other).style = 'display: none';
}

const error = (errorBool, msg) => {
	if (errorBool) {
		document.getElementById('response').innerHTML = msg;
	} else {
		document.getElementById('response').innerHTML = '';
	}
}