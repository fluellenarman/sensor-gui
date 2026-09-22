import {
	Component,
	createEffect,
	createSignal,
	createMemo,
	JSX,
	onMount,
	onCleanup,
	Show
} from 'solid-js'
import { CageContext } from '../contexts/CageContext.js'
import { GridContext } from '../contexts/GridContext.js'
import { useContextOrThrow } from '../../util/useContextOrThrow.js'
import {
	BoxGeometry,
	CircleGeometry,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	Scene,
	WebGLRenderer,
	Group,
	MathUtils
} from 'three'
import { GraphingContext, GraphingType } from '../contexts/GraphingContext.js'
import { SensorsContext } from '../contexts/SensorsContext.js'
import { metersPerFoot } from '../../util/mathConstants.js'
import { For } from 'solid-js'
import { xid } from 'zod/v4'
import { SimpleConicalBeam } from '../beams/conical/ConicalBeam.jsx'
import { TTRx, TTRy } from '../sensors/Sensor.jsx'

const [circle1X, setCircle1X] = createSignal(10) // Drone
const [circle1Y, setCircle1Y] = createSignal(8) // Drone
const [circle1Opacity, setcircle1Opacity] = createSignal(0.8)
const [circle2X, setCircle2X] = createSignal(14) // Missile
const [circle2Y, setCircle2Y] = createSignal(14) // Missile
const [circle2Opacity, setcircle2Opacity] = createSignal(0.8)

const [showSimpleConical, setShowSimpleConical] = createSignal(false)
const [simpleConicalAngle, setsimpleConicalAngle] = createSignal(0)
const [droneAlive, setDroneAlive] = createSignal(false)

const LOS_TIMEOUT_DURATION = 1000 // milliseconds
const [LOStimeout, setLOStimeout] = createSignal(LOS_TIMEOUT_DURATION)

type Flare = {
	id: number
	x: number
	y: number
	radius: number
	opacity: number
}

const [flares, setFlares] = createSignal<Flare[]>([])
let flareIdCounter = 0
const FLARE_COUNT = 20
const FLARE_SCATTER_RADIUS = 4 // feet
const FLARE_FADE_STEP = 0.05

const [renderFlare, setRenderFlare] = createSignal(false)

let ShowSConicalTimeout = 100

let id = setInterval(() => {
	const opacity1 = circle1Opacity()
	const opacity2 = circle2Opacity()
	if (circle1Opacity() >= 0) {
		setcircle1Opacity(opacity1 - 0.1)
	}
	if (circle2Opacity() >= 0) {
		setcircle2Opacity(opacity2 - 0.1)
	}

	// fade out flares and remove fully-faded ones
	setFlares((current) =>
		current
			.map((flare) => ({ ...flare, opacity: flare.opacity - FLARE_FADE_STEP }))
			.filter((flare) => flare.opacity > 0)
	)
	ShowSConicalTimeout -= 1
	if (ShowSConicalTimeout <= 0) {
		setShowSimpleConical(false)
	}
	setLOStimeout(LOStimeout() - 100)
}, 100)

window.electronAPI.onLOS_ping((loc: object) => {
	// console.log("Graph.tsx: received missile location from main", loc.x, loc.y)
	setLOStimeout(LOS_TIMEOUT_DURATION)
	ShowSConicalTimeout = 10
	setShowSimpleConical(true)
	console.log('Graph.tsx: LOS ping received from main')
})

window.electronAPI.onDroneStatusPing((data: { droneStatus: boolean }) => {
	setDroneAlive(data.droneStatus)
})

function angleBetweenPoints(x1: number, y1: number, x2: number, y2: number): number {
	return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI) // Convert to degrees
}

function normalizeAngleDiff(diff: number): number {
	// normalize to range (-180, 180]
	let normalized = diff % 360
	if (normalized > 180) normalized -= 360
	if (normalized <= -180) normalized += 360
	return normalized
}

function isDroneInBeam(sensor: any): boolean {
	// only ultrasonic/virtual_missile_launcher sensors have a measuringAngle
	if (sensor.type !== 'ultrasonic') {
		return false
	}

	const dx = circle1X() - sensor.xFeet
	const dy = circle1Y() - sensor.yFeet
	const distance = Math.sqrt(dx * dx + dy * dy)

	// convert sensor max range (meters) to feet, and check drone is within range
	const maxRangeFeet = sensor.maxRange / metersPerFoot
	if (distance > maxRangeFeet) {
		return false
	}

	// angle from sensor to drone
	const angleToDrone = angleBetweenPoints(sensor.xFeet, sensor.yFeet, circle1X(), circle1Y())

	// difference between sensor's facing angle and angle to drone
	const angleDiff = Math.abs(normalizeAngleDiff(angleToDrone - sensor.horizontalAngle))

	// drone is in beam if within half the measuring angle (cone half-width)
	return angleDiff <= sensor.measuringAngle / 2
}

