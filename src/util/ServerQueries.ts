import express from 'express'
import { ipcMain } from 'electron'
import os from 'os'
import { Discovery } from '../network/discovery'

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }

    console.log('from server, addresses:\n',addresses[0]?.address, '\n');
    return addresses[0]?.address
}

function mainTest() {
    console.log('test main')
    console.log('ServerQueries.ts mainTest() called')
    console.log();
}

function startServer() {
    ipcMain.on('launchMissileRequest', () => {
        console.log('ServerQueries.ts: received launch missile request from renderer')
        launchQuery();
    })
    ipcMain.on('launcherLocPing', (event, x: number, y: number) => {
        console.log(`ServerQueries.ts: received launcher location ping from renderer: x=${x}, y=${y}`)
        launcherLocQuery(x, y);
        // Here you can handle the x and y coordinates as needed
    })
    const ip = getLocalIPAddress()
    const server = express()
    const port = 3000
    const discovery = new Discovery('red-gui', port)
    discovery.start()

    server.listen(port, () => {
        console.log(`ServerQueries.ts: Server is running on ${ip}:${port}`)
    })

    server.get('/', (req, res) => {
        res.send('Hello from the server!')
    })
    testQuery();

    console.log('ServerQueries.ts: startServer() END\n')
}

async function testQuery() {
    // Using this testURL because it's free and open
    const testURL = 'https://jsonplaceholder.typicode.com/todos/1'
    const response = await fetch(testURL);
    const data = await response.json();
    console.log(data);
    console.log('ServerQueries.ts: testQuery() END\n')
}

async function sendTestQuery(ip: string) {
    try {
        const response = await fetch(`http://${ip}`);
        const data = await response.text();
        console.log(data);
        }
    catch (error) {
        console.log(error);
    }
}

// url will need to be changed for PROD
async function launchQuery() {
    const url = 'http://localhost:3003/pingMissileLaunch';
    const data = await fetch(url).catch((error) => {
        console.error('Error in launchQuery():', error);
    })
}

async function launcherLocQuery(x: number, y: number) {
    const url = `http://localhost:3003/pingLauncherLoc`;
    const payload = { x, y };
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
}

export {mainTest, startServer, testQuery, sendTestQuery, launchQuery}