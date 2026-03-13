interface Edge {
    source: string;
    target: string;
}
/**
 * Detect circular dependencies using Tarjan's Strongly Connected Components.
 *
 * Input: list of edges [{source, target}]
 * Output: set of edge keys "source|target" that form cycles
 *
 * Reusable by Agent system — no DOM dependencies.
 */
export default class CycleDetector {
    /**
     * Find all edges that participate in circular dependencies.
     * @param edges
     * @returns keys in format "source|target"
     */
    detect(edges: Edge[]): Set<string>;
    /**
     * Tarjan's algorithm for strongly connected components.
     * @returns list of SCCs
     */
    _tarjan(nodes: Set<string>, adj: Map<string, string[]>): string[][];
}
export {};
