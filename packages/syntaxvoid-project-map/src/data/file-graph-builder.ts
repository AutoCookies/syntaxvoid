'use strict';

import { Emitter, Disposable } from 'atom';
import * as fs from 'fs';
import * as path from 'path';
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
    edges: Edge[];
    aborted: boolean;
    _debounceTimer: NodeJS.Timeout | null;
    latestGraph: GraphSnapshot | null;

    constructor() {
        this.emitter = new Emitter();
        this.parser = new ImportParser();
        this.cycleDetector = new CycleDetector();
        this.nodes = new Map(); // path -> Node
        this.edges = [];
        this.aborted = false;
        this._debounceTimer = null;
        this.latestGraph = null;
    }

    getGraph(): GraphSnapshot | null {
        return this.latestGraph;
    }


    onDidUpdate(callback: (graph: GraphSnapshot) => void): Disposable {
        return this.emitter.on('did-update', callback);
    }

    onDidStart(callback: () => void): Disposable {
        return this.emitter.on('did-start', callback);
    }

    onDidError(callback: (err: any) => void): Disposable {
        return this.emitter.on('did-error', callback);
    }

    async build(rootPath: string, opts: FileGraphBuilderOptions = {}) {
        if (this.aborted) this.aborted = false; // Reset
        this.emitter.emit('did-start');

        const maxFiles = opts.maxFiles || 2000;
        const ignoredDirs = opts.ignoredDirs || new Set<string>();

        this.nodes.clear();
        this.edges = [];

        try {
            // 1. Scan files
            const files = await this._scan(rootPath, ignoredDirs, maxFiles);

            // 2. Initialize nodes
            for (const f of files) {
                this.nodes.set(f, {
                    id: f,
                    path: f,
                    // name: path.basename(f), // Not in FileNode interface, adding it would change it.
                    // keeping consistent with interface.
                    // Wait, FileNode interface check:
                    // export interface FileNode { id: string; path: string; relPath: string; inDegree: number; outDegree: number; isCircular: boolean; }
                    // I need relPath.
                    relPath: path.relative(rootPath, f),
                    inDegree: 0,
                    outDegree: 0,
                    isCircular: false
                });
            }

            // 3. Parse imports
            for (const [filePath, node] of this.nodes) {
                if (this.aborted) break;

                const imports = await this.parser.parse(filePath);

                for (const imp of imports) {
                    const targetPath = this._resolve(filePath, imp);

                    if (targetPath && this.nodes.has(targetPath)) {
                        // Edge found
                        this.edges.push({
                            from: filePath,
                            to: targetPath,
                            weight: 1 // Default weight? Interface has weight.
                        });

                        node.outDegree++;
                        const targetNode = this.nodes.get(targetPath);
                        if (targetNode) {
                            targetNode.inDegree++;
                        }
                    }
                }
            }

            // 4. Detect Cycles
            const edgesForDetector = this.edges.map(e => ({ source: e.from, target: e.to }));
            const circularEdges = this.cycleDetector.detect(edgesForDetector);

            // Mark circular nodes
            if (circularEdges.size > 0) {
                for (const edge of this.edges) {
                    const key = `${edge.from}|${edge.to}`;
                    if (circularEdges.has(key)) {
                        edge.circular = true;
                        if (this.nodes.has(edge.from)) this.nodes.get(edge.from)!.isCircular = true;
                        if (this.nodes.has(edge.to)) this.nodes.get(edge.to)!.isCircular = true;
                    }
                }
            }

            this.latestGraph = {
                nodes: Array.from(this.nodes.values()),
                edges: this.edges,
                // circularEdges, // GraphSnapshot doesn't have circularEdges set, only Edge[] has circular prop
                // rootPath, // GraphSnapshot doesn't have it
                // stats: ... // Not in interface
                version: Date.now() // Added version to interface? Yes.
            };

            this.emitter.emit('did-update', this.latestGraph);

        } catch (err) {
            this.emitter.emit('did-error', err);
        }
    }

    debouncedBuild(rootPath: string, opts: FileGraphBuilderOptions = {}, debounceMs = 800) {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.build(rootPath, opts);
        }, debounceMs);
    }

    async _scan(dir: string, ignored: Set<string>, limit: number): Promise<string[]> {
        let files: string[] = [];
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (this.nodes.size + files.length > limit) break;

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || ignored.has(entry.name) || ignored.has(fullPath)) continue;
                const subFiles = await this._scan(fullPath, ignored, limit - files.length);
                files = files.concat(subFiles);
            } else {
                files.push(fullPath);
                // Map basename to full path for easier fuzzy resolution
                // Note: collisions possible, so maybe store array?
                // For C++: #include "foo.h" -> search for foo.h in all files?
            }
        }
        return files;
    }

    // Resolves import string to absolute path
    _resolve(sourceFile: string, importPath: string): string | null {
        // 1. Relative import (Explicit)
        if (importPath.startsWith('.')) {
            const dir = path.dirname(sourceFile);
            const candidate = path.join(dir, importPath);
            return this._tryExtensions(candidate);
        }

        // 2. Absolute/include path (common in C++ and some JS setups)
        // If it's just "foo.h" or "utils/bar.js"
        // Try to match against known files relative to project root
        // OR try to find checking usage of "include path" (heuristic: search in this.nodes)

        // Strategy: 
        // A. Is it a path relative to root? (e.g. `src/utils.js`)
        // B. Is it a file in the same directory but without `./`? (some langs allow this)
        // C. Is it a file anywhere with that name? (C++ include path behavior - fuzzy)

        // Attempt A: Relative to root? (Not reliably known, but we can try)
        // We can't easily know root here without passing it, but we have `this.nodes` keys.

        // Attempt B: Sibling?
        const sibling = path.join(path.dirname(sourceFile), importPath);
        const resolvedSibling = this._tryExtensions(sibling);
        if (resolvedSibling) return resolvedSibling;

        // Attempt C: Fuzzy/Include Path search
        // If importPath looks like "myheader.h", search known nodes for ending with "/myheader.h"
        // This is O(N) per import, slow but maybe okay for 2000 files.
        for (const [nodePath] of this.nodes) {
            // Check if nodePath ends with importPath (with normalization)
            if (nodePath.endsWith(path.sep + importPath)) {
                return nodePath;
            }
        }

        return null;
    }

    _tryExtensions(basePath: string): string | null {
        // Exact match?
        if (this.nodes.has(basePath)) return basePath;

        // Extensions
        const exts = ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.svelte', '.h', '.hh', '.hpp', '.c', '.cc', '.cpp', '.py'];
        for (const ext of exts) {
            if (this.nodes.has(basePath + ext)) return basePath + ext;
        }

        // Index file
        for (const RP of exts) {
            const idx = path.join(basePath, 'index' + RP);
            if (this.nodes.has(idx)) return idx;
        }

        return null;
    }

    destroy() {
        this.aborted = true;
        this.emitter.dispose();
    }
}
