'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const import_parser_1 = __importDefault(require("./import-parser"));
const cycle_detector_1 = __importDefault(require("./cycle-detector"));
/**
 * Builds the File-to-File dependency graph.
 */
class FileGraphBuilder {
    constructor() {
        this.emitter = new atom_1.Emitter();
        this.parser = new import_parser_1.default();
        this.cycleDetector = new cycle_detector_1.default();
        this.nodes = new Map(); // path -> Node
        this.filenameMap = new Map();
        this.edges = [];
        this.aborted = false;
        this._debounceTimer = null;
        this.latestGraph = null;
    }
    getGraph() {
        return this.latestGraph;
    }
    onDidUpdate(callback) {
        return this.emitter.on('did-update', callback);
    }
    onDidStart(callback) {
        return this.emitter.on('did-start', callback);
    }
    onDidError(callback) {
        return this.emitter.on('did-error', callback);
    }
    async build(rootPath, opts = {}) {
        if (this.aborted)
            this.aborted = false; // Reset
        this.emitter.emit('did-start');
        const maxFiles = opts.maxFiles || 2000;
        const ignoredDirs = opts.ignoredDirs || new Set();
        this.nodes.clear();
        this.edges = [];
        try {
            // 1. Scan files
            const files = await this._scan(rootPath, ignoredDirs, maxFiles);
            // 2. Initialize nodes and filename map
            this.filenameMap.clear();
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
                const basename = path.basename(f);
                if (!this.filenameMap.has(basename)) {
                    this.filenameMap.set(basename, new Set());
                }
                this.filenameMap.get(basename).add(f);
            }
            // 3. Parse imports
            for (const [filePath, node] of this.nodes) {
                if (this.aborted)
                    break;
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
                        if (this.nodes.has(edge.from))
                            this.nodes.get(edge.from).isCircular = true;
                        if (this.nodes.has(edge.to))
                            this.nodes.get(edge.to).isCircular = true;
                    }
                }
            }
            this.latestGraph = {
                nodes: Array.from(this.nodes.values()),
                edges: this.edges,
                circularEdges,
                totalFiles: this.nodes.size,
                version: Date.now()
            };
            this.emitter.emit('did-update', this.latestGraph);
        }
        catch (err) {
            this.emitter.emit('did-error', err);
        }
    }
    debouncedBuild(rootPath, opts = {}, debounceMs = 800) {
        if (this._debounceTimer)
            clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.build(rootPath, opts);
        }, debounceMs);
    }
    async _scan(dir, ignored, limit) {
        let files = [];
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (this.nodes.size + files.length > limit)
                break;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || ignored.has(entry.name) || ignored.has(fullPath))
                    continue;
                const subFiles = await this._scan(fullPath, ignored, limit - files.length);
                files = files.concat(subFiles);
            }
            else {
                files.push(fullPath);
                // Map basename to full path for easier fuzzy resolution
                // Note: collisions possible, so maybe store array?
                // For C++: #include "foo.h" -> search for foo.h in all files?
            }
        }
        return files;
    }
    // Resolves import string to absolute path
    _resolve(sourceFile, importPath) {
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
        if (resolvedSibling)
            return resolvedSibling;
        // Attempt C: Fuzzy/Include Path search using filenameMap
        // If importPath is "foo.h", we look for "foo.h" in map.
        // If importPath is "utils/bar.js", we look for "bar.js" and check suffix.
        const targetName = path.basename(importPath);
        if (this.filenameMap.has(targetName)) {
            const candidates = this.filenameMap.get(targetName);
            // Filter candidates that end with importPath
            for (const candidate of candidates) {
                if (candidate.endsWith(path.sep + importPath)) {
                    return candidate;
                }
            }
            // If explicit filename match (e.g. import "foo.h" and we have "src/include/foo.h")
            // And importPath has no separators (just filename)
            if (!importPath.includes(path.sep)) {
                // Return the first match? or closest?
                // For now, return first.
                if (candidates.size > 0) {
                    const firstCandidate = candidates.values().next().value;
                    return firstCandidate ?? null;
                }
            }
        }
        return null;
    }
    _tryExtensions(basePath) {
        // Exact match?
        if (this.nodes.has(basePath))
            return basePath;
        // Extensions
        const exts = ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.svelte', '.h', '.hh', '.hpp', '.c', '.cc', '.cpp', '.py'];
        for (const ext of exts) {
            if (this.nodes.has(basePath + ext))
                return basePath + ext;
        }
        // Index file
        for (const RP of exts) {
            const idx = path.join(basePath, 'index' + RP);
            if (this.nodes.has(idx))
                return idx;
        }
        return null;
    }
    destroy() {
        this.aborted = true;
        this.emitter.dispose();
    }
}
exports.default = FileGraphBuilder;
