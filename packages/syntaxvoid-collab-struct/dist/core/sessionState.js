"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
const atom_1 = require("atom");
class SessionState {
    constructor() {
        this.mode = 'standalone';
        this.localPeerId = null;
        this.localRole = 'member'; // Default
        this.peers = new Map();
        this.hostUrl = null;
        this.followingPeerId = null; // Who am I following
        this.emitter = new atom_1.Emitter();
    }
    static getInstance() {
        if (!SessionState.instance)
            SessionState.instance = new SessionState();
        return SessionState.instance;
    }
    setMode(mode, role = 'member') {
        this.mode = mode;
        this.localRole = role;
        this.emitter.emit('did-change-mode', mode);
    }
    addPeer(peer) {
        this.peers.set(peer.id, peer);
        this.emitPeers();
    }
    removePeer(id) {
        this.peers.delete(id);
        this.emitPeers();
    }
    updatePeers(peers) {
        this.peers.clear();
        peers.forEach(p => this.peers.set(p.id, p));
        this.emitPeers();
    }
    addLog(entry) {
        this.emitter.emit('did-add-log', entry);
    }
    notifyPeerFocus(peerId, path, source) {
        this.emitter.emit('did-peer-focus', { peerId, path, source });
    }
    emitPeers() {
        this.emitter.emit('did-change-peers', Array.from(this.peers.values()));
    }
    // Helpers
    getPeerColor(id) {
        const p = this.peers.get(id);
        if (p)
            return p.color;
        // Deterministic fallback
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }
    // Events
    onDidChangeMode(cb) { return this.emitter.on('did-change-mode', cb); }
    onDidChangePeers(cb) { return this.emitter.on('did-change-peers', cb); }
    onDidAddLog(cb) { return this.emitter.on('did-add-log', cb); }
    onDidPeerFocus(cb) { return this.emitter.on('did-peer-focus', cb); }
}
exports.SessionState = SessionState;
