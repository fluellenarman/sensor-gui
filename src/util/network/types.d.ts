export interface DiscoveryMessage {
	type: 'DISCOVER' | 'DISCOVER_RESPONSE'
	id: string
	port: number
}
