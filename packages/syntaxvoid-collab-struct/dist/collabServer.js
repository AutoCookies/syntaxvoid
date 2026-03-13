"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollabServer = void 0;
const ws_1 = require("ws");
const sessionState_1 = require("./sessionState");
const protocol_1 = require("./protocol");
const crypto = __importStar(require("crypto"));
class CollabServer {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // ws -> peerId
        this.state = sessionState_1.SessionState.getInstance();
    }
    start(port = 4217) {
        if (this.wss)
            return;
        try {
            this.wss = new ws_1.WebSocketServer({ port, host: '0.0.0.0' });
            this.wss.on('listening', () => {
                this.state.setMode('host');
                this.state.localPeerId = 'host';
                this.state.addLog(`Host started on port ${port}`);
                // Host is also a peer implicitly, but usually we just track remote peers in connection list
                // We add host to the peer list for clients.
            });
            this.wss.on('connection', (ws) => {
                this.handleConnection(ws);
            });
            this.wss.on('error', (err) => {
                this.state.addLog(`Server error: ${err.message}`);
                this.stop();
            });
        }
        catch (e) {
            this.state.addLog(`Failed to start server: ${e.message}`);
        }
    }
    handleConnection(ws) {
        const peerId = crypto.randomUUID();
        this.clients.set(ws, peerId);
        // Wait for join message? Or just welcome?
        // Let's expect a join message first.
        ws.on('message', (data) => {
            try {
                // Determine if binary or string
                let parsed;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                }
                else if (Buffer.isBuffer(data)) {
                    parsed = JSON.parse(data.toString());
                }
                else {
                    return; // Ignore
                }
                const msg = (0, protocol_1.validateMessage)(parsed);
                if (!msg)
                    return;
                this.handleMessage(ws, peerId, msg);
            }
            catch (e) {
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
    handleMessage(ws, peerId, msg) {
        switch (msg.type) {
            case 'session.join':
                // Register peer
                const color = this.state.getPeerColor(peerId); // deterministic based on UUID
                const info = {
                    id: peerId,
                    name: msg.payload.name,
                    color: color
                };
                this.state.peers.set(peerId, info);
                this.state.addLog(`${info.name} joined session.`);
                // Send Welcome
                const welcome = {
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
    broadcastPresence() {
        // Include Host in presence?
        // Construct full list including Host.
        const hostInfo = {
            id: 'host',
            name: this.state.localName,
            color: this.state.getPeerColor('host')
        };
        const allPeers = [hostInfo, ...Array.from(this.state.peers.values())];
        const msg = {
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
    broadcast(msg, excludeId) {
        const data = JSON.stringify(msg);
        for (const [ws, pid] of this.clients) {
            if (pid !== excludeId && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    stop() {
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
exports.CollabServer = CollabServer;
