'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Draws curved dependency links between folder rects on a canvas.
 * Highlights circular dependencies with red glow.
 * Polished: Better curves, opacity management, and direction indicators.
 */
class DependencyOverlay {
    /**
     * @param opts
     */
    constructor(opts = {}) {
        this.showLinks = opts.showLinks !== false;
        this.circularOnly = opts.circularOnly || false;
    }
    /**
     * Draw all dependency links on the canvas.
     * @param ctx
     * @param edges - [{source, target, count}]
     * @param circularEdges - "source|target" keys
     * @param rectMap - folderPath -> rect
     * @param hoveredRect - Currently hovered rect for highlighting
     */
    draw(ctx, edges, circularEdges, rectMap, hoveredRect = null) {
        if (!this.showLinks || !edges || edges.length === 0)
            return;
        ctx.save();
        // Base opacity: vary based on whether we are focusing on a node
        const isFocusMode = hoveredRect !== null;
        const baseAlpha = isFocusMode ? 0.05 : 0.15;
        const circularAlpha = isFocusMode ? 0.2 : 0.6;
        // Group edges by relevant/irrelevant if focused
        // "Relevant" means connected to the hovered rect
        for (const edge of edges) {
            const sourceRect = rectMap.get(edge.source);
            const targetRect = rectMap.get(edge.target);
            if (!sourceRect || !targetRect)
                continue;
            const isCircular = circularEdges.has(`${edge.source}|${edge.target}`);
            if (this.circularOnly && !isCircular)
                continue;
            // Determine relevance
            let isRelevant = true;
            if (isFocusMode) {
                isRelevant = (sourceRect === hoveredRect || targetRect === hoveredRect);
            }
            // Skip irrelevant edges in focus mode to reduce noise, or draw very faintly
            if (isFocusMode && !isRelevant && !isCircular) {
                // simple optimization: skip non-circular irrelevant edges in focus mode
                // or draw extremely faint
                if (!this.circularOnly) {
                    ctx.globalAlpha = 0.02;
                }
                else {
                    continue;
                }
            }
            else {
                ctx.globalAlpha = isCircular ? circularAlpha : (isRelevant ? 0.6 : baseAlpha);
            }
            // Highlight color
            if (isRelevant && isFocusMode) {
                ctx.globalAlpha = 0.8;
                ctx.lineWidth = 2;
            }
            else {
                ctx.lineWidth = Math.min(3, Math.max(1, Math.log((edge.count || edge.weight || 0) + 1))); // Thickness based on weight
            }
            const sx = sourceRect.x + sourceRect.w / 2;
            const sy = sourceRect.y + sourceRect.h / 2;
            const tx = targetRect.x + targetRect.w / 2;
            const ty = targetRect.y + targetRect.h / 2;
            // Control point for quadratic bezier — offset perpendicular to the line
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;
            const dx = tx - sx;
            const dy = ty - sy;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 5)
                continue; // Don't draw tiny links
            // Perpendicular offset (curved amount scales with distance)
            const curveAmount = Math.min(len * 0.25, 60);
            // Directionality: Curve consistently (e.g. always "right" relative to direction) 
            // to avoid visual clutter of overlapping bi-directionals?
            // Simple approach: cross product Z component sign to determine side? 
            // Here just use fixed perp
            const cx = mx + (-dy / len) * curveAmount;
            const cy = my + (dx / len) * curveAmount;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cx, cy, tx, ty);
            if (isCircular) {
                // Red glow for circular deps
                ctx.strokeStyle = '#e74c3c';
                // Only glow if relevant or not in focus mode
                if (!isFocusMode || isRelevant) {
                    ctx.shadowColor = '#e74c3c';
                    ctx.shadowBlur = 6;
                }
                else {
                    ctx.shadowBlur = 0;
                }
            }
            else {
                // Color gradient based on theme? Hardcoded for now
                // Blueish for incoming, Greenish for outgoing? Hard to tell on single curve
                ctx.strokeStyle = (isRelevant && isFocusMode && sourceRect === hoveredRect)
                    ? '#e67e22' // Outgoing highlight
                    : ((isRelevant && isFocusMode && targetRect === hoveredRect)
                        ? '#2ecc71' // Incoming highlight
                        : '#95a5a6'); // Default
                ctx.shadowBlur = 0;
            }
            ctx.stroke();
            // Arrow head at target
            // Draw only if relevant or high contrast
            if (ctx.globalAlpha > 0.1) {
                this._drawArrow(ctx, cx, cy, tx, ty, isCircular ? '#e74c3c' : ctx.strokeStyle);
            }
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
    _drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
}
exports.default = DependencyOverlay;
