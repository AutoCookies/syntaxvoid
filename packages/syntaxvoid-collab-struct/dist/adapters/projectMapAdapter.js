"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMapAdapter = void 0;
const atom_1 = require("atom");
class ProjectMapAdapter {
    constructor(projectMap, state, server, client) {
        this.projectMap = projectMap;
        this.state = state;
        this.server = server;
        this.client = client;
        this.subscriptions = new atom_1.CompositeDisposable();
        // 1. Listen to Local Selection -> Broadcast
        this.subscriptions.add(this.projectMap.onDidSelectNode((event) => {
            if (this.state.mode === 'standalone')
                return;
            // Validate path (basic)
            if (!event.path)
                return;
            const msg = {
                type: 'view.focus',
                payload: {
                    peerId: this.state.localPeerId || 'unknown',
                    pathOrNodeId: event.path,
                    source: 'project-map' // or event.source
                }
            };
            if (this.state.mode === 'host') {
                this.server.broadcast(msg);
            }
            else if (this.state.mode === 'client') {
                this.client.send(msg);
            }
        }));
        // 2. Listen to Remote Selection -> Highlight
        this.subscriptions.add(this.state.onDidPeerFocus((event) => {
            // Check if following
            if (this.state.followingPeerId === event.peerId) {
                this.projectMap.highlightNodes([event.path], 'search');
                this.state.addLog(`Following ${this.state.getPeerName(event.peerId)} to ${event.path}`);
            }
        }));
    }
    dispose() {
        this.subscriptions.dispose();
    }
}
exports.ProjectMapAdapter = ProjectMapAdapter;
