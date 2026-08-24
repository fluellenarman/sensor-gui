export interface DiscoveryMessage {
  type:
    | 'DISCOVER'
    | 'DISCOVER_RESPONSE';
  id?: string;
  httpPort?: number;
}

export interface Peer {
  id?: string;
  ip?: string;
  httpPort?: number;
  lastSeen?: number;
}