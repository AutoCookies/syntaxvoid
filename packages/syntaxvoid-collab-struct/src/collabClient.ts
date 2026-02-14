import { WebSocket } from 'ws';
import { SessionState } from './sessionState';
import { CollabMessage, validateMessage } from './protocol';

export class CollabClient {
    private ws: WebSocket | null = null;
    private state: SessionState;

    constructor() {
        this.state = SessionState.getInstance();
    }

    public connect(url: string) {
        if (this.ws) this.disconnect();

        try {
            this.ws = new WebSocket(url);
            this.state.addLog(`Connecting to ${url}...`);

            this.ws.on('open', () => {
                this.state.setMode('client', url);
                this.state.addLog('Connected to host.');

                // Send Join
                const joinMsg: CollabMessage = {
                    type: 'session.join',
                    payload: {
                        name: this.state.localName,
                        version: '1.0.0'
                    }
                };
                this.send(joinMsg);
            });

            this.ws.on('message', (data: any) => {
                let parsed: any;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                } else if (Buffer.isBuffer(data)) {
                    parsed = JSON.parse((data as Buffer).toString());
                } else return;

                const msg = validateMessage(parsed);
                if (msg) this.handleMessage(msg);
            });

            this.ws.on('close', () => {
                this.state.setMode('standalone');
                this.state.addLog('Disconnected from host.');
                this.ws = null;
                this.state.updatePeers([]);
            });

            this.ws.on('error', (err) => {
                this.state.addLog(`Connection error: ${err.message}`);
                this.disconnect();
            });

        } catch (e: any) {
            this.state.addLog(`Failed to connect: ${e.message}`);
        }
    }

    private handleMessage(msg: CollabMessage) {
        switch (msg.type) {
            case 'session.welcome':
                this.state.localPeerId = msg.payload.peerId;
                this.state.updatePeers(msg.payload.peers);
                break;
            case 'session.presence':
                this.state.updatePeers(msg.payload.peers);
                break;
            case 'view.focus':
                // Protocol def: { type: "view.focus", payload: { peerId, pathOrNodeId, depth, source } }
                const pid = msg.payload.peerId || 'unknown';
                this.state.notifyPeerFocus(pid, msg.payload.pathOrNodeId, msg.payload.source);
                this.state.addLog(`${this.state.getPeerName(pid)} focused ${msg.payload.pathOrNodeId}`);
                break;
        }
    }

    public send(msg: CollabMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.state.setMode('standalone');
    }
}
