/**
 * Risk delta tracking between graph versions
 */

import { ProjectRiskSnapshot, RiskDelta } from '../types/risk';

/**
 * Compute risk delta between two snapshots
 */
export function computeRiskDelta(
    prev: ProjectRiskSnapshot,
    current: ProjectRiskSnapshot
): RiskDelta {
    const increased: string[] = [];
    const decreased: string[] = [];
    const newNodes: string[] = [];
    const removedNodes: string[] = [];

    const prevNodeIds = new Set(Object.keys(prev.nodes));
    const currentNodeIds = new Set(Object.keys(current.nodes));

    // Find new nodes
    for (const nodeId of currentNodeIds) {
        if (!prevNodeIds.has(nodeId)) {
            newNodes.push(nodeId);
        }
    }

    // Find removed nodes
    for (const nodeId of prevNodeIds) {
        if (!currentNodeIds.has(nodeId)) {
            removedNodes.push(nodeId);
        }
    }

    // Compare risk levels for common nodes
    for (const nodeId of currentNodeIds) {
        if (prevNodeIds.has(nodeId)) {
            const prevRisk = prev.nodes[nodeId];
            const currentRisk = current.nodes[nodeId];

            // Compare risk levels (not just scores for stability)
            const prevLevel = getRiskLevelValue(prevRisk.riskLevel);
            const currentLevel = getRiskLevelValue(currentRisk.riskLevel);

            if (currentLevel > prevLevel) {
                increased.push(nodeId);
            } else if (currentLevel < prevLevel) {
                decreased.push(nodeId);
            }
        }
    }

    return {
        versionFrom: prev.version,
        versionTo: current.version,
        increased,
        decreased,
        newNodes,
        removedNodes
    };
}

/**
 * Convert risk level to numeric value for comparison
 */
function getRiskLevelValue(level: "low" | "medium" | "high" | "critical"): number {
    switch (level) {
        case "low": return 0;
        case "medium": return 1;
        case "high": return 2;
        case "critical": return 3;
    }
}

/**
 * Format delta for human-readable output
 */
export function formatRiskDelta(delta: RiskDelta): string {
    const lines: string[] = [];

    lines.push(`\nRisk Delta (v${delta.versionFrom} → v${delta.versionTo}):`);
    lines.push('─'.repeat(50));

    if (delta.increased.length > 0) {
        lines.push(`\n📈 Risk Increased (${delta.increased.length}):`);
        delta.increased.slice(0, 10).forEach(nodeId => {
            lines.push(`  • ${nodeId}`);
        });
        if (delta.increased.length > 10) {
            lines.push(`  ... and ${delta.increased.length - 10} more`);
        }
    }

    if (delta.decreased.length > 0) {
        lines.push(`\n📉 Risk Decreased (${delta.decreased.length}):`);
        delta.decreased.slice(0, 10).forEach(nodeId => {
            lines.push(`  • ${nodeId}`);
        });
        if (delta.decreased.length > 10) {
            lines.push(`  ... and ${delta.decreased.length - 10} more`);
        }
    }

    if (delta.newNodes.length > 0) {
        lines.push(`\n➕ New Nodes (${delta.newNodes.length}):`);
        delta.newNodes.slice(0, 5).forEach(nodeId => {
            lines.push(`  • ${nodeId}`);
        });
        if (delta.newNodes.length > 5) {
            lines.push(`  ... and ${delta.newNodes.length - 5} more`);
        }
    }

    if (delta.removedNodes.length > 0) {
        lines.push(`\n➖ Removed Nodes (${delta.removedNodes.length}):`);
        delta.removedNodes.slice(0, 5).forEach(nodeId => {
            lines.push(`  • ${nodeId}`);
        });
        if (delta.removedNodes.length > 5) {
            lines.push(`  ... and ${delta.removedNodes.length - 5} more`);
        }
    }

    if (delta.increased.length === 0 && delta.decreased.length === 0 &&
        delta.newNodes.length === 0 && delta.removedNodes.length === 0) {
        lines.push('\n✓ No significant risk changes detected');
    }

    return lines.join('\n');
}
