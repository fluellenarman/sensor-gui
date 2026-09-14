import express from 'express'
import { ipcMain, BrowserWindow } from 'electron'
import os from 'os'

let networkURL = '';
let gWindow: BrowserWindow;

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

    console.log("from server, addresses:\n",addresses[0]?.address, '\n');
    return addresses[0]?.address
}

function mainTest() {
    console.log('test main')
    console.log("ServerQueries.ts mainTest() called")
    console.log();
}

function startServer(mainWindow: BrowserWindow) {
    gWindow = mainWindow;
    ipcMain.on('launchMissileRequest', () => {
        console.log("ServerQueries.ts: received launch missile request from renderer")
        launchQuery();
    })
    ipcMain.on('launcherLocPing', (event, x: number, y: number) => {
        console.log(`ServerQueries.ts: received launcher location ping from renderer: x=${x}, y=${y}`)
        launcherLocQuery(x, y);
        // Here you can handle the x and y coordinates as needed
    })
    ipcMain.on('LOS_LocPing', (event, x: number, y: number) => {
        console.log(`ServerQueries.ts: received launcher LOS location ping from renderer: x=${x}, y=${y}`)
        LOS_LocQuery(x, y);
        // Here you can handle the x and y coordinates as needed
    })
    const ip = getLocalIPAddress()
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
        // console.log("ServerQueries.ts: received drone location ping from Blue GUI")
        const data = req.body;
        console.log(data); // Log the received dataping from Blue GUI
        mainWindow.webContents.send('droneLocPing', data) // Forward the data to the renderer process
    })
    server.post('/missileLoc', (req, res) => {
        res.send('ok')
        // console.log("ServerQueries.ts: received missile location ping from Blue GUI")
        const data = req.body;
        console.log(data);
        mainWindow.webContents.send('missileLocPing', data) // Forward the data to the renderer process
    })
    server.get('/LOS-ping', (req, res) => {
        res.send('ok')
        console.log("ServerQueries.ts: received LOS ping from Blue GUI")
        mainWindow.webContents.send('LOS-ping') // Forward the data to the renderer process
    })
    server.get('/FlarePing', (req, res) => {
        res.send('ok')
        console.log("ServerQueries.ts: /FlarePing HIT from Blue GUI")
        mainWindow.webContents.send('flarePing') // Forward the data to the renderer process
    })

    testQuery();

    console.log("ServerQueries.ts: startServer() END\n")
}

async function testQuery() {
    // Using this testURL because it's free and open
    const testURL = 'https://jsonplaceholder.typicode.com/todos/1'
    const response = await fetch(testURL);
    const data = await response.json();
    console.log(data);
    console.log("ServerQueries.ts: testQuery() END\n")
}

async function sendTestQuery(ip: string) {
    const bluePort = 3003
    const url = `http://${ip}:${bluePort}/`;
    gWindow.webContents.send('sendIP-feedback', "progress")
    console.log(url)
    try {
        await fetch(url, {
            method: 'GET',
        });
        gWindow.webContents.send('sendIP-feedback', "success")
    } catch (error) { 
        console.log(error);
        gWindow.webContents.send('sendIP-feedback', "failed")
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
async function launchQuery() {
    const localhost_url = 'http://localhost:3003/pingMissileLaunch';
    try {
        let targetURL = localhost_url;
        if (networkURL != '') { targetURL = `${networkURL}pingMissileLaunch`; }
        await fetch(targetURL)
    } catch (error) {
        console.error("Error in launchQuery():", error);
    }
}

async function launcherLocQuery(x: number, y: number) {
    const localhost_url = `http://localhost:3003/pingLauncherLoc`;
    const payload = { x, y };
    try {
        let targetURL = localhost_url;
        if (networkURL != '') { targetURL = `${networkURL}pingLauncherLoc`; }
        console.log(`Sending launcher location to ${targetURL}`);
        await fetch(targetURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch (error) {
        console.error("Error in launcherLocQuery():", error);
    }
}

async function LOS_LocQuery(x: number, y: number) {
    const localhost_url = `http://localhost:3003/pingLOSLoc`;
    const payload = { x, y };
    try {
        let targetURL = localhost_url;
        if (networkURL != '') { targetURL = `${networkURL}pingLauncherLoc`; }
        console.log(`Sending launcher location to ${targetURL}`);
        await fetch(targetURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch (error) {
        console.error("Error in launcherLocQuery():", error);
    }
}

export {mainTest, startServer, testQuery, sendTestQuery, launchQuery}