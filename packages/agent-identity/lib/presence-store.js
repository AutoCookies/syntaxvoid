'use strict';

const { Emitter } = require('atom');

class PresenceStore {
    constructor() {
        this.emitter = new Emitter();
        this.state = {
            status: 'idle', // 'idle'|'planning'|'executing'|'patching'|'reviewing'|'error'|'offline'
            intensity: 0,
            signals: {
                diagnostics: { errors: 0, warnings: 0 },
                fileImpact: { sizeKb: 0 }
            }
        };
    }

    serialize() {
        return this.state;
    }

    destroy() {
        this.emitter.dispose();
    }

    getSnapshot() {
        return Object.freeze({ ...this.state });
    }

    update(partialState) {
        const oldState = this.state;
        this.state = {
            ...oldState,
            ...partialState,
            signals: {
                ...oldState.signals,
                ...(partialState.signals || {})
            }
        };

        this.emitter.emit('did-change', this.getSnapshot());
    }

    onDidChange(callback) {
        return this.emitter.on('did-change', callback);
    }
}

module.exports = new PresenceStore();
