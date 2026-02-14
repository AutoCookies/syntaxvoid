import { PatchProposal, RiskSummary } from './types/proposal';
import { Disposable } from 'atom';
interface ImpactService {
    computeImpact(filePath: string, options: any): any;
}
/**
 * Computes risk for a patch proposal.
 * Uses heuristics and syntaxvoid-impact service if available.
 */
export declare class RiskEngine {
    private impactService;
    consumeImpactService(service: ImpactService): Disposable;
    computeRisk(proposal: PatchProposal): Promise<RiskSummary>;
    private _resolvePath;
}
export {};
