const { app, BrowserWindow } = require('electron')
const path = require('path')
const { fork } = require('child_process')

let serverProcess = null;

function createWindow () {
  // YouTube altyazılarını çeken arka plan sunucusunu başlat
  const serverPath = path.join(__dirname, 'server.js')
  serverProcess = fork(serverPath, [], { silent: true })

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})
