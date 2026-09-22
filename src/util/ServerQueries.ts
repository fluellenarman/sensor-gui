import os from 'os'
import express from 'express'
import { ipcMain, BrowserWindow } from 'electron'
import { DiscoveryNetwork, getDeviceAddresses } from './network/discovery'

let networkURL = ''
let gWindow: BrowserWindow

function getLocalIPAddress() {
	const interfaces = os.networkInterfaces()
	const addresses = []

	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]) {
			// Skip internal (loopback) and non-IPv4 addresses
			if (iface.family === 'IPv4' && !iface.internal) {
				addresses.push({ name, address: iface.address })
			}
		}
	}

	console.log('from server, addresses:\n', addresses[0]?.address, '\n')
	return addresses[0]?.address
}
let discoveryNetwork: DiscoveryNetwork

function mainTest() {
	console.log('test main')
	console.log('ServerQueries.ts mainTest() called')
	console.log()
}

function startServer(mainWindow: BrowserWindow, discovery: DiscoveryNetwork) {
	gWindow = mainWindow
	discoveryNetwork = discovery

	ipcMain.handle('get-devices', () => {
		return discoveryNetwork.getDevices()
	})

	ipcMain.on('ip-address', (event, data) => {
		console.log('Received IP address from renderer:', data)
		sendManualAddress(event, data)
	})

	ipcMain.on('launchMissileRequest', (event) => {
		console.log('ServerQueries.ts: received launch missile request from renderer')
		launchQuery(event)
	})
	ipcMain.on('launcherLocPing', (event, x: number, y: number) => {
		console.log(
			`ServerQueries.ts: received launcher location ping from renderer: x=${x}, y=${y}`
		)
		launcherLocQuery(event, x, y)
		// Here you can handle the x and y coordinates as needed
	})
	ipcMain.on('LOS_LocPing', (event, x: number, y: number) => {
		console.log(
			`ServerQueries.ts: received launcher LOS location ping from renderer: x=${x}, y=${y}`
		)
		LOS_LocQuery(event, x, y)
		// Here you can handle the x and y coordinates as needed
	})

	const ip = getDeviceAddresses()[0].address
	const server = express()
	server.use(express.json())
	const port = 3000

	server.listen(port, () => {
		console.log(`ServerQueries.ts: Server is running on ${ip}:${port}`)
	})

	server.get('/', (req, res) => {
		res.send('Hello from RED GUI server!')
	})

	server.get('/LOS-ping', (req, res) => {
		res.send('ok')
		console.log('ServerQueries.ts: received LOS ping from Blue GUI')
		mainWindow.webContents.send('LOS-ping') // Forward the data to the renderer process
	})

	server.get('/FlarePing', (req, res) => {
		res.send('ok')
		console.log('ServerQueries.ts: /FlarePing HIT from Blue GUI')
		mainWindow.webContents.send('flarePing') // Forward the data to the renderer process
	})

	server.get('/jamPing', (req, res) => {
		res.send('ok')
		const ultrasonicTypeId = 1
		const ultrasonicSensorId = 0 // Jam all sensors
		const jamTotal = 100
		let jamOccurences = 0
		const jamInterval = setInterval(() => {
			if (jamOccurences === jamTotal) clearInterval(jamInterval)
			jamOccurences++
			mainWindow.webContents.send('jam', ultrasonicTypeId, ultrasonicSensorId)
		}, 100)
	})

	server.post('/droneLoc', (req, res) => {
		res.send('ok')
		// console.log("ServerQueries.ts: received drone location ping from Blue GUI")
		const data = req.body
		console.log(data) // Log the received dataping from Blue GUI
		mainWindow.webContents.send('droneLocPing', data) // Forward the data to the renderer process
	})

	server.post('/missileLoc', (req, res) => {
		res.send('ok')
		// console.log("ServerQueries.ts: received missile location ping from Blue GUI")
		const data = req.body
		console.log(data)
		mainWindow.webContents.send('missileLocPing', data) // Forward the data to the renderer process
	})

	testQuery()

	console.log('ServerQueries.ts: startServer() END\n')
}

async function testQuery() {
	// Using this testURL because it's free and open
	const testURL = 'https://jsonplaceholder.typicode.com/todos/1'
	const response = await fetch(testURL)
	const data = await response.json()
	console.log(data)
	console.log('ServerQueries.ts: testQuery() END\n')
}

async function sendTestQuery(ip: string) {
	const bluePort = 3003
	const url = `http://${ip}:${bluePort}`
	console.log(url)
	try {
		const response = fetch(url, {
			method: 'GET'
		})
		gWindow.webContents.send('sendIP-feedback', 'success')
		const data = await response.text()
		console.log(data)
		discoveryNetwork.setAddress('blue-gui', url)
		console.log(url)
	} catch (error) {
		console.log(error)
		gWindow.webContents.send('sendIP-feedback', 'failed')
	}
}

// async function testQuery2(url) {
//     gWindow.webContents.send('sendIP-feedback', "progress")
//     colorPrint("yellow", "ServerQueries.ts: testQuery2(): Calling url: ", url)
//     try {
//         await fetch(url, {
//             method: 'GET',
//         });
//         colorPrint("green", "ServerQueries.ts: testQuery2(): successful GET request to ", url);
//         gWindow.webContents.send('sendIP-feedback', "success")
//     } catch (error) {
//         // console.log("ServerQueries.ts: testQuery2() error: ", error);
//         colorPrint("red", "ServerQueries.ts: testQuery2() error: ", error);
//         gWindow.webContents.send('sendIP-feedback', "failed")
//     }
// }

// url will need to be changed for PROD
async function launchQuery(event) {
	const id = 'blue-gui'
	const api = '/pingMissileLaunch'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			console.log('launchQuery(): failed to connect to blue gui')
			event.sender.send('enable-ip-button', { id: id, api: api })
			return
		}

		const url = `http://${address}${api}`
		await fetch(url)
		console.log(url)
	} catch (error) {
		console.error('Error in launchQuery():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

async function sendManualAddress(event, data) {
	const { id, ip } = data
	const port = 3003
	try {
		const address = `${ip}:${port}`
		const url = `http://${address}`
		await fetch(url)
		event.sender.send('disable-ip-button', {})
		discoveryNetwork.setAddress(id, address)
	} catch {
		event.sender.send('enable-ip-button', {})
		discoveryNetwork.deleteAddress(id)
	}
}

async function launcherLocQuery(event, x: number, y: number) {
	const id = 'blue-gui'
	const api = '/pingLauncherLoc'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			console.log('launcherLocQuery(): failed to connect to blue gui')
			event.sender.send('enable-ip-button', { id: id, api: api })
			return
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
		console.error('Error in launcherLocQuery():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

async function LOS_LocQuery(event, x: number, y: number) {
	const id = 'blue-gui'
	const api = '/pingLauncherLoc'
	try {
		const address = await discoveryNetwork.getAddress(id)
		if (!address) {
			console.log('LOS_LocQuery(): failed to connect to blue gui')
			event.sender.send('enable-ip-button', { id: id, api: api })
			return
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
		console.error('Error in LOS_LocQuery():', error)
		discoveryNetwork.deleteAddress(id)
	}
}

export { mainTest, startServer, testQuery, sendTestQuery, launchQuery }
