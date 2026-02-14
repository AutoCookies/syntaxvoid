import { FileNode, Edge, GraphSnapshot } from '../types';
interface RenderNode extends FileNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    r: number;
}
interface RenderOptions {
    showLinks?: boolean;
    circularOnly?: boolean;
    filterText?: string;
}
/**
 * Renders the file dependency graph using a Force-Directed Layout.
 * - Nodes: Circles
 * - Edges: Lines/Curves
 * - Interaction: Drag, Zoom, Pan (handled by View)
 */
export default class FileGraphRenderer {
    nodes: RenderNode[];
    edges: Edge[];
    width: number;
    height: number;
    transform: {
        k: number;
        x: number;
        y: number;
    };
    constructor();
    layout(graph: GraphSnapshot, width: number, height: number): RenderNode[];
    _tick(w: number, h: number): void;
    getNode(path: string): RenderNode | undefined;
    hitTest(x: number, y: number): RenderNode | null;
    draw(ctx: CanvasRenderingContext2D, nodes: RenderNode[], edges: Edge[], hoveredNode: RenderNode | null, opts?: RenderOptions): void;
}
export {};
