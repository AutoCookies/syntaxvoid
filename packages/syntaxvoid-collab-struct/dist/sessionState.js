"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
const atom_1 = require("atom");
class SessionState {
    constructor() {
        this.mode = 'standalone';
        this.localPeerId = null;
        this.localName = 'User';
        this.peers = new Map();
        this.hostUrl = null;
        this.followingPeerId = null;
        this.emitter = new atom_1.Emitter();
        this.logEntries = [];
        this.localName = process.env.USER || 'User';
    }
    static getInstance() {
        if (!SessionState.instance) {
            SessionState.instance = new SessionState();
        }
        return SessionState.instance;
    }
    setMode(mode, url) {
        this.mode = mode;
        this.hostUrl = url || null;
        this.emitter.emit('did-change-mode', mode);
    }
    updatePeers(peers) {
        this.peers.clear();
        for (const p of peers) {
            this.peers.set(p.id, p);
        }
        this.emitter.emit('did-change-peers', peers);
    }
    addLog(entry) {
        this.logEntries.unshift(entry);
        if (this.logEntries.length > 200)
            this.logEntries.pop();
        this.emitter.emit('did-add-log', entry);
    }
    setFollowing(peerId) {
        this.followingPeerId = peerId;
        this.emitter.emit('did-change-following', peerId);
    }
    // Events
    onDidChangeMode(callback) {
        return this.emitter.on('did-change-mode', callback);
    }
    onDidChangePeers(callback) {
        return this.emitter.on('did-change-peers', callback);
    }
    onDidAddLog(callback) {
        return this.emitter.on('did-add-log', callback);
    }
    onDidChangeFollowing(callback) {
        return this.emitter.on('did-change-following', callback);
    }
    onDidPeerFocus(callback) {
        return this.emitter.on('did-peer-focus', callback);
    }
    notifyPeerFocus(peerId, path, source) {
        this.emitter.emit('did-peer-focus', { peerId, path, source });
    }
    // Helpers
    getPeerName(id) {
        if (id === this.localPeerId)
            return `${this.localName} (You)`;
        return this.peers.get(id)?.name || 'Unknown';
    }
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
    dispose() {
        this.emitter.dispose();
    }
}
exports.SessionState = SessionState;
