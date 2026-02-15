'use strict';

const { CompositeDisposable } = require('atom');
const PresenceStore = require('../presence-store');

class DiagnosticsSource {
    constructor() {
        this.subscriptions = new CompositeDisposable();
    }

    start() {
        this.startPolling();
    }

    stop() {
        this.subscriptions.dispose();
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    startPolling() {
        // Poll linter status every 5 seconds if no real API is available yet.
        // Ideally we would consume 'linter-indie' or similar service.
        // For now we check if there are any active linter messages in the workspace.
        this.interval = setInterval(() => {
            this.checkDiagnostics();
        }, 5000);
    }

    checkDiagnostics() {
        // Stub implementation: checking text editor markers would be complex without direct linter access.
        // We will assume 'idle' unless we get a signal from a real linter.
        // If we had access to `linter` service, we would subscribe to it.

        // For demonstration/Phase 1: we can simulate occasional activity or just keep it simple.
        // Let's implement a safe no-op that degrades gracefully.
        // If we find a way to hook into linter, we add it here.
    }
}

module.exports = DiagnosticsSource;
