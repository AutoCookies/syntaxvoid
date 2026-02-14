"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
/// <reference path="./atom.d.ts" />
const atom_1 = require("atom");
const layoutManager_1 = require("./layoutManager");
let subscriptions;
let layoutManager;
exports.config = {
    structureFirstMode: {
        type: 'boolean',
        default: true,
        title: 'Structure First Mode',
        description: 'Automatically enforce structure-first layout (Project Map left, Risk right, Tree View hidden) on startup.'
    }
};
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    layoutManager = new layoutManager_1.LayoutManager();
    // Check config on startup
    const isEnabled = atom.config.get('syntaxvoid-workspace-mode.structureFirstMode');
    if (isEnabled) {
        // Defer slightly to ensure other packages (project-map, tree-view) have hydrated
        // `atom.packages.onDidActivateInitialPackages` logic
        if (atom.packages.hasActivatedInitialPackages()) {
            layoutManager.enforceLayout();
        }
        else {
            const disp = atom.packages.onDidActivateInitialPackages(() => {
                layoutManager.enforceLayout();
                disp.dispose();
            });
        }
    }
    // React to config changes
    subscriptions.add(atom.config.onDidChange('syntaxvoid-workspace-mode.structureFirstMode', ({ newValue }) => {
        if (newValue) {
            layoutManager.enforceLayout();
        }
        else {
            layoutManager.revertLayout();
        }
    }));
}
function deactivate() {
    subscriptions.dispose();
}
//# sourceMappingURL=index.js.map