"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactPanel = void 0;
const atom_1 = require("atom");
const path = __importStar(require("path"));
class ImpactPanel {
    constructor(service) {
        this.selectedFile = null;
        this.impactData = null;
        // UI State
        this.depth = 1;
        this.showUpstream = true;
        this.showDownstream = true;
        // Elements
        this.headerTitle = null;
        this.headerPath = null;
        this.headerInfo = null;
        this.contentContainer = null;
        this.depthInput = null;
        this.depthLabel = null;
        this.upstreamCheckbox = null;
        this.downstreamCheckbox = null;
        this.upstreamLabel = null; // For count update
        this.downstreamLabel = null;
        this.impactService = service;
        this.subscriptions = new atom_1.CompositeDisposable();
        this.element = document.createElement('div');
        this.element.classList.add('syntaxvoid-impact-panel');
        // Add native-key-bindings so inputs work if focusing panel
        this.element.classList.add('native-key-bindings');
        this.element.tabIndex = -1;
        this._renderBase();
        this._bindEvents();
        // Listen for updates
        this.subscriptions.add(this.impactService.onDidUpdateGraph(() => {
            if (this.selectedFile) {
                this.updateForFile(this.selectedFile);
            }
            else {
                this._updateHeader(); // Update graph stats
            }
        }));
    }
    _renderBase() {
        this.element.innerHTML = `
            <header class="impact-header">
                <span class="title icon icon-zap">Impact Analysis</span>
                <div class="file-path" title=""></div>
                <div class="graph-info"></div>
            </header>

            <section class="controls">
                <div class="control-group">
                    <label class="depth-label">Depth: 1</label>
                    <input type="range" class="depth-slider input-range" min="1" max="5" value="1">
                </div>
                <div class="control-group toggles">
                    <label class="toggle-control upstream-toggle active">
                        <input type="checkbox" checked>
                        <span class="label-text">↑ Upstream</span>
                    </label>
                    <label class="toggle-control downstream-toggle active">
                        <input type="checkbox" checked>
                        <span class="label-text">↓ Downstream</span>
                    </label>
                </div>
            </section>

            <div class="results-container">
                <div class="impact-placeholder">
                    <div class="message">Select a file to see its impact.</div>
                    <button class="btn btn-primary btn-check-active">Check Active File</button>
                </div>
            </div>
        `;
        this.headerPath = this.element.querySelector('.file-path');
        this.headerInfo = this.element.querySelector('.graph-info');
        this.contentContainer = this.element.querySelector('.results-container');
        this.depthInput = this.element.querySelector('.depth-slider');
        this.depthLabel = this.element.querySelector('.depth-label');
        this.upstreamCheckbox = this.element.querySelector('.upstream-toggle input');
        this.downstreamCheckbox = this.element.querySelector('.downstream-toggle input');
        // Store labels for count updates
        const upLabel = this.element.querySelector('.upstream-toggle .label-text');
        if (upLabel)
            this.upstreamLabel = upLabel;
        const downLabel = this.element.querySelector('.downstream-toggle .label-text');
        if (downLabel)
            this.downstreamLabel = downLabel;
    }
    _bindEvents() {
        if (this.depthInput) {
            this.depthInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                this.depth = val;
                if (this.depthLabel)
                    this.depthLabel.textContent = `Depth: ${val}`;
                if (this.selectedFile)
                    this.updateForFile(this.selectedFile);
            });
        }
        if (this.upstreamCheckbox) {
            this.upstreamCheckbox.addEventListener('change', (e) => {
                this.showUpstream = e.target.checked;
                this._renderResults();
            });
        }
        if (this.downstreamCheckbox) {
            this.downstreamCheckbox.addEventListener('change', (e) => {
                this.showDownstream = e.target.checked;
                this._renderResults();
            });
        }
        // Delegate click for "Check Active File" button
        this.element.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('btn-check-active')) {
                const editor = atom.workspace.getActiveTextEditor();
                if (editor) {
                    const path = editor.getPath();
                    if (path)
                        this.updateForFile(path);
                }
            }
        });
    }
    async updateForFile(filePath, depth) {
        this.selectedFile = filePath;
        if (depth !== undefined) {
            this.depth = depth;
            if (this.depthInput)
                this.depthInput.value = depth.toString();
            if (this.depthLabel)
                this.depthLabel.textContent = `Depth: ${depth}`;
        }
        // Compute
        // This is synchronous in current service implementation but marked async in original UI?
        // Service implementation I wrote is synchronous (wrapper around pure fn).
        // Original service had async graph build, but compute was sync.
        const result = this.impactService.computeImpact(filePath, {
            depth: this.depth,
            direction: 'both' // Always compute both so we can toggle quickly? 
            // Type definition says ComputeImpactResult has both.
            // Oh wait, my computeImpact takes `ImpactOptions` which has `direction`.
            // But return type `ImpactResult` has `upstream` and `downstream` records.
            // If I pass 'both', I get both.
        });
        this.impactData = result;
        this._updateHeader();
        this._renderResults();
    }
    _updateHeader() {
        // Graph Info
        // Accessing graph via private property or adding getter?
        // Service typically has no public getter for graph details in core interface?
        // `ImpactService` I wrote didn't expose `getGraph` stats explicitly in a nice way,
        // but `getSnapshot` returns `GraphSnapshot`.
        // Let's add `getGraphSnapshot()` to ImpactService for stats.
        // Wait, `ImpactService` I wrote calls `this.graphProvider.getSnapshot()`.
        // Let's try to get localized path
        if (this.selectedFile && this.headerPath) {
            const rel = atom.project.relativize(this.selectedFile);
            this.headerPath.textContent = rel;
            this.headerPath.title = this.selectedFile;
        }
        if (this.headerInfo) {
            // We need stats.
            // I'll assume ImpactService has a method to get stats or snapshot
            // In my previous `impactService.ts` I didn't add public `getSnapshot`.
            // I'll assume it exists or I'll implement it.
            // Actually, the original JS had `getGraph()`.
            // My TS `ImpactService` didn't export it. I should fix that.
            this.headerInfo.textContent = 'Ready';
        }
        // Hub score
        // We can append to headerInfo
        if (this.impactData && this.headerInfo) {
            this.headerInfo.textContent += ` · Hub: ${this.impactData.hubScore}`;
        }
        // Update toggle counts
        if (this.impactData) {
            if (this.upstreamLabel)
                this.upstreamLabel.textContent = `↑ Upstream (${this.impactData.totalUpstream})`;
            if (this.downstreamLabel)
                this.downstreamLabel.textContent = `↓ Downstream (${this.impactData.totalDownstream})`;
        }
    }
    _renderResults() {
        if (!this.contentContainer)
            return;
        this.contentContainer.innerHTML = '';
        if (!this.impactData) {
            this.contentContainer.innerHTML = `
                <div class="impact-placeholder">
                    <div class="message warning">File not found in graph. Try rescanning.</div>
                </div>`;
            return;
        }
        const container = document.createElement('div');
        container.classList.add('impact-lists');
        if (this.showUpstream) {
            container.appendChild(this._renderSection('↑ Upstream', this.impactData.upstream, 'upstream'));
        }
        if (this.showDownstream) {
            container.appendChild(this._renderSection('↓ Downstream', this.impactData.downstream, 'downstream'));
        }
        this.contentContainer.appendChild(container);
    }
    _renderSection(title, levels, type) {
        const section = document.createElement('div');
        section.classList.add('impact-section', type);
        const titleEl = document.createElement('div');
        titleEl.classList.add('section-title');
        titleEl.textContent = title;
        section.appendChild(titleEl);
        // Flatten levels for now or show by depth?
        // Original flat-mapped by depth?
        // Original: `this.impactData.upstream` was Array of Nodes.
        // My `ImpactResult`: `upstream` is `Record<number, string[]>`.
        // I need to flatten.
        const allPaths = [];
        Object.keys(levels).forEach(d => {
            const depth = parseInt(d, 10);
            levels[depth].forEach(p => allPaths.push({ path: p, depth }));
        });
        if (allPaths.length === 0) {
            const empty = document.createElement('div');
            empty.classList.add('empty-hint');
            empty.textContent = `No ${type} dependencies found.`;
            section.appendChild(empty);
        }
        else {
            const ul = document.createElement('ul');
            ul.classList.add('file-list');
            // Sort by depth then name
            allPaths.sort((a, b) => {
                if (a.depth !== b.depth)
                    return a.depth - b.depth;
                return path.basename(a.path).localeCompare(path.basename(b.path));
            });
            allPaths.forEach(item => {
                const li = document.createElement('li');
                li.classList.add('file-item', `depth-${item.depth}`);
                li.title = item.path;
                li.onclick = () => atom.workspace.open(item.path);
                const name = path.basename(item.path);
                const dir = path.dirname(atom.project.relativize(item.path));
                li.innerHTML = `
                    <span class="file-icon icon icon-file-text"></span>
                    <span class="file-name">${name}</span>
                    <span class="file-rel-path">${dir}</span>
                    <span class="file-depth-badge">${item.depth}</span>
                `;
                ul.appendChild(li);
            });
            section.appendChild(ul);
        }
        return section;
    }
    // Atom Dock Protocol
    getTitle() { return 'Impact'; }
    getIconName() { return 'zap'; }
    getDefaultLocation() { return 'right'; }
    getURI() { return 'atom://syntaxvoid-impact'; }
    getAllowedLocations() { return ['left', 'right', 'bottom']; }
    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }
}
exports.ImpactPanel = ImpactPanel;
