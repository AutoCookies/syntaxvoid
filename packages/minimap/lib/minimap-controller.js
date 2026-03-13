'use strict';

const { CompositeDisposable } = require('atom');
const MinimapView = require('./minimap-view');

module.exports = class MinimapController {
  constructor(editor, configProvider) {
    this.editor         = editor;
    this.configProvider = configProvider;
    this.subscriptions  = new CompositeDisposable();
    this.view           = new MinimapView();
    this._mounted       = false;
    this._rafId         = null;

    this._mount();
    this._setupListeners();
    this._scheduleRender();
  }

  // ─── private ───────────────────────────────────────────────────────────────

  _mount() {
    const editorEl = atom.views.getView(this.editor);
    if (!editorEl) return;

    // The host is the custom element itself (atom-text-editor).
    // Its internal layout is a flex row: gutter | scroll-view | ... .
    // We append our minimap as an extra flex child on the right.
    const host = editorEl;
    host.style.display      = 'flex';
    host.style.flexDirection = 'row';
    host.style.overflow     = 'hidden';

    // Make the existing scroll-view take all remaining space
    const scrollView = host.querySelector('.scroll-view');
    if (scrollView) scrollView.style.flex = '1 1 0%';

    host.appendChild(this.view.element);
    this._hostEl = host;
    this._mounted = true;
  }

  _setupListeners() {
    // Text changes → full re-render
    this.subscriptions.add(
      this.editor.onDidChange(() => this._scheduleRender())
    );

    // Scroll → update viewport highlight + canvas offset
    const editorEl = atom.views.getView(this.editor);
    if (editorEl && typeof editorEl.onDidChangeScrollTop === 'function') {
      this.subscriptions.add(
        editorEl.onDidChangeScrollTop(() => this._scheduleRender())
      );
    }

    // Click → jump editor to that line
    this.view.element.addEventListener('mousedown', (e) => this._onClick(e));
  }

  _scheduleRender() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._doRender();
    });
  }

  _doRender() {
    if (!this._mounted || !this.view || !this.view.element) return;

    const opts = this.configProvider();

    const firstRow = this.editor.getFirstVisibleScreenRow
      ? this.editor.getFirstVisibleScreenRow()
      : 0;
    const lastRow  = this.editor.getLastVisibleScreenRow
      ? this.editor.getLastVisibleScreenRow()
      : firstRow + 40;

    const bgColor = this._readBg();

    try {
      this.view.render(this.editor, opts, firstRow, lastRow, bgColor);
    } catch (err) {
      // Never crash the editor.
      console.warn('[minimap] render error:', err);
    }
  }

  _readBg() {
    // Read background color from the editor element's own computed style,
    // falling back to the document root, then to a safe dark default.
    const editorEl = atom.views.getView(this.editor);
    if (editorEl) {
      const s = getComputedStyle(editorEl);
      const bg = s.backgroundColor || s.background;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
    }
    const root = getComputedStyle(document.documentElement);
    return root.getPropertyValue('--syntax-background-color').trim() || '#1e1e1e';
  }

  _onClick(e) {
    const rect  = this.view.element.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    // Account for the canvas scroll offset stored in the view
    const scrollOffset = this.view._scrollOffset || 0;
    const opts  = this.configProvider();
    const canvasY = clickY + scrollOffset;
    const row   = Math.floor(canvasY / opts.charHeight);
    const clampedRow = Math.max(0, Math.min(row, this.editor.getLineCount() - 1));
    this.editor.setCursorBufferPosition([clampedRow, 0]);
    this.editor.scrollToBufferPosition([clampedRow, 0], { center: true });
  }

  // ─── public ────────────────────────────────────────────────────────────────

  destroy() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.subscriptions.dispose();
    if (this.view) this.view.destroy();
    this.view = null;

    if (this._hostEl) {
      this._hostEl.style.display      = '';
      this._hostEl.style.flexDirection = '';
      this._hostEl.style.overflow     = '';
      const sv = this._hostEl.querySelector('.scroll-view');
      if (sv) sv.style.flex = '';
    }
  }
};
