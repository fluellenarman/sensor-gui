import {
  Component,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from 'solid-js'
import { useContextOrThrow } from '../../../util/useContextOrThrow.js'
import { Quaternion, Vector3 } from 'three'
import { SensorContext } from '../../contexts/SensorContext.js'
import { metersPerFoot } from '../../../util/mathConstants.js'
import { Brush, INTERSECTION } from 'three-bvh-csg'
import { GraphingContext } from '../../contexts/GraphingContext.js'
import { ConicalPingHandler } from './ConicalPingHandler.jsx'
import { borrowBrush, releaseBrush } from '../../3dRendering/pools/brushPool.js'
import { createBeamMaterial, BEAM_COLOR_CONNECTED, BEAM_COLOR_DISCONNECTED } from '../../3dRendering/materials.js'
import { csgEvaluator } from '../../3dRendering/evaluator.js'

// display a conical beam using a sensor's properties
export const ConicalBeam: Component = () => {
  const graphing = useContextOrThrow(GraphingContext)
  const sensor = useContextOrThrow(SensorContext)

  // Create a material that will be updated based on connection status
  const beamMaterial = createBeamMaterial(BEAM_COLOR_DISCONNECTED)

  // Update material color when connection status changes
  createEffect(() => {
    const isConnected = sensor.data.getIsConnected()
    beamMaterial.color.copy(isConnected ? BEAM_COLOR_CONNECTED : BEAM_COLOR_DISCONNECTED)
    beamMaterial.needsUpdate = true
    graphing.requestRender()
  })

  // the beam is made up of the intersection of a sphere and a cone
  // the sphere uses the sensor's max range as its radius, and the cone
  // uses the sensor's measuring angle as its angle

  // create the sphere, and maintain its position, scale, etc
  // use 1 as the base radius of the sphere so we can scale it to other radiuses easily
  const sphereBrush = borrowBrush(beamMaterial, { type: 'sphere' })
  const getSphereBrush = createMemo(() => {
    // set the radius by scaling the sphere up (or down)
    sphereBrush.scale.set(
      sensor.data.maxRange / metersPerFoot,
      sensor.data.maxRange / metersPerFoot,
      sensor.data.maxRange / metersPerFoot
    )
    // center the sphere on the sensor (ignore z)
    sphereBrush.position.set(sensor.data.xFeet, sensor.data.yFeet, 0)

    // update and return the brush
    sphereBrush.updateMatrixWorld()
    return sphereBrush
  })

  // create the cone, and maintain its position, scale, etc
  let coneBrush: Brush

  // get a brush for the cone, borrowing it from the pool
  // this is a seperate memo because we want to run this as little as possible
  const borrowConeBrush = createMemo(() => {
    return borrowBrush(beamMaterial, {
      type: 'cone',
      // use the measuring angle to determine the radius of the cone
      radius: Math.tan((sensor.data.measuringAngle * Math.PI) / 180 / 2),
    })
  })

  // get a brush for the cone (angle), and update it with the sensor's properties
  const getConeBrush = createMemo(() => {
    // get a new brush only if the angle has changed
    coneBrush = borrowConeBrush()

    // scale the cone to the maximum range of the sensor
    coneBrush.scale.set(
      sensor.data.maxRange / metersPerFoot,
      sensor.data.maxRange / metersPerFoot,
      sensor.data.maxRange / metersPerFoot
    )
    // move the cone's tip to the sensor (ignore z)
    coneBrush.position.set(sensor.data.xFeet, sensor.data.yFeet, 0)
    // rotate the cone to have the base point in the same direction as the sensor
    coneBrush.quaternion.copy(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, -1, 0),
        new Vector3(
          Math.sin(sensor.calculate.phi()) * Math.cos(sensor.calculate.theta()),
          Math.sin(sensor.calculate.phi()) * Math.sin(sensor.calculate.theta()),
          Math.cos(sensor.calculate.phi())
        ).normalize()
      )
    )

    // update and return the brush
    coneBrush.updateMatrixWorld()

    // return inside a wrapper object to force dependents to
    // see the change as a new reference
    return { brush: coneBrush }
  })

  // the beam is formed through intersecting the sphere (range) and cone (angle)
  const beamBrush = new Brush()

  // maintain the beam brush in the scene
  onMount(() => {
    graphing.scene.add(getBeamBrush().brush)
    onCleanup(() => {
      graphing.scene.remove(beamBrush)
      graphing.requestRender()
      releaseBrush(coneBrush)
      releaseBrush(sphereBrush)
      beamMaterial.dispose()
    })
  })

  // create the beam brush by evaluating the intersection of the sphere and cone
  const getBeamBrush = createMemo(() => {
    csgEvaluator.evaluate(
      getSphereBrush(),
      getConeBrush().brush,
      INTERSECTION,
      beamBrush
    )

    beamBrush.updateMatrixWorld()

    // return inside a wrapper object to force dependents to
    // see the change as a new reference
    return { brush: beamBrush }
  })

  // rerender whenever the beam brush changes
  createEffect(
    on(getBeamBrush, () => {
      // render beam
      graphing.requestRender()
    })
  )

  return (
    <>
      <ConicalPingHandler coneBrush={getConeBrush().brush} />
    </>
  )
}

// ...existing code...

export const SimpleConicalBeam: Component<{
  xFeet?: number
  yFeet?: number
  horizontalDeg?: number // left/right rotation, in degrees
  verticalDeg?: number // up/down rotation, in degrees
}> = (props) => {
  const graphing = useContextOrThrow(GraphingContext)

  const beamMaterial = createBeamMaterial(BEAM_COLOR_CONNECTED)

  const sphereBrush = borrowBrush(beamMaterial, { type: 'sphere' })
  sphereBrush.scale.set(10, 10, 10)
  sphereBrush.updateMatrixWorld()

  const coneBrush = borrowBrush(beamMaterial, {
    type: 'cone',
    radius: Math.tan((45 * Math.PI) / 180 / 2),
  })
  coneBrush.scale.set(10, 10, 10)

  const beamBrush = new Brush()

  // recompute position, direction, and re-evaluate the beam whenever props change
  createEffect(() => {
    const x = props.xFeet ?? 0
    const y = props.yFeet ?? 0

    sphereBrush.position.set(x, y, 0)
    sphereBrush.updateMatrixWorld()

    const horizontalRad = ((props.horizontalDeg ?? 0) * Math.PI) / 180
    const verticalRad = ((props.verticalDeg ?? 0) * Math.PI) / 180

    // phi: angle from "straight up" (z axis), theta: angle around z axis (left/right)
    const phi = (Math.PI / 2) - verticalRad
    const theta = horizontalRad

    coneBrush.position.set(x, y, 0)
    coneBrush.quaternion.copy(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, -1, 0),
        new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        ).normalize()
      )
    )
    coneBrush.updateMatrixWorld()

    csgEvaluator.evaluate(sphereBrush, coneBrush, INTERSECTION, beamBrush)
    beamBrush.updateMatrixWorld()

    graphing.requestRender()
  })

  onMount(() => {
    graphing.scene.add(beamBrush)
    graphing.requestRender()

    onCleanup(() => {
      graphing.scene.remove(beamBrush)
      graphing.requestRender()
      releaseBrush(coneBrush)
      releaseBrush(sphereBrush)
      beamMaterial.dispose()
    })
  })

  return null
}