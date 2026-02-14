"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollabClient = void 0;
const ws_1 = require("ws");
const sessionState_1 = require("./sessionState");
const protocol_1 = require("./protocol");
class CollabClient {
    constructor() {
        this.ws = null;
        this.state = sessionState_1.SessionState.getInstance();
    }
    connect(url) {
        if (this.ws)
            this.disconnect();
        try {
            this.ws = new ws_1.WebSocket(url);
            this.state.addLog(`Connecting to ${url}...`);
            this.ws.on('open', () => {
                this.state.setMode('client', url);
                this.state.addLog('Connected to host.');
                // Send Join
                const joinMsg = {
                    type: 'session.join',
                    payload: {
                        name: this.state.localName,
                        version: '1.0.0'
                    }
                };
                this.send(joinMsg);
            });
            this.ws.on('message', (data) => {
                let parsed;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                }
                else if (Buffer.isBuffer(data)) {
                    parsed = JSON.parse(data.toString());
                }
                else
                    return;
                const msg = (0, protocol_1.validateMessage)(parsed);
                if (msg)
                    this.handleMessage(msg);
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
        }
        catch (e) {
            this.state.addLog(`Failed to connect: ${e.message}`);
        }
    }
    handleMessage(msg) {
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
    send(msg) {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.state.setMode('standalone');
    }
}
exports.CollabClient = CollabClient;
