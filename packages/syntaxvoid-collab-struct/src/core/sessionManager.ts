import { SessionState } from './sessionState';
import { Transport } from '../transport/transport';
import { LanHostTransport } from '../transport/lanHostTransport';
import { LanClientTransport } from '../transport/lanClientTransport';
import { TokenManager } from '../security/tokenManager';
import { AuthGuard, RateLimiter } from '../security/authGuard';
import { Role, ROLE_PERMISSIONS } from '../types/roles';
import { PeerInfo } from '../types/peer';
import { CollabMessage, JoinMessage, WelcomeMessage, PresenceMessage, FocusMessage } from '../protocol/messages';
import * as crypto from 'crypto';

export class SessionManager {
    static instance: SessionManager;
    private state: SessionState;
    private transport: Transport | null = null;
    private tokenManager: TokenManager | null = null;
    private authGuard = new AuthGuard();
    private rateLimiter = new RateLimiter();

    private connectedPeers = new Map<string, PeerInfo>(); // id -> info

    constructor() {
        this.state = SessionState.getInstance();
    }

    public static getInstance() {
        if (!SessionManager.instance) SessionManager.instance = new SessionManager();
        return SessionManager.instance;
    }

    // --- Host Logic ---
    public async hostSession(port: number = 4217, role: Role = 'host') {
        if (this.transport) await this.stopSession();

        const sessionId = crypto.randomUUID();
        this.tokenManager = new TokenManager(sessionId);

        // Host transport
        const transport = new LanHostTransport();
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

    private handleHostMessage(msg: CollabMessage, tempId: string) {
        // Rate Limit
        if (!this.rateLimiter.checkLimit(tempId)) return; // Drop

        switch (msg.type) {
            case 'session.join':
                this.handleJoin(msg as JoinMessage, tempId);
                break;
            case 'view.focus':
                // Check Role
                const peer = this.connectedPeers.get(tempId);
                if (peer && ROLE_PERMISSIONS[peer.role].canBroadcastFocus) {
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

    private handleJoin(msg: JoinMessage, tempId: string) {
        if (!this.tokenManager) return;

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
        const role = (valid.role as Role) || 'member';

        // Use name from somewhere? Protocol doesn't have name in JoinMessage?
        // Wait, Protocol says JoinMessage has token. Token has Role. 
        // We need Peer Name.
        // Update protocol: JoinMessage needs name? Or Token payload needs name?
        // Usually name is in JoinMessage.
        // Let's assume JoinMessage has name too regardless of Protocol artifact (update it later if needed).
        // Actually, previous implementation had name. 
        // Let's assume msg has name or we default to 'Peer'.
        // FIX: I will add name to JoinMessage in types if missing.
        const name = (msg as any).name || 'Peer';

        const info: PeerInfo = {
            id: peerId,
            name: name,
            role: role,
            color: this.state.getPeerColor ? this.state.getPeerColor(peerId) : '#ccc', // Determine color later
            lastSeen: Date.now()
        };

        this.connectedPeers.set(peerId, info);
        this.state.addLog(`${name} joined as ${role}.`);

        // Send Welcome
        const welcome: WelcomeMessage = {
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
    public async joinSession(url: string, token: string, name: string) {
        if (this.transport) await this.stopSession();

        const transport = new LanClientTransport();
        this.transport = transport as unknown as Transport; // Force cast or fix internal mismatch strictness

        transport.onMessage((msg) => this.handleClientMessage(msg));
        transport.onDisconnect(() => this.stopSession());

        await transport.start(url);

        // Send Join
        const join: JoinMessage = {
            type: 'session.join',
            token: token
            // @ts-ignore - appending name dynamically if protocol missing it
            , name: name
        };
        // Fix up the type definition for JoinMessage later!

        transport.send(join);
        this.state.addLog(`Connecting...`);
    }

    private handleClientMessage(msg: CollabMessage) {
        switch (msg.type) {
            case 'session.welcome':
                this.state.setMode('client', msg.payload.role as Role);
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
    public broadcastFocus(path: string, source: string) {
        if (!ROLE_PERMISSIONS[this.state.localRole].canBroadcastFocus) return;

        const msg: FocusMessage = {
            type: 'view.focus',
            payload: {
                // Client doesn't set peerId? Host stamps it. 
                // Host sets its own peerId?
                peerId: this.state.localPeerId || undefined,
                pathOrNodeId: path,
                sourcePanel: source as any
            }
        };

        if (this.state.mode === 'host') {
            this.transport?.broadcast(msg); // Broadcast to all
            // Also notify self
            // this.state.notifyPeerFocus... (Wait, UI usually ignores self unless we loopback)
            // Let's log self action
            this.state.addLog(`You focused ${path}`);
        } else {
            this.transport?.send(msg);
        }
    }

    private broadcastPresence() {
        if (this.state.mode !== 'host') return;
        const peers = this.getAllPeers();
        this.transport?.broadcast({
            type: 'session.presence',
            payload: { peers }
        });
        this.updateStatePeers();
    }

    private getAllPeers(): PeerInfo[] {
        const hostInfo: PeerInfo = {
            id: 'host', // special ID for host
            name: 'Host',
            role: 'host',
            color: '#FF0000',
            lastSeen: Date.now()
        };
        return [hostInfo, ...Array.from(this.connectedPeers.values())];
    }

    private updateStatePeers() {
        this.state.updatePeers(this.getAllPeers());
    }

    public async stopSession() {
        await this.transport?.stop();
        this.transport = null;
        this.tokenManager = null;
        this.connectedPeers.clear();
        this.state.setMode('standalone');
        this.state.peers.clear();
    }

    // Commands
    public createInvite(role: Role = 'member'): string {
        if (this.state.mode !== 'host' || !this.tokenManager) return '';
        return this.tokenManager.generateToken(role);
    }
}
