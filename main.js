const { app, BrowserWindow, ipcMain } = require('electron');
const server = require('./server');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1920,   
        height: 1080,  
        fullscreen: true,  
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
});

ipcMain.on('close-app', () => {
    app.quit();
});

