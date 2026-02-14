'use strict';

import * as fs from 'fs';
import * as path from 'path';

interface FolderNode {
    type: 'folder';
    name: string;
    path: string;
    children: (FolderNode | FileNode)[];
    totalFileCount: number;
    depth: number;
}

interface FileNode {
    type: 'file';
    name: string;
    path: string;
    size: number;
}

interface CacheEntry {
    mtime: number;
    imports: string[];
}

interface Edge {
    source: string;
    target: string;
}

interface FolderEdge {
    source: string;
    target: string;
    weight: number;
}

/**
 * Regex-based import parser for various languages.
 * Best-effort only (no AST).
 */
export default class ImportParser {
    cache: Map<string, CacheEntry>;

    constructor() {
        this.cache = new Map(); // path -> { mtime, imports }
    }

    async parse(filePath: string): Promise<string[]> {
        try {
            const stats = await fs.promises.stat(filePath);
            const mtime = stats.mtimeMs;

            // Check cache
            if (this.cache.has(filePath)) {
                const entry = this.cache.get(filePath)!;
                if (entry.mtime === mtime) {
                    return entry.imports;
                }
            }

            const content = await fs.promises.readFile(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();
            let imports: string[] = [];

            if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
                imports = this._parseJS(content);
            } else if (['.c', '.cc', '.cpp', '.h', '.hh', '.hpp'].includes(ext)) {
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

    _parseJS(content: string): string[] {
        const imports = new Set<string>();

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

    _parseCpp(content: string): string[] {
        const imports = new Set<string>();
        // #include "..." (local)
        const reInclude = /#include\s+"([^"]+)"/g;
        let match;
        while ((match = reInclude.exec(content)) !== null) {
            imports.add(match[1]);
        }
        return Array.from(imports);
    }

    _parsePython(content: string): string[] {
        const imports = new Set<string>();

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
    async buildEdges(rootFolder: FolderNode): Promise<FolderEdge[]> {
        const edges: Edge[] = [];

        // 1. Flatten files to a "node map" for resolution
        const fileMap = new Set<string>();
        const collectFiles = (node: FolderNode | FileNode) => {
            if (node.type === 'file') {
                fileMap.add(node.path);
            } else if ((node as FolderNode).children) {
                (node as FolderNode).children.forEach(collectFiles);
            }
        };
        collectFiles(rootFolder);

        // 2. Helper for resolution (Ported from FileGraphBuilder logic)
        const resolveImport = (sourceFile: string, importPath: string): string | null => {
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
        const traverse = async (folder: FolderNode) => {
            if (!folder.children) return;

            for (const child of folder.children) {
                if (child.type === 'folder') {
                    await traverse(child as FolderNode);
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
        const folderEdges: FolderEdge[] = [];
        const folderMap = new Map<string, FolderEdge>();

        for (const edge of edges) {
            const srcFolder = path.dirname(edge.source);
            const dstFolder = path.dirname(edge.target);

            if (srcFolder !== dstFolder) {
                const key = `${srcFolder}|${dstFolder}`;
                if (!folderMap.has(key)) {
                    folderMap.set(key, { source: srcFolder, target: dstFolder, weight: 0 });
                }
                const entry = folderMap.get(key)!;
                entry.weight++;
            }
        }

        return Array.from(folderMap.values());
    }

    _tryExtensions(basePath: string, fileMap: Set<string>): string | null {
        // Exact match
        if (fileMap.has(basePath)) return basePath;

        // Extensions
        const exts = ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.svelte', '.h', '.hh', '.hpp', '.c', '.cc', '.cpp', '.py'];
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
