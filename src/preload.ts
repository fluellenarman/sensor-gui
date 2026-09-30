// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

import { Ping } from './types/Pings'
import { CageData } from './renderer/contexts/CageContext'

contextBridge.exposeInMainWorld('electronAPI', {
	onPingReceived: (callback: (ping: Ping) => unknown) =>
		ipcRenderer.on('ping-received', (_, ping) => callback(ping)),
	onIPReceived: (ip: string) => ipcRenderer.invoke('ip-received', ip),
	onUpdateDevices: (callback: (devices: { [path: string]: boolean }) => unknown) =>
		ipcRenderer.on('update-devices', (_, devices) => callback(devices)),
	trySetConnection: (path: string, connect: boolean) =>
		ipcRenderer.invoke('try-set-connection', path, connect),
	saveCageConfiguration: (cage: CageData) => ipcRenderer.invoke('save-cage', cage),
	loadCageConfiguration: () => ipcRenderer.invoke('load-cage'),
	onJam: (callback: (typeId: number, sensorId: number) => unknown) =>
		ipcRenderer.on('jam', (_, typeId, sensorId) => callback(typeId, sensorId)),
	toggleMockSensors: (enabled: boolean) => ipcRenderer.invoke('toggle-mock-sensors', enabled),
	onDroneLocPing: (callback) =>
		ipcRenderer.on('drone-location', (_event, data) => callback(data)),
	onMissileLocPing: (callback) =>
		ipcRenderer.on('missile-location', (_event, data) => callback(data)),
	onLOS_ping: (callback) => ipcRenderer.on('line-of-sight', (_event, data) => callback(data)),
	onFlarePing: (callback) => ipcRenderer.on('flare', (_event, data) => callback(data)),
	getDevices: () => ipcRenderer.invoke('get-devices'),
	onEnableAddressButton: (callback) =>
		ipcRenderer.on('enable-ip-button', (_event, value) => callback(value)),
	onDisableAddressButton: (callback) =>
		ipcRenderer.on('disable-ip-button', (_event, value) => callback(value)),
	onDroneStatusPing: (callback) =>
		ipcRenderer.on('drone-status', (_event, value) => callback(value)),

	sendAddress: (data) => ipcRenderer.send('connect', data),
	sendLOS_LocPing: (x: number, y: number) =>
		ipcRenderer.send('send-line-of-sight-location', x, y),
	sendLauncherLocPing: (x: number, y: number) =>
		ipcRenderer.send('send-missile-launcher-location', x, y),
	sendLaunchMissileRequest: () => ipcRenderer.send('send-launch-missile'),
	closeApp: () => ipcRenderer.send('close')
})
