/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class ImpactPanel {
    constructor(props) {
        this.props = props;
        this.impactService = props.impactService;
        this.projectMapService = props.projectMapService;

        this.selectedFile = null;
        this.impactData = null;

        // State
        this.depth = 1;
        this.showUpstream = true;
        this.showDownstream = true;
        this.filterText = '';

        etch.initialize(this);

        this.disposables = this.impactService.onDidUpdateGraph(() => {
            if (this.selectedFile) this.updateForFile(this.selectedFile);
        });
    }

    update(props) {
        this.props = props;
        return etch.update(this);
    }

    destroy() {
        this.disposables.dispose();
        return etch.destroy(this);
    }

    async updateForFile(filePath) {
        this.selectedFile = filePath;
        if (filePath) {
            this.impactData = this.impactService.computeImpact(filePath, this.depth);
            this._requestHighlights();
        } else {
            this.impactData = null;
        }
        await etch.update(this);
    }

    _requestHighlights() {
        if (this.projectMapService && this.impactData) {
            const files = [this.selectedFile];
            if (this.showUpstream) files.push(...this.impactData.upstream.map(n => n.path));
            if (this.showDownstream) files.push(...this.impactData.downstream.map(n => n.path));

            // Only highlight if panel is visible? assume yes if we are updating
            this.projectMapService.highlightNodes(files, 'impact');
        }
    }

    // Actions

    _setDepth(newDepth) {
        this.depth = newDepth;
        this.updateForFile(this.selectedFile);
    }

    _toggleUpstream() {
        this.showUpstream = !this.showUpstream;
        this._requestHighlights();
        etch.update(this);
    }

    _toggleDownstream() {
        this.showDownstream = !this.showDownstream;
        this._requestHighlights();
        etch.update(this);
    }

    _openFile(filePath) {
        atom.workspace.open(filePath);
    }

    render() {
        if (!this.selectedFile) {
            return (
                <div className="syntaxvoid-impact-panel empty">
                    <div className="message">Select a file to see its impact.</div>
                    <button className="btn" onclick={() => this.updateForFile(atom.workspace.getActiveTextEditor()?.getPath())}>
                        Check Active File
                    </button>
                </div>
            );
        }

        const upstreamCount = this.impactData ? this.impactData.upstream.length : 0;
        const downstreamCount = this.impactData ? this.impactData.downstream.length : 0;

        return (
            <div className="syntaxvoid-impact-panel">
                <header className="header">
                    <span className="title">Impact Analysis</span>
                    <div className="file-path" title={this.selectedFile}>
                        {atom.project.relativize(this.selectedFile)}
                    </div>
                </header>

                <section className="controls">
                    <div className="control-group">
                        <label>Depth: {this.depth}</label>
                        <input type="range" min="1" max="5" value={this.depth}
                            oninput={(e) => this._setDepth(parseInt(e.target.value))} />
                    </div>

                    <div className="control-group toggles">
                        <label>
                            <input type="checkbox" checked={this.showUpstream} onclick={() => this._toggleUpstream()} />
                            Upstream ({upstreamCount})
                        </label>
                        <label>
                            <input type="checkbox" checked={this.showDownstream} onclick={() => this._toggleDownstream()} />
                            Downstream ({downstreamCount})
                        </label>
                    </div>
                </section>

                <div className="results-container">
                    {this.impactData && (
                        <div className="impact-lists">
                            {this.showUpstream && this.renderList('Upstream (Dependencies)', this.impactData.upstream)}
                            {this.showDownstream && this.renderList('Downstream (Dependents)', this.impactData.downstream)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    renderList(title, nodes) {
        if (!nodes || nodes.length === 0) return null;

        return (
            <div className="impact-section">
                <div className="section-title">{title}</div>
                <ul className="file-list">
                    {nodes.map(node => (
                        <li className={`file-item depth-${node.impactDepth}`} onclick={() => this._openFile(node.path)}>
                            <span className="file-name">{node.name}</span>
                            <span className="file-path">{node.relPath}</span>
                            {node.isCircular && <span className="badge badge-warning">Circular</span>}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    getTitle() { return 'Impact'; }
    getDefaultLocation() { return 'right'; }
    getURI() { return 'atom://syntaxvoid-impact'; }
}
