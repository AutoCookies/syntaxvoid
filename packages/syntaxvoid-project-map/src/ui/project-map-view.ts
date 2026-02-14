'use strict';

import * as path from 'path';
import { CompositeDisposable, Disposable } from 'atom';
import GraphBuilder from '../data/graph-builder';
import FileGraphBuilder from '../data/file-graph-builder';
import TreemapRenderer, { Rect } from './treemap-renderer';
import FileGraphRenderer from './file-graph-renderer';
import DependencyOverlay from './dependency-overlay';
import InspectorPanel from './inspector-panel';
import { GraphSnapshot } from '../types';

// Ambient imports for legacy core
const settings: any = require('../../../../core/platform/settings');
const panels: any = require('../../../../core/platform/panels');
const paths: any = require('../../../../core/platform/paths');

const PROJECT_MAP_URI = 'atom://syntaxvoid-project-map';

interface ProjectMapViewOptions {
    viewMode?: 'folder' | 'file';
    themeMode?: 'clean' | 'pixel';
    colorMode?: 'folder' | 'dependency' | 'heatmap';
    zoomLevel?: number;
    panOffset?: { x: number, y: number };
}

/**
 * Dock panel view for the project topology visualization.
 * Refactored for "SyntaxVoid Polish" with 3-pane layout and design system.
 */
export default class ProjectMapView {
    static URI = PROJECT_MAP_URI;

    subscriptions: CompositeDisposable;
    graphBuilder: GraphBuilder;
    fileGraphBuilder: FileGraphBuilder;
    treemapRenderer: TreemapRenderer;
    fileGraphRenderer: FileGraphRenderer;

    viewMode: 'folder' | 'file';
    themeMode: 'clean' | 'pixel';
    colorMode: 'folder' | 'dependency' | 'heatmap';
    zoomLevel: number;
    panOffset: { x: number, y: number };
    filterText: string;
    isDragging: boolean;
    lastMouse: { x: number, y: number };

    overlay: DependencyOverlay;
    rectMap: Map<string, Rect>;
    hoveredRect: any; // Rect | RenderNode
    _animFrame: number | null;

    inspector: InspectorPanel;

    element!: HTMLElement; // Assigned in _createDOM
    btnModeFolder!: HTMLButtonElement;
    btnModeFile!: HTMLButtonElement;
    btnTheme!: HTMLButtonElement;
    btnColor!: HTMLButtonElement;
    btnLinks!: HTMLButtonElement;
    btnCircular!: HTMLButtonElement;
    btnRescan!: HTMLButtonElement;
    canvas!: HTMLCanvasElement;
    btnZoomIn!: HTMLButtonElement;
    btnZoomOut!: HTMLButtonElement;
    btnResetZoom!: HTMLButtonElement;
    tooltip!: HTMLElement;
    footer!: HTMLElement;
    footerStatus!: HTMLElement;
    statusBar!: HTMLElement;
    searchInput!: HTMLInputElement;

    highlightedNodes: Set<string> | null = null;
    highlightStyle: string = 'impact';
    _resizeObserver: ResizeObserver | null = null;

    constructor(serializedState?: ProjectMapViewOptions) {
        this.subscriptions = new CompositeDisposable();

        // Data
        this.graphBuilder = new GraphBuilder();
        this.fileGraphBuilder = new FileGraphBuilder();

        // Renderers
        this.treemapRenderer = new TreemapRenderer();
        this.fileGraphRenderer = new FileGraphRenderer();

        // State
        const state = serializedState || {};
        this.viewMode = state.viewMode || 'folder'; // 'folder' | 'file'
        this.themeMode = state.themeMode || 'clean';
        this.colorMode = state.colorMode || 'folder' as any; // Cast to avoid strict check if string mismatch
        this.zoomLevel = state.zoomLevel || 1.0;
        this.panOffset = state.panOffset || { x: 0, y: 0 };
        this.filterText = '';
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };

        this.overlay = new DependencyOverlay({
            showLinks: settings.get('syntaxvoid-project-map.showDependencyLinks'),
            circularOnly: settings.get('syntaxvoid-project-map.circularOnly')
        });

