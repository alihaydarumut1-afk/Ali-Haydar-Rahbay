const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startBackendServer } = require('./server.js');

async function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true, // Üstteki rahatsız edici menü çubuğunu gizler
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Arka plan sunucusunu başlatıyoruz ve atanan portu alıyoruz
  const port = await startBackendServer();
  
  win.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});