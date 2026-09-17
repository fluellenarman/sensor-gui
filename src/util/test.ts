import { sendJam, sendPing } from '../main/serialCommunication/initializeSerial'
import { colorPrint } from './logging'

class MockSensor {
    sensorId:           number;
    baselineRanging:    number;
    baselineDeviation:  number;
    droneRanging:       number;
    droneDeviation:     number;

    constructor(sensorId: number, 
        baselineRanging: number, baselineDeviation: number = 0, 
        droneRanging: number, droneDeviation: number = 0) {
        this.sensorId           = sensorId;
        this.baselineRanging    = baselineRanging;
        this.baselineDeviation  = baselineDeviation;
        this.droneRanging       = droneRanging;
        this.droneDeviation     = droneDeviation;
    }
}

class MockSensorController {
    baselineCount:      number = 0;
    baselineCountMax:   number = 10;
    droneTimeCount:     number = 0;
    droneTimeCountMax:  number = 3;
    inBaseline:         boolean = true;
    MockSensorArray:    MockSensor[] = [];

    // handles how long testing will be in baseline and then drone time
    checkBaseline() {
        this.handleCounts()
        return this.inBaseline;
    }

    handleCounts() {
        if (this.inBaseline == true) {
            this.baselineCount++;
            if (this.baselineCount >= this.baselineCountMax) {
                this.inBaseline = false;
                this.baselineCount = 0;
                colorPrint('yellow', 'MockSensors: in drone time');
            }
        } else if (this.inBaseline == false) {
            this.droneTimeCount++;
            if (this.droneTimeCount >= this.droneTimeCountMax) {
                this.inBaseline = true
                this.droneTimeCount = 0
                colorPrint('yellow', 'MockSensors: in baseline');
            }
        }
    }

    handleTimer() {
        setInterval(() => {
            let deviation = 0
            const useBaselineRanging = this.checkBaseline()
            
            for (let i = 0; i < this.MockSensorArray.length; i++) {
                let deviation = Math.floor(Math.random() * this.MockSensorArray[i].baselineDeviation) - this.MockSensorArray[i].baselineDeviation
                let ranging = this.MockSensorArray[i].baselineRanging + deviation
                if (useBaselineRanging == false) { 
                    deviation = Math.floor(Math.random() * this.MockSensorArray[i].droneDeviation) - this.MockSensorArray[i].droneDeviation
                    ranging = this.MockSensorArray[i].droneRanging + deviation
                }
                sendPing({
                    type: 'ultrasonic',
                    distance: ranging,
                    sensorId: this.MockSensorArray[i].sensorId,
                })
            }
        }, 1000)
    }

    addMockSensor(sensorId: number, baselineRanging: number, baselineDeviation: number = 0, droneRanging: number = 0, droneDeviation: number = 0) {
        const newMockSensor = new MockSensor(sensorId, baselineRanging, baselineDeviation, droneRanging, droneDeviation);
        this.MockSensorArray.push(newMockSensor);
    }
}
const timeController = new MockSensorController();

export function testingEnvironment() {
    const test = process.argv.slice(2).includes('--test=true');
    // console.log('Test mode:', test);
    colorPrint('yellow', 'Test mode:', test);

    // This is where we can add mock sensors for testing. The parameters are: sensorId, baselineRanging, baselineDeviation, droneRanging, droneDeviation
    if (test == true) {
        // if need to edit/add mock sensors, do it here
        timeController.handleTimer();
        timeController.addMockSensor(1, 300, 0, 150, 0);
        timeController.addMockSensor(2, 300, 1, 150, 1);
        timeController.addMockSensor(3, 300, 50, 150, 50);
    }
}

function mockSensor(sensorId: number, baselineRanging: number) {
    let distance = baselineRanging

    setInterval(() => {
        console.debug(sensorId)
        if (timeController.checkBaseline() == false) {
            distance = distance / 2
            // distance = baselineRanging - 50 + Math.floor(Math.random() * 100) // random distance between 150 and 250
        }
        sendPing({
            type: 'ultrasonic',
            distance,
            sensorId,
        })
    }, 1000)
}