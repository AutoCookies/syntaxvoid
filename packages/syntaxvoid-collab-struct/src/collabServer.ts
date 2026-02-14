import { WebSocketServer, WebSocket } from 'ws';
import { SessionState } from './sessionState';
import { PeerInfo, CollabMessage, validateMessage } from './protocol';
import * as crypto from 'crypto';

export class CollabServer {
    private wss: WebSocketServer | null = null;
    private state: SessionState;
    private clients: Map<WebSocket, string> = new Map(); // ws -> peerId

    constructor() {
        this.state = SessionState.getInstance();
    }

    public start(port: number = 4217) {
        if (this.wss) return;

        try {
            this.wss = new WebSocketServer({ port, host: '0.0.0.0' });

            this.wss.on('listening', () => {
                this.state.setMode('host');
                this.state.localPeerId = 'host';
                this.state.addLog(`Host started on port ${port}`);
                // Host is also a peer implicitly, but usually we just track remote peers in connection list
                // We add host to the peer list for clients.
            });

            this.wss.on('connection', (ws: WebSocket) => {
                this.handleConnection(ws);
            });

            this.wss.on('error', (err) => {
                this.state.addLog(`Server error: ${err.message}`);
                this.stop();
            });

        } catch (e: any) {
            this.state.addLog(`Failed to start server: ${e.message}`);
        }
    }

    private handleConnection(ws: WebSocket) {
        const peerId = crypto.randomUUID();
        this.clients.set(ws, peerId);

        // Wait for join message? Or just welcome?
        // Let's expect a join message first.

        ws.on('message', (data: any) => {
            try {
                // Determine if binary or string
                let parsed: any;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                } else if (Buffer.isBuffer(data)) {
                    parsed = JSON.parse((data as Buffer).toString());
                } else {
                    return; // Ignore
                }

                const msg = validateMessage(parsed);
                if (!msg) return;

                this.handleMessage(ws, peerId, msg);

            } catch (e) {
                // Drop malformed
            }
        });

        ws.on('close', () => {
            const info = this.state.peers.get(peerId);
            if (info) {
                this.state.addLog(`${info.name} left session.`);
                this.state.peers.delete(peerId);
                this.broadcastPresence();
            }
            this.clients.delete(ws);
        });

        ws.on('error', () => {
            ws.close();
        });
    }

    private handleMessage(ws: WebSocket, peerId: string, msg: CollabMessage) {
        switch (msg.type) {
            case 'session.join':
                // Register peer
                const color = this.state.getPeerColor(peerId); // deterministic based on UUID
                const info: PeerInfo = {
                    id: peerId,
                    name: msg.payload.name,
                    color: color
                };
                this.state.peers.set(peerId, info);
                this.state.addLog(`${info.name} joined session.`);

                // Send Welcome
                const welcome: CollabMessage = {
                    type: 'session.welcome',
                    payload: {
                        peerId: peerId,
                        peers: Array.from(this.state.peers.values())
                    }
                };
                ws.send(JSON.stringify(welcome));

                // Broadcast new presence to others
                this.broadcastPresence();
                break;

            case 'view.focus':
                // Re-broadcast to others
                this.broadcast(msg, peerId);

                // Notify local state so Host sees it too
                this.state.notifyPeerFocus(peerId, msg.payload.pathOrNodeId, msg.payload.source);
                this.state.addLog(`${this.state.getPeerName(peerId)} focused ${msg.payload.pathOrNodeId}`);
                break;
        }
    }

    private broadcastPresence() {
        // Include Host in presence?
        // Construct full list including Host.
        const hostInfo: PeerInfo = {
            id: 'host',
            name: this.state.localName,
            color: this.state.getPeerColor('host')
        };
        const allPeers = [hostInfo, ...Array.from(this.state.peers.values())];

        const msg: CollabMessage = {
            type: 'session.presence',
            payload: { peers: allPeers }
        };

        // Update local state (Host sees everyone)
        // this.state.updatePeers(allPeers); // Careful, state.peers is map of REMOTES usually?
        // Let's unify: SessionState.peers = All known peers.
        // On Host, we track remotes in `this.clients`. `SessionState.peers` is for UI.

        this.broadcast(msg);

        // Update host UI
        this.state.updatePeers(allPeers);
    }

    public broadcast(msg: CollabMessage, excludeId?: string) {
        const data = JSON.stringify(msg);
        for (const [ws, pid] of this.clients) {
            if (pid !== excludeId && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }

    public stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.state.setMode('standalone');
        this.state.addLog('Session ended.');
        this.clients.clear();
        this.state.peers.clear();
        this.state.updatePeers([]);
    }
}
