'use strict';

import { FileNode, Edge, GraphSnapshot } from '../types';

// Use ambient or require for untyped modules
const settings: any = require('../../../../core/platform/settings');

interface RenderNode extends FileNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    r: number;
}

interface RenderOptions {
    showLinks?: boolean;
    circularOnly?: boolean;
    filterText?: string;
}

/**
 * Renders the file dependency graph using a Force-Directed Layout.
 * - Nodes: Circles
 * - Edges: Lines/Curves
 * - Interaction: Drag, Zoom, Pan (handled by View)
 */
export default class FileGraphRenderer {
    nodes: RenderNode[];
    edges: Edge[];
    width: number;
    height: number;
    transform: { k: number, x: number, y: number };

    constructor() {
        this.nodes = [];
        this.edges = [];
        this.width = 0;
        this.height = 0;
        this.transform = { k: 1, x: 0, y: 0 };
    }

    layout(graph: GraphSnapshot, width: number, height: number): RenderNode[] {
        this.width = width;
        this.height = height;

        // Preserve existing node positions if possible (incremental layout)
        const oldNodesMap = new Map(this.nodes.map(n => [n.id, n]));
        const uninitialized: RenderNode[] = [];

        this.nodes = graph.nodes.map(n => {
            const old = oldNodesMap.get(n.id);
            if (old && old.x !== undefined && !isNaN(old.x)) {
                return { ...n, x: old.x, y: old.y, vx: old.vx, vy: old.vy, r: old.r } as RenderNode;
            }
            // Init with temporary valid values to prevent undefined persistence
            const newNode = {
                ...n,
                x: width / 2 + (Math.random() - 0.5) * 20,
                y: height / 2 + (Math.random() - 0.5) * 20,
                vx: 0,
                vy: 0,
                r: Math.min(10, 3 + (n.inDegree + n.outDegree) * 0.5)
            } as RenderNode;
            uninitialized.push(newNode);
            return newNode;
        });

        this.edges = graph.edges;

        // Stratified Layout Initialization for new nodes
        if (uninitialized.length > 0 && width > 0 && height > 0) {
            const sorted = uninitialized.sort((a, b) => { // Sort only new nodes
                const rankA = a.inDegree - a.outDegree;
                const rankB = b.inDegree - b.outDegree;
                return rankA - rankB;
            });

            const nodeCount = sorted.length;
            const cols = Math.ceil(Math.sqrt(nodeCount * (width / height)));
            const safeCols = cols || 1;
            const rows = Math.ceil(nodeCount / safeCols);

            const cellW = width / safeCols;
            const cellH = height / (rows || 1);

            sorted.forEach((node, i) => {
                const c = i % safeCols;
                const r = Math.floor(i / safeCols);
                node.x = (c * cellW) + (cellW / 2) + (Math.random() * 10 - 5);
                node.y = (r * cellH) + (cellH / 2) + (Math.random() * 10 - 5);
                // r is already set
            });
        }

        // Iterative Relaxation
        for (let i = 0; i < 50; i++) {
            this._tick(width, height);
        }

        return this.nodes;
    }

