const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'app/KATT.png'),
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // devTools: false,
    }
  });

  win.loadFile('app/index.html');
  win.setFullScreen(true);
}

app.whenReady().then(() => {
  createWindow();
});

ipcMain.on('quit-app', () => {
  app.quit();
});