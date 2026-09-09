import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  onCleanup,
  onMount,
  runWithOwner,
} from 'solid-js'
import { SensorData } from '../../types/SensorData.js'
import { useContextOrThrow } from '../../util/useContextOrThrow.js'
import { GridContext } from '../contexts/GridContext.js'
import { SidebarContext } from '../contexts/SidebarContext.js'
import { SensorEditor } from './SensorEditor.jsx'
import { SetStoreFunction } from 'solid-js/store'
import { SensorContext } from '../contexts/SensorContext.js'
import { CageContext } from '../contexts/CageContext.js'
import { DragContext } from '../contexts/DragContext.js'
import { launchQuery } from '../../util/ServerQueries.js'
import { ConicalBeam } from '../beams/conical/ConicalBeam.jsx'


const [iconColor, setIconColor] = createSignal('black')

let LOS_received = false

window.electronAPI.onLOS_ping((loc: object) => {
  // console.log("Graph.tsx: received missile location from main", loc.x, loc.y)
  console.log("LOS ping received from main")
  setIconColor('green');
  LOS_received = true;
})

setInterval(() => { // To reset the icon color to black if no LOS ping is received within 2 second
  if (LOS_received === true) {
    LOS_received = false
  } else if (LOS_received === false) {
    setIconColor('black');
  }
}, 1000)


// Visual indicator for a sensor and its pings
export const Sensor: Component<{
  setSensor: SetStoreFunction<SensorData>
  getCageBoundry: undefined | (() => DOMRect)
}> = (props) => {
  // we need grid contextual data to scale feet to screen pixels
  const grid = useContextOrThrow(GridContext)
  const sidebar = useContextOrThrow(SidebarContext)
  const sensor = useContextOrThrow(SensorContext)
  const cage = useContextOrThrow(CageContext)

  // calculate the position (screen pixels) of the sensor
  const getX = createMemo(() => grid.getXScale()(sensor.data.xFeet))
  const getY = createMemo(() => grid.getYScale()(sensor.data.yFeet))

  const [usingSidebar, setUsingSidebar] = createSignal(false)

  const owner = getOwner()

  function renderSensorLabel(sensor: SensorData) {
    if (sensor.type === 'ultrasonic') {
      return sensor.routNumber
    } else if (sensor.type === 'TTR') {
      return 'T'
    } else if (sensor.type === 'virtual_missile_launcher') {
      return 'M'
    }
  }  

  // when the indicator is clicked, upon up a sidebar
  // to edit the sensor's data
  function openSensorProperties(event?: MouseEvent) {
    // don't toggle menu if dragging is user's goal
    if (getDragging()) {
      setDragging(false)
      event?.stopPropagation()
      return
    }

    if (usingSidebar() === true) {
      // close sidebar if already open
      setUsingSidebar(false)
      sidebar.setSidebar(<></>)
      return
    }

    // prepare and open sidebar
    setUsingSidebar(true)
    // we run with owner so that we have access to contexts
    runWithOwner(owner, () => {
      sidebar.setSidebar(<SensorEditor setSensor={props.setSensor} />, () => {
        setUsingSidebar(false)
      })
    })

    // this click is handled. prevent it from propogating
    event?.stopPropagation()
  }

  // keep the sensor in the cage if the cage changes size
  // (also may have side effect of keeping sensor in cage
  // if sensor moves, but this is already implemented elsewhere)
  createEffect(() => {
    if (sensor.data.xFeet >= cage.length) {
      props.setSensor('xFeet', cage.length)
    }
    if (sensor.data.yFeet >= cage.width) {
      props.setSensor('yFeet', cage.width)
    }
  })

  // when a sensor is created, automatically open its property editor
  onMount(() => {
    // queueMicrotask is used because onMount is too early to set the sidebar content.
    queueMicrotask(() => {
      openSensorProperties()
    })
  })

  
  const [getMouseDown, setMouseDown] = createSignal(false)
  
  createEffect(() => {
    console.log(`Mouse down: ${getMouseDown()}`)  
    // console.log(sensor.data)
    if (sensor.data.type === 'virtual_missile_launcher') {
      console.log(`Sensor type: ${sensor.data.type}`)
      console.log(sensor.data.xFeet, sensor.data.yFeet)
      if (getMouseDown() == false) {
        window.electronAPI.sendLauncherLocPing(sensor.data.xFeet, sensor.data.yFeet)
        // launchQuery();
      }
    }
    if (sensor.data.type === 'TTR') { 
      console.log(`Sensor type: ${sensor.data.type}`)
      console.log(sensor.data.xFeet, sensor.data.yFeet)
      if (getMouseDown() == false) {
        window.electronAPI.sendLOS_LocPing(sensor.data.xFeet, sensor.data.yFeet)
        // launchQuery();
      }
    }
  })

  // drag and drop the sensor
  function drag(event: MouseEvent) {
    if (props.getCageBoundry === undefined) return

    // used to compare mouse position with cage
    const boundingRect = props.getCageBoundry()

    // set position of sensor based on mouse position
    props.setSensor(
      'xFeet',
      // put on left or right if out of bounds, or at mouse x position (in feet) otherwise
      event.x <= boundingRect.left
        ? 0
        : event.x >= boundingRect.right
          ? cage.length
          : ((event.x - boundingRect.left) /
              (boundingRect.right - boundingRect.left)) *
            cage.length,
    )
    props.setSensor('yFeet', (prev) =>
      // put on bottom or top if out of bounds, or at mouse y position (in feet) otherwise
      event.y <= boundingRect.top
        ? cage.width
        : event.y >= boundingRect.bottom
          ? 0
          : ((boundingRect.bottom - event.y) /
              (boundingRect.bottom - boundingRect.top)) *
            cage.width,
    )
    console.log("drag")
  }

  const [getDragging, setDragging] = createSignal(false)

  // get ability to track drags anywhere in window
  const dragContext = useContextOrThrow(DragContext)

  function startDragging(event: MouseEvent) {
    if (!getMouseDown() || getDragging()) return
    setDragging(true)
    drag(event)
    dragContext.startDrag(drag, () => {
      // console.log('drag stop')
      setDragging(false)
      setMouseDown(false)
    })
  }

  return (
    <>
      <g
        class="stroke-primary fill-base-200"
        onMouseLeave={startDragging}
        onMouseMove={startDragging}
      >
        {/* <ConicalBeam/> */}
        <circle
          r="1rem"
          onClick={(event) => {
            if (getDragging()) return
            openSensorProperties(event)
          }}
          class="cursor-pointer"
          stroke-width={usingSidebar() === true ? '1' : '0'}
          transform-origin="center"
          transform={`translate(${getX()}, ${getY()})`}
          fill={iconColor()}
          fill-opacity="0.8"
          onMouseDown={() => setMouseDown(true)}
          onMouseUp={() => setMouseDown(false)}
        />
      </g>
      <g class="fill-primary pointer-events-none">
        {/* sensor label */}
        <text
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="monospace"
          font-size="20"
          transform={`translate(${getX()}, ${getY()})`}
        >
          {renderSensorLabel(sensor.data)}
        </text>
        {/* circle around label */}
      </g>

      {/* render sensor pings */}
      <sensor.data.renderer />
    </>
  )
}
