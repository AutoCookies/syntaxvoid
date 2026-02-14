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
exports.SessionManager = void 0;
const sessionState_1 = require("./sessionState");
const lanHostTransport_1 = require("../transport/lanHostTransport");
const lanClientTransport_1 = require("../transport/lanClientTransport");
const tokenManager_1 = require("../security/tokenManager");
const authGuard_1 = require("../security/authGuard");
const roles_1 = require("../types/roles");
const crypto = __importStar(require("crypto"));
class SessionManager {
    constructor() {
        this.transport = null;
        this.tokenManager = null;
        this.authGuard = new authGuard_1.AuthGuard();
        this.rateLimiter = new authGuard_1.RateLimiter();
        this.connectedPeers = new Map(); // id -> info
        this.state = sessionState_1.SessionState.getInstance();
    }
    static getInstance() {
        if (!SessionManager.instance)
            SessionManager.instance = new SessionManager();
        return SessionManager.instance;
    }
    // --- Host Logic ---
    async hostSession(port = 4217, role = 'host') {
        if (this.transport)
            await this.stopSession();
        const sessionId = crypto.randomUUID();
        this.tokenManager = new tokenManager_1.TokenManager(sessionId);
        // Host transport
        const transport = new lanHostTransport_1.LanHostTransport();
        this.transport = transport;
        transport.onConnect((tempId) => {
            // Wait for Join message with token
        });
        transport.onDisconnect((peerId) => {
            if (this.connectedPeers.has(peerId)) {
                const p = this.connectedPeers.get(peerId);
                this.state.addLog(`${p?.name} disconnected.`);
                this.connectedPeers.delete(peerId);
                this.broadcastPresence();
            }
        });
        transport.onMessage((msg, peerId) => this.handleHostMessage(msg, peerId));
        await transport.start(port);
        this.state.setMode('host', role);
        this.state.localPeerId = 'host';
        this.state.addLog(`Hosting session ${sessionId.substring(0, 8)} on port ${port}`);
        // Generate Invite Token
        const inviteToken = this.tokenManager.generateToken('member');
        this.state.addLog(`INVITE TOKEN: ${inviteToken}`);
        // Set local peer info in list?
        // Host usually isn't in connectedPeers, but state.peers needs it.
        this.updateStatePeers();
    }
    handleHostMessage(msg, tempId) {
        // Rate Limit
        if (!this.rateLimiter.checkLimit(tempId))
            return; // Drop
        switch (msg.type) {
            case 'session.join':
                this.handleJoin(msg, tempId);
                break;
            case 'view.focus':
                // Check Role
                const peer = this.connectedPeers.get(tempId);
                if (peer && roles_1.ROLE_PERMISSIONS[peer.role].canBroadcastFocus) {
                    // Re-broadcast
                    // Stamp peerId
                    msg.payload.peerId = peer.id;
                    this.transport?.broadcast(msg, undefined); // Broadcast to all
                    this.state.notifyPeerFocus(peer.id, msg.payload.pathOrNodeId, msg.payload.sourcePanel);
                    this.state.addLog(`${peer.name} focused ${msg.payload.pathOrNodeId}`);
                }
                break;
        }
    }
    handleJoin(msg, tempId) {
        if (!this.tokenManager)
            return;
        const valid = this.tokenManager.validateToken(msg.token);
        if (!valid) {
            // Reject
            // this.transport.sendTo(tempId, { type: 'session.reject', reason: 'Invalid Token' });
            return; // Or close
        }
        if (this.authGuard.isReplay(valid.nonce)) {
            // Replay attack
            return;
        }
        // Add Peer
        // We use tempId as peerId for simplicity in Transport, 
        // but robust systems might negotiate ID. Assuming tempId is stable unique ID from transport.
        const peerId = tempId;
        const role = valid.role || 'member';
        // Use name from somewhere? Protocol doesn't have name in JoinMessage?
        // Wait, Protocol says JoinMessage has token. Token has Role. 
        // We need Peer Name.
        // Update protocol: JoinMessage needs name? Or Token payload needs name?
        // Usually name is in JoinMessage.
        // Let's assume JoinMessage has name too regardless of Protocol artifact (update it later if needed).
        // Actually, previous implementation had name. 
        // Let's assume msg has name or we default to 'Peer'.
        // FIX: I will add name to JoinMessage in types if missing.
        const name = msg.name || 'Peer';
        const info = {
            id: peerId,
            name: name,
            role: role,
            color: this.state.getPeerColor ? this.state.getPeerColor(peerId) : '#ccc', // Determine color later
            lastSeen: Date.now()
        };
        this.connectedPeers.set(peerId, info);
        this.state.addLog(`${name} joined as ${role}.`);
        // Send Welcome
        const welcome = {
            type: 'session.welcome',
            payload: {
                peerId: peerId,
                role: role,
                peers: this.getAllPeers()
            }
        };
        this.transport?.sendTo(peerId, welcome);
        this.broadcastPresence();
    }
    // --- Client Logic ---
    async joinSession(url, token, name) {
        if (this.transport)
            await this.stopSession();
        const transport = new lanClientTransport_1.LanClientTransport();
        this.transport = transport; // Force cast or fix internal mismatch strictness
        transport.onMessage((msg) => this.handleClientMessage(msg));
        transport.onDisconnect(() => this.stopSession());
        await transport.start(url);
        // Send Join
        const join = {
            type: 'session.join',
            token: token
            // @ts-ignore - appending name dynamically if protocol missing it
            ,
            name: name
        };
        // Fix up the type definition for JoinMessage later!
        transport.send(join);
        this.state.addLog(`Connecting...`);
    }
    handleClientMessage(msg) {
        switch (msg.type) {
            case 'session.welcome':
                this.state.setMode('client', msg.payload.role);
                this.state.localPeerId = msg.payload.peerId;
                this.state.updatePeers(msg.payload.peers);
                this.state.addLog('Joined session.');
                break;
            case 'session.presence':
                this.state.updatePeers(msg.payload.peers);
                break;
            case 'view.focus':
                const pid = msg.payload.peerId || 'unknown';
                this.state.notifyPeerFocus(pid, msg.payload.pathOrNodeId, msg.payload.sourcePanel);
                this.state.addLog(`Focus: ${msg.payload.pathOrNodeId}`);
                break;
        }
    }
    // --- Shared ---
    broadcastFocus(path, source) {
        if (!roles_1.ROLE_PERMISSIONS[this.state.localRole].canBroadcastFocus)
            return;
        const msg = {
            type: 'view.focus',
            payload: {
                // Client doesn't set peerId? Host stamps it. 
                // Host sets its own peerId?
                peerId: this.state.localPeerId || undefined,
                pathOrNodeId: path,
                sourcePanel: source
            }
        };
        if (this.state.mode === 'host') {
            this.transport?.broadcast(msg); // Broadcast to all
            // Also notify self
            // this.state.notifyPeerFocus... (Wait, UI usually ignores self unless we loopback)
            // Let's log self action
            this.state.addLog(`You focused ${path}`);
        }
        else {
            this.transport?.send(msg);
        }
    }
    broadcastPresence() {
        if (this.state.mode !== 'host')
            return;
        const peers = this.getAllPeers();
        this.transport?.broadcast({
            type: 'session.presence',
            payload: { peers }
        });
        this.updateStatePeers();
    }
    getAllPeers() {
        const hostInfo = {
            id: 'host', // special ID for host
            name: 'Host',
            role: 'host',
            color: '#FF0000',
            lastSeen: Date.now()
        };
        return [hostInfo, ...Array.from(this.connectedPeers.values())];
    }
    updateStatePeers() {
        this.state.updatePeers(this.getAllPeers());
    }
    async stopSession() {
        await this.transport?.stop();
        this.transport = null;
        this.tokenManager = null;
        this.connectedPeers.clear();
        this.state.setMode('standalone');
        this.state.peers.clear();
    }
    // Commands
    createInvite(role = 'member') {
        if (this.state.mode !== 'host' || !this.tokenManager)
            return '';
        return this.tokenManager.generateToken(role);
    }
}
exports.SessionManager = SessionManager;
