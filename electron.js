require('./src/index.js');
const { app, BrowserWindow } = require('electron');

const port = process.env.PANEL_PORT || 3000;

let window;

function createWindow() {
	window = new BrowserWindow({ minWidth: 400, minHeight: 400 });
	window.loadURL(`http://localhost:${port}`);
	window.on('closed', () => {
		window = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (window === null) {
		createWindow();
	}
});