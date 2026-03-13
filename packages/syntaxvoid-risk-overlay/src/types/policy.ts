/**
 * Policy enforcement types for risk governance
 */

/**
 * Risk policy configuration
 */
export interface RiskPolicy {
    /** Maximum allowed risk score for changes (0-10) */
    maxAllowedRisk: number;

    /** If true, block any changes to nodes with 'critical' risk level */
    blockCriticalNodes: boolean;

    /** Risk score threshold requiring explicit user approval */
    requireApprovalThreshold: number;

    /** Whether policy enforcement is enabled */
    enabled: boolean;
}

/**
 * Severity level for policy violations
 */
export type ViolationSeverity = "warning" | "block";

/**
 * Represents a single policy violation for a node
 */
export interface PolicyViolation {
    /** Node identifier that violates policy */
    nodeId: string;

    /** Current risk score of the node */
    currentRisk: number;

    /** Risk level of the node */
    riskLevel: "low" | "medium" | "high" | "critical";

    /** Policy threshold that was exceeded */
    threshold: number;

    /** How severe this violation is */
    severity: ViolationSeverity;

    /** Human-readable violation message */
    message: string;
}

/**
 * Result of evaluating file changes against risk policy
 */
export interface PolicyEvaluationResult {
    /** Whether the change is allowed under current policy */
    allowed: boolean;

    /** List of policy violations (if any) */
    violations: PolicyViolation[];

    /** Whether user override/approval is required */
    overrideRequired: boolean;

    /** Summary message for display */
    summary: string;
}
