export interface ScannerFileNode {
    type: 'file';
    name: string;
    path: string;
    size: number;
}
export interface FolderNode {
    type: 'folder';
    name: string;
    path: string;
    children: (FolderNode | ScannerFileNode)[];
    totalFileCount: number;
    depth: number;
    fileCount?: number;
    files?: string[];
}
interface ScannerOptions {
    maxFiles?: number;
    ignoredDirs?: Set<string>;
}
/**
 * Async recursive file scanner with gitignore-aware directory skipping.
 * Returns a folder tree with file counts for treemap sizing.
 *
 * Reusable by Agent system — no DOM dependencies.
 */
export default class FileScanner {
    maxFiles: number;
    ignoredDirs: Set<string>;
    totalFiles: number;
    aborted: boolean;
    /**
     * @param opts
     * @param opts.maxFiles - stop after this many files
     * @param opts.ignoredDirs - directory basenames to skip
     */
    constructor(opts?: ScannerOptions);
    /**
     * Scan a directory tree and return folder nodes.
     * @param rootPath - absolute path to scan
     * @returns
     */
    scan(rootPath: string): Promise<FolderNode | null>;
    _scanFolder(folderPath: string, currentDepth?: number): Promise<FolderNode | null>;
    _isIgnored(name: string): boolean;
    /** Cancel an in-progress scan */
    abort(): void;
}
export {};
