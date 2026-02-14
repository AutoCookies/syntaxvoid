import { Emitter, CompositeDisposable, Disposable } from 'atom';
import { ImpactResult, ImpactOptions } from './types/impact';
import { ProjectGraphProvider } from './graphAdapter';
import { computeImpact } from './impactTraversal';

interface CacheEntry {
    graphVersion: number;
    result: ImpactResult;
}

export class ImpactService {
    private emitter: Emitter;
    private subscriptions: CompositeDisposable;
    private graphProvider: ProjectGraphProvider | null = null;
    private cache: Map<string, CacheEntry>;

    constructor() {
        this.emitter = new Emitter();
        this.subscriptions = new CompositeDisposable();
        this.cache = new Map();
    }

    consumeGraphProvider(provider: ProjectGraphProvider): Disposable {
        this.graphProvider = provider;
        console.log('[ImpactService] Consumed graph provider');

        const sub = this.graphProvider.onDidUpdate(() => {
            this.cache.clear(); // Invalidate cache on graph update
            this.emitter.emit('did-update-graph');
        });

        return new Disposable(() => {
            sub.dispose();
            this.graphProvider = null;
        });
    }

    computeImpact(filePath: string, options: ImpactOptions): ImpactResult | null {
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
            const entry = this.cache.get(cacheKey)!;
            if (entry.graphVersion === version) {
                return entry.result;
            }
        }

        console.log(`[ImpactService] Computing impact for ${filePath}`);
        const result = computeImpact(filePath, snapshot, options);

        this.cache.set(cacheKey, {
            graphVersion: version,
            result
        });

        return result;
    }

    onDidUpdateGraph(callback: () => void): Disposable {
        return this.emitter.on('did-update-graph', callback);
    }

    dispose() {
        this.emitter.dispose();
        this.subscriptions.dispose();
        this.cache.clear();
    }
}
