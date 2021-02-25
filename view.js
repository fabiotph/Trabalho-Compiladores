const { app, BrowserWindow, ipcMain } = require('electron')
const {analise_sintatica} = require('./index')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    title: "Compilador LALG"
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('execute', (e, data) => {
  result = analise_sintatica(data);
  e.returnValue = result
})