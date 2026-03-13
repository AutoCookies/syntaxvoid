"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionPanel = void 0;
const atom_1 = require("atom");
const sessionState_1 = require("../core/sessionState");
const sessionManager_1 = require("../core/sessionManager");
class SessionPanel {
    constructor() {
        this.subscriptions = new atom_1.CompositeDisposable();
        this.state = sessionState_1.SessionState.getInstance();
        this.manager = sessionManager_1.SessionManager.getInstance();
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-collab-panel';
        this._buildUI();
        this._updateView('standalone');
        this.subscriptions.add(this.state.onDidChangeMode((mode) => this._updateView(mode)), this.state.onDidChangePeers((peers) => this._updatePeers(peers)));
    }
    _buildUI() {
        // Controls
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'connection-controls';
        this.element.appendChild(this.controlsContainer);
        // List
        const listHeader = document.createElement('div');
        listHeader.className = 'section-title';
        listHeader.textContent = 'Peers';
        listHeader.style.padding = 'var(--sv-space-3) var(--sv-space-3) 0';
        this.element.appendChild(listHeader);
        this.peerListContainer = document.createElement('div');
        this.peerListContainer.className = 'peer-list';
        this.element.appendChild(this.peerListContainer);
    }
    _updateView(mode) {
        this.controlsContainer.innerHTML = '';
        if (mode === 'standalone') {
            // Host
            const btnHost = this._createButton('Host Session', 'icon-radio-tower');
            btnHost.onclick = () => this.manager.hostSession();
            this.controlsContainer.appendChild(this._wrapRow(btnHost));
            // Join Inputs
            this.inputUrl = this._createInput('ws://IP:4217');
            this.inputUrl.value = 'ws://localhost:4217';
            this.inputToken = this._createInput('Token (Base64)');
            const btnJoin = this._createButton('Join', 'icon-plug');
            btnJoin.onclick = () => {
                const url = this.inputUrl.value;
                const token = this.inputToken.value;
                // Use a proper name
                const name = process.env.USER || 'User';
                if (url && token)
                    this.manager.joinSession(url, token, name);
            };
            this.controlsContainer.appendChild(this._wrapRow(this.inputUrl));
            this.controlsContainer.appendChild(this._wrapRow(this.inputToken));
            this.controlsContainer.appendChild(this._wrapRow(btnJoin));
        }
        else if (mode === 'host') {
            const status = document.createElement('div');
            status.innerHTML = `<span class="icon icon-check text-success"></span> Hosting`;
            this.controlsContainer.appendChild(this._wrapRow(status));
            // Invite Gen
            const btnInvite = this._createButton('Copy Invite Token', 'icon-clippy');
            btnInvite.classList.add('btn-primary');
            btnInvite.onclick = () => {
                const token = this.manager.createInvite('member');
                atom.clipboard.write(token);
                atom.notifications.addSuccess('Member token copied!');
            };
            this.controlsContainer.appendChild(this._wrapRow(btnInvite));
            const btnStop = this._createButton('Stop', 'icon-x');
            btnStop.classList.add('btn-error');
            btnStop.onclick = () => this.manager.stopSession();
            this.controlsContainer.appendChild(this._wrapRow(btnStop));
        }
        else if (mode === 'client') {
            const status = document.createElement('div');
            status.innerHTML = `<span class="icon icon-link text-success"></span> Connected as ${this.state.localRole}`;
            this.controlsContainer.appendChild(this._wrapRow(status));
            const btnLeave = this._createButton('Leave', 'icon-sign-out');
            btnLeave.onclick = () => this.manager.stopSession();
            this.controlsContainer.appendChild(this._wrapRow(btnLeave));
        }
    }
    _updatePeers(peers) {
        this.peerListContainer.innerHTML = '';
        peers.forEach(p => {
            const div = document.createElement('div');
            div.className = 'peer-item';
            div.innerHTML = `
                <div class="peer-avatar" style="background:${p.color}">${p.role[0].toUpperCase()}</div>
                <div class="peer-info">
                    <div class="peer-name">${p.name} ${this.state.localPeerId === p.id ? '(You)' : ''}</div>
                    <div class="peer-status">${p.role}</div>
                </div>
             `;
            this.peerListContainer.appendChild(div);
        });
    }
    _createButton(text, icon) {
        const btn = document.createElement('button');
        btn.className = `btn icon ${icon}`;
        btn.textContent = text;
        btn.style.width = '100%';
        return btn;
    }
    _createInput(placeholder) {
        const inp = document.createElement('input');
        inp.className = 'input-text native-key-bindings'; // native-key-bindings essential for Atom
        inp.placeholder = placeholder;
        inp.style.width = '100%';
        return inp;
    }
    _wrapRow(el) {
        const div = document.createElement('div');
        div.className = 'control-row';
        div.style.marginBottom = '8px';
        div.appendChild(el);
        return div;
    }
}
exports.SessionPanel = SessionPanel;
