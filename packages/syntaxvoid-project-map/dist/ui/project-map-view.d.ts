import { CompositeDisposable, Disposable } from 'atom';
import GraphBuilder from '../data/graph-builder';
import FileGraphBuilder from '../data/file-graph-builder';
import TreemapRenderer, { Rect } from './treemap-renderer';
import FileGraphRenderer from './file-graph-renderer';
import DependencyOverlay from './dependency-overlay';
import InspectorPanel from './inspector-panel';
interface ProjectMapViewOptions {
    viewMode?: 'folder' | 'file';
    themeMode?: 'clean' | 'pixel';
    colorMode?: 'folder' | 'dependency' | 'heatmap';
    zoomLevel?: number;
    panOffset?: {
        x: number;
        y: number;
    };
}
/**
 * Dock panel view for the project topology visualization.
 * Refactored for "SyntaxVoid Polish" with 3-pane layout and design system.
 */
export default class ProjectMapView {
    static URI: string;
    subscriptions: CompositeDisposable;
    graphBuilder: GraphBuilder;
    fileGraphBuilder: FileGraphBuilder;
    treemapRenderer: TreemapRenderer;
    fileGraphRenderer: FileGraphRenderer;
    viewMode: 'folder' | 'file';
    themeMode: 'clean' | 'pixel';
    colorMode: 'folder' | 'dependency' | 'heatmap';
    zoomLevel: number;
    panOffset: {
        x: number;
        y: number;
    };
    filterText: string;
    isDragging: boolean;
    lastMouse: {
        x: number;
        y: number;
    };
    overlay: DependencyOverlay;
    externalOverlays: Set<any>;
    rectMap: Map<string, Rect>;
    hoveredRect: any;
    _animFrame: number | null;
    inspector: InspectorPanel;
    element: HTMLElement;
    btnModeFolder: HTMLButtonElement;
    btnModeFile: HTMLButtonElement;
    btnTheme: HTMLButtonElement;
    btnColor: HTMLButtonElement;
    btnLinks: HTMLButtonElement;
    btnCircular: HTMLButtonElement;
    btnRescan: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    btnZoomIn: HTMLButtonElement;
    btnZoomOut: HTMLButtonElement;
    btnResetZoom: HTMLButtonElement;
    tooltip: HTMLElement;
    footer: HTMLElement;
    footerStatus: HTMLElement;
    statusBar: HTMLElement;
    searchInput: HTMLInputElement;
    highlightedNodes: Set<string> | null;
    highlightStyle: string;
    _resizeObserver: ResizeObserver | null;
    renderNodes: any[] | null;
    constructor(serializedState?: ProjectMapViewOptions);
    getTitle(): string;
    getURI(): string;
    getIconName(): string;
    getElement(): HTMLElement;
    addOverlay(overlay: any): Disposable;
    _updateUIState(): void;
    _createDOM(): void;
    _createSvButton(text: string, _iconOnly?: boolean): HTMLButtonElement;
    _createSeparator(): HTMLDivElement;
    _bindEvents(): void;
    _applyTheme(): void;
    /**
     * Highlights specific nodes in the view.
     * @param nodeIds - Array of file paths to highlight
     * @param style - 'impact' | 'search'
     */
    highlightNodes(nodeIds: string[], style?: string): void;
    _getProjectRoot(): any;
    _getIgnoredDirs(): Set<string>;
    _triggerBuild(): void;
    _debouncedRebuild(): void;
    _recalcLayout(w: number, h: number): void;
    _render(): void;
    _adjustZoom(delta: number): void;
    _onWheel(e: WheelEvent): void;
    _onMouseDown(e: MouseEvent): void;
    _onMouseUp(): void;
    _onDoubleClick(e: MouseEvent): void;
    _doPaint(): void;
    _drawRect(ctx: CanvasRenderingContext2D, rect: Rect): void;
    _onMouseMove(e: MouseEvent): void;
    _hideTooltip(): void;
    serialize(): {
        viewMode: "file" | "folder";
        themeMode: "pixel" | "clean";
        colorMode: "folder" | "dependency" | "heatmap";
        zoomLevel: number;
        panOffset: {
            x: number;
            y: number;
        };
    };
    destroy(): void;
}
export {};
