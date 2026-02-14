import { Disposable } from 'atom';
import { GraphSnapshot } from './types/impact';
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
export declare class GraphAdapter implements ProjectGraphProvider {
    private service;
    private version;
    constructor();
    consumeGraphService(service: any): Disposable;
    getSnapshot(): GraphSnapshot | null;
    getVersion(): number;
    onDidUpdate(callback: () => void): Disposable;
}
