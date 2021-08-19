const { Selector } = require('testcafe');

const LOGIN = {
	email: Selector('#Lemail'),
	password: Selector('#Lpassword'),
	token: Selector('#Ltoken'),
	button: Selector('#Lbutton'),
	change: Selector('#Lchange'),
};

const REGISTER = {
	username: Selector('#Rusername'),
	email: Selector('#Remail'),
	password: Selector('#Rpassword'),
	totp: Selector('#Rtotp'),
	button: Selector('#Rbutton'),
	change: Selector('#Rchange'),
};

const NEWNODE = {
	ip: Selector('#ip'),
	port: Selector('#port'),
	ca: Selector('#ca'),
	button: Selector('#new-node'),
};

const EDITNODE = {
	goto: Selector('.edit-node'),
	connected: Selector('.connected'),
	ip: Selector('#ip'),
	port: Selector('#port'),
	ca: Selector('#ca'),
	edit: Selector('#edit-node'),
	delete: Selector('#delete-node'),
};

const EDITUSER = {
	goto: Selector('.edit-user'),
	username: Selector('#username'),
	email: Selector('#email'),
	password: Selector('#password'),
	permissions: Selector('#permissions'),
	edit: Selector('#edit-user'),
	delete: Selector('#delete-user'),
};

const FILES = {
	goto: Selector('#browse-files'),
	upload: Selector('#file'),
	uploadButton: Selector('#upload-file'),
	directory: Selector('#createDirectory'),
	directoryButton: Selector('#create-directory'),
	downloadButton: Selector('.download-file'),
	deleteButton: Selector('.delete-file'),
	decrypt: Selector('#decryption-key'),
	encrypt: Selector('#file-key'),
};

const RESPONSE = Selector('#response');

module.exports = {
	LOGIN,
	REGISTER,
	NEWNODE,
	EDITNODE,
	EDITUSER,
	FILES,
	RESPONSE,
};