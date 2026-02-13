'use strict';

const settings = require('../../../../core/platform/settings');

/**
 * Renders the file dependency graph using a Force-Directed Layout.
 * - Nodes: Circles
 * - Edges: Lines/Curves
 * - Interaction: Drag, Zoom, Pan (handled by View)
 */
class FileGraphRenderer {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.simulation = null;
        this.width = 0;
        this.height = 0;
        this.transform = { k: 1, x: 0, y: 0 };
    }

    layout(graph, width, height, opts = {}) {
        this.width = width;
        this.height = height;
        this.nodes = graph.nodes;
        this.edges = graph.edges;

        // Stratified Layout
        const sorted = [...this.nodes].sort((a, b) => {
            const rankA = a.inDegree - a.outDegree;
            const rankB = b.inDegree - b.outDegree;
            return rankA - rankB;
        });

        const nodeCount = sorted.length;
        const cols = Math.ceil(Math.sqrt(nodeCount * (width / height)));
        const rows = Math.ceil(nodeCount / cols);

        const cellW = width / cols;
        const cellH = height / rows;

        // Assign initial positions
        sorted.forEach((node, i) => {
            if (node.x === undefined) {
                const c = i % cols;
                const r = Math.floor(i / cols);
                node.x = (c * cellW) + (cellW / 2) + (Math.random() * 10 - 5);
                node.y = (r * cellH) + (cellH / 2) + (Math.random() * 10 - 5);
            }
            node.r = Math.min(10, 3 + (node.inDegree + node.outDegree) * 0.5);
        });

        // Iterative Relaxation
        for (let i = 0; i < 50; i++) {
            this._tick(width, height);
        }

        return this.nodes;
    }

    _tick(w, h) {
        // Repulsion
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 0 && distSq < 10000) {
                    const f = 100 / distSq;
                    a.vx = (a.vx || 0) + dx * f;
                    a.vy = (a.vy || 0) + dy * f;
                    b.vx = (b.vx || 0) - dx * f;
                    b.vy = (b.vy || 0) - dy * f;
                }
            }
        }

        // Spring (Edges)
        for (const edge of this.edges) {
            const s = this.getNode(edge.from);
            const t = this.getNode(edge.to);
            if (!s || !t) continue;

            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetDist = 50;

            if (dist > 0) {
                const force = (dist - targetDist) * 0.05;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                s.vx = (s.vx || 0) + fx;
                s.vy = (s.vy || 0) + fy;
                t.vx = (t.vx || 0) - fx;
                t.vy = (t.vy || 0) - fy;
            }
        }

        // Center Gravity & Bounds
        const cx = w / 2;
        const cy = h / 2;
        for (const n of this.nodes) {
            n.vx = (n.vx || 0) + (cx - n.x) * 0.01;
            n.vy = (n.vy || 0) + (cy - n.y) * 0.01;

            n.vx *= 0.8;
            n.vy *= 0.8;

            n.x += n.vx;
            n.y += n.vy;

            n.x = Math.max(10, Math.min(w - 10, n.x));
            n.y = Math.max(10, Math.min(h - 10, n.y));
        }
    }

    getNode(path) {
        return this.nodes.find(n => n.path === path);
    }

    hitTest(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = x - n.x;
            const dy = y - n.y;
            if (dx * dx + dy * dy <= n.r * n.r + 25) {
                return n;
            }
        }
        return null;
    }

    draw(ctx, nodes, edges, hoveredNode, opts = {}) {
        const { showLinks = true, circularOnly = false, filterText = '' } = opts;

        // 1. Identify "Highlighted" set based on Filter
        // If filterText is present, find matching nodes AND their neighbors
        let matchedNodes = null;
        let relatedNodes = null; // direct neighbors of matches

        if (filterText && filterText.trim().length > 0) {
            const lowerFilter = filterText.toLowerCase();
            matchedNodes = new Set();
            relatedNodes = new Set();

            for (const n of nodes) {
                if (n.name.toLowerCase().includes(lowerFilter) || n.relPath.toLowerCase().includes(lowerFilter)) {
                    matchedNodes.add(n);
                }
            }

            // Should we show neighbors of matches? User said "and It related node"
            // Let's add direct neighbors to relatedNodes
            if (matchedNodes.size > 0) {
                for (const edge of edges) {
                    const s = this.getNode(edge.from);
                    const t = this.getNode(edge.to);
                    if (!s || !t) continue;

                    if (matchedNodes.has(s)) relatedNodes.add(t);
                    if (matchedNodes.has(t)) relatedNodes.add(s);
                }
            }
        }

        const isFiltered = matchedNodes !== null && matchedNodes.size > 0;

        // Helper to check visibility/dimming
        const isNodeVisible = (n) => {
            if (!isFiltered) return true; // everything visible if no filter
            return matchedNodes.has(n) || relatedNodes.has(n);
        };

        const isEdgeVisible = (s, t) => {
            if (!isFiltered) return true;
            // Show edge if both are "visible" (match or neighbor)
            // AND at least one is a direct match (connections between two neighbors of a match might be noise)
            // Let's be generous: show if both are visible
            return isNodeVisible(s) && isNodeVisible(t);
        };


        // Draw Edges
        ctx.lineWidth = 1;

        if (showLinks) {
            for (const edge of edges) {
                if (circularOnly && !edge.circular) continue;

                const s = this.getNode(edge.from);
                const t = this.getNode(edge.to);
                if (!s || !t) continue;

                // Filter Visibility
                if (isFiltered && !isEdgeVisible(s, t)) {
                    // If heavily filtered, maybe don't draw at all? 
                    // Or draw extremely faint
                    ctx.globalAlpha = 0.02;
                } else {
                    ctx.globalAlpha = 0.2;
                }

                const isHoverPath = hoveredNode && (s === hoveredNode || t === hoveredNode);
                const isDimmed = (hoveredNode && !isHoverPath) || (isFiltered && !isEdgeVisible(s, t));

                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);

                if (edge.circular) {
                    ctx.strokeStyle = '#e74c3c';
                    ctx.globalAlpha = isDimmed ? 0.05 : 0.8;
                } else {
                    ctx.strokeStyle = '#555';
                    ctx.globalAlpha = isDimmed ? (isFiltered ? 0.02 : 0.05) : 0.2;
                    if (isHoverPath) ctx.globalAlpha = 0.8;
                    if (isFiltered && isEdgeVisible(s, t) && !isDimmed) ctx.globalAlpha = 0.5; // Highlight filtered edges
                }

                ctx.stroke();
            }
        }

        // Draw Nodes
        for (const n of nodes) {
            const isHovered = n === hoveredNode;
            const isMatch = isFiltered && matchedNodes.has(n);
            const isRelated = isFiltered && relatedNodes.has(n);
            const isDimmedByFilter = isFiltered && !isMatch && !isRelated;
            const isDimmedByHover = hoveredNode && !isHovered && n !== hoveredNode; // simplistic hover

            // Refine hover logic for nodes
            // If hovering, dim everything except hover node and maybe neighbors?
            // Current renderer doesn't track graph topology for hover, just node detection

            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

            if (n.isCircular) {
                ctx.fillStyle = '#e74c3c';
            } else {
                ctx.fillStyle = '#3498db';
                // Different color for matches?
                if (isMatch) ctx.fillStyle = '#f1c40f'; // Gold for search match
                if (isRelated) ctx.fillStyle = '#2ecc71'; // Green for related
            }

            ctx.globalAlpha = (isDimmedByFilter || isDimmedByHover) ? 0.1 : 1.0;

            ctx.fill();

            if (isHovered || isMatch) { // Always show label for matches?
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw Label
                ctx.font = '12px sans-serif';
                ctx.fillStyle = settings.get('syntaxvoid-project-map.themeMode') === 'pixel' ? '#0f0' : '#333';
                ctx.globalAlpha = 1.0;
                ctx.fillText(n.name, n.x + n.r + 4, n.y + 4);
            }
        }
    }
}

module.exports = FileGraphRenderer;
