"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutManager = void 0;
class LayoutManager {
    constructor() { }
    /**
     * Enforce the structure-first layout.
     * 1. Hide Tree View
     * 2. Open Project Map (Left)
     * 3. Open Risk Overlay (Right, split top)
     */
    async enforceLayout() {
        console.log('SyntaxVoid: Enforcing Structure-First Layout');
        // 1. Hide Tree View (if active)
        this.hideTreeView();
        // 2. Open Project Map
        await this.ensureProjectMap();
        // 3. Open Risk Overlay
        await this.ensureRiskOverlay();
    }
    /**
     * Revert changes?
     * We shouldn't necessarily close Project Map, but we should unhide Tree View if it was hidden?
     * For now, just a logging stub or maybe showing tree view.
     */
    async revertLayout() {
        console.log('SyntaxVoid: Reverting Layout');
        // Optionally show tree view again?
        // atom.commands.dispatch(atom.views.getView(atom.workspace), 'tree-view:show');
    }
    hideTreeView(attempt = 1) {
        // Retry up to 5 times (2.5s total) to catch race conditions
        const MAX_ATTEMPTS = 5;
        const RETRY_DELAY = 500;
        let found = false;
        // Strategy 1: Check Legacy Panels
        const panels = atom.workspace.getLeftPanels();
        const treeViewPanel = panels.find((p) => {
            const item = p.getItem();
            return this.isTreeViewItem(item);
        });
        if (treeViewPanel) {
            console.log('SyntaxVoid: Hiding Tree View (Panel)');
            treeViewPanel.hide();
            found = true;
        }
        // Strategy 2: Check Dock Items (Modern)
        const leftDock = atom.workspace.getLeftDock();
        if (leftDock) {
            const panes = leftDock.getPanes();
            panes.forEach((pane) => {
                const items = pane.getItems();
                items.forEach((item) => {
                    // Debug logging
                    const name = item.constructor ? item.constructor.name : 'Unknown';
                    const classes = item.element && item.element.classList ? Array.from(item.element.classList).join(' ') : 'No Element';
                    console.log(`SyntaxVoid: Checking item: ${name}, Classes: ${classes}`);
                    if (this.isTreeViewItem(item)) {
                        console.log('SyntaxVoid: Closing Tree View (Dock Item)');
                        pane.destroyItem(item);
                        found = true;
                    }
                });
            });
        }
        if (!found) {
            if (attempt <= 20) { // 10 seconds
                // Silent retry after first few logs to avoid spam
                if (attempt < 3)
                    console.log(`SyntaxVoid: Tree View not found (attempt ${attempt}). Retrying...`);
                setTimeout(() => this.hideTreeView(attempt + 1), RETRY_DELAY);
            }
            else {
                console.warn('SyntaxVoid: Tree View could not be found to hide after 10s.');
            }
        }
    }
    isTreeViewItem(item) {
        if (!item)
            return false;
        // Robust check: Look for class 'tree-view' on the element
        if (item.element && item.element.classList) {
            return item.element.classList.contains('tree-view');
        }
        if (item.classList) {
            return item.classList.contains('tree-view');
        }
        return item.constructor && item.constructor.name === 'TreeView';
    }
    async ensureProjectMap() {
        // Check if already open
        const exists = atom.workspace.getPaneItems().some((item) => item.getURI && item.getURI() === 'syntaxvoid://project-map');
        if (!exists) {
            await atom.workspace.open('syntaxvoid://project-map', {
                location: 'left',
                activatePane: false, // Don't steal focus
                searchAllPanes: true
            });
        }
    }
    async ensureRiskOverlay() {
        const exists = atom.workspace.getPaneItems().some((item) => item.getURI && item.getURI() === 'syntaxvoid://risk-overlay');
        if (!exists) {
            // Try impact, or risk overlay
            try {
                await atom.workspace.open('syntaxvoid://risk-overlay', {
                    location: 'right',
                    activatePane: false,
                    searchAllPanes: true
                });
            }
            catch (e) {
                console.warn("SyntaxVoid: Could not open risk overlay", e);
            }
        }
    }
}
exports.LayoutManager = LayoutManager;
//# sourceMappingURL=layoutManager.js.map