        this.rectMap = new Map();
        this.hoveredRect = null;
        this._animFrame = null;

        this.inspector = new InspectorPanel();

        this._createDOM();
        this._bindEvents();

        // Initialize Theme & updating UI state to match
        this._applyTheme();
        this._updateUIState();

        // Initial build
        this._triggerBuild();
    }

    _updateUIState() {
        // Mode switch
        if (this.viewMode === 'file') {
            this.btnModeFolder.classList.remove('active');
            this.btnModeFile.classList.add('active');
            // Hide folder specific controls?
        } else {
            this.btnModeFolder.classList.add('active');
            this.btnModeFile.classList.remove('active');
        }

        if (this.colorMode === 'heatmap') {
            const span = this.btnColor.querySelector('span');
            if (span) span.textContent = 'Heatmap';
            const i = this.btnColor.querySelector('i');
            if (i) i.className = 'icon icon-flame';
        } else {
            const span = this.btnColor.querySelector('span');
            if (span) span.textContent = 'Folder';
            const i = this.btnColor.querySelector('i');
            if (i) i.className = 'icon icon-repo';
        }
    }

    // ─── DOM Construction ────────────────────────────────────────────

    _createDOM() {
        this.element = document.createElement('div');
        this.element.classList.add('syntaxvoid-project-map');
        // Theme class added by _applyTheme

        // 1. Header
        const header = document.createElement('div');
        header.classList.add('project-map-header');

        const headerLeft = document.createElement('div');
        headerLeft.classList.add('header-left');

        const title = document.createElement('span');
        title.classList.add('header-title');
        title.textContent = 'Project Map';

        this.searchInput = document.createElement('input');
        this.searchInput.classList.add('search-input', 'native-key-bindings');
        this.searchInput.placeholder = 'Filter folders...';

        headerLeft.appendChild(title);
        headerLeft.appendChild(this.searchInput);

        const controls = document.createElement('div');
        controls.classList.add('header-controls');

        // Mode Switch (Folder | File)
        const modeGroup = document.createElement('div');
        modeGroup.classList.add('btn-group');
        modeGroup.style.marginRight = '8px';

        this.btnModeFolder = document.createElement('button');
        this.btnModeFolder.classList.add('btn', 'btn-sm'); // Pulsar classes
        this.btnModeFolder.textContent = 'Folders';

        this.btnModeFile = document.createElement('button');
        this.btnModeFile.classList.add('btn', 'btn-sm');
        this.btnModeFile.textContent = 'Files';

        modeGroup.appendChild(this.btnModeFolder);
        modeGroup.appendChild(this.btnModeFile);

        controls.appendChild(modeGroup);
        controls.appendChild(this._createSeparator());

        // Theme Toggle
        this.btnTheme = this._createButton('icon-paintcan', 'Theme', true);
        this.btnTheme.title = 'Toggle Clean/Pixel Mode';

        // Color Mode Toggle
        this.btnColor = this._createButton('icon-repo', 'Folder');
        this.btnColor.title = 'Switch Color Mode (Folder/Heatmap)';

        // View Toggles
        this.btnLinks = this._createButton('', 'Links');
        if (this.overlay.showLinks) this.btnLinks.classList.add('active');

        this.btnCircular = this._createButton('', 'Circular');
        if (this.overlay.circularOnly) this.btnCircular.classList.add('active');

        this.btnRescan = this._createButton('icon-sync', '', true);
        this.btnRescan.title = 'Rescan Project';

        controls.appendChild(this.btnTheme);
        controls.appendChild(this.btnColor);
        controls.appendChild(this._createSeparator());
        controls.appendChild(this.btnLinks);
        controls.appendChild(this.btnCircular);
        controls.appendChild(this._createSeparator());
        controls.appendChild(this.btnRescan);

        header.appendChild(headerLeft);
        header.appendChild(controls);
        this.element.appendChild(header);

        // 2. Body (Canvas + Inspector)
        const body = document.createElement('div');
        body.classList.add('project-map-body');

        // Canvas Container
        const canvasContainer = document.createElement('div');
        canvasContainer.classList.add('project-map-canvas-container');

        this.canvas = document.createElement('canvas');
        canvasContainer.appendChild(this.canvas);

        // Zoom Controls Overlay
        const zoomOverlay = document.createElement('div');
        zoomOverlay.classList.add('zoom-overlay');
        this.btnZoomIn = document.createElement('button');
        this.btnZoomIn.innerHTML = '<i class="icon icon-plus"></i>';
        this.btnZoomOut = document.createElement('button');
        this.btnZoomOut.innerHTML = '<i class="icon icon-dash"></i>';
        this.btnResetZoom = document.createElement('button');
        this.btnResetZoom.innerHTML = '<i class="icon icon-screen-full"></i>';

        zoomOverlay.appendChild(this.btnZoomIn);
        zoomOverlay.appendChild(this.btnZoomOut);
        zoomOverlay.appendChild(this.btnResetZoom);
        canvasContainer.appendChild(zoomOverlay);

        // Tooltip (attached to container)
        this.tooltip = document.createElement('div');
        this.tooltip.classList.add('project-map-tooltip');
        this.tooltip.innerHTML = `
          <div class="tooltip-header"></div>
          <div class="tooltip-path"></div>
          <div class="tooltip-stat"></div>
        `;
        canvasContainer.appendChild(this.tooltip);

        body.appendChild(canvasContainer);
        body.appendChild(this.inspector.element); // Inspector Panel
        this.element.appendChild(body);

        // 3. Footer
        this.footer = document.createElement('div');
        this.footer.classList.add('project-map-footer');
        this.footerStatus = document.createElement('div');
        this.footerStatus.classList.add('footer-stat');
        this.footerStatus.textContent = 'Ready';
        this.footer.appendChild(this.footerStatus);

        this.element.appendChild(this.footer);

        this.statusBar = this.footerStatus; // Alias for backward compat existing logic
    }

    _createButton(iconClass: string, text: string, isIconOnly = false): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.classList.add('btn-control');
        if (isIconOnly) btn.classList.add('btn-icon');

        if (iconClass) {
            const i = document.createElement('i');
            i.classList.add('icon', iconClass);
            btn.appendChild(i);
        }

        if (text) {
            const span = document.createElement('span');
            span.textContent = text;
            btn.appendChild(span);
        }
        return btn;
    }

    _createSeparator() {
        const sep = document.createElement('div');
        sep.style.width = '1px';
        sep.style.height = '14px';
        sep.style.background = 'var(--pm-border)';
        sep.style.margin = '0 4px';
        return sep;
    }

    // ─── Event Binding ───────────────────────────────────────────────

    _bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.filterText = target.value.toLowerCase();
            this._render();
        });

        // Mode Switch
        this.btnModeFolder.addEventListener('click', () => {
            this.viewMode = 'folder';
            this.zoomLevel = 1.0;
            this.panOffset = { x: 0, y: 0 };
            this._updateUIState();
            this._triggerBuild(); // Rebuild graph for folders
        });

        this.btnModeFile.addEventListener('click', () => {
            this.viewMode = 'file';
            this.zoomLevel = 0.5; // Start zoomed out for files
            this.panOffset = { x: 0, y: 0 };
            this._updateUIState();
            this._triggerBuild(); // Build file graph
        });

        // Theme
        this.btnTheme.addEventListener('click', () => {
            this.themeMode = this.themeMode === 'clean' ? 'pixel' : 'clean';
            this._applyTheme();
            this._render();
        });

        // Color Mode
        this.btnColor.addEventListener('click', () => {
            // Cycle modes: folder -> heatmap -> folder
            if (this.colorMode === 'folder') {
                this.colorMode = 'heatmap';
                const span = this.btnColor.querySelector('span'); if (span) span.textContent = 'Heatmap';
                const i = this.btnColor.querySelector('i'); if (i) i.className = 'icon icon-flame';
            } else {
                this.colorMode = 'folder';
                const span = this.btnColor.querySelector('span'); if (span) span.textContent = 'Folder';
                const i = this.btnColor.querySelector('i'); if (i) i.className = 'icon icon-repo';
            }
            this._render();
        });


        // Toggles
        this.btnLinks.addEventListener('click', () => {
            this.overlay.showLinks = !this.overlay.showLinks;
            this.btnLinks.classList.toggle('active', this.overlay.showLinks);
            settings.set('syntaxvoid-project-map.showDependencyLinks', this.overlay.showLinks);
            this._render();
        });

        this.btnCircular.addEventListener('click', () => {
            this.overlay.circularOnly = !this.overlay.circularOnly;
            this.btnCircular.classList.toggle('active', this.overlay.circularOnly);
            settings.set('syntaxvoid-project-map.circularOnly', this.overlay.circularOnly);
            this._render();
        });

        this.btnRescan.addEventListener('click', () => {
            this._triggerBuild();
        });

        // Zoom/Pan
        this.btnZoomIn.addEventListener('click', () => this._adjustZoom(0.1));
        this.btnZoomOut.addEventListener('click', () => this._adjustZoom(-0.1));
        this.btnResetZoom.addEventListener('click', () => {
            this.zoomLevel = 1.0;
            this.panOffset = { x: 0, y: 0 };
            this._render();
        });

        // Canvas interactions
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this._hideTooltip());
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mouseup', () => this._onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));

        // Graph updates (Folder)
        this.subscriptions.add(
            this.graphBuilder.onDidUpdate(() => {
                if (this.viewMode === 'folder') this._render();
            }),
            this.graphBuilder.onDidStart(() => {
                if (this.viewMode === 'folder') {
                    this.statusBar.textContent = 'Scanning folders...';
                    this.btnRescan.classList.add('icon-sync-spin');
                }
            }),
            this.graphBuilder.onDidError((err) => {
                this.statusBar.textContent = `Error: ${err.message}`;
            })
        );

        // Graph updates (File)
        this.subscriptions.add(
            this.fileGraphBuilder.onDidUpdate((graph) => {
                if (this.viewMode === 'file') this._render();
            }),
            this.fileGraphBuilder.onDidStart(() => {
                if (this.viewMode === 'file') {
                    this.statusBar.textContent = 'Scanning files...';
                    this.btnRescan.classList.add('icon-sync-spin');
                }
            }),
            this.fileGraphBuilder.onDidError((err: any) => {
                this.statusBar.textContent = `Error: ${err.message}`;
            })
        );

        // File save -> incremental rebuild
        this.subscriptions.add(
            panels.observeTextEditors((editor: any) => {
                const sub = editor.onDidSave(() => {
                    this._debouncedRebuild();
                });
                this.subscriptions.add(sub);
            })
        );

        // Resize observer
        this._resizeObserver = new ResizeObserver(() => {
            this._render();
        });
        this._resizeObserver.observe(this.element);

        // Config changes
        this.subscriptions.add(
            settings.observe('syntaxvoid-project-map.showDependencyLinks', (val: boolean) => {
                this.overlay.showLinks = val;
                this.btnLinks.classList.toggle('active', val);
                this._render();
            }),
            settings.observe('syntaxvoid-project-map.circularOnly', (val: boolean) => {
                this.overlay.circularOnly = val;
                this.btnCircular.classList.toggle('active', val);
                this._render();
            })
        );
    }

    _applyTheme() {
        this.element.classList.remove('pm-clean', 'pm-pixel');
        this.element.classList.add(`pm-${this.themeMode}`);

        if (this.themeMode === 'pixel') {
            this.btnTheme.classList.add('active');
        } else {
            this.btnTheme.classList.remove('active');
        }
    }

    /**
     * Highlights specific nodes in the view.
     * @param nodeIds - Array of file paths to highlight
     * @param style - 'impact' | 'search'
     */
    highlightNodes(nodeIds: string[], style = 'impact') {
        this.highlightedNodes = new Set(nodeIds);
        this.highlightStyle = style;
        this._render();
    }

    // ─── Build & Render ──────────────────────────────────────────────

    _getProjectRoot() {
        const dirs = paths.getProjectDirectories();
        return dirs.length > 0 ? dirs[0].getPath() : null;
    }

    _getIgnoredDirs() {
        const raw = settings.get('syntaxvoid-project-map.ignoredDirectories') || '';
        return new Set<string>(raw.split(',').map((s: string) => s.trim()).filter(Boolean));
    }

    _triggerBuild() {
        const root = this._getProjectRoot();
        if (!root) {
            this.statusBar.textContent = 'No project open';
            return;
        }

        const opts = {
            maxFiles: settings.get('syntaxvoid-project-map.maxFiles'),
            ignoredDirs: this._getIgnoredDirs()
        };

        if (this.viewMode === 'file') {
            this.fileGraphBuilder.build(root, opts);
        } else {
            this.graphBuilder.build(root, opts);
        }
    }

    _debouncedRebuild() {
        const root = this._getProjectRoot();
        if (!root) return;
        const debounceMs = settings.get('syntaxvoid-project-map.debounceMs');

        const opts = {
            maxFiles: settings.get('syntaxvoid-project-map.maxFiles'),
            ignoredDirs: this._getIgnoredDirs()
        };

        if (this.viewMode === 'file') {
            this.fileGraphBuilder.debouncedBuild(root, opts, debounceMs);
        } else {
            this.graphBuilder.debouncedBuild(root, opts, debounceMs);
        }
    }

    _render() {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        this._animFrame = requestAnimationFrame(() => this._doPaint());
    }

    // ─── Interaction Logic (Zoom/Pan) ────────────────────────────────

    _adjustZoom(delta: number) {
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel + delta));
        this._render();
    }

    _onWheel(e: WheelEvent) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            this._adjustZoom(delta * 5);
        } else {
            // Pan
            this.panOffset.x -= e.deltaX;
            this.panOffset.y -= e.deltaY;
            this._render();
        }
    }

    _onMouseDown(e: MouseEvent) {
        if (e.button === 0) { // Left click
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            if (this.canvas.parentElement) {
                this.canvas.parentElement.style.cursor = 'grabbing';
            }
        }
    }

    _onMouseUp() {
        this.isDragging = false;
        if (this.canvas.parentElement) {
            this.canvas.parentElement.style.cursor = 'grab';
        }
    }

    _onDoubleClick(e: MouseEvent) {
        // Reuse mouse move logic to find hit
        const bounds = this.canvas.getBoundingClientRect();
        const cx = bounds.width / 2;
        const cy = bounds.height / 2;

        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        const logicalX = (mouseX - cx) / this.zoomLevel - this.panOffset.x + cx;
        const logicalY = (mouseY - cy) / this.zoomLevel - this.panOffset.y + cy;

        const hit = this.treemapRenderer.hitTest(logicalX, logicalY);

        if (hit) {
            // Reveal in tree view
            const treeViewPkg = atom.packages.getActivePackage('tree-view');
            if (treeViewPkg && treeViewPkg.mainModule) {
                const main = treeViewPkg.mainModule as any;
                if (main.treeView && typeof main.treeView.revealPath === 'function') {
                    main.treeView.revealPath(hit.folder.path);
                } else if (main.createTreeView) {
                    main.createTreeView().revealPath(hit.folder.path);
                }
            }
        }
    }

    _doPaint() {
        const container = this.canvas.parentElement;
        if (!container) return;

        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // Apply Zoom/Pan Transform
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(this.zoomLevel, this.zoomLevel);
        ctx.translate(-w / 2 + this.panOffset.x, -h / 2 + this.panOffset.y);

        if (this.viewMode === 'file') {
            // File Graph Mode
            const graph = this.fileGraphBuilder.getGraph(); // Assuming builder has getGraph()
            if (graph) {
                this.fileGraphRenderer.layout(graph, w, h);
                this.fileGraphRenderer.draw(ctx, (graph.nodes as any), graph.edges, this.hoveredRect, {
                    showLinks: this.overlay.showLinks,
                    circularOnly: this.overlay.circularOnly,
                    filterText: this.filterText // Pass filter text
                });

                // Update status
                let status = `${graph.nodes.length} files · ${graph.edges.length} edges`;
                // graph.stats and circularEdges missing from GraphSnapshot interface, but might be there at runtime
                // TypeScript won't like it unless cast.
                // const g = graph as any;
                // if (g.stats && g.stats.circularEdges) status += ` · circular`;
                this.statusBar.textContent = status;
            }
        } else {
            // Folder Treemap Mode
            const graph = this.graphBuilder.getGraph();
            if (graph) {
                const rects = this.treemapRenderer.layout(graph.root, w, h, {
                    colorMode: this.colorMode
                });

                // Build rect lookup for dependency overlay
                this.rectMap.clear();
                for (const rect of rects) {
                    this.rectMap.set(rect.folder.path, rect);
                }

                // Draw treemap rects
                for (const rect of rects) {
                    this._drawRect(ctx, rect);
                }

                // Draw dependency overlay
                // graph.edges in Folder Mode is FolderEdge[] which has {source, target, weight}.
                // DependencyOverlay expects Edge[] which has {source, target, weight/count}.
                // They match.
                this.overlay.draw(ctx, graph.edges as any[], graph.circularEdges, this.rectMap, this.hoveredRect);

                // Status
                const circularCount = graph.circularEdges.size;
                let status = `${graph.totalFiles} files · ${graph.edges.length} deps`;
                if (circularCount > 0) {
                    status += ` · ${circularCount} circular`;
                }
                this.statusBar.textContent = status;
            }
        }

        ctx.restore();
    }

    _drawRect(ctx: CanvasRenderingContext2D, rect: Rect) {
        if (rect.w < 2 || rect.h < 2) return;

        const isHovered = this.hoveredRect === rect;

        // Use theme colors if we wanted to enforce it here, but TreemapRenderer handles base colors
        // We handle selection/hover styling here

        // Filter check
        let isDimmed = false;
        if (this.filterText && this.filterText.length > 0) {
            const name = rect.folder.name.toLowerCase();
            // Simple contains check
            if (!name.includes(this.filterText)) {
                isDimmed = true;
            }
        }

        // Fill
        ctx.fillStyle = rect.color;

        // Highlight logic
        const isHighlighted = this.highlightedNodes && this.highlightedNodes.has(rect.folder.path);

        if (this.highlightedNodes && this.highlightedNodes.size > 0) {
            // Dim everything else if there are highlights
            if (isHighlighted) {
                ctx.globalAlpha = 0.95;
                if (this.highlightStyle === 'impact') {
                    ctx.shadowColor = '#e74c3c';
                    ctx.shadowBlur = 10;
                }
            } else {
                ctx.globalAlpha = 0.1; // Dim unrelated
            }
        } else if (isDimmed) {
            ctx.globalAlpha = 0.05; // Very dim (search filter)
        } else {
            ctx.globalAlpha = isHovered ? 0.9 : 0.25 + (rect.depth * 0.1);
        }

        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.shadowBlur = 0; // Reset shadow

        // Border
        ctx.globalAlpha = 1;
        // Theme aware border?
        if (isHighlighted) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = isHovered ? '#ecf0f1' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = isHovered ? 2 : 1;
        }

        // Round corners in Clean mode
        if (this.themeMode === 'clean' && rect.w > 10 && rect.h > 10) {
            // Simple rect for now, we'll upgrade to round rect in Phase 2
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        } else {
            // Pixel mode or small
            ctx.strokeRect(Math.floor(rect.x) + 0.5, Math.floor(rect.y) + 0.5, Math.floor(rect.w) - 1, Math.floor(rect.h) - 1);
        }

        // Label (only if rect is big enough)
        if (rect.w > 40 && rect.h > 16) {
            ctx.fillStyle = this.themeMode === 'pixel' ? '#0f0' : '#ecf0f1';

            const fontName = this.themeMode === 'pixel' ? 'monospace' : 'Inter, sans-serif';
            ctx.font = `${Math.min(11, rect.h - 4)}px ${fontName}`;
            ctx.globalAlpha = 0.9;

            const label = rect.folder.name;
            const maxW = rect.w - 6;
            let text = label;
            if (ctx.measureText(text).width > maxW) {
                while (text.length > 1 && ctx.measureText(text + '…').width > maxW) {
                    text = text.slice(0, -1);
                }
                text += '…';
            }

            ctx.fillText(text, rect.x + 3, rect.y + 12);
        }
    }

    // ─── Tooltip ─────────────────────────────────────────────────────

    _onMouseMove(e: MouseEvent) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.panOffset.x += dx / this.zoomLevel; // Logical pan
            this.panOffset.y += dy / this.zoomLevel;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this._render();
            return;
        }

        const bounds = this.canvas.getBoundingClientRect();
        // Transform mouse to canvas logical coords
        // logicalX = (screenX - centerX) / scale - panX + centerX
        // We essentially need to inverse the transform
        const cx = bounds.width / 2;
        const cy = bounds.height / 2;

        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        const logicalX = (mouseX - cx) / this.zoomLevel - this.panOffset.x + cx;
        const logicalY = (mouseY - cy) / this.zoomLevel - this.panOffset.y + cy;

        let hit = null;
        if (this.viewMode === 'file') {
            hit = this.fileGraphRenderer.hitTest(logicalX, logicalY);
        } else {
            hit = this.treemapRenderer.hitTest(logicalX, logicalY);
        }

        if (hit) {
            this.hoveredRect = hit; // Generalized as "hovered item"

            const header = this.tooltip.querySelector('.tooltip-header');
            const pathEl = this.tooltip.querySelector('.tooltip-path');
            const stat = this.tooltip.querySelector('.tooltip-stat');

            // Tooltip logic needs to vary
            if (this.viewMode === 'file') {
                // File Node Hit
                // const importCount = hit.outDegree;
                const relPath = (hit as any).relPath; // cast needed if not in shared interface?
                if (header) header.textContent = (hit as any).name || 'File';
                if (pathEl) pathEl.textContent = relPath;
                if (stat) stat.textContent = `In: ${(hit as any).inDegree} · Out: ${(hit as any).outDegree}`;

                // Update Inspector
                const graph = this.fileGraphBuilder.getGraph();
                this.inspector.update(hit as any, graph as any);

            } else {
                // Folder Hit
                const graph = this.graphBuilder.getGraph();
                const folderPath = (hit as any).folder.path;
                const importCount = graph
                    ? graph.edges.filter(e => e.source === folderPath || e.target === folderPath).length
                    : 0;

                const root = this._getProjectRoot();
                const relPath = root
                    ? path.relative(root, folderPath)
                    : folderPath;

                if (header) header.textContent = (hit as any).folder.name;
                if (pathEl) pathEl.textContent = relPath;
                if (stat) stat.textContent = `${(hit as any).folder.totalFileCount} files · ${importCount} imports`;

                this.inspector.update(hit as any, graph as any);
            }

            // Position tooltip near cursor (screen coords)
            let tx = e.clientX - bounds.left + 16;
            let ty = e.clientY - bounds.top + 16;

            // Constrain
            const tw = 220;
            if (tx + tw > bounds.width) tx -= (tw + 20);
            if (ty + 100 > bounds.height) ty -= 100;

            this.tooltip.style.left = `${tx}px`;
            this.tooltip.style.top = `${ty}px`;
            this.tooltip.classList.add('visible');

        } else {
            this.hoveredRect = null;
            this._hideTooltip();
            // Optional: Clear inspector on miss?
        }

        this._render();
        // this._render(); // Double render? Removed.
    }

    _hideTooltip() {
        this.hoveredRect = null;
        this.tooltip.classList.remove('visible');
        this._render();
    }

    // Required for Atom serialization
    serialize() {
        return {
            viewMode: this.viewMode,
            themeMode: this.themeMode,
            colorMode: this.colorMode,
            zoomLevel: this.zoomLevel,
            panOffset: this.panOffset
        };
    }

    destroy() {
        this.element.remove();
        this.inspector.destroy();
        this.subscriptions.dispose();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
        }
    }
}
