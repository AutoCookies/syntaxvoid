'use strict';

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
    detect(edges: Edge[]): Set<string> {
        // Build adjacency list
        const adj = new Map<string, string[]>();
        const nodes = new Set<string>();

        for (const { source, target } of edges) {
            nodes.add(source);
            nodes.add(target);
            if (!adj.has(source)) adj.set(source, []);
            adj.get(source)!.push(target);
        }

        // Tarjan's SCC
        const sccs = this._tarjan(nodes, adj);

        // Any SCC with size > 1 contains circular deps
        const circularNodes = new Set<string>();
        for (const scc of sccs) {
            if (scc.length > 1) {
                for (const node of scc) {
                    circularNodes.add(node);
                }
            }
        }

        // Also detect self-loops (SCC size 1 with self-edge)
        for (const { source, target } of edges) {
            if (source === target) circularNodes.add(source);
        }

        // Mark edges where both endpoints are in the same SCC
        const circularEdges = new Set<string>();
        for (const { source, target } of edges) {
            if (circularNodes.has(source) && circularNodes.has(target)) {
                // Verify they are in the SAME SCC
                const sourceSCC = sccs.find(scc => scc.includes(source));
                const targetSCC = sccs.find(scc => scc.includes(target));
                if (sourceSCC && targetSCC && sourceSCC === targetSCC) {
                    circularEdges.add(`${source}|${target}`);
                }
            }
        }

        return circularEdges;
    }

    /**
     * Tarjan's algorithm for strongly connected components.
     * @returns list of SCCs
     */
    _tarjan(nodes: Set<string>, adj: Map<string, string[]>): string[][] {
        let index = 0;
        const stack: string[] = [];
        const onStack = new Set<string>();
        const indices = new Map<string, number>();
        const lowlinks = new Map<string, number>();
        const sccs: string[][] = [];

        const strongconnect = (v: string) => {
            indices.set(v, index);
            lowlinks.set(v, index);
            index++;
            stack.push(v);
            onStack.add(v);

            const neighbors = adj.get(v) || [];
            for (const w of neighbors) {
                if (!indices.has(w)) {
                    strongconnect(w);
                    lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
                } else if (onStack.has(w)) {
                    lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
                }
            }

            if (lowlinks.get(v) === indices.get(v)) {
                const scc: string[] = [];
                let w: string;
                do {
                    w = stack.pop()!;
                    onStack.delete(w);
                    scc.push(w);
                } while (w !== v);
                sccs.push(scc);
            }
        };

        for (const node of nodes) {
            if (!indices.has(node)) {
                strongconnect(node);
            }
        }

        return sccs;
    }
}
