"use strict";
/**
 * Core risk engine with caching and version guards
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngine = void 0;
const riskFormula_1 = require("./riskFormula");
const centralityCalculator_1 = require("./centralityCalculator");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    depthCap: 3,
    chunkSize: 1000,
    maxCacheSize: 2
};
/**
 * Production-grade risk engine with deterministic scoring
 */
class RiskEngine {
    constructor(config = {}) {
        this.cache = new Map();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.computingVersion = null;
    }
    /**
     * Compute risk snapshot for graph
     * Cached by graph version, abortable
     */
    async computeRisk(graph, abortSignal) {
        // Check cache first
        const cached = this.cache.get(graph.version);
        if (cached) {
            return cached;
        }
        // Version guard: detect if computation already in progress
        if (this.computingVersion === graph.version) {
            throw new Error('Risk computation already in progress for this version');
        }
        this.computingVersion = graph.version;
        try {
            // 1. Compute centrality metrics (chunked, non-blocking)
            const centralityMetrics = await (0, centralityCalculator_1.computeCentralityMetrics)(graph, this.config.depthCap, this.config.chunkSize, abortSignal);
            // Check if aborted after centrality computation
            if (abortSignal?.aborted) {
                throw new Error('Risk computation aborted');
            }
            // 2. Get max values for normalization
            const maxValues = (0, centralityCalculator_1.getMaxValues)(centralityMetrics, graph);
            // 3. Build risk metrics for each node
            const nodeRisks = {};
            let totalRisk = 0;
            let maxRisk = 0;
            let highRiskCount = 0;
            for (const node of graph.nodes) {
                const centrality = centralityMetrics.get(node.id);
                if (!centrality)
                    continue;
                const metrics = {
                    hubScore: node.inDegree + node.outDegree,
                    downstreamRadius: centrality.radius,
                    circularParticipation: node.isCircular,
                    centralityScore: centrality.centrality
                };
                const nodeRisk = (0, riskFormula_1.createNodeRisk)(node.id, metrics, maxValues);
                nodeRisks[node.id] = nodeRisk;
                totalRisk += nodeRisk.riskScore;
                maxRisk = Math.max(maxRisk, nodeRisk.riskScore);
                if (nodeRisk.riskLevel === 'high' || nodeRisk.riskLevel === 'critical') {
                    highRiskCount++;
                }
            }
            // 4. Build snapshot
            const snapshot = {
                version: graph.version,
                computedAt: Date.now(),
                nodes: nodeRisks,
                maxRisk,
                averageRisk: graph.nodes.length > 0 ? totalRisk / graph.nodes.length : 0,
                highRiskCount
            };
            // 5. Cache result (bounded cache)
            this.cacheSnapshot(snapshot);
            return snapshot;
        }
        finally {
            this.computingVersion = null;
        }
    }
    /**
     * Get cached snapshot by version
     */
    getCached(version) {
        return this.cache.get(version) || null;
    }
    /**
     * Get latest cached snapshot
     */
    getLatest() {
        if (this.cache.size === 0)
            return null;
        let latest = null;
        for (const snapshot of this.cache.values()) {
            if (!latest || snapshot.version > latest.version) {
                latest = snapshot;
            }
        }
        return latest;
    }
    /**
     * Cache snapshot with bounded size
     */
    cacheSnapshot(snapshot) {
        this.cache.set(snapshot.version, snapshot);
        // Evict oldest if exceeding max size
        if (this.cache.size > this.config.maxCacheSize) {
            let oldestVersion = Infinity;
            for (const version of this.cache.keys()) {
                if (version < oldestVersion) {
                    oldestVersion = version;
                }
            }
            this.cache.delete(oldestVersion);
        }
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
exports.RiskEngine = RiskEngine;
