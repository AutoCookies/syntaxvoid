"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchGovernorPanel = void 0;
class PatchGovernorPanel {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-ui sv-panel sv-skin-clean syntaxvoid-patch-governor-panel';
        // Header
        const header = document.createElement('header');
        header.className = 'sv-header';
        header.innerHTML = '<div class="title"><span class="icon icon-shield"></span> Patch Governor</div>';
        this.element.appendChild(header);
        // Content Body
        const content = document.createElement('div');
        content.className = 'content sv-body';
        content.innerHTML = '<div class="message" style="padding: 20px; color: var(--sv-muted); text-align: center;">No active patch proposal.</div>';
        this.element.appendChild(content);
    }
    showProposal(proposal, onApply, onReject) {
        const content = this.element.querySelector('.content');
        if (!content)
            return;
        const risk = proposal.risk;
        // riskScore > 10 is high risk
        const isHighRisk = (risk?.riskScore || 0) > 10;
        const riskClass = isHighRisk ? 'text-error' : 'text-info';
        content.innerHTML = `
            <div class="sv-section">
                <div class="section-title">${proposal.title}</div>
                <div class="sv-kv-row">
                    <span class="key">ID</span>
                    <span class="value">${proposal.id}</span>
                </div>
                <div class="sv-kv-row">
                    <span class="key">Source</span>
                    <span class="value">${proposal.source}</span>
                </div>
            </div>
            
            <div class="risk-summary">
                <div class="risk-score ${riskClass}">
                    <div style="font-size: 10px; color: var(--sv-muted); text-transform: uppercase;">Risk Score</div>
                    ${risk?.riskScore || 0}
                </div>
                <div class="risk-details">
                    <div class="sv-kv-row" style="gap: 12px">
                        <span class="key">Upstream</span> <span class="value">${risk?.impactUpstream || 0}</span>
                    </div>
                    <div class="sv-kv-row" style="gap: 12px">
                        <span class="key">Downstream</span> <span class="value">${risk?.impactDownstream || 0}</span>
                    </div>
                </div>
            </div>

            <div class="file-list">
                ${proposal.files.map(f => `
                    <div class="file-change">
                        <span class="sv-badge ${f.kind === 'delete' ? 'error' : (f.kind === 'create' ? 'success' : 'info')}">${f.kind}</span>
                        <span class="path" title="${f.path}">${f.path}</span>
                    </div>
                `).join('')}
            </div>

            <div class="actions sv-footer">
                <button class="sv-btn danger btn-reject">Reject</button>
                <button class="sv-btn primary btn-apply">${isHighRisk ? 'Confirm & Apply' : 'Apply Patch'}</button>
            </div>
        `;
        const btnApply = content.querySelector('.btn-apply');
        const btnReject = content.querySelector('.btn-reject');
        if (btnApply)
            btnApply.addEventListener('click', onApply);
        if (btnReject)
            btnReject.addEventListener('click', onReject);
    }
    // Atom Dock API
    getTitle() { return 'Patch Governor'; }
    getDefaultLocation() { return 'right'; }
    getURI() { return 'atom://syntaxvoid-patch-governor'; }
}
exports.PatchGovernorPanel = PatchGovernorPanel;
