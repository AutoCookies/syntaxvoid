import { Emitter } from 'atom';
import { PeerInfo } from '../types/peer';
import { Role } from '../types/roles';

export type SessionMode = 'standalone' | 'host' | 'client';

export class SessionState {
    private static instance: SessionState;

    public mode: SessionMode = 'standalone';
    public localPeerId: string | null = null;
    public localRole: Role = 'member'; // Default
    public peers: Map<string, PeerInfo> = new Map();
    public hostUrl: string | null = null;
    public followingPeerId: string | null = null; // Who am I following

    private emitter = new Emitter();

    constructor() { }

    public static getInstance(): SessionState {
        if (!SessionState.instance) SessionState.instance = new SessionState();
        return SessionState.instance;
    }

    public setMode(mode: SessionMode, role: Role = 'member') {
        this.mode = mode;
        this.localRole = role;
        this.emitter.emit('did-change-mode', mode);
    }

    public addPeer(peer: PeerInfo) {
        this.peers.set(peer.id, peer);
        this.emitPeers();
    }

    public removePeer(id: string) {
        this.peers.delete(id);
        this.emitPeers();
    }

    public updatePeers(peers: PeerInfo[]) {
        this.peers.clear();
        peers.forEach(p => this.peers.set(p.id, p));
        this.emitPeers();
    }

    public addLog(entry: string) {
        this.emitter.emit('did-add-log', entry);
    }

    public notifyPeerFocus(peerId: string, path: string, source: string) {
        this.emitter.emit('did-peer-focus', { peerId, path, source });
    }

    private emitPeers() {
        this.emitter.emit('did-change-peers', Array.from(this.peers.values()));
    }

    // Helpers
    public getPeerColor(id: string): string {
        const p = this.peers.get(id);
        if (p) return p.color;
        // Deterministic fallback
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // Events
    public onDidChangeMode(cb: (mode: SessionMode) => void) { return this.emitter.on('did-change-mode', cb); }
    public onDidChangePeers(cb: (peers: PeerInfo[]) => void) { return this.emitter.on('did-change-peers', cb); }
    public onDidAddLog(cb: (entry: string) => void) { return this.emitter.on('did-add-log', cb); }
    public onDidPeerFocus(cb: (evt: any) => void) { return this.emitter.on('did-peer-focus', cb); }
}
