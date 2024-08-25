const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let win;
let child;

function createWindow() {
    win = new BrowserWindow({
        width: 500,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'assets', 'favicon.ico'),
        minHeight: 600,
        minWidth: 400
    });

    win.loadFile('index.html');
    // Optional: Open the DevTools
    // win.webContents.openDevTools();

    // Automatically start the script when the window finishes loading
    win.webContents.on('did-finish-load', () => {
        startScript();  // Automatically start the script after the app loads
    });
}

app.whenReady().then(createWindow);

function startScript() {
    if (child) child.kill();

    child = spawn('node', ['bot.mjs']);

    if (child) {
        child.stdout.on('data', (data) => {
            win.webContents.send('console-output', data.toString());
        });

        child.stderr.on('data', (data) => {
            win.webContents.send('console-output', data.toString());
        });

        child.on('close', (code) => {
            win.webContents.send('console-output', `Script exited with code ${code}`);
        });
    } else {
        win.webContents.send('console-output', 'Failed to start script.');
    }
}

ipcMain.on('start-script', () => {
    startScript();
});

ipcMain.on('stop-script', () => {
    if (child) {
        child.kill();
        win.webContents.send('console-output', 'Script stopped.');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
