# DiscoveryNetwork

The discovery network is an automatic ip retrieval system using udp packets to share addresses. It uses broadcasting for intra-network communication and multicasting for localhost communication. The system uses a designated protocol to communicate between applications.

## Table of Contents

1. [UDP](#udp)
2. [Broadcast](#broadcast)
3. [Multicast](#multicast)
4. [Message Handling](#message-handling)
5. [Server IP Usage](#server-ip-usage)
6. [Manual IP Input](#manual-ip-input)
7. [Functions](#functions)

## UDP

UDP is used for service discovery because it is connectionless, lightweight, and supports both broadcasting and multicasting out of the box. Discovery needs to be fast and decentralized. Applications should be able to query the network to automatically retrieve necessary IP addresses.

## Broadcast

Broadcasting is utilized for `intra-network` communication across local subnets. When a node sends a packet to the subnet's broadcast address, the packet is received by every machine on the local physical network. This ensures that new peers on the same network discover each other automatically without needing manual ip retrieval.

## Multicast

Multicasting is used primarily for `localhost` communication and testing. When multiple instances of the application run on the same machine, broadcast packets sent to a subnet broadcast address often fail to route correctly between local processes depending on the operating system's network configuration. By joining a multicast group, local processes can reliably receive and exchange discovery packets on the same device as all processes in the multicast group receive the message. Though there is no actual call to any localhost address, calling on its own ip will cause a loopback. This is confirmed as multicast still works on wifi with client isolation.

## Message Handling

The application automatically processes incoming packets by parsing json as raw buffers into a DiscoveryMessage. It routes packets based on their type:

- `DISCOVER`: Sent by a peer searching for peers. When received, the receiver records the sender's details and immediately replies with a `DISCOVER_RESPONSE` packet so the sender learns its address in return.

- `DISCOVER_RESPONSE`: Sent in reply to a discovery request. The receiver maps the responding peers's ID to its IP and HTTP port combination storing it in `peers`.

Packets originating from the application are ignored to prevent self-discovery loops, and malformed JSON payloads are safely caught and logged.

## Server IP Usage

Once a peer's address is successfully resolved and cached in the `peers` map, applications can call `getAddress()` to retrieve the target endpoint. This will attempt to get the address if cached; otherwise, it will attempt to broadcast for the address for the attempts allowed. This IP and port pair can then be directly utilized to establish HTTP connections for application-specific communication.

## Manual IP Input

Manual IP input can be done using `setAddress()`. This maintains backwards compatability with the current usage of manually obtaining ip addresses through an input field.

# Functions

```typescript
discoveryNetwork.getAddress(id: string, max_retries: number): string | undefined
```

- Attempts to retrieve the address associated with the identifier. If there is no stored address, it will attempt to broadcast itself to the network for the alloted amount of retries. If it does not discover the address after the max attempts it will return `undefined`.

```typescript
discoveryNetwork.setAddress(id: string, address: string): void
```

- Sets the address for the specified identifier. If there is already an address it will overwrite it.

```typescript
discoveryNetwork.broadcast(): void
```

- Sends a `DISCOVER` packet broadcast at set intervals to the local network. The broadcast stops when all of the expected peers are found.

```typescript
discoveryNetwork.handleMessage(): void
```

- This is a private function that handles incoming messages based on message type (e.g. `DISCOVER`, `DISCOVER_RESPONSE`, etc.)

```typescript
getDeviceAddresses(): { name: string; address: string; netmask: string }[]
```

- Returns an array of network interface info. This function removes interal loopback addresses and only returns externally accessible ipv4 addresses.

```typescript
getBroadcastAddresses(): string[]
```

- Returns a list of broadcast addresses to send packets to. Each address is converted from a string to a number. The netmask is then used to calculate the broadcast address for the subnet of the address.

Other functions exist within the discovery network. These functions are smaller modules that are used by the bigger functions.

Here is a list of the other functions:

- `broadcastOnce()`
- `handleResponse()`
- `handleRequest()`
