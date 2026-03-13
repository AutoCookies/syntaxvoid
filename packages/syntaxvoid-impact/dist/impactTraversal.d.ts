import { GraphSnapshot, ImpactOptions, ImpactResult } from './types/impact';
/**
 * Pure function to compute impact analysis on a graph snapshot.
 * Uses strict typing and avoids cycles.
 */
export declare function computeImpact(rootId: string, graph: GraphSnapshot, options: ImpactOptions): ImpactResult;
