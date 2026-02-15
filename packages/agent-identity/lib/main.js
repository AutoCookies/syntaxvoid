'use strict';

const PresenceStore = require('./presence-store');
const WorkspaceSource = require('./presence-sources/workspace-source');
const DiagnosticsSource = require('./presence-sources/diagnostics-source');
const OverlayView = require('./renderer/overlay-view');
const { CompositeDisposable } = require('atom');

class AgentIdentityPackage {
    constructor() {
        this.subscriptions = null;
        this.overlayView = null;
        this.sources = [];
    }

    activate(state) {
        this.subscriptions = new CompositeDisposable();

        // Commands
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'agent-identity:toggle': () => this.toggle(),
            'agent-identity:open-control-room': () => this.openControlRoom()
        }));

        // Config
        this.subscriptions.add(atom.config.observe('agent-identity.enabled', (enabled) => {
            if (enabled) {
                this.enable();
            } else {
                this.disable();
            }
        }));
    }

    deactivate() {
        this.disable();
        this.subscriptions.dispose();
    }

    enable() {
        if (this.overlayView) return;

        // Initialize Sources
        this.sources = [
            new WorkspaceSource(),
            new DiagnosticsSource()
        ];
        this.sources.forEach(source => source.start());

        // Initialize View
        this.overlayView = new OverlayView();
        this.overlayView.attach();

        atom.notifications.addInfo('Agent Identity System: Online');
    }

    disable() {
        if (!this.overlayView) return;

        this.sources.forEach(source => source.stop());
        this.sources = [];

        this.overlayView.detach();
        this.overlayView = null;
    }

    toggle() {
        const current = atom.config.get('agent-identity.enabled');
        atom.config.set('agent-identity.enabled', !current);
    }

    openControlRoom() {
        atom.notifications.addInfo('Agent Control Room: Coming Soon');
    }
}

module.exports = new AgentIdentityPackage();
