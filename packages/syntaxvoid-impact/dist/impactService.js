"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactService = void 0;
const atom_1 = require("atom");
const impactTraversal_1 = require("./impactTraversal");
class ImpactService {
    constructor() {
        this.graphProvider = null;
        this.emitter = new atom_1.Emitter();
        this.subscriptions = new atom_1.CompositeDisposable();
        this.cache = new Map();
    }
    consumeGraphProvider(provider) {
        this.graphProvider = provider;
        console.log('[ImpactService] Consumed graph provider');
        const sub = this.graphProvider.onDidUpdate(() => {
            this.cache.clear(); // Invalidate cache on graph update
            this.emitter.emit('did-update-graph');
        });
        return new atom_1.Disposable(() => {
            sub.dispose();
            this.graphProvider = null;
        });
    }
    computeImpact(filePath, options) {
        if (!this.graphProvider) {
            console.warn('[ImpactService] No graph provider available');
            return null;
        }
        const snapshot = this.graphProvider.getSnapshot();
        if (!snapshot) {
            console.warn('[ImpactService] Graph snapshot not available');
            return null;
        }
        const version = this.graphProvider.getVersion();
        const cacheKey = `${filePath}:${options.depth}:${options.direction}`;
        if (this.cache.has(cacheKey)) {
            const entry = this.cache.get(cacheKey);
            if (entry.graphVersion === version) {
                return entry.result;
            }
        }
        console.log(`[ImpactService] Computing impact for ${filePath}`);
        const result = (0, impactTraversal_1.computeImpact)(filePath, snapshot, options);
        this.cache.set(cacheKey, {
            graphVersion: version,
            result
        });
        return result;
    }
    onDidUpdateGraph(callback) {
        return this.emitter.on('did-update-graph', callback);
    }
    dispose() {
        this.emitter.dispose();
        this.subscriptions.dispose();
        this.cache.clear();
    }
}
exports.ImpactService = ImpactService;
