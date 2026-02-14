/**
 * Canvas-based risk overlay renderer
 * Renders risk heatmap over project map treemap
 */
import { ProjectRiskSnapshot } from '../types/risk';
interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
/**
 * Risk overlay renderer
 */
export declare class RiskOverlay {
    private enabled;
    private currentVersion;
    private snapshot;
    constructor();
    setSnapshot(snapshot: ProjectRiskSnapshot): void;
    enable(): void;
    disable(): void;
    toggle(): void;
    isEnabled(): boolean;
    /**
     * Render risk heatmap on canvas
     */
    render(ctx: CanvasRenderingContext2D, rectMap: Map<string, Rect>, hoveredRect?: Rect | null): void;
    /**
     * Get color for risk level
     */
    private getRiskColor;
    /**
     * Render risk score label
     */
    private renderLabel;
    /**
     * Clear overlay state
     */
    clear(): void;
}
export {};
