import { Component, createMemo, For } from 'solid-js'
import { Sensor } from './Sensor.jsx'
import { createStore } from 'solid-js/store'
import { SensorContext } from '../contexts/SensorContext.js'
import { useContextOrThrow } from '../../util/useContextOrThrow.js'
import { SensorsContext } from '../contexts/SensorsContext.js'
import { GridContext } from '../contexts/GridContext.js'

// manage the display of each sensor and their pings
export const Sensors: Component<{}> = () => {
  const grid = useContextOrThrow(GridContext)
  const sensors = useContextOrThrow(SensorsContext)

  // when a ping is received, have sensors of the right type and id
  // display it
  window.electronAPI.onPingReceived((ping) => {
    sensors.sensors
      .filter(
        (sensor) =>
          sensor.type === ping.type && sensor.routNumber === ping.sensorId,
      )
      .forEach((sensor) => sensor.getPingHandler()?.(ping.distance))
  })

  window.electronAPI.onJam((typeId, sensorId) => {
    sensors.sensors
      .filter(
        (sensor) =>
          (typeId === 0 || sensor.sensorTypeId === typeId) &&
          (sensorId === 0 || sensor.routNumber === sensorId),
      )
      .forEach((sensor) =>
        sensor.getPingHandler()?.(
          Math.round(Math.random() * sensor.maxRange * 100),
        ),
      )
  })

  // give sensor children access to rect for bounding calculations
  let rectRef: undefined | SVGRectElement

  return (
    <>
      {/* expand area to detect mouse movements anywhere on grid */}
      <rect
        ref={rectRef}
        opacity="0"
        x={grid.left}
        y={grid.top}
        width={grid.right - grid.left}
        height={grid.bottom - grid.top}
      />
      {/* display each sensor */}
      <For each={sensors.sensors}>
        {(sensor, index) => (
          <>
            <SensorContext.Provider
              value={{
                data: sensor,
                index: index,
                calculate: {
                  theta: createMemo(
                    () => (sensor.horizontalAngle * Math.PI) / 180,
                  ),
                  phi: createMemo(
                    () => ((-sensor.verticalAngle + 90) * Math.PI) / 180,
                  ),
                },
              }}
            >
              <Sensor
                getCageBoundry={
                  rectRef !== undefined
                    ? () => rectRef.getBoundingClientRect()
                    : undefined
                }
                setSensor={createStore(sensor)[1]}
              />
            </SensorContext.Provider>
          </>
        )}
      </For>
    </>
  )
}
