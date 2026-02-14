import { Emitter, Disposable } from 'atom';
import FileScanner, { FolderNode } from './file-scanner';
import ImportParser from './import-parser';
import CycleDetector from './cycle-detector';
interface GraphBuilderOptions {
    maxFiles?: number;
    ignoredDirs?: Set<string>;
}
interface FolderEdge {
    source: string;
    target: string;
    weight: number;
}
interface GraphModel {
    root: FolderNode | null;
    edges: FolderEdge[];
    circularEdges: Set<string>;
    totalFiles: number;
    aborted: boolean;
}
/**
 * Orchestrates scanning, import parsing, and cycle detection.
 * Emits 'did-update' when the graph model changes.
 *
 * Reusable by Agent system — only depends on atom.Emitter for events.
 * Can be adapted to use Node EventEmitter for standalone use.
 */
export default class GraphBuilder {
    emitter: Emitter;
    scanner: FileScanner | null;
    parser: ImportParser;
    cycleDetector: CycleDetector;
    graph: GraphModel | null;
    building: boolean;
    _debounceTimer: NodeJS.Timeout | null;
    constructor();
    /**
     * The current graph model.
     */
    getGraph(): GraphModel | null;
    /**
     * Build the full graph for a project root.
     */
    build(rootPath: string, opts?: GraphBuilderOptions): Promise<GraphModel | null>;
    /**
     * Debounced rebuild — call on file save.
     */
    debouncedBuild(rootPath: string, opts?: GraphBuilderOptions, debounceMs?: number): void;
    onDidUpdate(callback: (graph: GraphModel) => void): Disposable;
    onDidStart(callback: () => void): Disposable;
    onDidError(callback: (err: Error) => void): Disposable;
    destroy(): void;
}
export {};
