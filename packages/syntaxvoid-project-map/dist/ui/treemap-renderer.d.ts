import { FolderNode } from '../data/file-scanner';
export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    folder: FolderNode;
    depth: number;
    color: string;
}
interface LayoutOptions {
    colorMode?: 'folder' | 'dependency' | 'heatmap';
}
/**
 * Squarified treemap layout algorithm.
 * Converts a folder tree into positioned rectangles for canvas rendering.
 * polished: padded, rounded, and aesthetically tuned.
 */
export default class TreemapRenderer {
    rects: Rect[];
    basePalette: string[];
    padding: number;
    constructor();
    /**
     * Compute layout rectangles from folder tree.
     * @param root
     * @param width - canvas width
     * @param height - canvas height
     * @param opts - { colorMode: 'folder'|'dependency'|'heatmap' }
     * @returns
     */
    layout(root: FolderNode | null, width: number, height: number, opts?: LayoutOptions): Rect[];
    /**
     * Squarified treemap: lays out children into a rectangle trying
     * to keep aspect ratios close to 1.
     */
    _squarify(children: FolderNode[], bounds: {
        x: number;
        y: number;
        w: number;
        h: number;
    }, totalSize: number, depth: number, opts: LayoutOptions): void;
    _layoutRow(items: FolderNode[], bounds: {
        x: number;
        y: number;
        w: number;
        h: number;
    }, totalSize: number, depth: number, opts: LayoutOptions): void;
    _worstAspect(row: FolderNode[], rowSize: number, bounds: {
        w: number;
        h: number;
    }, totalSize: number, isWide: boolean): number;
    _getColor(item: FolderNode, depth: number, opts: LayoutOptions): string;
    /**
     * Hit-test: find which rect contains (x, y).
     * Returns deepest (most specific) rect.
     */
    hitTest(x: number, y: number): Rect | null;
}
export {};
