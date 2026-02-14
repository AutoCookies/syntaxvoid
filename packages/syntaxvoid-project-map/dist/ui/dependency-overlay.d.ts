interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface OverlayOptions {
    showLinks?: boolean;
    circularOnly?: boolean;
}
interface Edge {
    source: string;
    target: string;
    weight?: number;
    count?: number;
}
/**
 * Draws curved dependency links between folder rects on a canvas.
 * Highlights circular dependencies with red glow.
 * Polished: Better curves, opacity management, and direction indicators.
 */
export default class DependencyOverlay {
    showLinks: boolean;
    circularOnly: boolean;
    /**
     * @param opts
     */
    constructor(opts?: OverlayOptions);
    /**
     * Draw all dependency links on the canvas.
     * @param ctx
     * @param edges - [{source, target, count}]
     * @param circularEdges - "source|target" keys
     * @param rectMap - folderPath -> rect
     * @param hoveredRect - Currently hovered rect for highlighting
     */
    draw(ctx: CanvasRenderingContext2D, edges: Edge[], circularEdges: Set<string>, rectMap: Map<string, Rect>, hoveredRect?: Rect | null): void;
    _drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string): void;
}
export {};
