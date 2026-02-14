/**
 * Chunked BFS-based centrality calculator
 * Non-blocking, handles 10k+ nodes safely
 */
import { GraphSnapshot } from 'syntaxvoid-project-map';
/**
 * Compute all centrality metrics for graph
 * Chunked to avoid blocking UI thread
 */
export declare function computeCentralityMetrics(graph: GraphSnapshot, depthCap?: number, chunkSize?: number, abortSignal?: AbortSignal): Promise<Map<string, {
    radius: number;
    centrality: number;
}>>;
/**
 * Get max values for normalization
 */
export declare function getMaxValues(centralityMetrics: Map<string, {
    radius: number;
    centrality: number;
}>, graph: GraphSnapshot): {
    maxHub: number;
    maxRadius: number;
    maxCentrality: number;
};
