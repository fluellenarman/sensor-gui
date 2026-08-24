import dgram from 'dgram'
import { DiscoveryMessage, Peer } from './types';

export class Discovery {
    private socket = dgram.createSocket('udp4');

    private peers: Peer[] = [];

    constructor(
        private readonly id: string,
        private readonly httpPort: number,
        private readonly broadcastAddress = '10.0.0.63',
        // private readonly port = 41234
        private readonly port = 41235
    ) {}

    start() {
        this.socket.on('message', (data, rinfo) => {
        this.handleMessage(data, rinfo);
        });

        this.socket.bind(this.port, '0.0.0.0', () => {
        this.socket.setBroadcast(true);

        console.log(
            `${this.id} discovery listening on UDP ${this.port}`
        );

        // Announce ourselves immediately
        this.broadcast();

        // Announce ourselves periodically
        setInterval(() => {
            this.broadcast();
        }, 5000);
        });
    }

    private broadcast() {
        const message: DiscoveryMessage = {
        type: 'DISCOVER',
        id: this.id,
        httpPort: this.httpPort,
        };

        const data = Buffer.from(JSON.stringify(message));

        this.socket.send(
            data,
            // this.port,
            41234,
            this.broadcastAddress
        );
    }

    private handleMessage(
        data: Buffer,
        rinfo: dgram.RemoteInfo
    ) {
        try {
            const message =
                JSON.parse(data.toString()) as DiscoveryMessage;

            if (message.type !== 'DISCOVER') {
                console.log('Not discovery message')
                return;
            }

            // Ignore our own broadcasts
            if (message.id === this.id) {
                return;
            }

            const peer: Peer = {
                id: message.id,
                ip: rinfo.address,
                httpPort: message.httpPort,
                lastSeen: Date.now(),
            };

            this.peers.push(peer);

            console.log('Discovered:', peer);
        } catch {
            console.error('Invalid discovery packet');
        }
    }

    getPeers(): Peer[] {
        return [...this.peers.values()];
    }
}