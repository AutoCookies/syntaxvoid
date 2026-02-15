'use strict';

const { CompositeDisposable } = require('atom');
const PresenceStore = require('../presence-store');

class WorkspaceSource {
    constructor() {
        this.subscriptions = new CompositeDisposable();
    }

    start() {
        this.subscriptions.add(
            atom.workspace.onDidChangeActivePaneItem(this.handleActivePaneItemChange.bind(this))
        );
        this.subscriptions.add(
            atom.workspace.observeTextEditors(editor => {
                this.subscriptions.add(editor.onDidSave(this.handleSave.bind(this)));
            })
        );
        this.handleActivePaneItemChange(atom.workspace.getActivePaneItem());
    }

    stop() {
        this.subscriptions.dispose();
    }

    handleActivePaneItemChange(item) {
        if (!item) {
            PresenceStore.update({ status: 'idle' });
            return;
        }

        // Heuristic: If it's a TextEditor, we are 'reviewing' code.
        // If it's something else (like Settings), we might be 'planning' or 'idle'.
        if (atom.workspace.isTextEditor(item)) {
            const text = item.getText();
            const sizeKb = (text.length / 1024).toFixed(2);

            PresenceStore.update({
                status: 'reviewing',
                signals: {
                    fileImpact: { sizeKb }
                }
            });
        } else {
            PresenceStore.update({ status: 'idle' });
        }
    }

    handleSave(event) {
        // When saving, we might briefy switch to 'patching' or just refresh 'reviewing'
        PresenceStore.update({ status: 'patching', intensity: 0.5 });
        setTimeout(() => {
            this.handleActivePaneItemChange(atom.workspace.getActivePaneItem());
        }, 1000);
    }
}

module.exports = WorkspaceSource;
