import { sendJam, sendPing } from '../main/serialCommunication/initializeSerial'

export function testingEnvironment() {
    const test = process.argv.slice(2).includes('--test=true');
    console.log('Test mode:', test);
    if (test == true) {
        console.log('Test mode:', test);
        const sensorId = 99
        const distance = 200
        setInterval(() => {
            console.debug(sensorId)
            sendPing({
                type: 'ultrasonic',
                distance,
                sensorId,
            })
        }, 1000)

        setInterval(() => {
            sendPing({
                type: 'ultrasonic',
                distance: 400,
                sensorId
            })
        }, 5000)
    }
}

