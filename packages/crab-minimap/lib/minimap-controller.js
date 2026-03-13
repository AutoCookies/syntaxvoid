const { CompositeDisposable } = require('atom');

module.exports = class MinimapaController {
  constructor(editor, editorElement) {
    this.editor = editor;
    this.editorElement = editorElement;
    this.subscriptions = new CompositeDisposable();

    this.container = document.createElement('div');
    this.container.classList.add('crab-minimap');

    this.viewport = document.createElement('div');
    this.viewport.classList.add('crab-minimap-viewport');
    this.container.appendChild(this.viewport);

    // Ensure editor is relatively positioned so our absolute minimap can anchor.
    this.editorElement.style.position = this.editorElement.style.position || 'relative';
    this.editorElement.appendChild(this.container);

    this.subscriptions.add(
      this.editor.onDidDestroy(() => this.dispose())
    );

    this.subscriptions.add(
      this.editorElement.onDidChangeScrollTop
        ? this.editorElement.onDidChangeScrollTop(() => this.update())
        : null
    );

    this.subscriptions.add(
      this.editor.onDidChange(() => this.update())
    );

    this.container.addEventListener('click', event => {
      this.handleClick(event);
    });

    // Initial paint
    this.update();
  }

  handleClick(event) {
    const rect = this.container.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const lineCount = Math.max(1, this.editor.getLineCount());
    const targetRow = Math.round((lineCount - 1) * ratio);
    this.editor.scrollToBufferPosition([targetRow, 0], { center: true });
  }

  update() {
    if (!this.editor || !this.editorElement || !this.viewport) return;

    const lineCount = Math.max(1, this.editor.getLineCount());

    const firstVisibleRow = this.editorElement.getFirstVisibleScreenRow
      ? this.editorElement.getFirstVisibleScreenRow()
      : 0;
    const lastVisibleRow = this.editorElement.getLastVisibleScreenRow
      ? this.editorElement.getLastVisibleScreenRow()
      : firstVisibleRow + 1;

    const visibleCount = Math.max(1, lastVisibleRow - firstVisibleRow);

    const topRatio = firstVisibleRow / lineCount;
    const heightRatio = visibleCount / lineCount;

    this.viewport.style.top = `${topRatio * 100}%`;
    this.viewport.style.height = `${heightRatio * 100}%`;
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose();
      this.subscriptions = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.editor = null;
    this.editorElement = null;
    this.container = null;
    this.viewport = null;
  }
};

