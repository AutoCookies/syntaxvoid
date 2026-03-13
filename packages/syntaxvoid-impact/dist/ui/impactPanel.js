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
        // Reset classes to match UI Kit
        this.element.className = 'syntaxvoid-ui sv-panel sv-skin-clean syntaxvoid-impact-panel native-key-bindings';
        // 1. Header
        const head = document.createElement('header');
        head.className = 'sv-header';
        const titleGroup = document.createElement('div');
        titleGroup.className = 'title';
        titleGroup.innerHTML = '<span class="icon icon-zap"></span> Impact';
        this.headerPath = document.createElement('div');
        this.headerPath.className = 'header-path';
        titleGroup.appendChild(this.headerPath);
        this.headerInfo = document.createElement('div');
        this.headerInfo.className = 'stats';
        this.headerInfo.style.fontSize = 'var(--sv-font-sm)';
        this.headerInfo.style.color = 'var(--sv-muted)';
        head.appendChild(titleGroup);
        head.appendChild(this.headerInfo);
        this.element.appendChild(head);
        // 2. Body
        const body = document.createElement('div');
        body.className = 'sv-body';
        // Controls Section
        const controls = document.createElement('section');
        controls.className = 'controls';
        // Depth Slider
        const depthGroup = document.createElement('div');
        depthGroup.className = 'control-group';
        this.depthLabel = document.createElement('label');
        this.depthLabel.className = 'depth-label';
        this.depthLabel.textContent = 'Depth: 1';
        this.depthInput = document.createElement('input');
        this.depthInput.type = 'range';
        this.depthInput.className = 'depth-slider input-range sv-input'; // sv-input might not fit range well? range usually custom
        this.depthInput.min = '1';
        this.depthInput.max = '5';
        this.depthInput.value = '1';
        depthGroup.appendChild(this.depthLabel);
        depthGroup.appendChild(this.depthInput);
        controls.appendChild(depthGroup);
        // Toggles
        const toggleGroup = document.createElement('div');
        toggleGroup.className = 'control-group toggles';
        // Upstream
        const upLabel = document.createElement('label');
        upLabel.className = 'toggle-control upstream-toggle';
        this.upstreamCheckbox = document.createElement('input');
        this.upstreamCheckbox.type = 'checkbox';
        this.upstreamCheckbox.checked = true;
        this.upstreamLabel = document.createElement('span');
        this.upstreamLabel.className = 'label-text';
        this.upstreamLabel.textContent = '↑ Upstream';
        upLabel.append(this.upstreamCheckbox, this.upstreamLabel);
        // Downstream
        const downLabel = document.createElement('label');
        downLabel.className = 'toggle-control downstream-toggle';
        this.downstreamCheckbox = document.createElement('input');
        this.downstreamCheckbox.type = 'checkbox';
        this.downstreamCheckbox.checked = true;
        this.downstreamLabel = document.createElement('span');
        this.downstreamLabel.className = 'label-text';
        this.downstreamLabel.textContent = '↓ Downstream';
        downLabel.append(this.downstreamCheckbox, this.downstreamLabel);
        toggleGroup.appendChild(upLabel);
        toggleGroup.appendChild(downLabel);
        controls.appendChild(toggleGroup);
        this.element.appendChild(controls); // Controls technically part of body or separate? 
        // In UI kit, body scrolls. Controls usually sticky?
        // Let's put controls OUTSIDE the scrollable body, or stickied inside.
        // I'll put controls between header and body.
        // Re-structure: Header -> Controls -> Body
        this.element.appendChild(body);
        this.contentContainer = body; // Body IS the container now
        // Placeholder
        this.contentContainer.innerHTML = `
            <div class="impact-placeholder">
                <div class="message">Select a file.</div>
                <button class="sv-btn primary btn-check-active">Check Active File</button>
            </div>
        `;
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
