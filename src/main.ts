import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import { initializeSerial } from './main/serialCommunication/initializeSerial'
import { CageData, parseCageData } from './renderer/contexts/CageContext'
import { readFileSync, writeFileSync } from 'node:fs'
import { testingEnvironment } from './util/test'
import { mainTest, startServer, sendTestQuery } from './util/ServerQueries'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 480,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'preload.js'),
    },
    fullscreen: app.isPackaged, // enable fullscreen in production
  })

  startServer(mainWindow)

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)

    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, `../.vite/renderer/index.html`))
  }

  ipcMain.on('close', () => mainWindow.close())

  initializeSerial(mainWindow)
  ipcMain.handle('save-cage', async (event: IpcMainInvokeEvent , cage: CageData) => {
    try {
      writeFileSync(
        path.join(app.getPath('appData'), 'god-sensor-cage-config.json'),
        JSON.stringify(cage),
        {
          encoding: 'utf8',
        }
      )
      return true
    } catch {
      return false
    }
  })
  ipcMain.handle(
    'load-cage',
    async (event: IpcMainInvokeEvent ): Promise<CageData | null> => {
      try {
        const rawData = readFileSync(
          path.join(app.getPath('appData'), 'god-sensor-cage-config.json'),
          'utf8'
        )
        const data = JSON.parse(rawData)
        const cage = parseCageData.parse(data)
        return cage
      } catch {
        return null
      }
    }
  )
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

testingEnvironment()

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function handleIP(event: IpcMainInvokeEvent, ip: string) {
  console.log(ip)
  sendTestQuery(ip)
}

app.whenReady().then(() => {
  ipcMain.handle('ip-received', handleIP)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