    _tick(w: number, h: number) {
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
                    const fx = dx * f;
                    const fy = dy * f;

                    a.vx = (a.vx || 0) + fx;
                    a.vy = (a.vy || 0) + fy;
                    b.vx = (b.vx || 0) - fx;
                    b.vy = (b.vy || 0) - fy;
                }
            }
        }

        // Spring (Edges)
        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

        for (const edge of this.edges) {
            const s = nodeMap.get(edge.from);
            const t = nodeMap.get(edge.to);
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

            n.vx! *= 0.8;
            n.vy! *= 0.8;

            n.x += n.vx!;
            n.y += n.vy!;

            n.x = Math.max(10, Math.min(w - 10, n.x));
            n.y = Math.max(10, Math.min(h - 10, n.y));
        }
    }

    getNode(path: string): RenderNode | undefined {
        return this.nodes.find(n => n.id === path); // id is the path/identifier
    }

    hitTest(x: number, y: number): RenderNode | null {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = x - n.x;
            const dy = y - n.y;
            if (dx * dx + dy * dy <= n.r * n.r + 25) { // Hit padding
                return n;
            }
        }
        return null;
    }

    draw(ctx: CanvasRenderingContext2D, nodes: RenderNode[], edges: Edge[], hoveredNode: RenderNode | null, opts: RenderOptions = {}) {
        const { showLinks = true, circularOnly = false, filterText = '' } = opts;

        // Debugging Blank Map
        // console.log(`[FileGraphRenderer] Drawing ${nodes.length} nodes, ${edges.length} edges. Width: ${this.width}, Height: ${this.height}`);
        if (nodes.length > 0 && nodes[0].x === undefined) {
            console.warn('[FileGraphRenderer] Node 0 has undefined X!');
        }

        // 1. Identify "Highlighted" set based on Filter
        // If filterText is present, find matching nodes AND their neighbors
        let matchedNodes: Set<RenderNode> | null = null;
        let relatedNodes: Set<RenderNode> | null = null; // direct neighbors of matches

        if (filterText && filterText.trim().length > 0) {
            const lowerFilter = filterText.toLowerCase();
            matchedNodes = new Set();
            relatedNodes = new Set();

            if (nodes.length > 0) {
                // Debug log only once per render? No, too spammy.
                // We'll trust the user to look at console if asked.
            }

            for (const n of nodes) {
                // Check name and relPath. Check if n.name is defined
                // Ensure name is derived if missing.
                const name = (n as any).name || (n.path ? n.path.split('/').pop() : 'unknown');
                // Store derived name back on node for hit testing consistency?
                (n as any).name = name;

                if (name.toLowerCase().includes(lowerFilter) || (n.relPath && n.relPath.toLowerCase().includes(lowerFilter))) {
                    matchedNodes.add(n);
                }
            }

            // Should we show neighbors of matches? User said "and It related node"
            // Let's add direct neighbors to relatedNodes
            if (matchedNodes.size > 0) {
                // Build a quick lookup for edges?
                // Just iterate edges
                const nodeMap = new Map(nodes.map(n => [n.id, n]));

                for (const edge of edges) {
                    const s = nodeMap.get(edge.from);
                    const t = nodeMap.get(edge.to);
                    if (!s || !t) continue;

                    if (matchedNodes.has(s)) relatedNodes.add(t);
                    if (matchedNodes.has(t)) relatedNodes.add(s);
                }
            }
        }

        const isFiltered = matchedNodes !== null && matchedNodes.size > 0;

        // Helper to check visibility/dimming
        const isNodeVisible = (n: RenderNode) => {
            if (!isFiltered) return true; // everything visible if no filter
            return (matchedNodes && matchedNodes.has(n)) || (relatedNodes && relatedNodes.has(n));
        };

        const isEdgeVisible = (s: RenderNode, t: RenderNode) => {
            if (!isFiltered) return true;
            // Show edge if both are "visible" (match or neighbor)
            // AND at least one is a direct match (connections between two neighbors of a match might be noise)
            // Let's be generous: show if both are visible
            return isNodeVisible(s) && isNodeVisible(t);
        };


        // Draw Edges
        ctx.lineWidth = 1;

        if (showLinks) {
            const nodeMap = new Map(nodes.map(n => [n.id, n])); // Optimization: lift out if slow

            for (const edge of edges) {
                if (circularOnly && !edge.circular) continue;

                const s = nodeMap.get(edge.from);
                const t = nodeMap.get(edge.to);
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
            const isMatch = matchedNodes ? matchedNodes.has(n) : false;
            const isRelated = relatedNodes ? relatedNodes.has(n) : false;
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

            // Name
            const name = (n as any).name || (n.path ? n.path.split('/').pop() : 'unknown');

            if (isHovered || isMatch) { // Always show label for matches?
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw Label
                ctx.font = '12px sans-serif';
                ctx.fillStyle = settings.get('syntaxvoid-project-map.themeMode') === 'pixel' ? '#0f0' : '#333';
                ctx.globalAlpha = 1.0;
                ctx.fillText(name, n.x + n.r + 4, n.y + 4);
            }
        }
    }
}
