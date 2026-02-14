/**
 * Risk policy engine for evaluating changes against risk thresholds
 */
import { RiskPolicy, PolicyEvaluationResult } from '../types/policy';
import { ProjectRiskSnapshot } from '../types/risk';
/**
 * Default risk policy
 */
export declare const DEFAULT_POLICY: RiskPolicy;
/**
 * Risk policy engine - read-only evaluation
 */
export declare class RiskPolicyEngine {
    private policy;
    constructor(policy?: RiskPolicy);
    /**
     * Evaluate file changes against risk policy
     */
    evaluateFiles(filePaths: string[], riskSnapshot: ProjectRiskSnapshot): PolicyEvaluationResult;
    /**
     * Build summary message
     */
    private buildSummary;
    /**
     * Update policy configuration
     */
    updatePolicy(policy: Partial<RiskPolicy>): void;
    /**
     * Get current policy
     */
    getPolicy(): RiskPolicy;
}
