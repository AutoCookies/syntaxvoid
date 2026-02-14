/**
 * Chunked BFS-based centrality calculator
 * Non-blocking, handles 10k+ nodes safely
 */

import { GraphSnapshot, FileNode, Edge } from 'syntaxvoid-project-map';

/**
 * Adjacency list representation
 */
interface AdjacencyList {
    /** Outgoing edges: node -> [targets] */
    outgoing: Map<string, Set<string>>;
    /** Incoming edges: node -> [sources] */
    incoming: Map<string, Set<string>>;
}

/**
 * Build adjacency lists from graph edges
 */
function buildAdjacencyLists(nodes: FileNode[], edges: Edge[]): AdjacencyList {
    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map<string, Set<string>>();

    // Initialize with all nodes
    for (const node of nodes) {
        outgoing.set(node.id, new Set());
        incoming.set(node.id, new Set());
    }

    // Populate edges
    for (const edge of edges) {
        const fromSet = outgoing.get(edge.from);
        const toSet = incoming.get(edge.to);

        if (fromSet) fromSet.add(edge.to);
        if (toSet) toSet.add(edge.from);
    }

    return { outgoing, incoming };
}

/**
 * Compute downstream radius using BFS with depth cap
 * Returns maximum depth to any reachable leaf node
 */
function computeDownstreamRadius(
    nodeId: string,
    adjacency: AdjacencyList,
    depthCap: number
): number {
    const visited = new Set<string>();
    const queue: Array<{ node: string; depth: number }> = [{ node: nodeId, depth: 0 }];
    let maxDepth = 0;

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (visited.has(current.node)) continue;
        visited.add(current.node);

        maxDepth = Math.max(maxDepth, current.depth);

        // Depth cap to prevent excessive computation
        if (current.depth >= depthCap) continue;

        const neighbors = adjacency.outgoing.get(current.node);
        if (neighbors) {
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push({ node: neighbor, depth: current.depth + 1 });
                }
            }
        }
    }

    return maxDepth;
}

/**
 * Simplified betweenness centrality using path sampling
 * For performance, we don't compute exact betweenness (O(n³))
 * Instead, we approximate by counting paths through node from random samples
 */
function computeCentrality(
    nodeId: string,
    adjacency: AdjacencyList,
    allNodes: FileNode[],
    depthCap: number
): number {
    // Count how many shortest paths go through this node
    // Sample-based approximation for large graphs
    const sampleSize = Math.min(100, allNodes.length);
    let pathsThrough = 0;
    let totalPaths = 0;

    // Sample random source nodes
    for (let i = 0; i < sampleSize; i++) {
        const sourceNode = allNodes[Math.floor(i * allNodes.length / sampleSize)];
        if (sourceNode.id === nodeId) continue;

        // BFS from source to find nodes reachable through our target
        const reachableDirectly = new Set<string>();
        const reachableThroughTarget = new Set<string>();

        // Direct BFS without going through target
        bfsWithExclusion(sourceNode.id, adjacency, depthCap, nodeId, reachableDirectly);

        // BFS allowing target
        const allReachable = new Set<string>();
        bfsWithExclusion(sourceNode.id, adjacency, depthCap, null, allReachable);

        // Count nodes only reachable through target
        for (const node of allReachable) {
            if (!reachableDirectly.has(node)) {
                reachableThroughTarget.add(node);
            }
        }

        pathsThrough += reachableThroughTarget.size;
        totalPaths += allReachable.size;
    }

    if (totalPaths === 0) return 0;
    return pathsThrough / totalPaths; // Normalized to [0, 1]
}

/**
 * BFS with optional node exclusion
 */
function bfsWithExclusion(
    startNode: string,
    adjacency: AdjacencyList,
    depthCap: number,
    excludeNode: string | null,
    visited: Set<string>
): void {
    const queue: Array<{ node: string; depth: number }> = [{ node: startNode, depth: 0 }];

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.node === excludeNode) continue;
        if (visited.has(current.node)) continue;
        if (current.depth >= depthCap) continue;

        visited.add(current.node);

        const neighbors = adjacency.outgoing.get(current.node);
        if (neighbors) {
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor) && neighbor !== excludeNode) {
                    queue.push({ node: neighbor, depth: current.depth + 1 });
                }
            }
        }
    }
}

/**
 * Compute all centrality metrics for graph
 * Chunked to avoid blocking UI thread
 */
export async function computeCentralityMetrics(
    graph: GraphSnapshot,
    depthCap: number = 3,
    chunkSize: number = 1000,
    abortSignal?: AbortSignal
): Promise<Map<string, { radius: number; centrality: number }>> {
    const adjacency = buildAdjacencyLists(graph.nodes, graph.edges);
    const results = new Map<string, { radius: number; centrality: number }>();

    // Process in chunks to avoid blocking
    for (let i = 0; i < graph.nodes.length; i += chunkSize) {
        // Check if aborted
        if (abortSignal?.aborted) {
            throw new Error('Centrality computation aborted');
        }

        const chunk = graph.nodes.slice(i, i + chunkSize);

        // Process chunk
        for (const node of chunk) {
            const radius = computeDownstreamRadius(node.id, adjacency, depthCap);
            const centrality = computeCentrality(node.id, adjacency, graph.nodes, depthCap);

            results.set(node.id, { radius, centrality });
        }

        // Yield to UI thread between chunks
        if (i + chunkSize < graph.nodes.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return results;
}

/**
 * Get max values for normalization
 */
export function getMaxValues(
    centralityMetrics: Map<string, { radius: number; centrality: number }>,
    graph: GraphSnapshot
): { maxHub: number; maxRadius: number; maxCentrality: number } {
    let maxHub = 0;
    let maxRadius = 0;
    let maxCentrality = 0;

    for (const node of graph.nodes) {
        const hubScore = node.inDegree + node.outDegree;
        maxHub = Math.max(maxHub, hubScore);

        const metrics = centralityMetrics.get(node.id);
        if (metrics) {
            maxRadius = Math.max(maxRadius, metrics.radius);
            maxCentrality = Math.max(maxCentrality, metrics.centrality);
        }
    }

    // Prevent division by zero
    return {
        maxHub: maxHub || 1,
        maxRadius: maxRadius || 1,
        maxCentrality: maxCentrality || 1
    };
}
