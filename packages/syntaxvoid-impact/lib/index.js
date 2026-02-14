'use strict';

const { CompositeDisposable } = require('atom');
const ImpactService = require('./impact-service');
const ImpactPanel = require('./ui/impact-panel');

const IMPACT_URI = 'atom://syntaxvoid-impact';

module.exports = {
    subscriptions: null,
    impactService: null,
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
                    const filePath = editor ? editor.getPath() : null;
                    if (filePath) {
                        this.impactPanel.updateForFile(filePath);
                    }
                }
            })
        );

        // Build graph proactively
        this._buildGraphIfNeeded();
    },

    deactivate() {
        this.subscriptions.dispose();
        if (this.impactPanel) this.impactPanel.destroy();
        if (this.impactService) this.impactService.destroy();
    },

    // Optional: still accept graph from project-map if available
    consumeGraphService(service) {
        console.log('[syntaxvoid-impact] consumeGraphService called');
        const graph = service.getGraph();
        if (graph) {
            console.log('[syntaxvoid-impact] Using external graph');
            this.impactService.setGraph(graph);
            if (this.impactPanel) this.impactPanel.refreshState();
        }

        this.subscriptions.add(
            service.onDidUpdateGraph((graph) => {
                if (graph) {
                    this.impactService.setGraph(graph);
                    if (this.impactPanel) this.impactPanel.refreshState();
                }
            })
        );
    },

    toggle() {
        atom.workspace.toggle(IMPACT_URI);
    },

    async showForActiveFile() {
        // Ensure graph is built
        await this._buildGraphIfNeeded();

        await atom.workspace.open(IMPACT_URI, { searchAllPanes: true });

        const editor = atom.workspace.getActiveTextEditor();
        if (editor && this.impactPanel) {
            const filePath = editor.getPath();
            console.log('[syntaxvoid-impact] showForActiveFile:', filePath);
            this.impactPanel.updateForFile(filePath);
        }
    },

    async _buildGraphIfNeeded() {
        if (this.impactService.getGraph() || this.impactService.isBuilding()) return;

        const projectPaths = atom.project.getPaths();
        if (projectPaths.length > 0) {
            console.log('[syntaxvoid-impact] Building own graph for:', projectPaths[0]);
            await this.impactService.buildGraph(projectPaths[0]);
            if (this.impactPanel) this.impactPanel.refreshState();
        }
    },

    _createPanel() {
        this.impactPanel = new ImpactPanel({
            impactService: this.impactService
        });

        // Initialize with active file if available
        const editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            this.impactPanel.updateForFile(editor.getPath());
        }

        return this.impactPanel;
    }
};
