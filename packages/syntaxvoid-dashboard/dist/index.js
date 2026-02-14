"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.activate = activate;
exports.consumeRiskOverlay = consumeRiskOverlay;
exports.consumePatchGovernor = consumePatchGovernor;
exports.deactivate = deactivate;
/// <reference path="./atom.d.ts" />
const atom_1 = require("atom");
const dashboardView_1 = require("./dashboardView");
const dataManager_1 = require("./dataManager");
let subscriptions;
let dataManager;
exports.config = {
    showOnStartup: {
        type: 'boolean',
        default: true,
        title: 'Show Dashboard on Startup',
        description: 'Show the project overview dashboard when opening a project (if Structure Mode is enabled).'
    }
};
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    dataManager = new dataManager_1.DataManager();
    // Register Opener
    subscriptions.add(atom.workspace.addOpener((uri) => {
        if (uri === 'syntaxvoid://dashboard') {
            return new dashboardView_1.DashboardView(dataManager);
        }
    }));
    // Check startup logic
    // We defer slightly to allow workspace mode to set the stage
    if (atom.packages.hasActivatedInitialPackages()) {
        checkAndOpen();
    }
    else {
        const disp = atom.packages.onDidActivateInitialPackages(() => {
            checkAndOpen();
            disp.dispose();
        });
    }
    // Command to open manually
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-dashboard:toggle': () => {
            atom.workspace.toggle('syntaxvoid://dashboard');
        }
    }));
}
function checkAndOpen() {
    const showDashboard = atom.config.get('syntaxvoid-dashboard.showOnStartup');
    // We respect the global "Structure First" mode from the other package if available
    // But mostly we just check our own config + maybe a heuristic
    const structureMode = atom.config.get('syntaxvoid-workspace-mode.structureFirstMode') !== false; // Default true if package missing
    if (showDashboard && structureMode) {
        // Open in center
        atom.workspace.open('syntaxvoid://dashboard', {
            location: 'center',
            activatePane: true,
            searchAllPanes: true
        });
    }
}
function consumeRiskOverlay(service) {
    dataManager.setRiskService(service);
}
function consumePatchGovernor(service) {
    dataManager.setPatchService(service);
}
function deactivate() {
    subscriptions.dispose();
}
//# sourceMappingURL=index.js.map