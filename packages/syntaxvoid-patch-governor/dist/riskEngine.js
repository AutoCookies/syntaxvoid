"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngine = void 0;
const atom_1 = require("atom");
/**
 * Computes risk for a patch proposal.
 * Uses heuristics and syntaxvoid-impact service if available.
 */
class RiskEngine {
    constructor() {
        this.impactService = null;
    }
    consumeImpactService(service) {
        this.impactService = service;
        return new atom_1.Disposable(() => { this.impactService = null; });
    }
    async computeRisk(proposal) {
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
                if (file.kind !== 'modify' && file.kind !== 'delete')
                    continue;
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
                            if (impact.circular)
                                circular = true;
                            hubScore += impact.hubScore;
                        }
                    }
                }
                catch (e) {
                    console.warn('[RiskEngine] Impact analysis failed for', file.path, e);
                }
            }
        }
        // Risk Heuristics
        if (impactDownstream > 50)
            riskScore += 3;
        if (impactUpstream > 20)
            riskScore += 2; // Many depend on this
        if (circular)
            riskScore += 5; // Circular dependency touches are risky
        if (hubScore > 100)
            riskScore += 2; // High fan-in/fan-out
        return {
            impactUpstream,
            impactDownstream,
            circular,
            hubScore,
            riskScore
        };
    }
    _resolvePath(p) {
        // If absolute, return.
        if (path.isAbsolute(p))
            return p;
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
exports.RiskEngine = RiskEngine;
const path = __importStar(require("path"));
