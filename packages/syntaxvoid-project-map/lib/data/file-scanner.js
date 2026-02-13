'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Async recursive file scanner with gitignore-aware directory skipping.
 * Returns a folder tree with file counts for treemap sizing.
 *
 * Reusable by Agent system — no DOM dependencies.
 */
class FileScanner {
    /**
     * @param {Object} opts
     * @param {number} opts.maxFiles - stop after this many files
     * @param {Set<string>} opts.ignoredDirs - directory basenames to skip
     */
    constructor(opts = {}) {
        this.maxFiles = opts.maxFiles || 10000;
        this.ignoredDirs = opts.ignoredDirs || new Set([
            'node_modules', '.git', 'dist', 'build', 'out',
            '.next', '.cache', 'vendor', 'coverage'
        ]);
        this.totalFiles = 0;
        this.aborted = false;
    }

    /**
     * Scan a directory tree and return folder nodes.
     * @param {string} rootPath - absolute path to scan
     * @returns {Promise<FolderNode>}
     *
     * FolderNode = {
     *   name: string,
     *   path: string,
     *   fileCount: number,       // direct files
     *   totalFileCount: number,  // recursive
     *   files: string[],         // direct file paths
     *   children: FolderNode[]
     * }
     */
    async scan(rootPath) {
        this.totalFiles = 0;
        this.aborted = false;
        return this._scanFolder(rootPath);
    }

    async _scanFolder(folderPath, currentDepth = 0) {
        if (this.aborted || this.totalFiles >= this.maxFiles) return null;

        const folderName = path.basename(folderPath);
        const children = [];
        let folderSize = 0; // based on file count

        try {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                if (this.aborted || this.totalFiles >= this.maxFiles) break;

                const fullPath = path.join(folderPath, entry.name);

                if (entry.isDirectory()) {
                    if (this._isIgnored(entry.name)) continue;

                    const childFolder = await this._scanFolder(fullPath, currentDepth + 1);
                    if (childFolder) {
                        children.push(childFolder);
                        folderSize += childFolder.totalFileCount;
                    }
                } else if (entry.isFile()) {
                    if (this._isIgnored(entry.name)) continue;

                    children.push({
                        type: 'file',
                        name: entry.name,
                        path: fullPath,
                        size: (await fs.promises.stat(fullPath)).size
                    });
                    this.totalFiles++;
                    folderSize++;
                }
            }
        } catch (err) {
            console.warn(`Failed to scan ${folderPath}:`, err);
        }

        return {
            type: 'folder',
            name: folderName,
            path: folderPath,
            children,
            totalFileCount: folderSize,
            depth: currentDepth
        };
    }

    _isIgnored(name) {
        return this.ignoredDirs.has(name) || name.startsWith('.');
    }

    /** Cancel an in-progress scan */
    abort() {
        this.aborted = true;
    }
}

module.exports = FileScanner;
