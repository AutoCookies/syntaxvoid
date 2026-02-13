'use strict';

const { Emitter } = require('atom');

module.exports = class ImpactService {
    constructor() {
        this.emitter = new Emitter();
        this.graph = null;
        this.cache = new Map(); // key -> { upstream, downstream }
    }

    setGraph(graph) {
        this.graph = graph;
        this.cache.clear();
        this.emitter.emit('did-update-graph');
    }

    getGraph() {
        return this.graph;
    }

    onDidUpdateGraph(callback) {
        return this.emitter.on('did-update-graph', callback);
    }

    /**
     * Compute impact for a file.
     * @param {string} filePath - Absolute path
     * @param {number} depth - Traversal depth
     * @returns {Object} { upstream: Node[], downstream: Node[], circular: boolean }
     */
    computeImpact(filePath, depth = 1) {
        if (!this.graph) return null;

        const cacheKey = `${filePath}:${depth}:${this.graph.edges.length}`; // Simple cache key
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Find node
        const node = this.graph.nodes.find(n => n.path === filePath);
        if (!node) return null;

        const result = {
            upstream: this._traverse(filePath, 'upstream', depth),
            downstream: this._traverse(filePath, 'downstream', depth),
            circular: node.isCircular || false,
            hubScore: (node.inDegree || 0) + (node.outDegree || 0)
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    _traverse(startPath, direction, maxDepth) {
        const visited = new Set();
        const result = [];
        const queue = [{ path: startPath, depth: 0 }];

        visited.add(startPath);

        while (queue.length > 0) {
            const { path: currentPath, depth } = queue.shift();

            if (depth >= maxDepth) continue;

            // Find neighbors
            // upstream: who imports me? (edge.to === me, neighbor is edge.from)
            // downstream: who do I import? (edge.from === me, neighbor is edge.to)
            const neighbors = this.graph.edges
                .filter(e => direction === 'upstream' ? e.to === currentPath : e.from === currentPath)
                .map(e => direction === 'upstream' ? e.from : e.to);

            for (const neighborPath of neighbors) {
                if (!visited.has(neighborPath)) {
                    visited.add(neighborPath);
                    const node = this.graph.nodes.find(n => n.path === neighborPath);
                    if (node) {
                        // Check if we already have this node (multi-path)
                        // Actually visited set handles this.
                        const nodeWithDepth = Object.assign({}, node, { impactDepth: depth + 1 });
                        result.push(nodeWithDepth);
                        queue.push({ path: neighborPath, depth: depth + 1 });
                    }
                }
            }
        }

        // Sort by depth then name
        return result.sort((a, b) => {
            if (a.impactDepth !== b.impactDepth) return a.impactDepth - b.impactDepth;
            return a.name.localeCompare(b.name);
        });
    }

    destroy() {
        this.emitter.dispose();
        this.cache.clear();
        this.graph = null;
    }
}
