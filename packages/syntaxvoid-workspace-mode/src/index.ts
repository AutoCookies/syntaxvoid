/// <reference path="./atom.d.ts" />
import { CompositeDisposable } from 'atom';
import { LayoutManager } from './layoutManager';

let subscriptions: CompositeDisposable;
let layoutManager: LayoutManager;

export const config = {
    structureFirstMode: {
        type: 'boolean',
        default: true,
        title: 'Structure First Mode',
        description: 'Automatically enforce structure-first layout (Project Map left, Risk right, Tree View hidden) on startup.'
    }
};

export function activate() {
    subscriptions = new CompositeDisposable();
    layoutManager = new LayoutManager();

    // Check config on startup
    const isEnabled = atom.config.get('syntaxvoid-workspace-mode.structureFirstMode');

    if (isEnabled) {
        // Defer slightly to ensure other packages (project-map, tree-view) have hydrated
        // `atom.packages.onDidActivateInitialPackages` logic
        if (atom.packages.hasActivatedInitialPackages()) {
            layoutManager.enforceLayout();
        } else {
            const disp = atom.packages.onDidActivateInitialPackages(() => {
                layoutManager.enforceLayout();
                disp.dispose();
            });
        }
    }

    // React to config changes
    subscriptions.add(
        atom.config.onDidChange('syntaxvoid-workspace-mode.structureFirstMode', ({ newValue }: { newValue: boolean }) => {
            if (newValue) {
                layoutManager.enforceLayout();
            } else {
                layoutManager.revertLayout();
            }
        })
    );
}

export function deactivate() {
    subscriptions.dispose();
}
