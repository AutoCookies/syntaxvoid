/**
 * Deterministic risk scoring formula
 * Same graph → same score (no randomness, no time dependency)
 */

import { RiskMetrics, NodeRisk } from '../types/risk';

/**
 * Risk level thresholds
 */
const RISK_THRESHOLDS = {
    LOW: 3.0,
    MEDIUM: 6.0,
    HIGH: 8.0
} as const;

/**
 * Normalize a value to [0, 1] range
 */
function normalize(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.min(1.0, value / max);
}

/**
 * Calculate deterministic risk score for a node
 * 
 * Formula:
 * riskScore = (
 *     normalize(hubScore, maxHub) * 0.40 +
 *     (circularParticipation ? 0.25 : 0.0) +
 *     log10(downstreamRadius + 1) / log10(maxRadius + 1) * 0.25 +
 *     normalize(centralityScore, maxCentrality) * 0.10
 * ) * 10
 * 
 * Weights:
 * - Hub connectivity: 40% (how connected this node is)
 * - Circular participation: 25% (fixed penalty for being in a cycle)
 * - Downstream radius: 25% (how far impact propagates)
 * - Centrality: 10% (how critical this node is for graph connectivity)
 * 
 * @param metrics - Node metrics
 * @param maxValues - Maximum values for normalization
 * @returns Risk score on 0-10 scale
 */
export function calculateRiskScore(
    metrics: RiskMetrics,
    maxValues: {
        maxHub: number;
        maxRadius: number;
        maxCentrality: number;
    }
): number {
    const hubComponent = normalize(metrics.hubScore, maxValues.maxHub) * 0.40;

    const circularComponent = metrics.circularParticipation ? 0.25 : 0.0;

    // Logarithmic scaling for radius to avoid over-penalizing deep graphs
    const radiusComponent = maxValues.maxRadius > 0
        ? (Math.log10(metrics.downstreamRadius + 1) / Math.log10(maxValues.maxRadius + 1)) * 0.25
        : 0.0;

    const centralityComponent = normalize(metrics.centralityScore, maxValues.maxCentrality) * 0.10;

    const rawScore = (hubComponent + circularComponent + radiusComponent + centralityComponent) * 10;

    // Clamp to [0, 10]
    return Math.max(0, Math.min(10, rawScore));
}

/**
 * Categorize risk score into risk level
 */
export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score < RISK_THRESHOLDS.LOW) return "low";
    if (score < RISK_THRESHOLDS.MEDIUM) return "medium";
    if (score < RISK_THRESHOLDS.HIGH) return "high";
    return "critical";
}

/**
 * Create a NodeRisk object from metrics
 */
export function createNodeRisk(
    nodeId: string,
    metrics: RiskMetrics,
    maxValues: {
        maxHub: number;
        maxRadius: number;
        maxCentrality: number;
    }
): NodeRisk {
    const riskScore = calculateRiskScore(metrics, maxValues);
    const riskLevel = getRiskLevel(riskScore);

    return {
        nodeId,
        metrics,
        riskScore,
        riskLevel
    };
}
