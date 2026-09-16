import os from 'os'
import express from 'express'
import { ipcMain, BrowserWindow } from 'electron'
import { DiscoveryNetwork, getDeviceAddresses } from './network/discovery'
import { add } from 'three/tsl'

let discoveryNetwork: DiscoveryNetwork

function mainTest() {
	console.log('test main')
	console.log('ServerQueries.ts mainTest() called')
	console.log()
}

function startServer(mainWindow: BrowserWindow, discovery: DiscoveryNetwork) {
	discoveryNetwork = discovery

	ipcMain.on('launchMissileRequest', () => {
		console.log('ServerQueries.ts: received launch missile request from renderer')
		launchQuery()
	})
	ipcMain.on('launcherLocPing', (event, x: number, y: number) => {
		console.log(
			`ServerQueries.ts: received launcher location ping from renderer: x=${x}, y=${y}`
		)
		launcherLocQuery(x, y)
		// Here you can handle the x and y coordinates as needed
	})
	ipcMain.on('LOS_LocPing', (event, x: number, y: number) => {
		console.log(
			`ServerQueries.ts: received launcher LOS location ping from renderer: x=${x}, y=${y}`
		)
		LOS_LocQuery(x, y)
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
	server.post('/droneLoc', (req, res) => {
		res.send('ok')
		console.log('ServerQueries.ts: received drone location ping from Blue GUI')
		const data = req.body
		console.log(data) // Log the received dataping from Blue GUI
		mainWindow.webContents.send('droneLocPing', data) // Forward the data to the renderer process
	})
	server.post('/missileLoc', (req, res) => {
		res.send('ok')
		console.log('ServerQueries.ts: received missile location ping from Blue GUI')
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
		const response = await fetch(url)
		const data = await response.text()
		console.log(data)
		discoveryNetwork.setAddress('blue-gui', url)
		console.log(url)
	} catch (error) {
		console.log(error)
	}
}

// url will need to be changed for PROD
async function launchQuery() {
	try {
		const address = await discoveryNetwork.getAddress('blue-gui')
		if (!address) {
			console.log('launchQuery(): failed to connect to red gui')
			return
		}

		const url = `http://${address}/pingMissileLaunch`
		await fetch(url)
		console.log(url)
	} catch (error) {
		console.error('Error in launchQuery():', error)
	}
}

async function launcherLocQuery(x: number, y: number) {
	try {
		const address = await discoveryNetwork.getAddress('blue-gui')
		if (!address) {
			console.log('launcherLocQuery(): failed to connect to red gui')
			return
		}

		const url = `http://${address}/pingLauncherLoc`
		const payload = { x, y }
		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		console.log(url)
	} catch (error) {
		console.error('Error in launcherLocQuery():', error)
	}
}

async function LOS_LocQuery(x: number, y: number) {
	try {
		const address = await discoveryNetwork.getAddress('blue-gui')
		if (!address) {
			console.log('LOS_LocQuery(): failed to connect to red gui')
			return
		}

		const url = `http://${address}/pingLauncherLoc`
		const payload = { x, y }
		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		console.log(url)
	} catch (error) {
		console.error('Error in LOS_LocQuery():', error)
	}
}

export { mainTest, startServer, testQuery, sendTestQuery, launchQuery }
