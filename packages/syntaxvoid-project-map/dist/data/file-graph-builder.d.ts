import { Emitter, Disposable } from 'atom';
import ImportParser from './import-parser';
import CycleDetector from './cycle-detector';
import { FileNode, Edge, GraphSnapshot } from '../types';
interface FileGraphBuilderOptions {
    maxFiles?: number;
    ignoredDirs?: Set<string>;
}
/**
 * Builds the File-to-File dependency graph.
 */
export default class FileGraphBuilder {
    emitter: Emitter;
    parser: ImportParser;
    cycleDetector: CycleDetector;
    nodes: Map<string, FileNode>;
    filenameMap: Map<string, Set<string>>;
    edges: Edge[];
    aborted: boolean;
    _debounceTimer: NodeJS.Timeout | null;
    latestGraph: GraphSnapshot | null;
    constructor();
    getGraph(): GraphSnapshot | null;
    onDidUpdate(callback: (graph: GraphSnapshot) => void): Disposable;
    onDidStart(callback: () => void): Disposable;
    onDidError(callback: (err: any) => void): Disposable;
    build(rootPath: string, opts?: FileGraphBuilderOptions): Promise<void>;
    debouncedBuild(rootPath: string, opts?: FileGraphBuilderOptions, debounceMs?: number): void;
    _scan(dir: string, ignored: Set<string>, limit: number): Promise<string[]>;
    _resolve(sourceFile: string, importPath: string): string | null;
    _tryExtensions(basePath: string): string | null;
    destroy(): void;
}
export {};
