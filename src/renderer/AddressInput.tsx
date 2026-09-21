import { Component, createResource, createSignal, For, Show } from 'solid-js'

const AddressInput: Component = () => {
	let ipButton!: HTMLButtonElement

	const [ShowAddressInput, setShowAddressInput] = createSignal(false)
	const toggleShowAddressInput = () => setShowAddressInput(!ShowAddressInput())

	const fetchDevices = async () => {
		const result = await window.electronAPI.getDevices()
		return [...result]
	}

	const [devices] = createResource(fetchDevices)

	window.electronAPI.onEnableAddressButton((data) => {
		ipButton.disabled = false
	})

	window.electronAPI.onDisableAddressButton(() => {
		ipButton.disabled = true
		toggleShowAddressInput()
	})

	function handleClick() {
		const id = document.getElementById('device-id') as HTMLSelectElement
		const ip = document.getElementById('ip-address') as HTMLInputElement

		console.log('IP Address entered: ' + ip.value)
		window.electronAPI.sendAddress({ id: id.value, ip: ip.value })
	}

	return (
		<div>
			<Show when={!ShowAddressInput()}>
				<button
					ref={ipButton}
					onClick={toggleShowAddressInput}
					// class="icon-button add-button"
					class="btn btn-outline btn-square btn-primary btn-sm"
					data-tooltip="Connect to Network"
					disabled
				>
					<svg
						viewBox="0 0 20 16"
						fill="currentColor"
						color="currentColor"
						height="1em"
						width="1em"
						xmlns="http://www.w3.org/2000/svg"
						style="overflow: visible;"
					>
						<path
							fill="currentColor"
							d="M10 9c1.654 0 3.154.673 4.241 1.759l-1.414 1.414C12.103 11.449 11.103 11 10 11s-2.103.449-2.827 1.173l-1.414-1.414A5.982 5.982 0 0 1 10 9zM2.929 7.929C4.818 6.04 7.329 5 10 5s5.182 1.04 7.071 2.929l-1.414 1.414C14.146 7.832 12.137 7 10 7s-4.146.832-5.657 2.343L2.929 7.929zM15.45 2.101a13.966 13.966 0 0 1 4.45 3l-1.414 1.414C16.219 4.249 13.206 3 10.001 3S3.782 4.248 1.516 6.515L.102 5.101A13.955 13.955 0 0 1 10.002 1c1.89 0 3.723.37 5.45 1.101zM9 14a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"
						></path>
					</svg>
				</button>
			</Show>
			<Show when={ShowAddressInput()}>
				<div class="flex items-center gap-2">
					{/* <select id="device-id" class="select-field add-field"> */}
					<select id="device-id" class="select select-xs border w-full validator">
						<option value="" selected>
							Select a Device...
						</option>
						<For each={devices()}>
							{(device) => <option value={device}>{device}</option>}
						</For>
					</select>
					<input
						class="text-field add-field"
						type="text"
						id="ip-address"
						placeholder="Enter IP Address"
					/>
					<button
						onClick={handleClick}
						// class="icon-button add-button"
						class="btn btn-outline btn-square btn-primary btn-sm"
						data-tooltip="Connect to Network"
					>
						<svg
							viewBox="0 0 20 16"
							fill="currentColor"
							color="currentColor"
							height="1em"
							width="1em"
							xmlns="http://www.w3.org/2000/svg"
							style="overflow: visible;"
						>
							<path
								fill="currentColor"
								d="M10 9c1.654 0 3.154.673 4.241 1.759l-1.414 1.414C12.103 11.449 11.103 11 10 11s-2.103.449-2.827 1.173l-1.414-1.414A5.982 5.982 0 0 1 10 9zM2.929 7.929C4.818 6.04 7.329 5 10 5s5.182 1.04 7.071 2.929l-1.414 1.414C14.146 7.832 12.137 7 10 7s-4.146.832-5.657 2.343L2.929 7.929zM15.45 2.101a13.966 13.966 0 0 1 4.45 3l-1.414 1.414C16.219 4.249 13.206 3 10.001 3S3.782 4.248 1.516 6.515L.102 5.101A13.955 13.955 0 0 1 10.002 1c1.89 0 3.723.37 5.45 1.101zM9 14a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"
							></path>
						</svg>
					</button>
				</div>
			</Show>
		</div>
	)
}

export { AddressInput }
