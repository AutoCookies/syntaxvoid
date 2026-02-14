/// <reference path="./atom.d.ts" />
import { CompositeDisposable } from 'atom';
import { DataManager } from './dataManager';

export class DashboardView {
    element: HTMLElement;
    private subscriptions = new CompositeDisposable();
    private dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.dataManager = dataManager;
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-dashboard pane-item native-key-bindings'; // native-key-bindings for scrolling
        this.element.tabIndex = -1;

        this.renderSkeleton();

        this.subscriptions.add(this.dataManager.onDidUpdate((data) => {
            this.update(data);
        }));

        // Trigger initial fetch
        this.dataManager.fetchData();
    }

    getTitle() { return 'Dashboard'; }
    getIconName() { return 'dashboard'; }
    getURI() { return 'syntaxvoid://dashboard'; }
    getDefaultLocation() { return 'center'; }

    renderSkeleton() {
        this.element.innerHTML = `
            <div class="sv-dashboard-container" style="padding: 40px; max-width: 1200px; margin: 0 auto;">
                <header style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="font-weight: 300; margin: 0;">Project Overview</h1>
                        <div class="text-subtle">SyntaxVoid > Structural Analysis</div>
                    </div>
                </header>

                <!-- Row 1: Metrics -->
                <div class="sv-grid-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div class="sv-card" id="metric-graph" style="background: var(--syntaxvoid-ui-bg-subtle, #222); padding: 20px; border-radius: 8px;">
                        <h3 class="text-info">Graph</h3>
                        <div class="sv-skeleton" style="height: 40px; background: rgba(255,255,255,0.1);"></div>
                    </div>
                    <div class="sv-card" id="metric-risk" style="background: var(--syntaxvoid-ui-bg-subtle, #222); padding: 20px; border-radius: 8px;">
                        <h3 class="text-warning">Global Risk</h3>
                         <div class="sv-skeleton" style="height: 40px; background: rgba(255,255,255,0.1);"></div>
                    </div>
                     <div class="sv-card" id="metric-circular" style="background: var(--syntaxvoid-ui-bg-subtle, #222); padding: 20px; border-radius: 8px;">
                        <h3 class="text-error">Circular Dependencies</h3>
                         <div class="sv-skeleton" style="height: 40px; background: rgba(255,255,255,0.1);"></div>
                    </div>
                </div>

                <!-- Row 2: Details -->
                <div class="sv-grid-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div class="sv-card" style="background: var(--syntaxvoid-ui-bg-subtle, #222); padding: 20px; border-radius: 8px;">
                        <h3>Top Risk Files</h3>
                        <ul id="list-risks" style="padding-left: 20px;">
                             <li class="text-subtle">Loading...</li>
                        </ul>
                    </div>
                     <div class="sv-card" style="background: var(--syntaxvoid-ui-bg-subtle, #222); padding: 20px; border-radius: 8px;">
                        <h3>Recent Activity</h3>
                        <ul id="list-activity" style="padding-left: 20px;">
                             <li class="text-subtle">Loading...</li>
                        </ul>
                    </div>
                </div>

                <!-- Row 3: Actions -->
                 <div class="sv-actions" style="display: flex; gap: 10px;">
                    <button class="btn btn-primary" id="btn-analyze">Analyze Project</button>
                    <button class="btn" id="btn-risk">View Risk Overlay</button>
                    <button class="btn" id="btn-collab">Start Collaboration</button>
                 </div>
            </div>
        `;

        // Bind buttons
        this.element.querySelector('#btn-risk')?.addEventListener('click', () => {
            const view = atom.views.getView(atom.workspace);
            atom.commands.dispatch(view, 'syntaxvoid-risk-overlay:toggle');
        });
    }

    update(data: any) {
        if (!data) return;

        const { risk, activity } = data;

        // Update Metrics
        const graphEl = this.element.querySelector('#metric-graph .sv-skeleton');
        if (graphEl && graphEl.parentElement) graphEl.parentElement.innerHTML = `
            <h3 class="text-info">Graph</h3>
            <div style="font-size: 2em;">${risk.nodes || 0} <span style="font-size:0.5em" class="text-subtle">Nodes</span></div>
            <div class="text-subtle">${risk.edges || 0} Edges</div>
        `;

        const riskEl = this.element.querySelector('#metric-risk .sv-skeleton');
        if (riskEl && riskEl.parentElement) riskEl.parentElement.innerHTML = `
            <h3 class="text-warning">Global Risk</h3>
            <div style="font-size: 2em; color: ${risk.score > 50 ? 'orange' : 'inherit'}">${risk.score || 0}%</div>
        `;

        const circularEl = this.element.querySelector('#metric-circular .sv-skeleton');
        if (circularEl && circularEl.parentElement) circularEl.parentElement.innerHTML = `
            <h3 class="text-error">Cycles</h3>
            <div style="font-size: 2em; color: ${risk.circular > 0 ? '#ff6b6b' : 'inherit'}">${risk.circular || 0}</div>
        `;

        // Update Lists
        const riskList = this.element.querySelector('#list-risks');
        if (riskList) {
            riskList.innerHTML = risk.topRisks.map((r: any) => `
                <li>
                    <span class="text-warning">${r.score}%</span> 
                    <span class="text-info" style="margin-left:8px">${r.path}</span>
                </li>
            `).join('') || '<li class="text-subtle">No high risks detected.</li>';
        }

        const activityList = this.element.querySelector('#list-activity');
        if (activityList) {
            activityList.innerHTML = activity.map((a: any) => `
                <li>
                    <strong>${a.id}</strong>: ${a.description} <span class="text-subtle">(${a.time})</span>
                </li>
            `).join('') || '<li class="text-subtle">No recent activity.</li>';
        }
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }
}
