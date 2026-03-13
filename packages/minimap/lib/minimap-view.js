'use strict';

const MinimapRenderer = require('./minimap-renderer');

module.exports = class MinimapView {
  constructor() {
    // ── outer container ──────────────────────────────────────────────────────
    // Sits as a flex sibling next to the editor scroll-view.
    // overflow:hidden clips the canvas when the file is taller than the editor.
    this.element = document.createElement('div');
    this.element.classList.add('minimap-container');

    // ── scroll area inside the container ────────────────────────────────────
    // We translate this div up/down to "scroll" the canvas.
    this.scroller = document.createElement('div');
    this.scroller.classList.add('minimap-scroller');
    this.element.appendChild(this.scroller);

    // ── canvas ───────────────────────────────────────────────────────────────
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('minimap-canvas');
    this.scroller.appendChild(this.canvas);

    // ── viewport highlight ───────────────────────────────────────────────────
    // Absolute-positioned inside the *container* (not scroller), so it always
    // stays in screen-space and doesn't scroll with the canvas.
    this.viewport = document.createElement('div');
    this.viewport.classList.add('minimap-viewport');
    this.element.appendChild(this.viewport);

    this.renderer = new MinimapRenderer(this.canvas);
  }

  /**
   * @param {TextEditor} editor
   * @param {object}     opts          { width, charHeight, charWidth, viewportOpacity }
   * @param {number}     firstRow      first visible screen row
   * @param {number}     lastRow       last visible screen row
   * @param {string}     bgColor       background hex/rgb string
   */
  render(editor, opts, firstRow, lastRow, bgColor) {
    const { width, charHeight, charWidth, viewportOpacity } = opts;

    const lineCount      = Math.max(1, editor.getLineCount());
    const canvasPixelH   = lineCount * charHeight;    // full-file height in px
    const containerH     = this.element.offsetHeight; // visible area height
    const visibleLines   = Math.max(1, lastRow - firstRow);

    // ── resize canvas pixel buffer (1:1 with CSS, no DPR scaling needed here)
    if (this.canvas.width  !== width)        this.canvas.width  = width;
    if (this.canvas.height !== canvasPixelH) this.canvas.height = canvasPixelH;

    this.canvas.style.width  = width + 'px';
    this.canvas.style.height = canvasPixelH + 'px';
    this.element.style.width = width + 'px';

    // ── draw ─────────────────────────────────────────────────────────────────
    this.renderer.render(editor, { charHeight, charWidth }, bgColor);

    // ── scroll the canvas so the current viewport is visible ─────────────────
    // We want the center of [firstRow..lastRow] in the canvas to line up with
    // the center of the container.
    if (canvasPixelH > containerH && containerH > 0) {
      const viewCenterPx   = (firstRow + visibleLines / 2) * charHeight;
      const idealScrollTop = viewCenterPx - containerH / 2;
      const maxScroll      = canvasPixelH - containerH;
      const scrollTop      = Math.max(0, Math.min(idealScrollTop, maxScroll));
      this.scroller.style.transform = `translateY(${-scrollTop}px)`;
      this._scrollOffset = scrollTop;
    } else {
      this.scroller.style.transform = '';
      this._scrollOffset = 0;
    }

    // ── viewport highlight position (in container / screen space) ────────────
    // Map row numbers → pixel position in the *visible* canvas strip.
    const topInCanvas    = firstRow * charHeight;
    const heightInCanvas = visibleLines * charHeight;
    const topOnScreen    = topInCanvas - (this._scrollOffset || 0);

    this.viewport.style.top    = Math.max(0, topOnScreen) + 'px';
    this.viewport.style.height = Math.max(2, heightInCanvas) + 'px';
    this.viewport.style.opacity = String(viewportOpacity);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element  = null;
    this.scroller = null;
    this.canvas   = null;
    this.viewport = null;
    this.renderer = null;
  }
};
