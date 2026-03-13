'use strict';

module.exports = class MinimapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  /**
   * Draw all lines of the editor onto the canvas.
   * canvas.width / canvas.height must already be set by the caller.
   */
  render(editor, opts, bgColor) {
    const { charHeight, charWidth } = opts;
    const ctx   = this.ctx;
    const W     = this.canvas.width;
    const H     = this.canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    const lines = editor.getBuffer().getLines();
    for (let row = 0; row < lines.length; row++) {
      const y    = row * charHeight;
      const line = lines[row];
      if (!line) continue;

      let col = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '\t') { col += 2; continue; }
        if (ch === ' ')  { col++;    continue; }

        // Stop drawing when we go past the canvas width
        if (col * charWidth >= W) break;

        ctx.fillStyle = this._color(ch, line, i);
        ctx.fillRect(col * charWidth, y, charWidth, charHeight);
        col++;
      }
    }
  }

  // ─── heuristic token colorizer ──────────────────────────────────────────────

  _color(ch, line, i) {
    const code = ch.charCodeAt(0);

    // Inside a string literal (simple single-pass quote heuristic)
    const before    = line.slice(0, i);
    const dqOpen    = (before.match(/(?<!\\)"/g) || []).length % 2 === 1;
    const sqOpen    = (before.match(/(?<!\\)'/g) || []).length % 2 === 1;
    if (dqOpen || sqOpen) return '#D4A44C';  // amber string

    // Comment starters
    if (ch === '/' && (line[i + 1] === '/' || line[i + 1] === '*')) return '#6B7280';

    // Numbers
    if (code >= 48 && code <= 57) return '#F97316';

    // Operators & punctuation → desaturated red/terracotta
    if ('{}[]()=<>!&|^~;:,'.includes(ch)) return '#CD5C4A';

    // Uppercase → likely a type or constant → green
    if (code >= 65 && code <= 90) return '#6FAF5A';

    // Lowercase → identifier text → near-white
    if (code >= 97 && code <= 122) return '#D4C8C2';

    // Other printable
    return '#9E8E88';
  }
};
