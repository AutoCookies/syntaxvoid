'use strict';

const { CompositeDisposable, Disposable } = require('atom');
const ImpactService = require('./impact-service');
const ImpactPanel = require('./ui/impact-panel');

const IMPACT_URI = 'atom://syntaxvoid-impact';

module.exports = {
    subscriptions: null,
    impactService: null,
    projectMapService: null,
    impactPanel: null,

    activate(state) {
        this.subscriptions = new CompositeDisposable();
        this.impactService = new ImpactService();

        // Register Opener
        this.subscriptions.add(
            atom.workspace.addOpener(uri => {
                if (uri === IMPACT_URI) {
                    return this._createPanel();
                }
            })
        );

        // Register Commands
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'syntaxvoid-impact:toggle': () => this.toggle(),
                'syntaxvoid-impact:show-for-active-file': () => this.showForActiveFile()
            })
        );

        // Watch active editor to update panel if visible
        this.subscriptions.add(
            atom.workspace.onDidChangeActiveTextEditor(editor => {
                if (this.impactPanel && this.impactPanel.element.offsetParent !== null) {
                    // Panel is visible
                    const path = editor ? editor.getPath() : null;
                    if (path) {
                        this.impactPanel.updateForFile(path);
                    }
                }
            })
        );
    },

    deactivate() {
        this.subscriptions.dispose();
        if (this.impactPanel) this.impactPanel.destroy();
        if (this.impactService) this.impactService.destroy();
    },

    consumeGraphService(service) {
        this.projectMapService = service;

        // Initial graph fetch
        const graph = service.getGraph();
        if (graph) {
            this.impactService.setGraph(graph);
        }

        // Listen for updates
        this.subscriptions.add(
            service.onDidUpdateGraph((graph) => {
                this.impactService.setGraph(graph);
            })
        );

        // Update panel if it exists
        if (this.impactPanel) {
            this.impactPanel.update({
                impactService: this.impactService,
                projectMapService: this.projectMapService
            });
        }
    },

    toggle() {
        atom.workspace.toggle(IMPACT_URI);
    },

    async showForActiveFile() {
        await atom.workspace.open(IMPACT_URI, { searchAllPanes: true });
        // After opening, set the file
        const editor = atom.workspace.getActiveTextEditor();
        if (editor && this.impactPanel) {
            this.impactPanel.updateForFile(editor.getPath());
        }
    },

    _createPanel() {
        this.impactPanel = new ImpactPanel({
            impactService: this.impactService,
            projectMapService: this.projectMapService
        });

        // Initialize with active file if available
        const editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            this.impactPanel.updateForFile(editor.getPath());
        }

        return this.impactPanel;
    }
};
