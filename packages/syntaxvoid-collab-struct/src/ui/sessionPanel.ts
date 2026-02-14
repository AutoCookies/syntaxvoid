import { CompositeDisposable } from 'atom';
import { SessionState, SessionMode } from '../sessionState';
import { PeerInfo } from '../protocol';
import { CollabServer } from '../collabServer';
import { CollabClient } from '../collabClient';

export class SessionPanel {
    element: HTMLElement;
    private subscriptions = new CompositeDisposable();
    private state = SessionState.getInstance();
    private server: CollabServer | null = null;
    private client: CollabClient | null = null;

    private controlsContainer!: HTMLElement;
    private peerListContainer!: HTMLElement;
    private joinInput!: HTMLInputElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-collab-panel';

        this._buildUI();
        this._updateView('standalone');

        this.subscriptions.add(
            this.state.onDidChangeMode((mode) => this._updateView(mode)),
            this.state.onDidChangePeers((peers) => this._updatePeers(peers))
        );
    }

    setServer(s: CollabServer) { this.server = s; }
    setClient(c: CollabClient) { this.client = c; }

    private _buildUI() {
        // 1. Controls
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'connection-controls';
        this.element.appendChild(this.controlsContainer);

        // 2. Peers List
        const listHeader = document.createElement('div');
        listHeader.className = 'section-title';
        listHeader.textContent = 'Peers';
        listHeader.style.padding = 'var(--sv-space-3) var(--sv-space-3) 0';
        this.element.appendChild(listHeader);

        this.peerListContainer = document.createElement('div');
        this.peerListContainer.className = 'peer-list';
        this.element.appendChild(this.peerListContainer);
    }

    private _updateView(mode: SessionMode) {
        this.controlsContainer.innerHTML = '';

        if (mode === 'standalone') {
            // Host Button
            const hostRow = document.createElement('div');
            hostRow.className = 'control-row';
            const btnHost = this._createButton('Host Session', 'icon-radio-tower');
            btnHost.onclick = () => atom.commands.dispatch(atom.views.getView(atom.workspace), 'syntaxvoid-collab:host');
            hostRow.appendChild(btnHost);
            this.controlsContainer.appendChild(hostRow);

            // Join Input
            const joinRow = document.createElement('div');
            joinRow.className = 'control-row';
            this.joinInput = document.createElement('input');
            this.joinInput.className = 'sv-input native-key-bindings';
            this.joinInput.placeholder = 'ws://IP:4217';
            this.joinInput.value = 'ws://localhost:4217'; // default convenience

            const btnJoin = this._createButton('Join', 'icon-plug');
            btnJoin.onclick = () => {
                const url = this.joinInput.value;
                if (url) {
                    // Dispatch command with arg? or just call client directly?
                    // Command dispatch is cleaner but args are tricky in some Atom versions.
                    // We'll call client directly if set, or via command.
                    // Let's use command registry if possible, but here we have direct access.
                    // Actually, let's use the public API via index.ts or just use the client reference we will likely inject.
                    if (this.client) this.client.connect(url);
                }
            };

            joinRow.appendChild(this.joinInput);
            joinRow.appendChild(btnJoin);
            this.controlsContainer.appendChild(joinRow);

        } else if (mode === 'host') {
            const statusRow = document.createElement('div');
            statusRow.className = 'control-row';
            statusRow.innerHTML = `<span class="icon icon-radio-tower text-success"></span> Hosting on Port 4217`;
            this.controlsContainer.appendChild(statusRow);

            const stopRow = document.createElement('div');
            stopRow.className = 'control-row';
            const btnStop = this._createButton('Stop Session', 'icon-circle-slash');
            btnStop.classList.add('btn-error');
            btnStop.onclick = () => {
                if (this.server) this.server.stop();
            };
            stopRow.appendChild(btnStop);
            this.controlsContainer.appendChild(stopRow);

        } else if (mode === 'client') {
            const statusRow = document.createElement('div');
            statusRow.className = 'control-row';
            statusRow.innerHTML = `<span class="icon icon-plug text-success"></span> Connected`;
            this.controlsContainer.appendChild(statusRow);

            const leaveRow = document.createElement('div');
            leaveRow.className = 'control-row';
            const btnLeave = this._createButton('Disconnect', 'icon-sign-out');
            btnLeave.onclick = () => {
                if (this.client) this.client.disconnect();
            };
            leaveRow.appendChild(btnLeave);
            this.controlsContainer.appendChild(leaveRow);
        }
    }

    private _createButton(text: string, icon?: string) {
        const btn = document.createElement('button');
        btn.className = 'sv-btn';
        if (icon) {
            btn.innerHTML = `<span class="icon ${icon}"></span> ${text}`;
        } else {
            btn.textContent = text;
        }
        return btn;
    }

    private _updatePeers(peers: PeerInfo[]) {
        this.peerListContainer.innerHTML = '';

        // Always show self if in session
        if (this.state.mode !== 'standalone') {
            const selfInfo: PeerInfo = {
                id: this.state.localPeerId || 'unknown',
                name: `${this.state.localName} (You)`,
                color: this.state.getPeerColor(this.state.localPeerId || 'unknown')
            };
            this.peerListContainer.appendChild(this._createPeerItem(selfInfo, true));
        }

        peers.forEach(p => {
            if (p.id !== this.state.localPeerId) {
                this.peerListContainer.appendChild(this._createPeerItem(p));
            }
        });

        if (this.state.mode !== 'standalone' && peers.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-subtle text-center';
            empty.style.padding = '20px';
            empty.textContent = 'Waiting for peers...';
            this.peerListContainer.appendChild(empty);
        }
    }

    private _createPeerItem(peer: PeerInfo, isSelf = false) {
        const div = document.createElement('div');
        div.className = 'peer-item';

        const avatar = document.createElement('div');
        avatar.className = 'peer-avatar';
        avatar.style.backgroundColor = peer.color;
        avatar.textContent = peer.name.substring(0, 2).toUpperCase();

        const info = document.createElement('div');
        info.className = 'peer-info';

        const name = document.createElement('div');
        name.className = 'peer-name';
        name.textContent = peer.name;

        info.appendChild(name);
        div.appendChild(avatar);
        div.appendChild(info);

        if (!isSelf) {
            const actions = document.createElement('div');
            actions.className = 'peer-actions';

            // Follow toggle
            // For MVP, just a button? Or toggle switch.
            // Let's use simple text btn
            const btnFollow = document.createElement('button');
            btnFollow.className = 'btn btn-xs icon icon-eye';
            btnFollow.title = 'Follow Focus';
            btnFollow.onclick = () => {
                this.state.setFollowing(this.state.followingPeerId === peer.id ? null : peer.id);
                this._updatePeers(Array.from(this.state.peers.values())); // generic refresh
            };

            if (this.state.followingPeerId === peer.id) {
                btnFollow.classList.add('btn-primary');
            }

            actions.appendChild(btnFollow);
            div.appendChild(actions);
        }
        return div;
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }
}
