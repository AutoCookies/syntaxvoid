/**
 * Deterministic risk scoring formula
 * Same graph → same score (no randomness, no time dependency)
 */
import { RiskMetrics, NodeRisk } from '../types/risk';
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
export declare function calculateRiskScore(metrics: RiskMetrics, maxValues: {
    maxHub: number;
    maxRadius: number;
    maxCentrality: number;
}): number;
/**
 * Categorize risk score into risk level
 */
export declare function getRiskLevel(score: number): "low" | "medium" | "high" | "critical";
/**
 * Create a NodeRisk object from metrics
 */
export declare function createNodeRisk(nodeId: string, metrics: RiskMetrics, maxValues: {
    maxHub: number;
    maxRadius: number;
    maxCentrality: number;
}): NodeRisk;
