'use strict';

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

    constructor() {
        this.rects = [];
        // Base palette (Strategy A - Depth/Folder)
        this.basePalette = [
            '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f39c12',
            '#1abc9c', '#e67e22', '#2980b9', '#27ae60', '#c0392b',
            '#8e44ad', '#d35400', '#16a085', '#f1c40f', '#7f8c8d'
        ];

        this.padding = 2; // Default padding
    }

    /**
     * Compute layout rectangles from folder tree.
     * @param root
     * @param width - canvas width
     * @param height - canvas height
     * @param opts - { colorMode: 'folder'|'dependency'|'heatmap' }
     * @returns
     */
    layout(root: FolderNode | null, width: number, height: number, opts: LayoutOptions = {}): Rect[] {
        this.rects = [];
        if (!root || root.totalFileCount === 0) return this.rects;

        // Apply global padding container
        const pad = 4;
        const rootChildren = root.children.filter(c => c.type === 'folder') as FolderNode[];
        // Note: Treemap usually only layouts folders? Or files too?
        // Original code: `root.children.length > 0 ? root.children : [root]`
        // And `_squarify` takes `children`.
        // If root has mixed files/folders, how does it handle?
        // _squarify: `sorted = children.filter(c => c.totalFileCount > 0)`
        // FileNodes don't have totalFileCount (only size).
        // Check FileScanner: `FolderNode` has `totalFileCount`. `ScannerFileNode` has `size`.
        // If `c.totalFileCount` is accessed on a FileNode, it's undefined.
        // `undefined > 0` is false. So files are filtered out?
        // If files are filtered out, then only folders appear in treemap.
        // This seems to be the intended behavior for "Folder Level" treemap.
        // Wait, `ScannerFileNode` has `size`.
        // If we want files in treemap, we need to handle them.
        // But original code: `.filter(c => c.totalFileCount > 0)` strongly suggests it expects folders or nodes with that prop.

        const childrenToLayout = rootChildren.length > 0 ? rootChildren : [root];
        // If root has no folder children, we layout root itself?

        this._squarify(childrenToLayout, {
            x: pad, y: pad, w: width - pad * 2, h: height - pad * 2
        }, root.totalFileCount, 0, opts);

        return this.rects;
    }

    /**
     * Squarified treemap: lays out children into a rectangle trying
     * to keep aspect ratios close to 1.
     */
    _squarify(children: FolderNode[], bounds: { x: number, y: number, w: number, h: number }, totalSize: number, depth: number, opts: LayoutOptions) {
        if (children.length === 0 || bounds.w < 2 || bounds.h < 2) return;

        // Sort children by size descending for better layout
        const sorted = children
            .filter(c => c.totalFileCount > 0)
            .sort((a, b) => b.totalFileCount - a.totalFileCount);

        if (sorted.length === 0) return;

        this._layoutRow(sorted, bounds, totalSize, depth, opts);
    }

    _layoutRow(items: FolderNode[], bounds: { x: number, y: number, w: number, h: number }, totalSize: number, depth: number, opts: LayoutOptions) {
        if (items.length === 0 || bounds.w < 2 || bounds.h < 2) return;

        const isWide = bounds.w >= bounds.h;
        let remaining = [...items];
        let currentBounds = { ...bounds };

        while (remaining.length > 0 && currentBounds.w >= 2 && currentBounds.h >= 2) {
            // Find the best row
            const row: FolderNode[] = [];
            let rowSize = 0;
            const availableSize = remaining.reduce((s, c) => s + c.totalFileCount, 0);
            let bestAspect = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                row.push(remaining[i]);
                rowSize += remaining[i].totalFileCount;

                const aspect = this._worstAspect(row, rowSize, currentBounds, availableSize, isWide);
                if (aspect <= bestAspect) {
                    bestAspect = aspect;
                } else {
                    row.pop();
                    rowSize -= remaining[i].totalFileCount;
                    break;
                }
            }

            // Layout this row
            const rowFraction = rowSize / availableSize;
            let rowBounds: { x: number, y: number, w: number, h: number };

            if (isWide) {
                const rowW = currentBounds.w * rowFraction;
                rowBounds = { x: currentBounds.x, y: currentBounds.y, w: rowW, h: currentBounds.h };
                currentBounds = {
                    x: currentBounds.x + rowW,
                    y: currentBounds.y,
                    w: currentBounds.w - rowW,
                    h: currentBounds.h
                };
            } else {
                const rowH = currentBounds.h * rowFraction;
                rowBounds = { x: currentBounds.x, y: currentBounds.y, w: currentBounds.w, h: rowH };
                currentBounds = {
                    x: currentBounds.x,
                    y: currentBounds.y + rowH,
                    w: currentBounds.w,
                    h: currentBounds.h - rowH
                };
            }

            // Position items within the row
            let offset = 0;
            for (const item of row) {
                const itemFraction = item.totalFileCount / rowSize;
                let rect: Rect;

                if (isWide) {
                    const itemH = rowBounds.h * itemFraction;
                    rect = {
                        x: rowBounds.x,
                        y: rowBounds.y + offset,
                        w: rowBounds.w,
                        h: itemH,
                        folder: item,
                        depth,
                        color: this._getColor(item, depth, opts)
                    };
                    offset += itemH;
                } else {
                    const itemW = rowBounds.w * itemFraction;
                    rect = {
                        x: rowBounds.x + offset,
                        y: rowBounds.y,
                        w: itemW,
                        h: rowBounds.h,
                        folder: item,
                        depth,
                        color: this._getColor(item, depth, opts)
                    };
                    offset += itemW;
                }

                this.rects.push(rect);

                // Recurse into children with padding
                // Filter folder children only
                const folderChildren = item.children.filter(c => c.type === 'folder' && (c as FolderNode).totalFileCount > 0) as FolderNode[];

                if (folderChildren.length > 0 && rect.w > 20 && rect.h > 20) {
                    const pad = Math.max(1, 4 - depth); // Tighter padding effectively as we go deeper
                    const headerH = depth === 0 ? 18 : 12; // Header space

                    // Don't recurse if too small
                    if (rect.w > pad * 2 && rect.h > headerH + pad) {
                        this._squarify(folderChildren, {
                            x: rect.x + pad,
                            y: rect.y + headerH,
                            w: rect.w - pad * 2,
                            h: rect.h - headerH - pad
                        }, item.totalFileCount, depth + 1, opts);
                    }
                }
            }

            remaining = remaining.slice(row.length);
        }
    }

    _worstAspect(row: FolderNode[], rowSize: number, bounds: { w: number, h: number }, totalSize: number, isWide: boolean) {
        const fraction = rowSize / totalSize;
        const stripSize = isWide ? bounds.w * fraction : bounds.h * fraction;
        const stripLength = isWide ? bounds.h : bounds.w;

        let worst = 0;
        for (const item of row) {
            const itemFrac = item.totalFileCount / rowSize;
            const itemSize = stripLength * itemFrac;
            if (itemSize === 0 || stripSize === 0) continue;
            const aspect = Math.max(itemSize / stripSize, stripSize / itemSize);
            worst = Math.max(worst, aspect);
        }
        return worst;
    }

    _getColor(item: FolderNode, depth: number, opts: LayoutOptions) {
        const mode = opts.colorMode || 'folder';

        switch (mode) {
            case 'heatmap':
                // Heatmap: darker = more files
                // Normalize 0-500 files -> 0-1
                const count = item.totalFileCount;
                const heat = Math.min(1, Math.max(0.1, count / 50));
                // Red Scale
                return `rgba(231, 76, 60, ${0.2 + heat * 0.8})`;

            case 'dependency':
                // Not implemented fully yet (needs graph data passed to renderer)
                // Fallback to folder
                return this.basePalette[depth % this.basePalette.length];

            case 'folder':
            default:
                return this.basePalette[depth % this.basePalette.length];
        }
    }

    /**
     * Hit-test: find which rect contains (x, y).
     * Returns deepest (most specific) rect.
     */
    hitTest(x: number, y: number): Rect | null {
        let hit: Rect | null = null;
        for (const rect of this.rects) {
            if (x >= rect.x && x < rect.x + rect.w &&
                y >= rect.y && y < rect.y + rect.h) {
                if (!hit || rect.depth > hit.depth) {
                    hit = rect;
                }
            }
        }
        return hit;
    }
}
