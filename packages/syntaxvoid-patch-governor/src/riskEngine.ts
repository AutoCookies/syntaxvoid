import { PatchProposal, RiskSummary } from './types/proposal';
// @ts-ignore
import { ImpactResult } from 'syntaxvoid-impact';
import { Disposable } from 'atom';

interface ImpactService {
    computeImpact(filePath: string, options: any): ImpactResult | null;
}

/**
 * Computes risk for a patch proposal.
 * Uses heuristics and syntaxvoid-impact service if available.
 */
export class RiskEngine {
    private impactService: ImpactService | null = null;

    consumeImpactService(service: ImpactService): Disposable {
        this.impactService = service;
        return new Disposable(() => { this.impactService = null; });
    }

    async computeRisk(proposal: PatchProposal): Promise<RiskSummary> {
        let riskScore = 0;
        let impactUpstream = 0;
        let impactDownstream = 0;
        let circular = false;
        let hubScore = 0;

        // 1. Analyze file count
        if (proposal.files.length > 1) {
            riskScore += (proposal.files.length - 1) * 2; // +2 per extra file
        }

        // 2. Analyze Delete operations (High Risk)
        const deletes = proposal.files.filter(f => f.kind === 'delete');
        if (deletes.length > 0) {
            riskScore += deletes.length * 5;
        }

        // 3. Impact Analysis (if service available)
        if (this.impactService) {
            for (const file of proposal.files) {
                // Only analyze existing files (modifies/deletes) or new files if linkable?
                // New files have no impact yet unless we parse content.
                // Assuming path exists for impact analysis.

                if (file.kind !== 'modify' && file.kind !== 'delete') continue;

                try {
                    // Start of integration: Need absolute path? Proposal paths often relative.
                    // Assume proposal paths are project-relative or absolute.
                    // We need to resolve to absolute.
                    const absPath = this._resolvePath(file.path);
                    if (absPath) {
                        const impact = this.impactService.computeImpact(absPath, { depth: 1, direction: 'both' });
                        if (impact) {
                            impactUpstream += impact.totalUpstream;
                            impactDownstream += impact.totalDownstream;
                            if (impact.circular) circular = true;
                            hubScore += impact.hubScore;
                        }
                    }
                } catch (e) {
                    console.warn('[RiskEngine] Impact analysis failed for', file.path, e);
                }
            }
        }

        // Risk Heuristics
        if (impactDownstream > 50) riskScore += 3;
        if (impactUpstream > 20) riskScore += 2; // Many depend on this
        if (circular) riskScore += 5; // Circular dependency touches are risky
        if (hubScore > 100) riskScore += 2; // High fan-in/fan-out

        return {
            impactUpstream,
            impactDownstream,
            circular,
            hubScore,
            riskScore
        };
    }

    private _resolvePath(p: string): string | null {
        // If absolute, return.
        if (path.isAbsolute(p)) return p;

        // Try to join with project paths
        const roots = atom.project.getPaths();
        for (const root of roots) {
            const candidate = path.join(root, p);
            // Check if exists?
            // fs.existsSync(candidate) ...
            // Simplified: return first guess for now or check existence
            return candidate;
        }
        return null;
    }
}
import * as path from 'path';
import * as fs from 'fs';
