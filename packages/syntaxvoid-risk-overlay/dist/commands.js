"use strict";
/**
 * Slash command handlers for risk overlay
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdRiskSummary = cmdRiskSummary;
exports.cmdRiskTop = cmdRiskTop;
exports.cmdRiskDelta = cmdRiskDelta;
exports.cmdRiskPolicy = cmdRiskPolicy;
const deltaTracker_1 = require("./storage/deltaTracker");
/**
 * Command: /sv risk
 * Show overall risk summary
 */
async function cmdRiskSummary(riskEngine, historyStore) {
    try {
        const snapshot = riskEngine.getLatest();
        if (!snapshot) {
            return '📊 Risk Summary: No risk data available (graph not analyzed yet)';
        }
        const lines = [];
        lines.push('\n📊 Risk Summary');
        lines.push('─'.repeat(50));
        lines.push(`Version: ${snapshot.version}`);
        lines.push(`Computed: ${new Date(snapshot.computedAt).toLocaleString()}`);
        lines.push(`Total Nodes: ${Object.keys(snapshot.nodes).length}`);
        lines.push(`\nRisk Scores:`);
        lines.push(`  Max: ${snapshot.maxRisk.toFixed(2)}`);
        lines.push(`  Average: ${snapshot.averageRisk.toFixed(2)}`);
        lines.push(`  High-Risk Nodes: ${snapshot.highRiskCount}`);
        // Risk level distribution
        const levels = { low: 0, medium: 0, high: 0, critical: 0 };
        for (const nodeRisk of Object.values(snapshot.nodes)) {
            levels[nodeRisk.riskLevel]++;
        }
        lines.push(`\nRisk Distribution:`);
        lines.push(`  Low: ${levels.low}`);
        lines.push(`  Medium: ${levels.medium}`);
        lines.push(`  High: ${levels.high}`);
        lines.push(`  Critical: ${levels.critical}`);
        return lines.join('\n');
    }
    catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
/**
 * Command: /sv risk top [N]
 * Show top N highest risk nodes
 */
async function cmdRiskTop(riskEngine, limit = 10) {
    try {
        const snapshot = riskEngine.getLatest();
        if (!snapshot) {
            return '📊 Top Risk Nodes: No risk data available';
        }
        // Sort nodes by risk score descending
        const sortedNodes = Object.values(snapshot.nodes)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, limit);
        const lines = [];
        lines.push(`\n📊 Top ${limit} Highest Risk Nodes`);
        lines.push('─'.repeat(70));
        for (let i = 0; i < sortedNodes.length; i++) {
            const node = sortedNodes[i];
            const icon = getRiskIcon(node.riskLevel);
            const level = node.riskLevel.toUpperCase().padEnd(8);
            const score = node.riskScore.toFixed(2).padStart(5);
            lines.push(`${(i + 1).toString().padStart(2)}. ${icon} ${level} ${score} │ ${node.nodeId}`);
        }
        return lines.join('\n');
    }
    catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
/**
 * Command: /sv risk delta
 * Show risk changes since last version
 */
async function cmdRiskDelta(riskEngine, historyStore) {
    try {
        const current = riskEngine.getLatest();
        if (!current) {
            return '📊 Risk Delta: No current risk data available';
        }
        // Get previous snapshot from cache
        const allVersions = Array.from(riskEngine['cache'].keys()).sort((a, b) => b - a);
        if (allVersions.length < 2) {
            return '📊 Risk Delta: No previous version available for comparison';
        }
        const prevVersion = allVersions[1];
        const prev = riskEngine.getCached(prevVersion);
        if (!prev) {
            return '📊 Risk Delta: Previous snapshot not found in cache';
        }
        const delta = (0, deltaTracker_1.computeRiskDelta)(prev, current);
        return (0, deltaTracker_1.formatRiskDelta)(delta);
    }
    catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
/**
 * Command: /sv risk policy
 * Display current policy settings
 */
async function cmdRiskPolicy(policyEngine) {
    try {
        const policy = policyEngine.getPolicy();
        const lines = [];
        lines.push('\n⚙️  Risk Policy Configuration');
        lines.push('─'.repeat(50));
        lines.push(`Enabled: ${policy.enabled ? '✓ YES' : '✗ NO'}`);
        lines.push(`Max Allowed Risk: ${policy.maxAllowedRisk.toFixed(1)}`);
        lines.push(`Block Critical Nodes: ${policy.blockCriticalNodes ? '✓ YES' : '✗ NO'}`);
        lines.push(`Approval Threshold: ${policy.requireApprovalThreshold.toFixed(1)}`);
        return lines.join('\n');
    }
    catch (error) {
        return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
/**
 * Get icon for risk level
 */
function getRiskIcon(level) {
    switch (level) {
        case "low": return "✓";
        case "medium": return "⚠";
        case "high": return "⚠";
        case "critical": return "❌";
    }
}
