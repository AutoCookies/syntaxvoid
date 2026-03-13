/**
 * Risk policy engine for evaluating changes against risk thresholds
 */

import { RiskPolicy, PolicyViolation, PolicyEvaluationResult, ViolationSeverity } from '../types/policy';
import { ProjectRiskSnapshot, NodeRisk } from '../types/risk';

/**
 * Default risk policy
 */
export const DEFAULT_POLICY: RiskPolicy = {
    maxAllowedRisk: 8.0,
    blockCriticalNodes: false,
    requireApprovalThreshold: 6.0,
    enabled: true
};

/**
 * Risk policy engine - read-only evaluation
 */
export class RiskPolicyEngine {
    private policy: RiskPolicy;

    constructor(policy: RiskPolicy = DEFAULT_POLICY) {
        this.policy = policy;
    }

    /**
     * Evaluate file changes against risk policy
     */
    evaluateFiles(
        filePaths: string[],
        riskSnapshot: ProjectRiskSnapshot
    ): PolicyEvaluationResult {
        if (!this.policy.enabled) {
            return {
                allowed: true,
                violations: [],
                overrideRequired: false,
                summary: 'Risk policy disabled'
            };
        }

        const violations: PolicyViolation[] = [];
        let hasBlockingViolation = false;
        let requiresApproval = false;

        for (const filePath of filePaths) {
            const nodeRisk = riskSnapshot.nodes[filePath];

            if (!nodeRisk) {
                // File not in risk snapshot (new file or not tracked)
                continue;
            }

            // Check critical node block
            if (this.policy.blockCriticalNodes && nodeRisk.riskLevel === 'critical') {
                violations.push({
                    nodeId: filePath,
                    currentRisk: nodeRisk.riskScore,
                    riskLevel: nodeRisk.riskLevel,
                    threshold: this.policy.maxAllowedRisk,
                    severity: 'block',
                    message: `Critical node change blocked: ${filePath} (risk: ${nodeRisk.riskScore.toFixed(2)})`
                });
                hasBlockingViolation = true;
                continue;
            }

            // Check max allowed risk
            if (nodeRisk.riskScore > this.policy.maxAllowedRisk) {
                violations.push({
                    nodeId: filePath,
                    currentRisk: nodeRisk.riskScore,
                    riskLevel: nodeRisk.riskLevel,
                    threshold: this.policy.maxAllowedRisk,
                    severity: 'block',
                    message: `Risk exceeds maximum: ${filePath} (${nodeRisk.riskScore.toFixed(2)} > ${this.policy.maxAllowedRisk})`
                });
                hasBlockingViolation = true;
                continue;
            }

            // Check approval threshold
            if (nodeRisk.riskScore >= this.policy.requireApprovalThreshold) {
                violations.push({
                    nodeId: filePath,
                    currentRisk: nodeRisk.riskScore,
                    riskLevel: nodeRisk.riskLevel,
                    threshold: this.policy.requireApprovalThreshold,
                    severity: 'warning',
                    message: `High-risk change requires approval: ${filePath} (risk: ${nodeRisk.riskScore.toFixed(2)})`
                });
                requiresApproval = true;
            }
        }

        const allowed = !hasBlockingViolation;
        const overrideRequired = !allowed || requiresApproval;

        const summary = this.buildSummary(violations, allowed, overrideRequired);

        return {
            allowed,
            violations,
            overrideRequired,
            summary
        };
    }

    /**
     * Build summary message
     */
    private buildSummary(
        violations: PolicyViolation[],
        allowed: boolean,
        overrideRequired: boolean
    ): string {
        if (violations.length === 0) {
            return '✓ All files pass risk policy';
        }

        const blockCount = violations.filter(v => v.severity === 'block').length;
        const warningCount = violations.filter(v => v.severity === 'warning').length;

        const parts: string[] = [];

        if (blockCount > 0) {
            parts.push(`${blockCount} blocking violation(s)`);
        }

        if (warningCount > 0) {
            parts.push(`${warningCount} warning(s)`);
        }

        const status = allowed ? '⚠️' : '❌';
        const action = allowed ? 'requires approval' : 'blocked';

        return `${status} Risk policy ${action}: ${parts.join(', ')}`;
    }

    /**
     * Update policy configuration
     */
    updatePolicy(policy: Partial<RiskPolicy>): void {
        this.policy = { ...this.policy, ...policy };
    }

    /**
     * Get current policy
     */
    getPolicy(): RiskPolicy {
        return { ...this.policy };
    }
}
