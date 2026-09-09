// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { Ping } from './types/Pings'
import { DeviceConnections } from './types/DevicesStatus'
import { ReadlineParser, SerialPort } from 'serialport'
import { CageData } from './renderer/contexts/CageContext'
import { send } from 'vite'


contextBridge.exposeInMainWorld('electronAPI', {
  onPingReceived: (callback: (ping: Ping) => unknown) =>
    ipcRenderer.on('ping-received', (_, ping) => callback(ping)),
  onIPReceived: (ip: string) => ipcRenderer.invoke('ip-received', ip),
  onUpdateDevices: (
    callback: (devices: { [path: string]: boolean }) => unknown
  ) => ipcRenderer.on('update-devices', (_, devices) => callback(devices)),
  trySetConnection: (path: string, connect: boolean) =>
    ipcRenderer.invoke('try-set-connection', path, connect),
  saveCageConfiguration: (cage: CageData) =>
    ipcRenderer.invoke('save-cage', cage),
  loadCageConfiguration: () => ipcRenderer.invoke('load-cage'),
  closeApp: () => ipcRenderer.send('close'),
  onJam: (callback: (typeId: number, sensorId: number) => unknown) =>
    ipcRenderer.on('jam', (_, typeId, sensorId) => callback(typeId, sensorId)),
  toggleMockSensors: (enabled: boolean) =>
    ipcRenderer.invoke('toggle-mock-sensors', enabled), 
  sendLaunchMissileRequest: () => ipcRenderer.send('launchMissileRequest'),
  sendLauncherLocPing: (x: number, y: number) => ipcRenderer.send('launcherLocPing', x, y),
  onDroneLocPing: (callback) => ipcRenderer.on('droneLocPing', (_event, data) => callback(data)),
  onMissileLocPing: (callback) => ipcRenderer.on('missileLocPing', (_event, data) => callback(data)),
  onLOS_ping: (callback) => ipcRenderer.on('LOS-ping', (_event, data) => callback(data)),
  sendLOS_LocPing: (x: number, y: number) => ipcRenderer.send('LOS_LocPing', x, y),
})
 