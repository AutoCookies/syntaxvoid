import { CompositeDisposable } from 'atom';
import { SessionState } from './sessionState';
import { CollabServer } from './collabServer';
import { CollabClient } from './collabClient';
import { SessionPanel } from './ui/sessionPanel';
import { LiveFeedPanel } from './ui/liveFeedPanel';
import { ProjectMapAdapter } from './adapters/projectMapAdapter';

// Types for services
interface ProjectMapService {
    onDidSelectNode(callback: (event: any) => void): void;
    highlightNodes(paths: string[], style: string): void;
}

const commands: any = require('../../../core/platform/commands'); // Legacy core glue if needed, or use atom.commands
const panels: any = require('../../../core/platform/panels');

let subscriptions: CompositeDisposable;
let sessionPanel: SessionPanel | null = null;
let feedPanel: LiveFeedPanel | null = null;
let server: CollabServer | null = null;
let client: CollabClient | null = null;
let projectMapAdapter: ProjectMapAdapter | null = null;
let activeProjectMapService: any = null;

export function activate() {
    subscriptions = new CompositeDisposable();

    // Core Logic
    const state = SessionState.getInstance();
    server = new CollabServer();
    client = new CollabClient();

    // UI
    sessionPanel = new SessionPanel();
    sessionPanel.setServer(server);
    sessionPanel.setClient(client);

    feedPanel = new LiveFeedPanel();

    // Register Panels (Right Dock)
    // We add them as items. For MVP, just add to right dock via atom.workspace.open?
    // Or use legacy panels service if available.
    // Let's use atom.workspace.open if they define getURI.
    // But they are simple classes. Let's make them behave like items.
    // For simplicity, we'll wrap them in a view provider or just use panels.addRightPanel if allowed.
    // Atom 1.x panels.addRightPanel returns a panel object.

    // Commands
    subscriptions.add(
        atom.commands.add('atom-workspace', {
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
        })
    );

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

    subscriptions.add(new CompositeDisposable());
    // TODO: Cleanup panels on deactivate
}

export function deactivate() {
    subscriptions.dispose();
    server?.stop();
    client?.disconnect();
    projectMapAdapter?.dispose();

    // Panels cleanup handled by subscriptions if we added the panel return value
}

// Service Consumption
export function consumeProjectMap(service: any) {
    activeProjectMapService = service;
    // Instantiate adapter if we have core ready
    if (server && client) {
        projectMapAdapter = new ProjectMapAdapter(
            service,
            SessionState.getInstance(),
            server,
            client
        );
    }
}

export function consumeImpact(service: any) {
    // Future: Impact Adapter
}
