import os from 'os'
import dgram from 'dgram'
import { DiscoveryMessage } from './types'

export class DiscoveryNetwork {
	private socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
	private devices = new Set<string>(['blue-gui'])
	private peers = new Map<string, string>()

	constructor(
		private readonly id = 'red-gui',
		private readonly multicast = '224.0.0.1',
		private readonly port = 41234,
		private readonly httpPort = 3000
	) {
		this.start()
	}

	getDevices() {
		return this.devices
	}

	async getAddress(id: string, max_retries = 5) {
		const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

		for (let retries = 0; retries < max_retries; retries++) {
			if (this.peers.get(id)) break

			this.broadcastOnce()
			await delay(250)
		}

		return this.peers.get(id)
	}

	setAddress(id: string, ip: string) {
		this.peers.set(id, ip)
	}

	deleteAddress(id: string) {
		this.peers.delete(id)
	}

	start() {
		this.socket.on('message', (data, rinfo) => {
			console.log(`[${this.id}]`, data.toString(), `${rinfo.address}:${rinfo.port}`)

			this.handleMessage(data, rinfo)
		})

		this.socket.on('listening', () => {
			console.log(`[${this.id}] listening on`, this.socket.address())
		})

		this.socket.on('error', (err) => {
			console.error(`[${this.id}]`, err)
		})

		this.socket.on('close', () => {
			console.log(`[${this.id}] socket closed`)
		})

		this.socket.bind(this.port, () => {
			this.socket.setBroadcast(true)
			this.socket.addMembership(this.multicast)
			this.broadcast()
		})
	}

	private broadcast() {
		const message: DiscoveryMessage = {
			type: 'DISCOVER',
			id: this.id,
			port: this.httpPort
		}

		const data = Buffer.from(JSON.stringify(message))
		let broadcastInterval: NodeJS.Timeout
		const broadcastDevice = () => {
			if (this.devices.size === this.peers.size) {
				clearInterval(broadcastInterval)
				console.log('All peers discovered:', this.devices.keys())
				return
			}

			for (const address of getBroadcastAddresses())
				this.socket.send(data, this.port, address)
		}

		broadcastDevice()
		broadcastInterval = setInterval(broadcastDevice, 5000)
	}

	private broadcastOnce() {
		if (this.devices.size === this.peers.size) {
			console.log('All peers discovered:', this.devices.keys())
			return
		}

		const message: DiscoveryMessage = {
			type: 'DISCOVER',
			id: this.id,
			port: this.httpPort
		}

		const data = Buffer.from(JSON.stringify(message))
		for (const address of getBroadcastAddresses()) this.socket.send(data, this.port, address)
	}

	private handleMessage(data: Buffer, rinfo: dgram.RemoteInfo) {
		try {
			const message = JSON.parse(data.toString()) as DiscoveryMessage

			if (message.id === this.id) return

			switch (message.type) {
				case 'DISCOVER_RESPONSE':
					this.handleResponse(message, rinfo)
					break
				case 'DISCOVER':
					this.handleResponse(message, rinfo)
					this.handleRequest(rinfo)
					break
				default:
					console.log('Error: unknown message type: ', message.type)
			}
		} catch {
			console.error('Invalid discovery packet')
		}
	}

	private handleResponse(message: DiscoveryMessage, rinfo: dgram.RemoteInfo) {
		if (!this.devices.has(message.id)) return

		const ip = `${rinfo.address}:${message.port}`
		this.peers.set(message.id, ip)
	}

	private handleRequest(rinfo: dgram.RemoteInfo) {
		const message: DiscoveryMessage = {
			type: 'DISCOVER_RESPONSE',
			id: this.id,
			port: this.httpPort
		}

		// for testing on localhost
		const data = Buffer.from(JSON.stringify(message))
		if (getDeviceAddresses().some((iface) => iface.address === rinfo.address)) {
			this.socket.send(data, this.port, this.multicast)
			return
		}

		this.socket.send(data, rinfo.port, rinfo.address)
	}
}

export function getDeviceAddresses() {
	const interfaces = os.networkInterfaces()
	return Object.entries(interfaces).flatMap(([name, addresses]) =>
		(addresses ?? [])
			.filter((iface) => iface.family === 'IPv4' && !iface.internal)
			.map((iface) => ({
				name,
				address: iface.address,
				netmask: iface.netmask
			}))
	)
}

export function getBroadcastAddresses() {
	return getDeviceAddresses().map((iface) => {
		const ip = iface.address.split('.').map(Number)
		const mask = iface.netmask.split('.').map(Number)
		return ip.map((octet, i) => octet | (~mask[i] & 255)).join('.')
	})
}

export default { DiscoveryNetwork, getDeviceAddresses, getBroadcastAddresses }
