'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Regex-based import parser for various languages.
 * Best-effort only (no AST).
 */
class ImportParser {
    constructor() {
        this.cache = new Map(); // path -> { mtime, imports }
    }

    async parse(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            const mtime = stats.mtimeMs;

            // Check cache
            if (this.cache.has(filePath)) {
                const entry = this.cache.get(filePath);
                if (entry.mtime === mtime) {
                    return entry.imports;
                }
            }

            const content = await fs.promises.readFile(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();
            let imports = [];

            if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
                imports = this._parseJS(content);
            } else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
                imports = this._parseCpp(content);
            } else if (['.py'].includes(ext)) {
                imports = this._parsePython(content);
            }

            this.cache.set(filePath, { mtime, imports });
            return imports;
        } catch (err) {
            console.warn(`Failed to parse ${filePath}:`, err);
            return [];
        }
    }

    _parseJS(content) {
        const imports = new Set();

        // Static import
        // import ... from '...'
        const reImport = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = reImport.exec(content)) !== null) {
            imports.add(match[1]);
        }

        // Dynamic import / require
        // import('...') or require('...')
        const reDynamic = /(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = reDynamic.exec(content)) !== null) {
            imports.add(match[1]);
        }

        // Export from
        const reExport = /export\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = reExport.exec(content)) !== null) {
            imports.add(match[1]);
        }

        return Array.from(imports);
    }

    _parseCpp(content) {
        const imports = new Set();
        // #include "..." (local)
        const reInclude = /#include\s+"([^"]+)"/g;
        let match;
        while ((match = reInclude.exec(content)) !== null) {
            imports.add(match[1]);
        }
        return Array.from(imports);
    }

    _parsePython(content) {
        const imports = new Set();

        // from ... import ...
        const reFrom = /^from\s+([\w\.]+)\s+import/gm;
        let match;
        while ((match = reFrom.exec(content)) !== null) {
            imports.add(match[1].replace(/\./g, '/')); // Convert dots to paths
        }

        // import ...
        const reImport = /^import\s+([\w\.]+)/gm;
        while ((match = reImport.exec(content)) !== null) {
            imports.add(match[1].replace(/\./g, '/'));
        }

        return Array.from(imports);
    }
    /**
     * Legacy method for Folder GraphBuilder.
     * Aggregates parsing results from a folder structure.
     */
    async buildEdges(rootFolder) {
        const edges = [];

        // 1. Flatten files to a "node map" for resolution
        const fileMap = new Set();
        const collectFiles = (node) => {
            if (node.type === 'file') {
                fileMap.add(node.path);
            } else if (node.children) {
                node.children.forEach(collectFiles);
            }
        };
        collectFiles(rootFolder);

        // 2. Helper for resolution (Ported from FileGraphBuilder logic)
        const resolveImport = (sourceFile, importPath) => {
            // A. Relative
            if (importPath.startsWith('.')) {
                const dir = path.dirname(sourceFile);
                const candidate = path.join(dir, importPath);
                return this._tryExtensions(candidate, fileMap);
            }

            // B. Absolute/Include (Fuzzy)
            // Try searching for file ending with importPath
            for (const filePath of fileMap) {
                if (filePath.endsWith(path.sep + importPath)) {
                    return filePath;
                }
            }

            return null;
        };

        // 3. Traverse and Parse
        const traverse = async (folder) => {
            if (!folder.children) return;

            for (const child of folder.children) {
                if (child.type === 'folder') {
                    await traverse(child);
                } else if (child.type === 'file') {
                    const imports = await this.parse(child.path);
                    for (const importPath of imports) {
                        const resolved = resolveImport(child.path, importPath);
                        if (resolved) {
                            edges.push({
                                source: child.path,
                                target: resolved
                            });
                        }
                    }
                }
            }
        };

        await traverse(rootFolder);

        // 4. Aggregate to Folder Edges
        const folderEdges = [];
        const folderMap = new Map();

        for (const edge of edges) {
            const srcFolder = path.dirname(edge.source);
            const dstFolder = path.dirname(edge.target);

            if (srcFolder !== dstFolder) {
                const key = `${srcFolder}|${dstFolder}`;
                if (!folderMap.has(key)) {
                    folderMap.set(key, { source: srcFolder, target: dstFolder, weight: 0 });
                }
                folderMap.get(key).weight++;
            }
        }

        return Array.from(folderMap.values());
    }

    _tryExtensions(basePath, fileMap) {
        // Exact match
        if (fileMap.has(basePath)) return basePath;

        // Extensions
        const exts = ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.svelte', '.h', '.hpp', '.c', '.cpp', '.py'];
        for (const ext of exts) {
            if (fileMap.has(basePath + ext)) return basePath + ext;
        }

        // Index file
        for (const ext of exts) {
            const idx = path.join(basePath, 'index' + ext);
            if (fileMap.has(idx)) return idx;
        }

        return null;
    }
}

module.exports = ImportParser;
