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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const electron_1 = require("electron");
/**
 * Side panel (or bottom) for displaying details about the selected/hovered folder.
 * Shows stats, incoming/outgoing dependencies, and actions.
 */
class InspectorPanel {
    constructor() {
        this.currentPath = null;
        this.element = document.createElement('div');
        this.element.classList.add('project-map-inspector');
        this.element.innerHTML = `
            <div class="inspector-header">Inspector</div>
            <div class="inspector-content">
                <div class="inspector-placeholder text-subtle">Hover over a folder to see details</div>
                <div class="inspector-details" style="display: none;">
                    <h3 class="folder-name"></h3>
                    <div class="folder-path text-subtle"></div>
                    <div class="folder-stats"></div>
                    
                    <div class="section-title">Imports</div>
                    <ul class="dep-list imports-list"></ul>
                    
                    <div class="section-title">Imported By</div>
                    <ul class="dep-list imported-by-list"></ul>
                    
                    <div class="inspector-actions">
                        <button class="btn btn-sm icon icon-file-directory btn-reveal">Reveal</button>
                    </div>
                </div>
            </div>
        `;
        this._bindEvents();
        this.content = this.element.querySelector('.inspector-content');
    }
    _bindEvents() {
        // Delegate event since we rewrite innerHTML
        this.element.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('btn-reveal')) {
                this._onReveal();
            }
        });
    }
    _onReveal() {
        if (this.currentPath) {
            const treeViewPkg = atom.packages.getActivePackage('tree-view');
            if (treeViewPkg && treeViewPkg.mainModule) {
                const main = treeViewPkg.mainModule;
                if (main.treeView && typeof main.treeView.revealPath === 'function') {
                    main.treeView.revealPath(this.currentPath);
                }
                else if (main.createTreeView) {
                    main.createTreeView().revealPath(this.currentPath);
                }
                else {
                    electron_1.shell.showItemInFolder(this.currentPath);
                }
            }
            else {
                electron_1.shell.showItemInFolder(this.currentPath);
            }
        }
    }
    /**
     * Update the inspector with the selected node.
     * @param hit - { folder, rect } or null
     * @param graph - The dependency graph
     */
    update(hit, graph) {
        if (!hit) {
            this.content.innerHTML = '<div class="inspector-placeholder text-subtle">Hover over a folder or file to see details</div>';
            this.currentPath = null;
            return;
        }
        // Check if it's a Folder (Treemap, folder is object) or File (Graph, folder is path string)
        if (hit.folder && typeof hit.folder === 'object') {
            this._renderFolderDetails(hit, graph);
        }
        else if (hit.path && hit.img === undefined) {
            // FileNode (has path, no folder obj wrapping it, usually)
            this._renderFileDetails(hit, graph);
        }
    }
    _renderFolderDetails(hit, graph) {
        const folder = hit.folder;
        this.currentPath = folder.path;
        // Calc dependencies (incoming/outgoing edges for this folder path)
        const incoming = [];
        const outgoing = [];
        if (graph && graph.edges) {
            for (const edge of graph.edges) {
                // Folder graph uses source/target properties
                if (edge.source === folder.path)
                    outgoing.push(edge);
                if (edge.target === folder.path)
                    incoming.push(edge);
            }
        }
        const html = `
            <div class="inspector-details">
                <h2 class="folder-name">${folder.name}</h2>
                <div class="folder-path text-subtle">${atom.project.relativize(folder.path)}</div>
                
                <div class="folder-stats">
                    <span class="badge badge-info">${folder.totalFileCount} Files</span>
                    <span class="badge badge-success">${folder.depth} Depth</span>
                </div>

                <div class="section-title">Imports (${outgoing.length})</div>
                <ul class="dep-list">
                    ${this._renderDepList(outgoing, 'target', 5)}
                </ul>

                <div class="section-title">Imported By (${incoming.length})</div>
                <ul class="dep-list">
                    ${this._renderDepList(incoming, 'source', 5)}
                </ul>
                
                <div class="inspector-actions">
                    <button class="btn btn-sm icon icon-file-directory btn-reveal">Reveal</button>
                </div>
            </div>
        `;
        this.content.innerHTML = html;
    }
    _renderFileDetails(node, graph) {
        this.currentPath = node.path || null;
        // Edges in File Graph are {from, to} (ids/paths)
        const incoming = [];
        const outgoing = [];
        if (graph && graph.edges) {
            for (const edge of graph.edges) {
                if (edge.from === node.id)
                    outgoing.push(edge);
                if (edge.to === node.id)
                    incoming.push(edge);
            }
        }
        const html = `
            <div class="inspector-details">
                <h2 class="folder-name" title="${node.name}"><i class="icon icon-file-text"></i> ${node.name}</h2>
                <div class="folder-path text-subtle">${node.relPath}</div>
                
                <div class="folder-stats">
                     <span class="badge" style="background:#3498db;color:white">In: ${node.inDegree}</span>
                     <span class="badge" style="background:#2ecc71;color:white">Out: ${node.outDegree}</span>
                     ${node.isCircular ? '<span class="badge" style="background:#e74c3c;color:white">Circular</span>' : ''}
                </div>

                <div class="section-title">Imports (${outgoing.length})</div>
                <ul class="dep-list">
                    ${this._renderFileDepList(outgoing, 'to', 50)}
                </ul>

                <div class="section-title">Imported By (${incoming.length})</div>
                <ul class="dep-list">
                    ${this._renderFileDepList(incoming, 'from', 50)}
                </ul>
                
                <div class="inspector-actions">
                    <button class="btn btn-sm icon icon-file-directory btn-reveal">Reveal</button>
                </div>
            </div>
        `;
        this.content.innerHTML = html;
    }
    _renderFileDepList(edges, key, limit) {
        if (edges.length === 0)
            return '<li class="text-subtle">None</li>';
        const top = edges.slice(0, limit);
        return top.map(edge => {
            const targetPath = edge[key];
            const name = path.basename(targetPath);
            return `
                <li>
                    <span class="dep-name" title="${targetPath}">${name}</span>
                </li>
            `;
        }).join('') + (edges.length > limit ? `<li class="text-subtle">+ ${edges.length - limit} more...</li>` : '');
    }
    _renderDepList(edges, key, limit) {
        if (edges.length === 0)
            return '<li class="text-subtle">None</li>';
        // Sort by weight/count
        edges.sort((a, b) => (b.weight || b.count || 0) - (a.weight || a.count || 0));
        // Show top N
        const top = edges.slice(0, limit);
        return top.map(edge => {
            const targetPath = edge[key];
            const name = path.basename(targetPath);
            return `
                <li>
                    <span class="dep-name" title="${targetPath}">${name}</span>
                    <span class="dep-count">×${edge.weight || edge.count || 1}</span>
                </li>
            `;
        }).join('') + (edges.length > limit ? `<li class="text-subtle">+ ${edges.length - limit} more...</li>` : '');
    }
    destroy() {
        this.element.remove();
    }
}
exports.default = InspectorPanel;
