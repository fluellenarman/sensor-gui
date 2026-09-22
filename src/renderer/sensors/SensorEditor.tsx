import { Component, createSignal, For } from 'solid-js'
import { CageContext } from '../contexts/CageContext.js'
import { useContextOrThrow } from '../../util/useContextOrThrow.js'
import { SensorData } from '../../types/SensorData.js'
import { SetStoreFunction } from 'solid-js/store'
import { SensorContext } from '../contexts/SensorContext.js'
import { getValidNumberInput } from '../../util/getValidNumberInput.js'
import { VsTrash } from 'solid-icons/vs'
import { SensorsContext } from '../contexts/SensorsContext.js'
import { sensorTypeLabels } from '../../localization/sensorTypeLabels.js'

export const SensorEditor: Component<{
	setSensor: SetStoreFunction<SensorData>
}> = (props) => {
	const cage = useContextOrThrow(CageContext)
	const sensor = useContextOrThrow(SensorContext)
	const sensors = useContextOrThrow(SensorsContext)

	let deleteConfirmRef: undefined | HTMLDialogElement

	return (
		<>
			<div
				class="flex h-min flex-col select-auto w-[15rem]"
				onClick={(event) => event.stopPropagation()}
			>
				{/* rout number */}
				<div>
					<label class="input input-xs border w-full validator">
						<span class="label">ROUT #:</span>
						<input
							type="number"
							class="text-right"
							placeholder="1"
							min="1"
							max="99"
							onInput={(event) => {
								sensors.setSensors(
									sensor.index(),
									'routNumber',
									(prev) => getValidNumberInput(event.currentTarget, 1) ?? prev
								)
							}}
							value={sensor.data.routNumber}
						/>
					</label>
					<p class="validator-hint mt-0">Must be a whole number between 1 and 99</p>
				</div>

				{/* type */}
				<div>
					<label class="select select-xs border w-full validator">
						<span class="label">Device Type:</span>
						<select
							onInput={(event) => {
								const nextType = event.currentTarget
									.value as keyof typeof sensorTypeLabels

								sensors.setSensors(sensor.index(), 'type', nextType)
								sensors.setSensors(
									sensor.index(),
									'sensorTypeId',
									nextType === 'virtual_missile_launcher' ? 2 : 1
								)
							}}
							value={sensor.data.type}
						>
							<For each={Object.entries(sensorTypeLabels)}>
								{([internalTypeName, displayTypeName]) => (
									<option value={internalTypeName}>{displayTypeName}</option>
								)}
							</For>
						</select>
					</label>
					<p class="validator-hint mt-0">Must be between 0 and {cage.length}</p>
				</div>

				{/* X position */}
				<div>
					<label class="input input-xs border w-full validator">
						<span class="label">X:</span>
						<input
							type="number"
							step="any"
							class="text-right"
							placeholder="0"
							min="0"
							max={cage.length}
							onInput={(event) =>
								sensors.setSensors(
									sensor.index(),
									'xFeet',
									(prev) => getValidNumberInput(event.currentTarget, 0) ?? prev
								)
							}
							value={sensor.data.xFeet}
						/>
						<span class="label">feet</span>
					</label>
					<p class="validator-hint mt-0">Must be between 0 and {cage.length}</p>
				</div>

				{/* Y position */}
				<div>
					<label class="input input-xs border w-full validator">
						<span class="label">Y:</span>
						<input
							type="number"
							step="any"
							class="text-right"
							min="0"
							placeholder="0"
							max={cage.width}
							onInput={(event) =>
								sensors.setSensors(
									sensor.index(),
									'yFeet',
									(prev) => getValidNumberInput(event.currentTarget, 0) ?? prev
								)
							}
							value={sensor.data.yFeet}
						/>
						<span class="label">feet</span>
					</label>
					<p class="validator-hint mt-0">Must be between 0 and {cage.length}</p>
				</div>

				{/* horizontal angle */}
				<div>
					<label class="input input-xs border w-full validator">
						<span class="label">Horizontal Angle:</span>
						<input
							type="number"
							step="5"
							class="text-right"
							placeholder="0"
							onInput={(event) =>
								sensors.setSensors(
									sensor.index(),
									'horizontalAngle',
									(prev) => getValidNumberInput(event.currentTarget, 0) ?? prev
								)
							}
							value={sensor.data.horizontalAngle}
						/>
						<span class="label">deg</span>
					</label>
					<p class="validator-hint mt-1">Invalid</p>
				</div>

				{/* vertical angle */}
				<div>
					<label class="input input-xs border w-full validator">
						<span class="label">Vertical Angle:</span>
						<input
							type="number"
							step="5"
							class="text-right"
							min="-90"
							placeholder="0"
							max="90"
							onInput={(event) =>
								sensors.setSensors(
									sensor.index(),
									'verticalAngle',
									(prev) => getValidNumberInput(event.currentTarget, 0) ?? prev
								)
							}
							value={sensor.data.verticalAngle}
						/>
						<span class="label">deg</span>
					</label>
					<p class="validator-hint mt-1">Must be between -90 and 90</p>
				</div>

				<div class="flex items-center justify-between mt-2">
					<button
						type="button"
						class="btn btn-xs btn-outline btn-secondary"
						onClick={(event) => {
							event.stopPropagation()
							sensor.data.getResetMovementCalibration()?.()
						}}
					>
						Calibrate Again
					</button>
				</div>

				{/* delete button */}
				<div class="flex flex-col items-center">
					<div
						class="tooltip tooltip-error size-min tooltip-bottom"
						data-tip="Delete Sensor"
					>
						<button
							class="btn btn-sm btn-primary btn-square btn-outline"
							onClick={() => deleteConfirmRef?.showModal()}
						>
							<VsTrash size="20" />
						</button>
					</div>
				</div>

				{/* delete confirmation */}
				<dialog ref={deleteConfirmRef} class="modal">
					<div class="modal-box">
						<h3 class="font-bold text-lg text-center">
							Are you sure that you want to delete sensor #{sensor.data.routNumber}?
						</h3>
						<div class="modal-action justify-center">
							<form method="dialog">
								<button
									onClick={() =>
										sensors.setSensors((prev) =>
											prev.toSpliced(sensor.index(), 1)
										)
									}
									class="btn mr-2 btn-outline btn-error"
								>
									Yes
								</button>
								<button class="btn btn-outline">No</button>
							</form>
						</div>
					</div>
				</dialog>
			</div>
		</>
	)
}
