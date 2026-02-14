'use strict';

const { Emitter } = require('atom');
const fs = require('fs');
const path = require('path');

/**
 * Self-contained Impact Analysis service.
 * Builds its own file dependency graph by scanning the project,
 * parsing imports across multiple languages, and resolving paths.
 */
module.exports = class ImpactService {
    constructor() {
        this.emitter = new Emitter();
        this.graph = null;          // { nodes: Map<path, Node>, edges: [] }
        this.cache = new Map();
        this.building = false;

        this.IGNORED_DIRS = new Set([
            'node_modules', '.git', 'dist', 'build', 'out', '.next',
            '.cache', 'vendor', 'coverage', '__pycache__', '.svn',
            'target', 'bin', 'obj', '.idea', '.vscode'
        ]);

        this.SUPPORTED_EXTS = new Set([
            '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
            '.c', '.cc', '.cpp', '.h', '.hh', '.hpp',
            '.py',
            '.go',
            '.rs',
            '.java',
            '.vue', '.svelte'
        ]);
    }

    // ── Graph Building ──────────────────────────────────────────

    async buildGraph(rootPath) {
        if (this.building) return this.graph;
        this.building = true;
        this.emitter.emit('did-start-build');

        try {
            console.log('[impact] Building graph for:', rootPath);

            // 1. Scan all files
            const files = await this._scanFiles(rootPath);
            console.log(`[impact] Found ${files.length} files`);

            // 2. Build node map
            const nodeMap = new Map();
            for (const f of files) {
                nodeMap.set(f, {
                    id: f,
                    path: f,
                    name: path.basename(f),
                    relPath: path.relative(rootPath, f),
                    ext: path.extname(f).toLowerCase(),
                    inDegree: 0,
                    outDegree: 0,
                    isCircular: false
                });
            }

            // 3. Parse imports and build edges
            const edges = [];
            for (const [filePath, node] of nodeMap) {
                const imports = await this._parseImports(filePath, node.ext);
                for (const imp of imports) {
                    const resolved = this._resolve(filePath, imp, nodeMap);
                    if (resolved && nodeMap.has(resolved)) {
                        edges.push({ from: filePath, to: resolved });
                        node.outDegree++;
                        nodeMap.get(resolved).inDegree++;
                    }
                }
            }

            console.log(`[impact] Built ${edges.length} edges`);

            this.graph = {
                nodes: nodeMap,
                edges,
                rootPath
            };

            this.cache.clear();
            this.emitter.emit('did-update-graph');
            return this.graph;

        } catch (err) {
            console.error('[impact] Graph build error:', err);
            this.emitter.emit('did-error', err);
            return null;
        } finally {
            this.building = false;
        }
    }

    // ── File Scanning ───────────────────────────────────────────

    async _scanFiles(dir, maxFiles = 5000) {
        const files = [];
        const stack = [dir];

        while (stack.length > 0 && files.length < maxFiles) {
            const current = stack.pop();
            let entries;
            try {
                entries = await fs.promises.readdir(current, { withFileTypes: true });
            } catch (e) {
                continue; // Permission denied, etc.
            }

            for (const entry of entries) {
                if (files.length >= maxFiles) break;
                const fullPath = path.join(current, entry.name);

                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') && !this.IGNORED_DIRS.has(entry.name)) {
                        stack.push(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (this.SUPPORTED_EXTS.has(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }

        return files;
    }

    // ── Import Parsing (multi-language) ─────────────────────────

    async _parseImports(filePath, ext) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');

            switch (ext) {
                case '.js': case '.ts': case '.jsx': case '.tsx':
                case '.mjs': case '.cjs': case '.vue': case '.svelte':
                    return this._parseJS(content);
                case '.c': case '.cc': case '.cpp':
                case '.h': case '.hh': case '.hpp':
                    return this._parseCpp(content);
                case '.py':
                    return this._parsePython(content);
                case '.go':
                    return this._parseGo(content);
                case '.rs':
                    return this._parseRust(content);
                case '.java':
                    return this._parseJava(content);
                default:
                    return [];
            }
        } catch (err) {
            return []; // File read error
        }
    }

    _parseJS(content) {
        const imports = new Set();
        let m;

        // import ... from '...'
        const re1 = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((m = re1.exec(content))) imports.add(m[1]);

        // import('...') / require('...')
        const re2 = /(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((m = re2.exec(content))) imports.add(m[1]);

        // export ... from '...'
        const re3 = /export\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((m = re3.exec(content))) imports.add(m[1]);

        return Array.from(imports);
    }

    _parseCpp(content) {
        const imports = new Set();
        let m;

        // #include "..." (local includes)
        const re = /#include\s+"([^"]+)"/g;
        while ((m = re.exec(content))) imports.add(m[1]);

        return Array.from(imports);
    }

    _parsePython(content) {
        const imports = new Set();
        let m;

        // from X import Y
        const re1 = /^from\s+([\w.]+)\s+import/gm;
        while ((m = re1.exec(content))) imports.add(m[1].replace(/\./g, '/'));

        // import X
        const re2 = /^import\s+([\w.]+)/gm;
        while ((m = re2.exec(content))) imports.add(m[1].replace(/\./g, '/'));

        return Array.from(imports);
    }

    _parseGo(content) {
        const imports = new Set();
        let m;

        // import "path"
        const re1 = /import\s+"([^"]+)"/g;
        while ((m = re1.exec(content))) imports.add(m[1]);

        // import ( "path" ) block
        const reBlock = /import\s*\(([\s\S]*?)\)/g;
        while ((m = reBlock.exec(content))) {
            const block = m[1];
            const re2 = /"([^"]+)"/g;
            let m2;
            while ((m2 = re2.exec(block))) imports.add(m2[1]);
        }

        return Array.from(imports);
    }

    _parseRust(content) {
        const imports = new Set();
        let m;

        // mod foo;
        const re1 = /^\s*mod\s+(\w+)\s*;/gm;
        while ((m = re1.exec(content))) imports.add(m[1]);

        // use crate::path::to::module;
        const re2 = /^\s*use\s+crate::([^;{]+)/gm;
        while ((m = re2.exec(content))) {
            const p = m[1].trim().replace(/::/g, '/');
            imports.add(p);
        }

        return Array.from(imports);
    }

    _parseJava(content) {
        const imports = new Set();
        let m;

        // import com.foo.Bar;
        const re = /^\s*import\s+([\w.]+)\s*;/gm;
        while ((m = re.exec(content))) {
            imports.add(m[1].replace(/\./g, '/'));
        }

        return Array.from(imports);
    }

    // ── Path Resolution ─────────────────────────────────────────

    _resolve(sourceFile, importPath, nodeMap) {
        // Skip absolute/external package imports
        if (importPath.startsWith('/') && !nodeMap.has(importPath)) return null;

        // 1. Relative import
        if (importPath.startsWith('.')) {
            const dir = path.dirname(sourceFile);
            return this._tryExtensions(path.join(dir, importPath), nodeMap);
        }

        // 2. Same-directory sibling (C++ style: #include "foo.h")
        const sibling = path.join(path.dirname(sourceFile), importPath);
        const resolvedSibling = this._tryExtensions(sibling, nodeMap);
        if (resolvedSibling) return resolvedSibling;

        // 3. Fuzzy search: file ending with "/importPath" (C++ include paths)
        for (const [nodePath] of nodeMap) {
            if (nodePath.endsWith(path.sep + importPath)) {
                return nodePath;
            }
        }

        return null;
    }

    _tryExtensions(basePath, nodeMap) {
        if (nodeMap.has(basePath)) return basePath;

        const exts = [
            '.js', '.ts', '.jsx', '.tsx', '.json',
            '.h', '.hh', '.hpp', '.c', '.cc', '.cpp',
            '.py', '.go', '.rs', '.java',
            '.vue', '.svelte'
        ];
        for (const ext of exts) {
            if (nodeMap.has(basePath + ext)) return basePath + ext;
        }

        // Index file
        for (const ext of ['.js', '.ts', '.jsx', '.tsx']) {
            const idx = path.join(basePath, 'index' + ext);
            if (nodeMap.has(idx)) return idx;
        }

        return null;
    }

    // ── Impact Computation ──────────────────────────────────────

    /**
     * @param {string} filePath - Absolute path
     * @param {number} depth - Traversal depth (1-5)
     * @returns {Object|null} { upstream: Node[], downstream: Node[], hubScore }
     */
    computeImpact(filePath, depth = 1) {
        if (!this.graph) return null;

        const cacheKey = `${filePath}:${depth}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        const nodeMap = this.graph.nodes;
        if (!nodeMap.has(filePath)) {
            console.log('[impact] File not in graph:', filePath);
            return null;
        }

        const node = nodeMap.get(filePath);
        const result = {
            upstream: this._traverse(filePath, 'upstream', depth),
            downstream: this._traverse(filePath, 'downstream', depth),
            circular: node.isCircular || false,
            hubScore: (node.inDegree || 0) + (node.outDegree || 0)
        };

        console.log(`[impact] ${path.basename(filePath)}: ↑${result.upstream.length} ↓${result.downstream.length}`);
        this.cache.set(cacheKey, result);
        return result;
    }

    _traverse(startPath, direction, maxDepth) {
        const visited = new Set();
        const result = [];
        const queue = [{ path: startPath, depth: 0 }];

        visited.add(startPath);

        while (queue.length > 0) {
            const { path: currentPath, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            // upstream: who imports me? (edge.to === me → neighbor is edge.from)
            // downstream: who do I import? (edge.from === me → neighbor is edge.to)
            const neighbors = this.graph.edges
                .filter(e => direction === 'upstream' ? e.to === currentPath : e.from === currentPath)
                .map(e => direction === 'upstream' ? e.from : e.to);

            for (const neighborPath of neighbors) {
                if (!visited.has(neighborPath)) {
                    visited.add(neighborPath);
                    const node = this.graph.nodes.get(neighborPath);
                    if (node) {
                        result.push(Object.assign({}, node, { impactDepth: depth + 1 }));
                        queue.push({ path: neighborPath, depth: depth + 1 });
                    }
                }
            }
        }

        return result.sort((a, b) => {
            if (a.impactDepth !== b.impactDepth) return a.impactDepth - b.impactDepth;
            return a.name.localeCompare(b.name);
        });
    }

    // ── External graph (optional, from project-map) ─────────────

    setGraph(externalGraph) {
        if (!externalGraph) return;
        // Convert array-based nodes to Map if needed
        const nodeMap = new Map();
        const nodes = Array.isArray(externalGraph.nodes) ? externalGraph.nodes : [];
        for (const n of nodes) {
            nodeMap.set(n.path, n);
        }
        this.graph = {
            nodes: nodeMap,
            edges: externalGraph.edges || [],
            rootPath: externalGraph.rootPath || ''
        };
        this.cache.clear();
        this.emitter.emit('did-update-graph');
    }

    // ── Events ──────────────────────────────────────────────────

    getGraph() { return this.graph; }
    isBuilding() { return this.building; }
    onDidUpdateGraph(cb) { return this.emitter.on('did-update-graph', cb); }
    onDidStartBuild(cb) { return this.emitter.on('did-start-build', cb); }

    destroy() {
        this.emitter.dispose();
        this.cache.clear();
        this.graph = null;
    }
};
