/**
 * Core risk analysis types for syntaxvoid-risk-overlay
 * All types are deterministic and properly typed (no 'any')
 */
/**
 * Metrics computed for each node to assess structural risk
 */
export interface RiskMetrics {
    /** Hub score: inDegree + outDegree */
    hubScore: number;
    /** Maximum BFS depth to any leaf node (downstream impact radius) */
    downstreamRadius: number;
    /** Whether this node participates in any circular dependency */
    circularParticipation: boolean;
    /** Betweenness centrality score (0-1, normalized) */
    centralityScore: number;
}
/**
 * Risk assessment for a single node in the graph
 */
export interface NodeRisk {
    /** Unique node identifier (file path) */
    nodeId: string;
    /** Computed metrics used for risk calculation */
    metrics: RiskMetrics;
    /** Final risk score (0-10 scale, deterministic) */
    riskScore: number;
    /** Categorized risk level based on score thresholds */
    riskLevel: "low" | "medium" | "high" | "critical";
}
/**
 * Complete risk snapshot for the entire project at a specific graph version
 */
export interface ProjectRiskSnapshot {
    /** Graph version this snapshot corresponds to */
    version: number;
    /** Timestamp when computed (for history tracking) */
    computedAt: number;
    /** Map of nodeId to risk assessment */
    nodes: Record<string, NodeRisk>;
    /** Maximum risk score in the project */
    maxRisk: number;
    /** Average risk score across all nodes */
    averageRisk: number;
    /** Count of nodes with risk level >= 'high' */
    highRiskCount: number;
}
/**
 * Tracks changes in risk between two graph versions
 */
export interface RiskDelta {
    /** Source version */
    versionFrom: number;
    /** Target version */
    versionTo: number;
    /** Node IDs where risk level increased */
    increased: string[];
    /** Node IDs where risk level decreased */
    decreased: string[];
    /** Node IDs that were added in target version */
    newNodes: string[];
    /** Node IDs that were removed in target version */
    removedNodes: string[];
}
/**
 * Minimal history entry for persistence (append-only JSONL)
 */
export interface RiskHistoryEntry {
    /** Graph version */
    version: number;
    /** Average risk score */
    avgRisk: number;
    /** Maximum risk score */
    maxRisk: number;
    /** Count of high-risk nodes */
    highRiskCount: number;
    /** Unix timestamp */
    timestamp: number;
}