window.electronAPI.onDroneLocPing((loc: object) => {
	// console.log("Graph.tsx: received drone location from main", loc.x, loc.y)
	const finalLoc = {
		x: loc.x / 20,
		y: -(loc.y / 40 - 15)
	}
	setCircle1X(finalLoc.x)
	setCircle1Y(finalLoc.y)
	if (LOStimeout() > 0) {
		setcircle1Opacity(0.8)
	}

	const angle = angleBetweenPoints(TTRx(), TTRy(), circle1X(), circle1Y())
	setsimpleConicalAngle(angle)
})
window.electronAPI.onMissileLocPing((loc: object) => {
	// console.log("Graph.tsx: received missile location from main", loc.x, loc.y)
	const finalLoc = {
		x: loc.x / 20,
		y: -(loc.y / 40 - 15)
	}
	setcircle2Opacity(0.8)
	setCircle2X(finalLoc.x)
	setCircle2Y(finalLoc.y)
})
window.electronAPI.onFlarePing((loc: object) => {
	// console.log("Graph.tsx: received flare location from main", loc.x, loc.y)
	const originX = circle1X()
	const originY = circle1Y()

	const newFlares: Flare[] = Array.from({ length: FLARE_COUNT }, () => {
		const angle = Math.random() * Math.PI * 2
		const distance = Math.random() * FLARE_SCATTER_RADIUS
		return {
			id: flareIdCounter++,
			x: originX + Math.cos(angle) * distance,
			y: originY + Math.sin(angle) * distance,
			radius: 0.2 + Math.random() * 0.3,
			opacity: 0.8
		}
	})

	setFlares((current) => [...current, ...newFlares])
})

export const StaticCircle: Component<{
	xFeet: number
	yFeet: number
	radiusFeet: number
	color?: number
	opacity?: number
}> = (props) => {
	const graphing = useContextOrThrow(GraphingContext)

	const geometry = new CircleGeometry(1, 64) // unit circle; scale to radius
	const material = new MeshBasicMaterial({
		color: props.color ?? 0x22c55e,
		transparent: true,
		opacity: props.opacity ?? 0.8
	})
	const mesh = new Mesh(geometry, material)

	onMount(() => {
		graphing.scene.add(mesh)
		graphing.requestRender()
	})

	createEffect(() => {
		mesh.position.set(props.xFeet, props.yFeet, 0)
		mesh.scale.set(props.radiusFeet, props.radiusFeet, 1)

		// reactively update opacity like x/y/radius
		material.opacity = props.opacity ?? 0.8
		material.transparent = material.opacity < 1

		graphing.requestRender()
	})

	onCleanup(() => {
		graphing.scene.remove(mesh)
		geometry.dispose()
		material.dispose()
		graphing.requestRender()
	})

	return null
}

export const StaticX: Component<{
	xFeet: number
	yFeet: number
	radiusFeet: number
	color?: number
	opacity?: number
}> = (props) => {
	const graphing = useContextOrThrow(GraphingContext)

	const mesh = new Group()
	const geometry = new BoxGeometry(0.5, 5, 1)
	const material = new MeshBasicMaterial({
		color: props.color ?? 0x22c55e,
		opacity: props.opacity ?? 1.0
	})

	const leftBar = new Mesh(geometry, material)
	leftBar.rotation.z = MathUtils.degToRad(-45)

	const rightBar = new Mesh(geometry, material)
	rightBar.rotation.z = MathUtils.degToRad(45)

	mesh.add(leftBar)
	mesh.add(rightBar)

	onMount(() => {
		graphing.scene.add(mesh)
		graphing.requestRender()
	})

	createEffect(() => {
		mesh.position.set(props.xFeet, props.yFeet, 0)
		mesh.scale.set(props.radiusFeet, props.radiusFeet, 1)

		// reactively update opacity like x/y/radius
		material.opacity = props.opacity ?? 1.0
		material.transparent = material.opacity < 1

		graphing.requestRender()
	})

	onCleanup(() => {
		graphing.scene.remove(mesh)
		geometry.dispose()
		material.dispose()
		graphing.requestRender()
	})
}

