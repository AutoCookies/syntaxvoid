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
export function createRiskEvaluationService(
    riskEngine: RiskEngine,
    policyEngine: RiskPolicyEngine
): RiskEvaluationService {
    return {
        async evaluatePatchRisk(filePaths: string[]): Promise<PolicyEvaluationResult> {
            try {
                // Get latest risk snapshot from cache
                const snapshot = riskEngine.getLatest();

                if (!snapshot) {
                    // No risk data available yet
                    return {
                        allowed: true,
                        violations: [],
                        overrideRequired: false,
                        summary: 'No risk data available (graph not analyzed yet)'
                    };
                }

                // Evaluate files against policy
                return policyEngine.evaluateFiles(filePaths, snapshot);
            } catch (error) {
                console.error('[RiskAdapter] Failed to evaluate patch risk:', error);

                // Fail open (allow change but log error)
                return {
                    allowed: true,
                    violations: [],
                    overrideRequired: false,
                    summary: `Risk evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        },

        isPolicyEnabled(): boolean {
            return policyEngine.getPolicy().enabled;
        }
    };
}
