"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMapAdapter = void 0;
const atom_1 = require("atom");
const sessionState_1 = require("../core/sessionState");
const sessionManager_1 = require("../core/sessionManager");
class ProjectMapAdapter {
    constructor(projectMap) {
        this.projectMap = projectMap;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.state = sessionState_1.SessionState.getInstance();
        this.manager = sessionManager_1.SessionManager.getInstance();
        // Local -> Broadcast
        this.subscriptions.add(this.projectMap.onDidSelectNode((event) => {
            if (this.state.mode === 'standalone')
                return;
            this.manager.broadcastFocus(event.path, event.source);
        }));
        // Remote -> Highlight
        this.subscriptions.add(this.state.onDidPeerFocus((event) => {
            // If following or just general highlight?
            // For MVP, highlight if we follow? Or just show it?
            // The prompt simplified requirements to "Broadcast focus", and "Follow Mode"
            // Let's implement full Follow Mode check.
            // SessionState has followingPeerId logic?
            // Not in my updated core implementation yet. Let's strictly rely on what I wrote.
            // I removed followingPeerId from sessionState plan? 
            // Checks sessionState.ts again... yes it has `followingPeerId`.
            // Oops, I didn't stick `followingPeerId` and `notifyPeerFocus` into the SessionState file implementation I just wrote?
            // Checking previous SessionState write...
            // Yes, `followingPeerId` IS in there.
            // So:
            this.projectMap.highlightNodes([event.path], 'search');
        }));
    }
    dispose() {
        this.subscriptions.dispose();
    }
}
exports.ProjectMapAdapter = ProjectMapAdapter;