export const Graph: Component<{
	children: JSX.Element
}> = (props) => {
	const grid = useContextOrThrow(GridContext)
	const cage = useContextOrThrow(CageContext)
	const sensors = useContextOrThrow(SensorsContext)

	setInterval(() => {
		console.log('Graph.tsx: sensors.sensors', sensors.sensors)
		for (const sensor of sensors.sensors) {
			console.log(
				`Sensor ${sensor.xFeet}, ${sensor.yFeet} has max range ${sensor.maxRange} feet`
			)
			// console.log(circle1X(), circle1Y())
			if (isDroneInBeam(sensor)) {
				setcircle1Opacity(0.8)
			}
		}
	}, 1000)

	const getWidth = createMemo(() => grid.right - grid.left)

	const getHeight = createMemo(() => grid.bottom - grid.top)

	// rendering the scene
	let threeContainer: undefined | HTMLDivElement
	const scene = new Scene()
	const camera = new OrthographicCamera(0, cage.length, cage.width, 0, -3, 1)
	camera.position.set(0, 0, 0)

	// use the max range to determine the size of the fustrum
	// get the max range from the longest range sensor
	const maxRange = createMemo(
		() =>
			sensors.sensors.reduce(
				(max, sensor) => (max > sensor.maxRange ? max : sensor.maxRange),
				0
			) / metersPerFoot
	)

	// set the camera near and far planes to fit max range of sensors
	createEffect(() => {
		// update planes
		camera.far = -maxRange() - Number.EPSILON
		camera.near = maxRange() + Number.EPSILON

		// update camera
		camera.updateProjectionMatrix()
		graphing.requestRender() // not sure if needed, but would assume it is (inconvenient to test)
	})

	// renderer
	const renderer = new WebGLRenderer({
		alpha: true,
		antialias: true,
		depth: false,
		powerPreference: 'high-performance'
	})

	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

	onMount(() => {
		if (threeContainer === undefined) throw new Error('Could not load 3D rendering container')
		threeContainer.append(renderer.domElement)
		renderer.render(scene, camera)

		createEffect(() => {
			camera.right = cage.length
			camera.top = cage.width
			camera.updateProjectionMatrix()
			renderer.setSize(getWidth(), getHeight())
			// renderer.setViewport(grid.left, grid.bottom)
			renderer.render(scene, camera)
			threeContainer.style.left = `${grid.left}px`
			threeContainer.style.top = `${grid.top}px`
		})
	})

	let rerenderNeeded = false
	const graphing: GraphingType = {
		scene,
		// when a component calls for render, queue it up for next animation frame
		requestRender: () => {
			rerenderNeeded = true
		}
	}

	// rerender when needed at most once per animation frame
	function renderLoop() {
		if (rerenderNeeded) {
			renderer.render(scene, camera)

			rerenderNeeded = false
		}

		requestAnimationFrame(renderLoop)
	}

	renderLoop()

	return (
		<>
			<GraphingContext.Provider value={graphing}>
				<Show
					when={droneAlive()}
					fallback={
						<StaticX
							xFeet={circle1X()}
							yFeet={circle1Y()}
							radiusFeet={0.5}
							color={0xff0000}
						></StaticX>
					}
				>
					<StaticCircle
						xFeet={circle1X()}
						yFeet={circle1Y()}
						radiusFeet={0.5}
						opacity={circle1Opacity()}
						color={0xff0000}
					/>
				</Show>
				<StaticCircle
					xFeet={circle2X()}
					yFeet={circle2Y()}
					radiusFeet={0.25}
					opacity={circle2Opacity()}
					color={0x00ff66}
				/>
				{props.children}
				<Show when={showSimpleConical()}>
					<SimpleConicalBeam
						xFeet={TTRx()}
						yFeet={TTRy()}
						horizontalDeg={simpleConicalAngle()}
						verticalDeg={0}
					/>
				</Show>

				<For each={flares()}>
					{(flare) => (
						<StaticCircle
							xFeet={flare.x}
							yFeet={flare.y}
							radiusFeet={flare.radius}
							opacity={flare.opacity}
							color={0xff0000}
						/>
					)}
				</For>

				<div class="absolute size-min pointer-events-none" ref={threeContainer} />
			</GraphingContext.Provider>
		</>
	)
}
