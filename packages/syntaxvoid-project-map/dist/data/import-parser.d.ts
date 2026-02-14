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
    constructor();
    parse(filePath: string): Promise<string[]>;
    _parseJS(content: string): string[];
    _parseCpp(content: string): string[];
    _parsePython(content: string): string[];
    /**
     * Legacy method for Folder GraphBuilder.
     * Aggregates parsing results from a folder structure.
     */
    buildEdges(rootFolder: FolderNode): Promise<FolderEdge[]>;
    _tryExtensions(basePath: string, fileMap: Set<string>): string | null;
}
export {};
