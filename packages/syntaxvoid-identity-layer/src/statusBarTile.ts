/// <reference path="./atom.d.ts" />
import { CompositeDisposable } from 'atom';

export class StatusBarTile {
    element: HTMLElement;
    private subscriptions = new CompositeDisposable();
    private breadcrumbContainer: HTMLElement;
    private statsContainer: HTMLElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-identity-tile inline-block';
        this.element.style.display = 'flex';
        this.element.style.alignItems = 'center';
        this.element.style.gap = '10px';
        this.element.style.padding = '0 10px';

        // 1. Identity Badge
        const badge = document.createElement('span');
        badge.className = 'icon icon-circuit-board text-info';
        badge.textContent = ' STRUCTURAL';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '0.9em';
        this.element.appendChild(badge);

        // 2. Stats (Risk / Impact)
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'syntaxvoid-stats';
        this.statsContainer.style.display = 'flex';
        this.statsContainer.style.gap = '8px';
        this.statsContainer.style.fontSize = '0.85em';
        this.statsContainer.style.color = '#888';
        this.element.appendChild(this.statsContainer);

        // 3. Breadcrumb
        this.breadcrumbContainer = document.createElement('span');
        this.breadcrumbContainer.className = 'syntaxvoid-breadcrumb text-subtl';
        this.breadcrumbContainer.style.marginLeft = '10px';
        this.breadcrumbContainer.style.opacity = '0.8';
        this.element.appendChild(this.breadcrumbContainer);

        // Initialize with default
        this.updateStats(0, 0);
        this.updateBreadcrumb('SyntaxVoid > Ready');

        // Listen for active item changes
        this.subscriptions.add(atom.workspace.onDidChangeActivePaneItem((item: any) => {
            this.updateForActiveItem(item);
        }));
    }

    updateStats(risk: number, depth: number, circular = false) {
        this.statsContainer.innerHTML = '';

        // Risk
        const riskEl = document.createElement('span');
        riskEl.textContent = `Risk: ${risk}%`;
        riskEl.style.color = risk > 50 ? 'orange' : (risk > 80 ? 'red' : 'inherit');
        this.statsContainer.appendChild(riskEl);

        // Depth
        const depthEl = document.createElement('span');
        depthEl.textContent = `Depth: ${depth}`;
        this.statsContainer.appendChild(depthEl);

        // Circular
        if (circular) {
            const warn = document.createElement('span');
            warn.textContent = '⚠️ Cycle';
            warn.style.color = 'yellow';
            warn.title = 'Circular Dependency Detected';
            this.statsContainer.appendChild(warn);
        }
    }

    updateBreadcrumb(text: string) {
        // Simple text for now, could be HTML
        this.breadcrumbContainer.textContent = text;
    }

    updateForActiveItem(item: any) {
        if (!item) return;

        // Breadcrumb Logic
        if (item.getPath && typeof item.getPath === 'function') {
            const path = item.getPath();
            if (path) {
                const relPath = atom.project.relativize(path);
                // Convert src/core/foo.ts -> Src > Core > Foo
                const parts = relPath.split('/').map((p: string) =>
                    p.replace(/\.[^/.]+$/, "") // remove extension
                        .replace(/^\w/, (c: string) => c.toUpperCase()) // Capitalize
                );
                this.updateBreadcrumb(parts.join(' > '));

                // Simulate risk update for demo (until real service linked)
                const mockRisk = Math.floor(Math.random() * 20);
                const mockDepth = Math.floor(Math.random() * 5);
                this.updateStats(mockRisk, mockDepth);
                return;
            }
        }

        // Fallback
        const title = item.getTitle ? item.getTitle() : 'Unknown';
        this.updateBreadcrumb(title);
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }
}
