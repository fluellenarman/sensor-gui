import express, { Response } from 'express'
import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron'

import { colorPrint } from './logging'
import DiscoveryNetwork, { getWifiAddress } from './network/discovery'

let discoveryNetwork: DiscoveryNetwork

ipcMain.handle('get-devices', () => {
	return discoveryNetwork.getDevices()
})

ipcMain.on('connect', (event, data) => {
	connectToAddress(event, data)
})

ipcMain.on('send-launch-missile', (event) => {
	sendMissileLaunch(event)
})
ipcMain.on('send-missile-launcher-location', (event, x: number, y: number) => {
	sendMissileLauncherLocation(event, x, y)
})
ipcMain.on('send-line-of-sight-location', (event, x: number, y: number) => {
	sendLineOfSightLocation(event, x, y)
})

export function startServer(mainWindow: BrowserWindow, discovery: DiscoveryNetwork) {
	discoveryNetwork = discovery

	const server = express()
	server.use(express.json())
	const port = 3000

	server.listen(port, () => {
		console.log(`ServerQueries.ts: Server is running on ${getWifiAddress()}:${port}`)
	})

	server.get('/', (_, res: Response) => {
		res.send('Hello from Red GUI server!').status(200)
	})

	server.get('/line-of-sight', (_, res: Response) => {
		mainWindow.webContents.send('line-of-sight')
		res.sendStatus(200)
	})

	server.get('/flare', (_, res: Response) => {
		mainWindow.webContents.send('flare')
		res.sendStatus(200)
	})

	server.get('/jam', (_, res: Response) => {
		const ultrasonicTypeId = 1
		const ultrasonicSensorId = 0 // Jam all sensors
		const jamTotal = 100
		let jamOccurences = 0
		const jamInterval = setInterval(() => {
			if (jamOccurences === jamTotal) clearInterval(jamInterval)
			jamOccurences++
			mainWindow.webContents.send('jam', ultrasonicTypeId, ultrasonicSensorId)
		}, 100)
		res.sendStatus(200)
	})

	server.post('/drone-location', (req, res) => {
		mainWindow.webContents.send('drone-location', req.body)
		res.sendStatus(200)
	})

	server.post('/missile-location', (req, res) => {
		mainWindow.webContents.send('missile-location', req.body)
		res.sendStatus(200)
	})

	server.post('/drone-status', (req, res) => {
		mainWindow.webContents.send('drone-status', req.body)
		res.sendStatus(200)
	})
}

async function connectToAddress(event: IpcMainEvent, data) {
	const { id, ip } = data
	try {
		const url = `http://${ip}`
		await fetch(url)
		event.sender.send('disable-ip-button', {})
		discoveryNetwork.setAddress(id, ip)
		colorPrint('cyan', url)
	} catch (error) {
		event.sender.send('enable-ip-button', {})
		colorPrint('red', 'connectToAddress():', error)
	}
}

async function sendMissileLaunch(event: IpcMainEvent) {
	const id = 'blue-gui'
	const api = '/launch-missile'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			event.sender.send('enable-ip-button', { id: id, api: api })
			throw Error(`failed to connect to ${id}`)
		}

		const url = `http://${address}${api}`
		await fetch(url)
		console.log(url)
	} catch (error) {
		colorPrint('red', 'sendMissileLaunch():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

async function sendMissileLauncherLocation(event: IpcMainEvent, x: number, y: number) {
	const id = 'blue-gui'
	const api = '/missile-launcher-location'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			event.sender.send('enable-ip-button', { id: id, api: api })
			throw Error(`failed to connect to ${id}`)
		}

		const url = `http://${address}${api}`
		const payload = { x, y }
		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		console.log(url)
	} catch (error) {
		colorPrint('red', 'sendMissileLauncherLocation():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

async function sendLineOfSightLocation(event: IpcMainEvent, x: number, y: number) {
	const id = 'blue-gui'
	const api = '/line-of-sight-location'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			event.sender.send('enable-ip-button', { id: id, api: api })
			throw Error(`failed to connect to ${id}`)
		}

		const url = `http://${address}${api}`
		const payload = { x, y }
		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		console.log(url)
	} catch (error) {
		colorPrint('red', 'sendLineOfSightLocation():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

export default { startServer }
