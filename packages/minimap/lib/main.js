'use strict';

const { CompositeDisposable } = require('atom');
const MinimapController = require('./minimap-controller');

module.exports = {
  subscriptions: null,
  controllers:   new Map(),

  activate() {
    this.subscriptions = new CompositeDisposable();
    this.controllers   = new Map();

    // Attach minimap to every open editor, and any that open later.
    this.subscriptions.add(
      atom.workspace.observeTextEditors((editor) => {
        this._attachToEditor(editor);
      })
    );

    // Clean up when an editor is destroyed.
    this.subscriptions.add(
      atom.workspace.onDidDestroyPaneItem(({ item }) => {
        if (this.controllers.has(item)) {
          this.controllers.get(item).destroy();
          this.controllers.delete(item);
        }
      })
    );

    // Re-render all minimaps when config changes.
    this.subscriptions.add(
      atom.config.onDidChange('minimap', () => {
        this.controllers.forEach((ctrl) => ctrl._scheduleRender());
      })
    );
  },

  deactivate() {
    this.controllers.forEach((ctrl) => ctrl.destroy());
    this.controllers.clear();
    if (this.subscriptions) this.subscriptions.dispose();
  },

  // ─── private ───────────────────────────────────────────────────────────────

  _attachToEditor(editor) {
    if (this.controllers.has(editor)) return;
    const ctrl = new MinimapController(editor, () => this._getOpts());
    this.controllers.set(editor, ctrl);
  },

  _getOpts() {
    return {
      width:           atom.config.get('minimap.width')          || 100,
      charHeight:      atom.config.get('minimap.charHeight')     || 2,
      charWidth:       atom.config.get('minimap.charWidth')      || 1,
      viewportOpacity: atom.config.get('minimap.viewportOpacity') !== undefined
                         ? atom.config.get('minimap.viewportOpacity')
                         : 0.25,
    };
  },
};
