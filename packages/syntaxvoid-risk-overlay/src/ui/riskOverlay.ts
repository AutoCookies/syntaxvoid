/**
 * Canvas-based risk overlay renderer
 * Renders risk heatmap over project map treemap
 */

import { ProjectRiskSnapshot, NodeRisk } from '../types/risk';

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Risk color mapping using UI Kit tokens
 */
const RISK_COLORS = {
    low: '#4caf50',      // Green (will map to --sv-success in production)
    medium: '#ff9800',   // Orange (will map to --sv-warning)
    high: '#f44336',     // Red (will map to --sv-danger)
    critical: '#9c27b0'  // Purple (will map to --sv-critical)
} as const;

/**
 * Risk overlay renderer
 */
export class RiskOverlay {
    private enabled: boolean;
    private currentVersion: number | null;
    private snapshot: ProjectRiskSnapshot | null = null;

    constructor() {
        this.enabled = false;
        this.currentVersion = null;
    }

    setSnapshot(snapshot: ProjectRiskSnapshot): void {
        this.snapshot = snapshot;
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
        this.currentVersion = null;
    }

    toggle(): void {
        this.enabled = !this.enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Render risk heatmap on canvas
     */
    render(
        ctx: CanvasRenderingContext2D,
        rectMap: Map<string, Rect>,
        hoveredRect: Rect | null = null
    ): void {
        if (!this.enabled || !this.snapshot) {
            return;
        }

        const riskSnapshot = this.snapshot;

        // Version guard removed: must re-render if rectMap changes (zoom/pan)
        // Optimization: Rely on requestAnimationFrame in parent view


        this.currentVersion = riskSnapshot.version;

        ctx.save();

        // Render each node's risk
        for (const [nodeId, rect] of rectMap) {
            const nodeRisk = riskSnapshot.nodes[nodeId];

            if (!nodeRisk) {
                // Node not in risk snapshot
                continue;
            }

            // Determine opacity based on hover state
            const isHovered = hoveredRect === rect;
            const baseAlpha = isHovered ? 0.8 : 0.5;

            // Get color for risk level
            const color = this.getRiskColor(nodeRisk);

            // Draw risk overlay rectangle
            ctx.fillStyle = color;
            ctx.globalAlpha = baseAlpha;
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

            // Draw border for high/critical risk
            if (nodeRisk.riskLevel === 'high' || nodeRisk.riskLevel === 'critical') {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.9;
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }

            // Draw risk score label for larger rects
            if (rect.w > 60 && rect.h > 40) {
                this.renderLabel(ctx, nodeRisk, rect);
            }
        }

        ctx.restore();
    }

    /**
     * Get color for risk level
     */
    private getRiskColor(nodeRisk: NodeRisk): string {
        // In production, should use CSS custom properties from UI Kit
        // For now, using hardcoded colors
        return RISK_COLORS[nodeRisk.riskLevel];
    }

    /**
     * Render risk score label
     */
    private renderLabel(
        ctx: CanvasRenderingContext2D,
        nodeRisk: NodeRisk,
        rect: Rect
    ): void {
        const score = nodeRisk.riskScore.toFixed(1);
        const label = `${score}`;

        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw background for better readability
        const textWidth = ctx.measureText(label).width;
        const bgX = rect.x + rect.w / 2 - textWidth / 2 - 4;
        const bgY = rect.y + rect.h / 2 - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bgX, bgY, textWidth + 8, 20);

        // Draw text
        ctx.fillStyle = '#fff';
        ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    /**
     * Clear overlay state
     */
    clear(): void {
        this.currentVersion = null;
    }
}
