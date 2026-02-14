'use strict';

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

    constructor() {
        this.emitter = new Emitter();
        this.scanner = null;
        this.parser = new ImportParser();
        this.cycleDetector = new CycleDetector();

        this.graph = null;     // current graph model
        this.building = false;
        this._debounceTimer = null;
    }

    /**
     * The current graph model.
     */
    getGraph(): GraphModel | null {
        return this.graph;
    }

    /**
     * Build the full graph for a project root.
     */
    async build(rootPath: string, opts: GraphBuilderOptions = {}): Promise<GraphModel | null> {
        if (this.building && this.scanner) {
            this.scanner.abort();
        }

        this.building = true;
        this.emitter.emit('did-start');

        try {
            this.scanner = new FileScanner({
                maxFiles: opts.maxFiles || 10000,
                ignoredDirs: opts.ignoredDirs
            });

            const root = await this.scanner.scan(rootPath);
            // Cast root to match ImportParser expectations if needed, but they share structure roughly.
            // ImportParser expects FolderNode but defined locally. Structural typing should work if keys match.
            // However, ImportParser.buildEdges arg type is its local FolderNode.
            // Since TS is structural, as long as shapes match it's fine.
            // My FileScanner FolderNode has { type, name, children... } which matches.

            // Wait, ImportParser's buildEdges expects a node that has children, type, path.
            // FileScanner's FolderNode has them.

            // Types might mismatch on 'children' element types if I'm not careful.
            // FileScanner children: (FolderNode | ScannerFileNode)[]
            // ImportParser children: (FolderNode | FileNode)[]
            // If they are structurally identical, it works.

            // I'll cast to any for now to avoid cross-file type importing headaches if they aren't perfectly shared.
            // Or better, update ImportParser to import from FileScanner? 
            // Circular dependency if I do that (ImportParser -> FileScanner -> ... no, FileScanner doesn't import ImportParser)
            // So ImportParser CAN import FolderNode from FileScanner.
            // But I already wrote ImportParser.

            // Use 'any' for the argument to buildEdges to be safe with "Hybrid/No strict module change" constraint timeline.
            const edges = await this.parser.buildEdges(root as any);
            const circularEdges = this.cycleDetector.detect(edges);

            this.graph = {
                root,
                edges,
                circularEdges,
                totalFiles: this.scanner.totalFiles,
                aborted: this.scanner.aborted
            };

            this.emitter.emit('did-update', this.graph);
            return this.graph;
        } catch (err) {
            this.emitter.emit('did-error', err);
            throw err;
        } finally {
            this.building = false;
        }
    }

    /**
     * Debounced rebuild — call on file save.
     */
    debouncedBuild(rootPath: string, opts: GraphBuilderOptions = {}, debounceMs = 500) {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this.build(rootPath, opts);
        }, debounceMs);
    }

    onDidUpdate(callback: (graph: GraphModel) => void): Disposable {
        return this.emitter.on('did-update', callback);
    }

    onDidStart(callback: () => void): Disposable {
        return this.emitter.on('did-start', callback);
    }

    onDidError(callback: (err: Error) => void): Disposable {
        return this.emitter.on('did-error', callback);
    }

    destroy() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        if (this.scanner) {
            this.scanner.abort();
        }
        this.emitter.dispose();
    }
}
