'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const file_scanner_1 = __importDefault(require("./file-scanner"));
const import_parser_1 = __importDefault(require("./import-parser"));
const cycle_detector_1 = __importDefault(require("./cycle-detector"));
/**
 * Orchestrates scanning, import parsing, and cycle detection.
 * Emits 'did-update' when the graph model changes.
 *
 * Reusable by Agent system — only depends on atom.Emitter for events.
 * Can be adapted to use Node EventEmitter for standalone use.
 */
class GraphBuilder {
    constructor() {
        this.emitter = new atom_1.Emitter();
        this.scanner = null;
        this.parser = new import_parser_1.default();
        this.cycleDetector = new cycle_detector_1.default();
        this.graph = null; // current graph model
        this.building = false;
        this._debounceTimer = null;
    }
    /**
     * The current graph model.
     */
    getGraph() {
        return this.graph;
    }
    /**
     * Build the full graph for a project root.
     */
    async build(rootPath, opts = {}) {
        if (this.building && this.scanner) {
            this.scanner.abort();
        }
        this.building = true;
        this.emitter.emit('did-start');
        try {
            this.scanner = new file_scanner_1.default({
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
            const edges = await this.parser.buildEdges(root);
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
        }
        catch (err) {
            this.emitter.emit('did-error', err);
            throw err;
        }
        finally {
            this.building = false;
        }
    }
    /**
     * Debounced rebuild — call on file save.
     */
    debouncedBuild(rootPath, opts = {}, debounceMs = 500) {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this.build(rootPath, opts);
        }, debounceMs);
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
exports.default = GraphBuilder;
