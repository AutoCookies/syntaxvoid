"use strict";
/**
 * Adapter for patch-governor integration
 * Provides read-only risk evaluation API without circular dependency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRiskEvaluationService = createRiskEvaluationService;
/**
 * Create risk evaluation service provider
 * This function is called by patch-governor via service consumption
 */
function createRiskEvaluationService(riskEngine, policyEngine) {
    return {
        async evaluatePatchRisk(filePaths) {
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
            }
            catch (error) {
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
        isPolicyEnabled() {
            return policyEngine.getPolicy().enabled;
        }
    };
}
