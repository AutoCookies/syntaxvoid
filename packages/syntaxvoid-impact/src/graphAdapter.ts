import { Disposable } from 'atom';
import { GraphSnapshot } from 'syntaxvoid-project-map';


/**
 * Interface for providing the project graph.
 * This adapter isolates the Impact package from the Project Map implementation details.
 */
export interface ProjectGraphProvider {
    getSnapshot(): GraphSnapshot | null;
    getVersion(): number;
    onDidUpdate(callback: () => void): Disposable;
}

/**
 * Adapter that consumes the syntaxvoid-project-map service.
 */
export class GraphAdapter implements ProjectGraphProvider {
    private service: any = null;
    private version: number = 0;

    constructor() { }

    consumeGraphService(service: any): Disposable {
        this.service = service;
        this.version++;
        return new Disposable(() => {
            this.service = null;
        });
    }

    getSnapshot(): GraphSnapshot | null {
        if (!this.service) return null;

        // The service returns the internal graph structure
        // We might need to adapt it if it doesn't match GraphSnapshot exactly
        // But for now, we assume structural compatibility or cast
        const rawGraph = this.service.getGraph();
        if (!rawGraph) return null;

        // Ensure compatibility
        return {
            nodes: rawGraph.nodes instanceof Map ? Array.from(rawGraph.nodes.values()) : rawGraph.nodes,
            edges: rawGraph.edges,
            circularEdges: rawGraph.circularEdges || new Set(),
            totalFiles: rawGraph.totalFiles || (rawGraph.nodes instanceof Map ? rawGraph.nodes.size : rawGraph.nodes.length),
            version: rawGraph.version || this.version
        };
    }

    getVersion(): number {
        return this.version;
    }

    onDidUpdate(callback: () => void): Disposable {
        if (this.service && typeof this.service.onDidUpdateGraph === 'function') {
            return this.service.onDidUpdateGraph(() => {
                this.version++;
                callback();
            });
        }
        return new Disposable(() => { });
    }
}
