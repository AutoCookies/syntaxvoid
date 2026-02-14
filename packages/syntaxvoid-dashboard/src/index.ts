/// <reference path="./atom.d.ts" />
import { CompositeDisposable } from 'atom';
import { DashboardView } from './dashboardView';
import { DataManager } from './dataManager';

let subscriptions: CompositeDisposable;
let dataManager: DataManager;

export const config = {
    showOnStartup: {
        type: 'boolean',
        default: true,
        title: 'Show Dashboard on Startup',
        description: 'Show the project overview dashboard when opening a project (if Structure Mode is enabled).'
    }
};

export function activate() {
    subscriptions = new CompositeDisposable();
    dataManager = new DataManager();

    // Register Opener
    subscriptions.add(atom.workspace.addOpener((uri: string) => {
        if (uri === 'syntaxvoid://dashboard') {
            return new DashboardView(dataManager);
        }
    }));

    // Check startup logic
    // We defer slightly to allow workspace mode to set the stage
    if (atom.packages.hasActivatedInitialPackages()) {
        checkAndOpen();
    } else {
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

export function consumeRiskOverlay(service: any) {
    dataManager.setRiskService(service);
}

export function consumePatchGovernor(service: any) {
    dataManager.setPatchService(service);
}

export function deactivate() {
    subscriptions.dispose();
}
