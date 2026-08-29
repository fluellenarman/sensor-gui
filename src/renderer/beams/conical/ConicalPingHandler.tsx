import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  getOwner,
  runWithOwner,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { GridContext } from '../../contexts/GridContext.js'
import { SensorContext } from '../../contexts/SensorContext.js'
import { useContextOrThrow } from '../../../util/useContextOrThrow.js'
import { metersPerFoot } from '../../../util/mathConstants.js'
import { ConicalBeamPing } from './ConicalBeamPing.jsx'
import { Brush } from 'three-bvh-csg'
import { Portal } from 'solid-js/web'
import { clamp } from 'three/src/math/MathUtils.js'
import { MovementDetector } from '../../../util/movementDetection.js'

// Time to consider a sensor connected after receiving data (milliseconds)
const CONNECTION_TIMEOUT = 1000

// display pings for a conical beam
export const ConicalPingHandler: Component<{
  coneBrush: Brush
}> = (props) => {
  const grid = useContextOrThrow(GridContext)
  const sensor = useContextOrThrow(SensorContext)
  const movementDetector = new MovementDetector()

  const resetMovementCalibration = () => {
    movementDetector.reset()
    sensor.data.setIsMoving(false)
  }

  sensor.data.setResetMovementCalibration(() => resetMovementCalibration)

  // each ping has a memo for its distance. We use this component as the owner
  // context for these memos
  const owner = getOwner()

  // track hieght in feet of last ping to display to use
  const [getLastPingHeight, setLastPingHeight] = createSignal<Accessor<number>>(
    () => 0,
  )

  // the list of all actively displayed pings for the current sensor
  const [pingsData, setPingsData] = createStore<{
    pings: { distance: number }[]
  }>({
    pings: [],
  })

  // Set up ping handler to track connection status
  sensor.data.setPingHandler(() => (centimeters: number) => {
    runWithOwner(owner, () => {
      const meters = centimeters / 100
      const feet = meters / metersPerFoot

      const isMoving = movementDetector.update(centimeters)
      sensor.data.setIsMoving(isMoving)

      if (sensor.data.getIsMoving()) {
        console.log('Sensor is detecting movement.')
        const data = {
          xFeet: sensor.data.xFeet,
          yFeet: sensor.data.yFeet,
          horizontalAngle: sensor.data.horizontalAngle,
          verticalAngle: sensor.data.verticalAngle,
          routNumber: sensor.data.routNumber,
          maxRange: sensor.data.maxRange,
          distance: centimeters
        }
        window.rendererToMain.onSensorData(data)
      }

      // Mark sensor as connected
      sensor.data.setIsConnected(true)

      // Clear any pending disconnection timeout
      if (disconnectTimeoutId !== null) {
        clearTimeout(disconnectTimeoutId)
      }

      // Schedule disconnection if no new data arrives
      disconnectTimeoutId = window.setTimeout(() => {
        sensor.data.setIsConnected(false)
        disconnectTimeoutId = null
      }, CONNECTION_TIMEOUT)

      // save the height to be displayed to the user seperately
      setLastPingHeight(() =>
        createMemo(() => feet * Math.cos(sensor.calculate.phi())),
      )
      // reset the ping height opacity
      fadeStartTime = performance.now()

      // create the ping to be displayed
      setPingsData('pings', pingsData.pings.length, { distance: feet })
    })
  })

  let disconnectTimeoutId: number | null = null

  // createEffect(() => console.log(grid.getOnTopMount()))

  const [getHeightOpacity, setHeightOpacity] = createSignal(1)

  let fadeStartTime: number = performance.now()
  function reduceHeightOpacity(now: number) {
    const progress = clamp((now - fadeStartTime) / 500, 0, 1) // 500 milliseconds fade duration
    setHeightOpacity(1 - Math.pow(progress, 2)) // quadratic easing for fade out

    requestAnimationFrame(reduceHeightOpacity)
  }
  requestAnimationFrame(reduceHeightOpacity)

  return (
    <>
      {/* create a ping object for each distance tracked */}
      <For each={pingsData.pings}>
        {(ping, getIndex) => (
          <>
            <ConicalBeamPing
              distance={ping.distance}
              finish={() =>
                setPingsData(
                  'pings',
                  pingsData.pings.filter((_, index) => index !== getIndex()),
                )
              }
            />
          </>
        )}
      </For>
      {/* if the height isn't 0, display the height to the user */}
      <Portal
        mount={grid.getOnTopMount()}
        isSVG
      >
        <g class="fill-info">
          <text
            x={`${grid.getXScale()(sensor.data.xFeet)}px`}
            y={`${grid.getYScale()(sensor.data.yFeet) + 24}px`}
            text-anchor="middle"
            opacity={getHeightOpacity()}
          >
            {getLastPingHeight()().toFixed(1)}ft
          </text>
        </g>
      </Portal>
    </>
  )
}
