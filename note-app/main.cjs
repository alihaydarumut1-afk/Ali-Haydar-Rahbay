const { app, BrowserWindow, session } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  })

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})