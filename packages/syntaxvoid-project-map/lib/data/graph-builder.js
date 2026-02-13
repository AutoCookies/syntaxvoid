'use strict';

const { Emitter } = require('atom');
const FileScanner = require('./file-scanner');
const ImportParser = require('./import-parser');
const CycleDetector = require('./cycle-detector');

/**
 * Orchestrates scanning, import parsing, and cycle detection.
 * Emits 'did-update' when the graph model changes.
 *
 * Reusable by Agent system — only depends on atom.Emitter for events.
 * Can be adapted to use Node EventEmitter for standalone use.
 */
class GraphBuilder {
    constructor() {
        this.emitter = new Emitter();
        this.scanner = null;
        this.parser = new ImportParser();
        this.cycleDetector = new CycleDetector();

        this.graph = null;     // current graph model
        this.building = false;
        this._debounceTimer = null;
    }

    /**
     * The current graph model.
     * @returns {GraphModel|null}
     *
     * GraphModel = {
     *   root: FolderNode,
     *   edges: Edge[],
     *   circularEdges: Set<string>,
     *   totalFiles: number,
     *   aborted: boolean
     * }
     */
    getGraph() {
        return this.graph;
    }

    /**
     * Build the full graph for a project root.
     * @param {string} rootPath
     * @param {Object} opts
     * @param {number} opts.maxFiles
     * @param {Set<string>} opts.ignoredDirs
     * @returns {Promise<GraphModel>}
     */
    async build(rootPath, opts = {}) {
        if (this.building && this.scanner) {
            this.scanner.abort();
        }

        this.building = true;
        this.emitter.emit('did-start');

        try {
            this.scanner = new FileScanner({
                maxFiles: opts.maxFiles || 10000,
                ignoredDirs: opts.ignoredDirs
            });

            const root = await this.scanner.scan(rootPath);
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
        } catch (err) {
            this.emitter.emit('did-error', err);
            throw err;
        } finally {
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

module.exports = GraphBuilder;
