import { CompositeDisposable } from 'atom';
import { SessionState } from './core/sessionState';
import { SessionManager } from './core/sessionManager';
import { SessionPanel } from './ui/sessionPanel';
import { LiveFeedPanel } from './ui/liveFeedPanel';
import { ProjectMapAdapter } from './adapters/projectMapAdapter';

let subscriptions: CompositeDisposable;
let sessionPanel: SessionPanel | null = null;
let feedPanel: LiveFeedPanel | null = null;
let projectMapAdapter: ProjectMapAdapter | null = null;
let activeProjectMapService: any = null;

export function activate() {
    subscriptions = new CompositeDisposable();

    // Init Singletons
    SessionState.getInstance();
    const manager = SessionManager.getInstance();

    // UI
    sessionPanel = new SessionPanel();
    feedPanel = new LiveFeedPanel(); // Reusing old generic implementation

    // Commands
    subscriptions.add(
        atom.commands.add('atom-workspace', {
            'syntaxvoid-collab:host': () => manager.hostSession(),
            'syntaxvoid-collab:leave': () => manager.stopSession(),
            'syntaxvoid-collab:join': () => {
                // Focus panel?
                atom.workspace.open(sessionPanel);
            }
        })
    );

    // Add Panels
    atom.workspace.addRightPanel({ item: sessionPanel.element, priority: 200 });
    atom.workspace.addBottomPanel({ item: feedPanel.element, priority: 200 });
}

export function deactivate() {
    subscriptions.dispose();
    SessionManager.getInstance().stopSession();
    projectMapAdapter?.dispose();
}

export function consumeProjectMap(service: any) {
    activeProjectMapService = service;
    projectMapAdapter = new ProjectMapAdapter(service);
}

export function consumeImpact(service: any) {
    // Stub
}
