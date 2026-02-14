"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchGovernorPanel = void 0;
class PatchGovernorPanel {
    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('syntaxvoid-patch-governor-panel');
        this.element.innerHTML = `
            <div class="header">
                <span class="icon icon-shield">Patch Governor</span>
            </div>
            <div class="content">
                <div class="message">No active patch proposal.</div>
            </div>
        `;
    }
    showProposal(proposal, onApply, onReject) {
        const content = this.element.querySelector('.content');
        if (!content)
            return;
        const risk = proposal.risk;
        const riskClass = (risk && risk.riskScore > 10) ? 'text-error' : 'text-info';
        content.innerHTML = `
            <h3>${proposal.title}</h3>
            <div class="meta text-subtle">ID: ${proposal.id} · Source: ${proposal.source}</div>
            
            <div class="risk-summary inset-panel padded">
                <div class="risk-score ${riskClass}">Risk Score: ${risk?.riskScore || 0}</div>
                <div class="risk-details">
                    <div>Upstream Impact: ${risk?.impactUpstream || 0}</div>
                    <div>Downstream Impact: ${risk?.impactDownstream || 0}</div>
                    <div>Circular: ${risk?.circular ? 'Yes' : 'No'}</div>
                </div>
            </div>

            <div class="file-list">
                ${proposal.files.map(f => `
                    <div class="file-change">
                        <span class="badge badge-${f.kind === 'delete' ? 'error' : (f.kind === 'create' ? 'success' : 'info')}">${f.kind}</span>
                        <span class="path">${f.path}</span>
                    </div>
                `).join('')}
            </div>

            <div class="actions">
                <button class="btn btn-error btn-reject">Reject</button>
                <button class="btn btn-primary btn-apply">Apply Patch</button>
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
