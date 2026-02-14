"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.consumeProjectMap = consumeProjectMap;
exports.consumeImpact = consumeImpact;
const atom_1 = require("atom");
const sessionState_1 = require("./core/sessionState");
const sessionManager_1 = require("./core/sessionManager");
const sessionPanel_1 = require("./ui/sessionPanel");
const liveFeedPanel_1 = require("./ui/liveFeedPanel");
const projectMapAdapter_1 = require("./adapters/projectMapAdapter");
let subscriptions;
let sessionPanel = null;
let feedPanel = null;
let projectMapAdapter = null;
let activeProjectMapService = null;
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    // Init Singletons
    sessionState_1.SessionState.getInstance();
    const manager = sessionManager_1.SessionManager.getInstance();
    // UI
    sessionPanel = new sessionPanel_1.SessionPanel();
    feedPanel = new liveFeedPanel_1.LiveFeedPanel(); // Reusing old generic implementation
    // Commands
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-collab:host': () => manager.hostSession(),
        'syntaxvoid-collab:leave': () => manager.stopSession(),
        'syntaxvoid-collab:join': () => {
            // Focus panel?
            atom.workspace.open(sessionPanel);
        }
    }));
    // Add Panels
    atom.workspace.addRightPanel({ item: sessionPanel.element, priority: 200 });
    atom.workspace.addBottomPanel({ item: feedPanel.element, priority: 200 });
}
function deactivate() {
    subscriptions.dispose();
    sessionManager_1.SessionManager.getInstance().stopSession();
    projectMapAdapter?.dispose();
}
function consumeProjectMap(service) {
    activeProjectMapService = service;
    projectMapAdapter = new projectMapAdapter_1.ProjectMapAdapter(service);
}
function consumeImpact(service) {
    // Stub
}
