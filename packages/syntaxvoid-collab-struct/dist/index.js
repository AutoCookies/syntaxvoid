"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.consumeProjectMap = consumeProjectMap;
exports.consumeImpact = consumeImpact;
const atom_1 = require("atom");
const sessionState_1 = require("./sessionState");
const collabServer_1 = require("./collabServer");
const collabClient_1 = require("./collabClient");
const sessionPanel_1 = require("./ui/sessionPanel");
const liveFeedPanel_1 = require("./ui/liveFeedPanel");
const projectMapAdapter_1 = require("./adapters/projectMapAdapter");
const commands = require('../../../core/platform/commands'); // Legacy core glue if needed, or use atom.commands
const panels = require('../../../core/platform/panels');
let subscriptions;
let sessionPanel = null;
let feedPanel = null;
let server = null;
let client = null;
let projectMapAdapter = null;
let activeProjectMapService = null;
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    // Core Logic
    const state = sessionState_1.SessionState.getInstance();
    server = new collabServer_1.CollabServer();
    client = new collabClient_1.CollabClient();
    // UI
    sessionPanel = new sessionPanel_1.SessionPanel();
    sessionPanel.setServer(server);
    sessionPanel.setClient(client);
    feedPanel = new liveFeedPanel_1.LiveFeedPanel();
    // Register Panels (Right Dock)
    // We add them as items. For MVP, just add to right dock via atom.workspace.open?
    // Or use legacy panels service if available.
    // Let's use atom.workspace.open if they define getURI.
    // But they are simple classes. Let's make them behave like items.
    // For simplicity, we'll wrap them in a view provider or just use panels.addRightPanel if allowed.
    // Atom 1.x panels.addRightPanel returns a panel object.
    // Commands
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-collab:host': () => {
            server?.start(4217); // Configurable?
        },
        'syntaxvoid-collab:join': () => {
            // Focus the input in panel
            // For now, just ensure panel is visible?
            atom.notifications.addInfo('Use the Collab Panel to join.');
        },
        'syntaxvoid-collab:toggle-feed': () => {
            // Toggle feed logic
        }
    }));
    // Add Panel to Workspace
    const rightPanel = atom.workspace.addRightPanel({
        item: sessionPanel.element,
        visible: true,
        priority: 200
    });
    const bottomPanel = atom.workspace.addBottomPanel({
        item: feedPanel.element,
        visible: true,
        priority: 200
    });
    subscriptions.add(new atom_1.CompositeDisposable());
    // TODO: Cleanup panels on deactivate
}
function deactivate() {
    subscriptions.dispose();
    server?.stop();
    client?.disconnect();
    projectMapAdapter?.dispose();
    // Panels cleanup handled by subscriptions if we added the panel return value
}
// Service Consumption
function consumeProjectMap(service) {
    activeProjectMapService = service;
    // Instantiate adapter if we have core ready
    if (server && client) {
        projectMapAdapter = new projectMapAdapter_1.ProjectMapAdapter(service, sessionState_1.SessionState.getInstance(), server, client);
    }
}
function consumeImpact(service) {
    // Future: Impact Adapter
}
