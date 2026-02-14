import { Disposable } from 'atom';
import { ImpactResult, ImpactOptions } from './types/impact';
import { ProjectGraphProvider } from './graphAdapter';
export declare class ImpactService {
    private emitter;
    private subscriptions;
    private graphProvider;
    private cache;
    constructor();
    consumeGraphProvider(provider: ProjectGraphProvider): Disposable;
    computeImpact(filePath: string, options: ImpactOptions): ImpactResult | null;
    onDidUpdateGraph(callback: () => void): Disposable;
    dispose(): void;
}
