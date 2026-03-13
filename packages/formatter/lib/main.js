'use strict';

const { CompositeDisposable } = require('atom');
const { format }              = require('./formatter');

module.exports = {
  subscriptions: null,
  statusBarTile: null,
  statusEl:      null,
  _hideTimeout:  null,

  // ─── lifecycle ─────────────────────────────────────────────────────────────

  activate() {
    this.subscriptions = new CompositeDisposable();

    // Commands
    this.subscriptions.add(
      atom.commands.add('atom-text-editor', {
        'formatter:format-document':  () => this._formatDocument(),
        'formatter:format-selection': () => this._formatSelection(),
      })
    );

    // Format-on-save
    this.subscriptions.add(
      atom.workspace.observeTextEditors((editor) => {
        this.subscriptions.add(
          editor.onDidSave(() => {
            if (atom.config.get('formatter.formatOnSave')) {
              this._formatEditor(editor, false);
            }
          })
        );
      })
    );
  },

  deactivate() {
    if (this.subscriptions) this.subscriptions.dispose();
    if (this.statusBarTile) this.statusBarTile.destroy();
    clearTimeout(this._hideTimeout);
  },

  // ─── status bar ────────────────────────────────────────────────────────────

  consumeStatusBar(statusBar) {
    this.statusEl = document.createElement('span');
    this.statusEl.classList.add('formatter-status', 'inline-block');
    this.statusEl.style.display = 'none';

    this.statusBarTile = statusBar.addRightTile({
      item: this.statusEl,
      priority: 10,
    });
  },

  _showStatus(msg, isError = false) {
    if (!this.statusEl) return;
    clearTimeout(this._hideTimeout);
    this.statusEl.textContent = msg;
    this.statusEl.style.display   = '';
    this.statusEl.style.color     = isError ? '#e06c75' : '#98c379';
    this._hideTimeout = setTimeout(() => {
      if (this.statusEl) this.statusEl.style.display = 'none';
    }, 4000);
  },

  // ─── commands ──────────────────────────────────────────────────────────────

  _formatDocument() {
    const editor = atom.workspace.getActiveTextEditor();
    if (editor) this._formatEditor(editor, true);
  },

  _formatSelection() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;
    const selection = editor.getSelectedText();
    if (!selection || !selection.trim()) {
      // Fall back to full document if nothing is selected
      this._formatEditor(editor, true);
      return;
    }
    this._runFormat(editor, selection, (formatted) => {
      editor.insertText(formatted, { select: false });
    });
  },

  async _formatEditor(editor, notify) {
    const text = editor.getText();
    this._runFormat(editor, text, (formatted) => {
      if (formatted === text) {
        if (notify) this._showStatus('Formatter: already clean ✓');
        return;
      }
      // Preserve cursor and scroll position
      const pos    = editor.getCursorBufferPosition();
      const scroll = atom.views.getView(editor).getScrollTop
        ? atom.views.getView(editor).getScrollTop()
        : 0;

      editor.setText(formatted);
      editor.setCursorBufferPosition(pos, { autoscroll: false });

      const editorEl = atom.views.getView(editor);
      if (editorEl.setScrollTop) editorEl.setScrollTop(scroll);

      if (notify) this._showStatus('Formatter: formatted ✓');
    });
  },

  async _runFormat(editor, text, onSuccess) {
    this._showStatus('Formatter: running…');
    try {
      const result = await format(editor, text);
      onSuccess(result);
    } catch (err) {
      const detail = err.stderr
        ? err.message + '\n\n' + err.stderr.slice(0, 800)
        : err.message;

      this._showStatus('Formatter: error ✗', true);

      atom.notifications.addError('Formatter failed', {
        detail,
        dismissable: true,
      });
    }
  },
};
