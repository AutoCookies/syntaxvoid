import { Emitter } from 'atom';
import { PeerInfo, CollabMessage } from './protocol';

export type SessionMode = 'standalone' | 'host' | 'client';

export class SessionState {
    private static instance: SessionState;

    public mode: SessionMode = 'standalone';
    public localPeerId: string | null = null;
    public localName: string = 'User';
    public peers: Map<string, PeerInfo> = new Map();
    public hostUrl: string | null = null;
    public followingPeerId: string | null = null;

    private emitter = new Emitter();
    private logEntries: string[] = [];

    constructor() {
        this.localName = process.env.USER || 'User';
    }

    public static getInstance(): SessionState {
        if (!SessionState.instance) {
            SessionState.instance = new SessionState();
        }
        return SessionState.instance;
    }

    public setMode(mode: SessionMode, url?: string) {
        this.mode = mode;
        this.hostUrl = url || null;
        this.emitter.emit('did-change-mode', mode);
    }

    public updatePeers(peers: PeerInfo[]) {
        this.peers.clear();
        for (const p of peers) {
            this.peers.set(p.id, p);
        }
        this.emitter.emit('did-change-peers', peers);
    }

    public addLog(entry: string) {
        this.logEntries.unshift(entry);
        if (this.logEntries.length > 200) this.logEntries.pop();
        this.emitter.emit('did-add-log', entry);
    }

    public setFollowing(peerId: string | null) {
        this.followingPeerId = peerId;
        this.emitter.emit('did-change-following', peerId);
    }

    // Events
    public onDidChangeMode(callback: (mode: SessionMode) => void) {
        return this.emitter.on('did-change-mode', callback);
    }

    public onDidChangePeers(callback: (peers: PeerInfo[]) => void) {
        return this.emitter.on('did-change-peers', callback);
    }

    public onDidAddLog(callback: (entry: string) => void) {
        return this.emitter.on('did-add-log', callback);
    }

    public onDidChangeFollowing(callback: (peerId: string | null) => void) {
        return this.emitter.on('did-change-following', callback);
    }

    public onDidPeerFocus(callback: (event: { peerId: string, path: string, source: string }) => void) {
        return this.emitter.on('did-peer-focus', callback);
    }

    public notifyPeerFocus(peerId: string, path: string, source: string) {
        this.emitter.emit('did-peer-focus', { peerId, path, source });
    }

    // Helpers
    public getPeerName(id: string): string {
        if (id === this.localPeerId) return `${this.localName} (You)`;
        return this.peers.get(id)?.name || 'Unknown';
    }

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

    public dispose() {
        this.emitter.dispose();
    }
}
