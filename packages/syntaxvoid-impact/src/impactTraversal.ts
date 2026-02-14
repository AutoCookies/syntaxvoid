import { GraphSnapshot, GraphNode, ImpactOptions, ImpactResult, ImpactDirection } from './types/impact';

/**
 * Pure function to compute impact analysis on a graph snapshot.
 * Uses strict typing and avoids cycles.
 */
export function computeImpact(
    rootId: string,
    graph: GraphSnapshot,
    options: ImpactOptions
): ImpactResult {
    // Build quick lookup map since Snapshot uses arrays for portability/serialization sometimes
    const nodeMap = new Map<string, GraphNode>();
    for (const node of graph.nodes) {
        nodeMap.set(node.id, node); // id is usually path
    }

    // Verify root exists
    if (!nodeMap.has(rootId)) {
        return {
            rootFile: rootId,
            depth: 0,
            upstream: {},
            downstream: {},
            circular: false,
            hubScore: 0,
            totalUpstream: 0,
            totalDownstream: 0
        };
    }

    const rootNode = nodeMap.get(rootId)!;

    // Result containers
    const upstreamLevels: Record<number, string[]> = {};
    const downstreamLevels: Record<number, string[]> = {};
    let totalUpstream = 0;
    let totalDownstream = 0;

    // Helper for BFS
    const traverse = (direction: 'upstream' | 'downstream') => {
        const visited = new Set<string>();
        const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
        visited.add(rootId);

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;

            if (depth > 0) {
                // Add to results
                const level = depth;
                if (direction === 'upstream') {
                    if (!upstreamLevels[level]) upstreamLevels[level] = [];
                    upstreamLevels[level].push(id);
                    totalUpstream++;
                } else {
                    if (!downstreamLevels[level]) downstreamLevels[level] = [];
                    downstreamLevels[level].push(id);
                    totalDownstream++;
                }
            }

            if (depth >= options.depth) continue;

            // Find neighbors
            // Upstream: who calls me? Edge: Other -> Me. (edge.to === me). Neighbor = edge.from
            // Downstream: who do I call? Edge: Me -> Other. (edge.from === me). Neighbor = edge.to

            // Optimization: Building an adjacency list once per compute might be expensive if graph is huge
            // but usually filtered traversal is okay. 
            // For better perf, adapter should provide adjacency list, but strictly following snapshot input:

            // Filter edges (naive O(E) per node visited - acceptable for local impact depth < 5)
            // Or we could build a mini-index for this traversal if graph is large.
            // Let's stick to simple filter for now unless perf is an issue.

            const neighbors: string[] = [];
            for (const edge of graph.edges) {
                if (direction === 'upstream') {
                    if (edge.to === id) neighbors.push(edge.from);
                } else {
                    if (edge.from === id) neighbors.push(edge.to);
                }
            }

            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    if (nodeMap.has(neighborId)) {
                        queue.push({ id: neighborId, depth: depth + 1 });
                    }
                }
            }
        }
    };

    if (options.direction === 'upstream' || options.direction === 'both') {
        traverse('upstream');
    }

    if (options.direction === 'downstream' || options.direction === 'both') {
        traverse('downstream');
    }

    return {
        rootFile: rootId,
        depth: options.depth,
        upstream: upstreamLevels,
        downstream: downstreamLevels,
        circular: rootNode.isCircular,
        hubScore: rootNode.inDegree + rootNode.outDegree,
        totalUpstream,
        totalDownstream
    };
}
