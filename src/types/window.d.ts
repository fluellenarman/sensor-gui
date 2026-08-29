import { CageData } from '../contexts/CageContext'
import { DeviceConnections } from './DevicesStatus'
import { Ping } from './Pings'

declare global {
  interface Window {
    // describe the API available to the renderer process
    // see preload.ts for implementation. It is important to keep this in sync with
    // preload.ts implementation
    electronAPI: {
      // listen for pings received from the main process
      onPingReceived: (callback: (ping: Ping) => unknown) => void
      onIPReceived: (ip: string) => void
      // listen for changes in device connections
      onUpdateDevices: (
        callback: (devices: DeviceConnections) => unknown
      ) => void
      // try to connect or disconnect a device
      trySetConnection: (
        path: string,
        connected: boolean
      ) => Promise<true | string>
      // save and load cage configuration
      saveCageConfiguration: (cage: CageData) => Promise<boolean>
      loadCageConfiguration: () => Promise<CageData | null>
      // close the application
      closeApp: () => unknown

      onJam: (callback: (typeId: number, sensorId: number) => unknown) => void
      toggleMockSensors: (enabled: boolean) => Promise<{ success: boolean; message: string }>
      onReqToMissileHit: (callback) => void
    },
    rendererToMain: {
      onSensorData: (callback) => void
    }
  }
}
