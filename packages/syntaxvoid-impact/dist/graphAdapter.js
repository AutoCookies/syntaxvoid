"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAdapter = void 0;
const atom_1 = require("atom");
/**
 * Adapter that consumes the syntaxvoid-project-map service.
 */
class GraphAdapter {
    constructor() {
        this.service = null;
        this.version = 0;
    }
    consumeGraphService(service) {
        this.service = service;
        this.version++;
        return new atom_1.Disposable(() => {
            this.service = null;
        });
    }
    getSnapshot() {
        if (!this.service)
            return null;
        // The service returns the internal graph structure
        // We might need to adapt it if it doesn't match GraphSnapshot exactly
        // But for now, we assume structural compatibility or cast
        const rawGraph = this.service.getGraph();
        if (!rawGraph)
            return null;
        // Ensure compatibility
        return {
            nodes: rawGraph.nodes instanceof Map ? Array.from(rawGraph.nodes.values()) : rawGraph.nodes,
            edges: rawGraph.edges,
            circularEdges: rawGraph.circularEdges || new Set(),
            totalFiles: rawGraph.totalFiles || (rawGraph.nodes instanceof Map ? rawGraph.nodes.size : rawGraph.nodes.length)
        };
    }
    getVersion() {
        return this.version;
    }
    onDidUpdate(callback) {
        if (this.service && typeof this.service.onDidUpdateGraph === 'function') {
            return this.service.onDidUpdateGraph(() => {
                this.version++;
                callback();
            });
        }
        return new atom_1.Disposable(() => { });
    }
}
exports.GraphAdapter = GraphAdapter;
