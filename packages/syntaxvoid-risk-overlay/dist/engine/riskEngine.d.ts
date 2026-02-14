/**
 * Core risk engine with caching and version guards
 */
import { GraphSnapshot } from 'syntaxvoid-project-map';
import { ProjectRiskSnapshot } from '../types/risk';
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
 * Production-grade risk engine with deterministic scoring
 */
export declare class RiskEngine {
    private cache;
    private config;
    private computingVersion;
    constructor(config?: Partial<RiskEngineConfig>);
    /**
     * Compute risk snapshot for graph
     * Cached by graph version, abortable
     */
    computeRisk(graph: GraphSnapshot, abortSignal?: AbortSignal): Promise<ProjectRiskSnapshot>;
    /**
     * Get cached snapshot by version
     */
    getCached(version: number): ProjectRiskSnapshot | null;
    /**
     * Get latest cached snapshot
     */
    getLatest(): ProjectRiskSnapshot | null;
    /**
     * Cache snapshot with bounded size
     */
    private cacheSnapshot;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<RiskEngineConfig>): void;
}
