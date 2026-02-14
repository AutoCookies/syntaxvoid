'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const atom_1 = require("atom");
const graph_builder_1 = __importDefault(require("../data/graph-builder"));
const file_graph_builder_1 = __importDefault(require("../data/file-graph-builder"));
const treemap_renderer_1 = __importDefault(require("./treemap-renderer"));
const file_graph_renderer_1 = __importDefault(require("./file-graph-renderer"));
const dependency_overlay_1 = __importDefault(require("./dependency-overlay"));
const inspector_panel_1 = __importDefault(require("./inspector-panel"));
// Ambient imports for legacy core
const settings = require('../../../../core/platform/settings');
const panels = require('../../../../core/platform/panels');
const paths = require('../../../../core/platform/paths');
const PROJECT_MAP_URI = 'atom://syntaxvoid-project-map';
/**
 * Dock panel view for the project topology visualization.
 * Refactored for "SyntaxVoid Polish" with 3-pane layout and design system.
 */
class ProjectMapView {
    constructor(serializedState) {
        this.highlightedNodes = null;
        this.highlightStyle = 'impact';
        this._resizeObserver = null;
        this.renderNodes = null;
        this.emitter = new atom_1.CompositeDisposable(); // actually we want Emitter
        this.subscriptions = new atom_1.CompositeDisposable();
        const { Emitter } = require('atom');
        this.eventEmitter = new Emitter();
        this.subscriptions.add(this.eventEmitter);
        // Data
        this.graphBuilder = new graph_builder_1.default();
        this.fileGraphBuilder = new file_graph_builder_1.default();
        // Renderers
        this.treemapRenderer = new treemap_renderer_1.default();
        this.fileGraphRenderer = new file_graph_renderer_1.default();
        // State
        const state = serializedState || {};
        this.viewMode = state.viewMode || 'folder'; // 'folder' | 'file'
        this.themeMode = state.themeMode || 'clean';
        this.colorMode = state.colorMode || 'folder'; // Cast to avoid strict check if string mismatch
        this.zoomLevel = state.zoomLevel || 1.0;
        this.panOffset = state.panOffset || { x: 0, y: 0 };
        this.filterText = '';
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.renderNodes = null; // Cache for layout nodes
        this.overlay = new dependency_overlay_1.default({
            showLinks: settings.get('syntaxvoid-project-map.showDependencyLinks'),
            circularOnly: settings.get('syntaxvoid-project-map.circularOnly')
        });
        this.externalOverlays = new Set();
        this.rectMap = new Map();
        this.hoveredRect = null;
        this._animFrame = null;
        this.inspector = new inspector_panel_1.default();
        this._createDOM();
        this._bindEvents();
        // Initialize Theme & updating UI state to match
        this._applyTheme();
        this._updateUIState();
        // Initial build
        this._triggerBuild();
    }
    getTitle() {
        return 'Project Map';
    }
    getURI() {
        return ProjectMapView.URI;
    }
    getIconName() {
        return 'repo';
    }
    getElement() {
        return this.element;
    }
    addOverlay(overlay) {
        this.externalOverlays.add(overlay);
        this._render();
        return new atom_1.Disposable(() => {
            this.externalOverlays.delete(overlay);
            this._render();
        });
    }
    _updateUIState() {
        // Mode switch
        if (this.viewMode === 'file') {
            this.btnModeFolder.classList.remove('active');
            this.btnModeFile.classList.add('active');
            // Hide folder specific controls?
        }
        else {
            this.btnModeFolder.classList.add('active');
            this.btnModeFile.classList.remove('active');
        }
        if (this.colorMode === 'heatmap') {
            const span = this.btnColor.querySelector('span');
            if (span)
                span.textContent = 'Heatmap';
            const i = this.btnColor.querySelector('i');
            if (i)
                i.className = 'icon icon-flame';
        }
        else {
            const span = this.btnColor.querySelector('span');
            if (span)
                span.textContent = 'Folder';
            const i = this.btnColor.querySelector('i');
            if (i)
                i.className = 'icon icon-repo';
        }
    }
    // ─── DOM Construction ────────────────────────────────────────────
    // Import helper (would normally be at top, but for replacing block)
    // import { panelRoot, header, wrapper, button as svButton, badge } from 'syntaxvoid-ui-kit';
    _createDOM() {
        // Use panelRoot from UI Kit (simulated here as we can't easily change top imports in this block)
        // In real refactor, we'd change imports. 
        // For this file execution, we will manually apply the classes to match syntaxvoid-ui-kit logic
        // or fully replace the method.
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-ui sv-panel sv-skin-clean syntaxvoid-project-map';
        // 1. Header
        const head = document.createElement('header');
        head.className = 'sv-header';
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.innerHTML = '<span class="icon icon-repo"></span> Project Map';
        this.searchInput = document.createElement('input');
        this.searchInput.className = 'sv-input native-key-bindings';
        this.searchInput.placeholder = 'Filter...';
        this.searchInput.style.marginLeft = '12px';
        this.searchInput.style.width = '140px';
        const headLeft = document.createElement('div');
        headLeft.style.display = 'flex';
        headLeft.style.alignItems = 'center';
        headLeft.appendChild(titleDiv);
        headLeft.appendChild(this.searchInput);
        const actions = document.createElement('div');
        actions.className = 'actions';
        // Mode Group
        const modeGroup = document.createElement('div');
        modeGroup.className = 'btn-group'; // Atom's btn-group or generic wrapper
        modeGroup.style.display = 'inline-flex';
        this.btnModeFolder = this._createSvButton('Folders');
        this.btnModeFile = this._createSvButton('Files');
        modeGroup.appendChild(this.btnModeFolder);
        modeGroup.appendChild(this.btnModeFile);
        actions.appendChild(modeGroup);
        // Theme Toggle
        this.btnTheme = this._createSvButton('Theme', true);
        this.btnTheme.title = 'Toggle Vibe';
        actions.appendChild(this.btnTheme);
        // Other Toggles
        this.btnColor = this._createSvButton('Color', true);
        this.btnLinks = this._createSvButton('Links', true);
        this.btnCircular = this._createSvButton('Circ', true);
        this.btnRescan = this._createSvButton('', true);
        this.btnRescan.innerHTML = '<i class="icon icon-sync"></i>';
        actions.appendChild(this.btnColor);
        actions.appendChild(this.btnLinks);
        actions.appendChild(this.btnCircular);
        actions.appendChild(this.btnRescan);
        head.appendChild(headLeft);
        head.appendChild(actions);
        this.element.appendChild(head);
        // 2. Body
        const body = document.createElement('div');
        body.className = 'sv-body project-map-body';
        body.style.display = 'flex';
        body.style.flexDirection = 'row'; // Changed to ROW
        body.style.padding = '0';
        body.style.height = '100%'; // Ensure full height
        // Inspector (Left Side)
        this.inspector.element.style.flex = '0 0 300px';
        this.inspector.element.style.borderRight = '1px solid var(--sv-border)';
        this.inspector.element.style.display = 'flex';
        this.inspector.element.style.flexDirection = 'column';
        this.inspector.element.style.background = 'var(--sv-surface-2)'; // Slightly distinct bg
        this.inspector.element.style.zIndex = '2'; // Above canvas if needed
        body.appendChild(this.inspector.element);
        // Canvas Container (Right Side)
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'project-map-canvas-container';
        canvasContainer.style.flex = '1';
        canvasContainer.style.position = 'relative';
        canvasContainer.style.overflow = 'hidden';
        canvasContainer.style.background = 'var(--sv-bg)';
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        canvasContainer.appendChild(this.canvas);
        // Zoom Controls (Overlay)
        const zoomOverlay = document.createElement('div');
        zoomOverlay.className = 'zoom-overlay';
        zoomOverlay.style.position = 'absolute';
        zoomOverlay.style.bottom = '16px';
        zoomOverlay.style.right = '16px';
        zoomOverlay.style.display = 'flex';
        zoomOverlay.style.flexDirection = 'column';
        zoomOverlay.style.gap = '4px';
        this.btnZoomIn = this._createSvButton('+', true);
        this.btnZoomOut = this._createSvButton('-', true);
        this.btnResetZoom = this._createSvButton('1:1', true);
        zoomOverlay.appendChild(this.btnZoomIn);
        zoomOverlay.appendChild(this.btnZoomOut);
        zoomOverlay.appendChild(this.btnResetZoom);
        canvasContainer.appendChild(zoomOverlay);
        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'project-map-tooltip sv-panel';
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.padding = '8px';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.display = 'none';
        this.tooltip.style.zIndex = '100';
        this.tooltip.style.border = '1px solid var(--sv-border-2)';
        this.tooltip.style.background = 'var(--sv-surface)';
        this.tooltip.style.boxShadow = 'var(--sv-shadow-md)';
        this.tooltip.innerHTML = `<div class="tooltip-content"></div>`;
        canvasContainer.appendChild(this.tooltip);
        body.appendChild(canvasContainer);
        this.element.appendChild(body);
        // 3. Footer
        this.footer = document.createElement('div');
        this.footer.className = 'sv-footer';
        this.footerStatus = document.createElement('div');
        this.footerStatus.style.fontSize = 'var(--sv-font-sm)';
        this.footerStatus.style.color = 'var(--sv-muted)';
        this.footerStatus.textContent = 'Ready';
        this.footer.appendChild(this.footerStatus);
        this.element.appendChild(this.footer);
        this.statusBar = this.footerStatus;
    }
    _createSvButton(text, _iconOnly = false) {
        const btn = document.createElement('button');
        btn.className = 'sv-btn';
        btn.textContent = text;
        return btn;
    }
    _createSeparator() {
        const sep = document.createElement('div');
        return sep; // No-op in new design
    }
    // ─── Event Binding ───────────────────────────────────────────────
    _bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            const target = e.target;
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
                const span = this.btnColor.querySelector('span');
                if (span)
                    span.textContent = 'Heatmap';
                const i = this.btnColor.querySelector('i');
                if (i)
                    i.className = 'icon icon-flame';
            }
            else {
                this.colorMode = 'folder';
                const span = this.btnColor.querySelector('span');
                if (span)
                    span.textContent = 'Folder';
                const i = this.btnColor.querySelector('i');
                if (i)
                    i.className = 'icon icon-repo';
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
        this.canvas.addEventListener('click', (e) => this._onClick(e));
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));
        // Graph updates (Folder)
        this.subscriptions.add(this.graphBuilder.onDidUpdate(() => {
            if (this.viewMode === 'folder')
                this._render();
        }), this.graphBuilder.onDidStart(() => {
            if (this.viewMode === 'folder') {
                this.statusBar.textContent = 'Scanning folders...';
                this.btnRescan.classList.add('icon-sync-spin');
            }
        }), this.graphBuilder.onDidError((err) => {
            this.statusBar.textContent = `Error: ${err.message}`;
        }));
        // Graph updates (File)
        this.subscriptions.add(this.fileGraphBuilder.onDidUpdate((graph) => {
            if (this.viewMode === 'file') {
                this.renderNodes = null; // Invalidate cache on graph update
                this._render();
            }
        }), this.fileGraphBuilder.onDidStart(() => {
            if (this.viewMode === 'file') {
                this.statusBar.textContent = 'Scanning files...';
                this.btnRescan.classList.add('icon-sync-spin');
            }
        }), this.fileGraphBuilder.onDidError((err) => {
            this.statusBar.textContent = `Error: ${err.message}`;
        }));
        // File save -> incremental rebuild
        this.subscriptions.add(panels.observeTextEditors((editor) => {
            const sub = editor.onDidSave(() => {
                this._debouncedRebuild();
            });
            this.subscriptions.add(sub);
        }));
        // Resize observer
        this._resizeObserver = new ResizeObserver(() => {
            this.renderNodes = null; // Invalidate cache
            this._render();
        });
        this._resizeObserver.observe(this.element);
        // Config changes
        this.subscriptions.add(settings.observe('syntaxvoid-project-map.showDependencyLinks', (val) => {
            this.overlay.showLinks = val;
            this.btnLinks.classList.toggle('active', val);
            this._render();
        }), settings.observe('syntaxvoid-project-map.circularOnly', (val) => {
            this.overlay.circularOnly = val;
            this.btnCircular.classList.toggle('active', val);
            this._render();
        }));
    }
    _applyTheme() {
        this.element.classList.remove('pm-clean', 'pm-pixel');
        this.element.classList.add(`pm-${this.themeMode}`);
        if (this.themeMode === 'pixel') {
            this.btnTheme.classList.add('active');
        }
        else {
            this.btnTheme.classList.remove('active');
        }
    }
    /**
     * Highlights specific nodes in the view.
     * @param nodeIds - Array of file paths to highlight
     * @param style - 'impact' | 'search'
     */
    highlightNodes(nodeIds, style = 'impact') {
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
        return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
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
        // Reset cache on new build
        this.renderNodes = null;
        if (this.viewMode === 'file') {
            this.fileGraphBuilder.build(root, opts);
            // Layout typically happens in render, but we can pre-calc if we want.
            // But we wait for the update event.
        }
        else {
            this.graphBuilder.build(root, opts);
        }
    }
    _debouncedRebuild() {
        const root = this._getProjectRoot();
        if (!root)
            return;
        const debounceMs = settings.get('syntaxvoid-project-map.debounceMs');
        const opts = {
            maxFiles: settings.get('syntaxvoid-project-map.maxFiles'),
            ignoredDirs: this._getIgnoredDirs()
        };
        if (this.viewMode === 'file') {
            this.fileGraphBuilder.debouncedBuild(root, opts, debounceMs);
        }
        else {
            this.graphBuilder.debouncedBuild(root, opts, debounceMs);
        }
    }
    // New helper to force layout recalc
    _recalcLayout(w, h) {
        if (this.viewMode === 'file') {
            const graph = this.fileGraphBuilder.getGraph();
            if (graph && w > 0 && h > 0) {
                this.renderNodes = this.fileGraphRenderer.layout(graph, w, h);
            }
        }
        // Folder mode handles layout differently (TreemapRenderer does layout implicitly during draw-ish? 
        // No, TreemapRenderer.layout returns rects. We can cache those too if we wanted, 
        // but Treemap is fast and deterministic. FileGraph force-directed is the one needing cache.)
    }
    _render() {
        if (this._animFrame)
            cancelAnimationFrame(this._animFrame);
        this._animFrame = requestAnimationFrame(() => this._doPaint());
    }
    // ─── Interaction Logic (Zoom/Pan) ────────────────────────────────
    _adjustZoom(delta) {
        this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel + delta));
        this._render();
    }
    _onWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            this._adjustZoom(delta * 5);
        }
        else {
            // Pan
            this.panOffset.x -= e.deltaX;
            this.panOffset.y -= e.deltaY;
            this._render();
        }
    }
    _onMouseDown(e) {
        if (e.button === 0) { // Left click
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            if (this.canvas.parentElement) {
                this.canvas.parentElement.style.cursor = 'grabbing';
            }
        }
    }
    _onMouseUp() {
        if (!this.isDragging && this.canvas.parentElement) {
            this.canvas.parentElement.style.cursor = 'grab';
            // Check for click (if we didn't drag much)
            // Ideally we track mousedown pos and compare.
            // For now, assume if isDragging was false, it's a click.
            // But isDragging is set to true on mousedown immediately in current code?
            // "this.isDragging = true;" in mousedown.
            // So _onMouseUp always sees true? 
            // Wait, logic in _onMouseDown was:
            // if (e.button === 0) { this.isDragging = true; ... }
            // So isDragging is always true on MouseUp if we held button.
            // We need to differentiate drag vs click.
        }
        this.isDragging = false;
        // Let's use a click handler or verify distance
        if (this.canvas.parentElement)
            this.canvas.parentElement.style.cursor = 'grab';
    }
    _onClick(e) {
        // Determine hit
        const bounds = this.canvas.getBoundingClientRect();
        const cx = bounds.width / 2;
        const cy = bounds.height / 2;
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;
        const logicalX = (mouseX - cx) / this.zoomLevel - this.panOffset.x + cx;
        const logicalY = (mouseY - cy) / this.zoomLevel - this.panOffset.y + cy;
        let hit = null;
        if (this.viewMode === 'folder') {
            hit = this.treemapRenderer.hitTest(logicalX, logicalY);
        }
        else {
            // File graph hit test
            if (this.renderNodes) {
                // Simple distance check
                // optimization: reverse iterate
                for (let i = this.renderNodes.length - 1; i >= 0; i--) {
                    const n = this.renderNodes[i];
                    const dx = logicalX - n.x;
                    const dy = logicalY - n.y;
                    if (dx * dx + dy * dy <= n.r * n.r) {
                        hit = { path: n.id, ...n }; // FileNode
                        break;
                    }
                }
            }
        }
        if (hit) {
            const path = hit.folder ? hit.folder.path : hit.path;
            if (path) {
                this.eventEmitter.emit('did-select-node', {
                    path: path,
                    source: 'project-map',
                    viewMode: this.viewMode
                });
            }
        }
    }
    // Public API
    onDidSelectNode(callback) {
        return this.eventEmitter.on('did-select-node', callback);
    }
    _onDoubleClick(e) {
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
                const main = treeViewPkg.mainModule;
                if (main.treeView && typeof main.treeView.revealPath === 'function') {
                    main.treeView.revealPath(hit.folder.path);
                }
                else if (main.createTreeView) {
                    main.createTreeView().revealPath(hit.folder.path);
                }
            }
        }
    }
    _doPaint() {
        const container = this.canvas.parentElement;
        if (!container)
            return;
        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0)
            return; // Prevent zero-size layout issues
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            return;
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
                // Use cached layout if available and dimensions match (approx)
                // Actually, if we resize, we MUST re-layout or at least re-center?
                // For force-directed, resizing usually implies re-simulation or scaling.
                // Let's re-layout only if cache is null.
                // But wait, if window resizes, we want to adapt.
                // If we cache, we MUST invalidate on resize. `_resizeObserver` should handle that.
                if (!this.renderNodes) {
                    this._recalcLayout(w, h);
                }
                if (this.renderNodes) {
                    this.fileGraphRenderer.draw(ctx, this.renderNodes, graph.edges, this.hoveredRect, {
                        showLinks: this.overlay.showLinks,
                        circularOnly: this.overlay.circularOnly,
                        filterText: this.filterText
                    });
                    // Update status
                    let status = `${graph.nodes.length} files · ${graph.edges.length} edges`;
                    this.statusBar.textContent = status;
                }
            }
        }
        else {
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
                this.overlay.draw(ctx, graph.edges, graph.circularEdges, this.rectMap, this.hoveredRect);
                // Draw external overlays (e.g. RiskOverlay)
                for (const overlay of this.externalOverlays) {
                    if (typeof overlay.render === 'function') {
                        overlay.render(ctx, this.rectMap, this.hoveredRect);
                    }
                }
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
    _drawRect(ctx, rect) {
        if (rect.w < 2 || rect.h < 2)
            return;
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
            }
            else {
                ctx.globalAlpha = 0.1; // Dim unrelated
            }
        }
        else if (isDimmed) {
            ctx.globalAlpha = 0.05; // Very dim (search filter)
        }
        else {
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
        }
        else {
            ctx.strokeStyle = isHovered ? '#ecf0f1' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = isHovered ? 2 : 1;
        }
        // Round corners in Clean mode
        if (this.themeMode === 'clean' && rect.w > 10 && rect.h > 10) {
            // Simple rect for now, we'll upgrade to round rect in Phase 2
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
        }
        else {
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
    _onMouseMove(e) {
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
        }
        else {
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
                const relPath = hit.relPath; // cast needed if not in shared interface?
                if (header) {
                    const h = hit;
                    const name = h.name || (h.path ? h.path.split('/').pop() : 'File');
                    header.textContent = name;
                }
                if (pathEl)
                    pathEl.textContent = relPath;
                if (stat)
                    stat.textContent = `In: ${hit.inDegree} · Out: ${hit.outDegree}`;
                // Update Inspector
                const graph = this.fileGraphBuilder.getGraph();
                this.inspector.update(hit, graph);
            }
            else {
                // Folder Hit
                const graph = this.graphBuilder.getGraph();
                const folderPath = hit.folder.path;
                const importCount = graph
                    ? graph.edges.filter(e => e.source === folderPath || e.target === folderPath).length
                    : 0;
                const root = this._getProjectRoot();
                const relPath = root
                    ? path.relative(root, folderPath)
                    : folderPath;
                if (header)
                    header.textContent = hit.folder.name;
                if (pathEl)
                    pathEl.textContent = relPath;
                if (stat)
                    stat.textContent = `${hit.folder.totalFileCount} files · ${importCount} imports`;
                this.inspector.update(hit, graph);
            }
            // Position tooltip near cursor (screen coords)
            let tx = e.clientX - bounds.left + 16;
            let ty = e.clientY - bounds.top + 16;
            // Constrain
            const tw = 220;
            if (tx + tw > bounds.width)
                tx -= (tw + 20);
            if (ty + 100 > bounds.height)
                ty -= 100;
            this.tooltip.style.left = `${tx}px`;
            this.tooltip.style.top = `${ty}px`;
            this.tooltip.classList.add('visible');
        }
        else {
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
ProjectMapView.URI = PROJECT_MAP_URI;
exports.default = ProjectMapView;
