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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Async recursive file scanner with gitignore-aware directory skipping.
 * Returns a folder tree with file counts for treemap sizing.
 *
 * Reusable by Agent system — no DOM dependencies.
 */
class FileScanner {
    /**
     * @param opts
     * @param opts.maxFiles - stop after this many files
     * @param opts.ignoredDirs - directory basenames to skip
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
     * @param rootPath - absolute path to scan
     * @returns
     */
    async scan(rootPath) {
        this.totalFiles = 0;
        this.aborted = false;
        return this._scanFolder(rootPath);
    }
    async _scanFolder(folderPath, currentDepth = 0) {
        if (this.aborted || this.totalFiles >= this.maxFiles)
            return null;
        const folderName = path.basename(folderPath);
        const children = [];
        let folderSize = 0; // based on file count
        try {
            const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
            for (const entry of entries) {
                if (this.aborted || this.totalFiles >= this.maxFiles)
                    break;
                const fullPath = path.join(folderPath, entry.name);
                if (entry.isDirectory()) {
                    if (this._isIgnored(entry.name))
                        continue;
                    const childFolder = await this._scanFolder(fullPath, currentDepth + 1);
                    if (childFolder) {
                        children.push(childFolder);
                        folderSize += childFolder.totalFileCount;
                    }
                }
                else if (entry.isFile()) {
                    if (this._isIgnored(entry.name))
                        continue;
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
        }
        catch (err) {
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
exports.default = FileScanner;
