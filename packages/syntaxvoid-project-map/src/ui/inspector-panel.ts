'use strict';

import * as path from 'path';
import { shell } from 'electron';
import { CompositeDisposable } from 'atom';

// Define minimal interfaces for Graph/Nodes to avoid circular deps or heavy imports
// Logic uses structural typing anyway.

interface InspectorHit {
    folder?: any; // FolderNode
    path?: string; // FileNode path
    img?: any; // Differentiate from some other object? (legacy check: hit.img === undefined)
    // FileNode properties
    id?: string;
    name?: string;
    relPath?: string;
    inDegree?: number;
    outDegree?: number;
    isCircular?: boolean;
}

interface Edge {
    source: string;
    target: string;
    from: string; // FileGraph uses from/to
    to: string;
    weight?: number;
    count?: number; // FolderGraph uses count/weight
}

interface GraphData {
    edges: Edge[];
}

/**
 * Side panel (or bottom) for displaying details about the selected/hovered folder.
 * Shows stats, incoming/outgoing dependencies, and actions.
 */
export default class InspectorPanel {
    element: HTMLElement;
    content: HTMLElement;
    currentPath: string | null = null;

    constructor() {
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
        this.content = this.element.querySelector('.inspector-content') as HTMLElement;
    }

    _bindEvents() {
        // Delegate event since we rewrite innerHTML
        this.element.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('btn-reveal')) {
                this._onReveal();
            }
        });
    }

    _onReveal() {
        if (this.currentPath) {
            const treeViewPkg = atom.packages.getActivePackage('tree-view');
            if (treeViewPkg && treeViewPkg.mainModule) {
                const main = treeViewPkg.mainModule as any;
                if (main.treeView && typeof main.treeView.revealPath === 'function') {
                    main.treeView.revealPath(this.currentPath);
                } else if (main.createTreeView) {
                    main.createTreeView().revealPath(this.currentPath);
                } else {
                    shell.showItemInFolder(this.currentPath);
                }
            } else {
                shell.showItemInFolder(this.currentPath);
            }
        }
    }

    /**
     * Update the inspector with the selected node.
     * @param hit - { folder, rect } or null
     * @param graph - The dependency graph
     */
    update(hit: InspectorHit | null, graph: GraphData | null) {
        if (!hit) {
            this.content.innerHTML = '<div class="inspector-placeholder text-subtle">Hover over a folder or file to see details</div>';
            this.currentPath = null;
            return;
        }

        // Check if it's a Folder (Treemap, folder is object) or File (Graph, folder is path string)
        if (hit.folder && typeof hit.folder === 'object') {
            this._renderFolderDetails(hit, graph);
        } else if (hit.path && hit.img === undefined) {
            // FileNode (has path, no folder obj wrapping it, usually)
            this._renderFileDetails(hit, graph);
        }
    }

    _renderFolderDetails(hit: any, graph: GraphData | null) {
        const folder = hit.folder;
        this.currentPath = folder.path;

        // Calc dependencies (incoming/outgoing edges for this folder path)
        const incoming: Edge[] = [];
        const outgoing: Edge[] = [];

        if (graph && graph.edges) {
            for (const edge of graph.edges) {
                // Folder graph uses source/target properties
                if (edge.source === folder.path) outgoing.push(edge);
                if (edge.target === folder.path) incoming.push(edge);
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

    _renderFileDetails(node: InspectorHit, graph: GraphData | null) {
        this.currentPath = node.path || null;

        // Edges in File Graph are {from, to} (ids/paths)
        const incoming: Edge[] = [];
        const outgoing: Edge[] = [];

        if (graph && graph.edges) {
            for (const edge of graph.edges) {
                if (edge.from === node.id) outgoing.push(edge);
                if (edge.to === node.id) incoming.push(edge);
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

    _renderFileDepList(edges: Edge[], key: 'from' | 'to', limit: number) {
        if (edges.length === 0) return '<li class="text-subtle">None</li>';

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

    _renderDepList(edges: Edge[], key: 'source' | 'target', limit: number) {
        if (edges.length === 0) return '<li class="text-subtle">None</li>';

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
