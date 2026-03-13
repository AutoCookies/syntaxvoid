/**
 * Core risk engine with caching and version guards
 */

import { GraphSnapshot } from 'syntaxvoid-project-map';
import { ProjectRiskSnapshot, RiskMetrics, NodeRisk } from '../types/risk';
import { calculateRiskScore, getRiskLevel, createNodeRisk } from './riskFormula';
import { computeCentralityMetrics, getMaxValues } from './centralityCalculator';

/**
 * Configuration for risk computation
 */
export interface RiskEngineConfig {
    /** Maximum BFS depth for centrality/radius calculation */
    depthCap: number;

    /** Number of nodes to process per chunk */
    chunkSize: number;

    /** Maximum number of cached snapshots */
    maxCacheSize: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RiskEngineConfig = {
    depthCap: 3,
    chunkSize: 1000,
    maxCacheSize: 2
};

/**
 * Production-grade risk engine with deterministic scoring
 */
export class RiskEngine {
    private cache: Map<number, ProjectRiskSnapshot>;
    private config: RiskEngineConfig;
    private computingVersion: number | null;

    constructor(config: Partial<RiskEngineConfig> = {}) {
        this.cache = new Map();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.computingVersion = null;
    }

    /**
     * Compute risk snapshot for graph
     * Cached by graph version, abortable
     */
    async computeRisk(
        graph: GraphSnapshot,
        abortSignal?: AbortSignal
    ): Promise<ProjectRiskSnapshot> {
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
            const centralityMetrics = await computeCentralityMetrics(
                graph,
                this.config.depthCap,
                this.config.chunkSize,
                abortSignal
            );

            // Check if aborted after centrality computation
            if (abortSignal?.aborted) {
                throw new Error('Risk computation aborted');
            }

            // 2. Get max values for normalization
            const maxValues = getMaxValues(centralityMetrics, graph);

            // 3. Build risk metrics for each node
            const nodeRisks: Record<string, NodeRisk> = {};
            let totalRisk = 0;
            let maxRisk = 0;
            let highRiskCount = 0;

            for (const node of graph.nodes) {
                const centrality = centralityMetrics.get(node.id);
                if (!centrality) continue;

                const metrics: RiskMetrics = {
                    hubScore: node.inDegree + node.outDegree,
                    downstreamRadius: centrality.radius,
                    circularParticipation: node.isCircular,
                    centralityScore: centrality.centrality
                };

                const nodeRisk = createNodeRisk(node.id, metrics, maxValues);
                nodeRisks[node.id] = nodeRisk;

                totalRisk += nodeRisk.riskScore;
                maxRisk = Math.max(maxRisk, nodeRisk.riskScore);

                if (nodeRisk.riskLevel === 'high' || nodeRisk.riskLevel === 'critical') {
                    highRiskCount++;
                }
            }

            // 4. Build snapshot
            const snapshot: ProjectRiskSnapshot = {
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
        } finally {
            this.computingVersion = null;
        }
    }

    /**
     * Get cached snapshot by version
     */
    getCached(version: number): ProjectRiskSnapshot | null {
        return this.cache.get(version) || null;
    }

    /**
     * Get latest cached snapshot
     */
    getLatest(): ProjectRiskSnapshot | null {
        if (this.cache.size === 0) return null;

        let latest: ProjectRiskSnapshot | null = null;
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
    private cacheSnapshot(snapshot: ProjectRiskSnapshot): void {
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
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<RiskEngineConfig>): void {
        this.config = { ...this.config, ...config };
    }
}
