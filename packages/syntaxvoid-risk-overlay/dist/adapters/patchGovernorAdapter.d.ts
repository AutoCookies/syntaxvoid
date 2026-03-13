/**
 * Adapter for patch-governor integration
 * Provides read-only risk evaluation API without circular dependency
 */
import { PolicyEvaluationResult } from '../types/policy';
import { RiskEngine } from '../engine/riskEngine';
import { RiskPolicyEngine } from '../policy/riskPolicyEngine';
/**
 * Service interface for risk evaluation
 * Consumed by patch-governor package
 */
export interface RiskEvaluationService {
    /**
     * Evaluate risk for proposed file changes
     * @param filePaths - Absolute paths to files being modified
     * @returns Policy evaluation result
     */
    evaluatePatchRisk(filePaths: string[]): Promise<PolicyEvaluationResult>;
    /**
     * Check if risk policy is enabled
     */
    isPolicyEnabled(): boolean;
}
/**
 * Create risk evaluation service provider
 * This function is called by patch-governor via service consumption
 */
export declare function createRiskEvaluationService(riskEngine: RiskEngine, policyEngine: RiskPolicyEngine): RiskEvaluationService;
