/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class ImpactPanel {
    constructor(props) {
        this.props = props;
        this.impactService = props.impactService;

        this.selectedFile = null;
        this.impactData = null;

        // State
        this.depth = 1;
        this.showUpstream = true;
        this.showDownstream = true;

        etch.initialize(this);

        this.disposables = this.impactService.onDidUpdateGraph(() => {
            if (this.selectedFile) this.updateForFile(this.selectedFile);
        });
    }

    update(props) {
        if (props) this.props = props;
        return etch.update(this);
    }

    destroy() {
        if (this.disposables) this.disposables.dispose();
        return etch.destroy(this);
    }

    refreshState() {
        if (this.selectedFile) {
            this.updateForFile(this.selectedFile);
        } else {
            etch.update(this);
        }
    }

    async updateForFile(filePath) {
        this.selectedFile = filePath;
        if (filePath) {
            this.impactData = this.impactService.computeImpact(filePath, this.depth);
        } else {
            this.impactData = null;
        }
        await etch.update(this);
    }

    // Actions
    _setDepth(newDepth) {
        this.depth = newDepth;
        this.updateForFile(this.selectedFile);
    }

    _toggleUpstream() {
        this.showUpstream = !this.showUpstream;
        etch.update(this);
    }

    _toggleDownstream() {
        this.showDownstream = !this.showDownstream;
        etch.update(this);
    }

    _openFile(filePath) {
        atom.workspace.open(filePath);
    }

    render() {
        const graph = this.impactService.getGraph();
        const isBuilding = this.impactService.isBuilding();
        const graphInfo = graph
            ? `${graph.nodes.size} files · ${graph.edges.length} deps`
            : 'No graph';

        if (!this.selectedFile) {
            return (
                <div className="syntaxvoid-impact-panel empty">
                    <div className="impact-header">
                        <span className="title icon icon-zap">Impact Analysis</span>
                    </div>
                    <div className="message">
                        {isBuilding
                            ? <span className="loading loading-spinner-small">Building graph...</span>
                            : <span>Select a file to see its impact.</span>
                        }
                    </div>
                    <div className="graph-info">{graphInfo}</div>
                    <button className="btn btn-primary" onclick={() => {
                        const ed = atom.workspace.getActiveTextEditor();
                        if (ed) this.updateForFile(ed.getPath());
                    }}>Check Active File</button>
                </div>
            );
        }

        const upstreamCount = this.impactData ? this.impactData.upstream.length : 0;
        const downstreamCount = this.impactData ? this.impactData.downstream.length : 0;
        const hubScore = this.impactData ? this.impactData.hubScore : 0;

        // Build children array for results-container (etch needs real nodes, not false)
        const resultChildren = [];

        if (!this.impactData && !isBuilding) {
            resultChildren.push(
                <div className="message warning">File not found in graph. Try rebuilding.</div>
            );
        }

        if (isBuilding) {
            resultChildren.push(
                <div className="message">
                    <span className="loading loading-spinner-small">Building graph...</span>
                </div>
            );
        }

        if (this.impactData) {
            const listChildren = [];
            if (this.showUpstream) {
                listChildren.push(this._renderList('↑ Upstream (who imports this)', this.impactData.upstream, 'upstream'));
            }
            if (this.showDownstream) {
                listChildren.push(this._renderList('↓ Downstream (imported by this)', this.impactData.downstream, 'downstream'));
            }
            resultChildren.push(
                <div className="impact-lists">{listChildren}</div>
            );
        }

        return (
            <div className="syntaxvoid-impact-panel">
                <header className="impact-header">
                    <span className="title icon icon-zap">Impact Analysis</span>
                    <div className="file-path" title={this.selectedFile}>
                        {atom.project.relativize(this.selectedFile)}
                    </div>
                    <div className="graph-info">{graphInfo} · Hub: {hubScore}</div>
                </header>

                <section className="controls">
                    <div className="control-group">
                        <label>Depth: {this.depth}</label>
                        <input type="range" min="1" max="5" value={this.depth}
                            oninput={(e) => this._setDepth(parseInt(e.target.value))} />
                    </div>

                    <div className="control-group toggles">
                        <label className={this.showUpstream ? 'active' : ''}>
                            <input type="checkbox" checked={this.showUpstream} onclick={() => this._toggleUpstream()} />
                            <span>↑ Upstream ({upstreamCount})</span>
                        </label>
                        <label className={this.showDownstream ? 'active' : ''}>
                            <input type="checkbox" checked={this.showDownstream} onclick={() => this._toggleDownstream()} />
                            <span>↓ Downstream ({downstreamCount})</span>
                        </label>
                    </div>
                </section>

                <div className="results-container">
                    {resultChildren}
                </div>
            </div>
        );
    }

    _renderList(title, nodes, type) {
        const items = [];

        if (!nodes || nodes.length === 0) {
            items.push(
                <div className="empty-hint">No {type} dependencies found.</div>
            );
        } else {
            const fileItems = nodes.map(node => {
                const children = [
                    <span className="file-icon icon icon-file-text"></span>,
                    <span className="file-name">{node.name}</span>,
                    <span className="file-rel-path">{node.relPath}</span>,
                    <span className="file-meta">↑{node.inDegree} ↓{node.outDegree}</span>
                ];

                if (node.isCircular) {
                    children.push(<span className="badge badge-warning">Circular</span>);
                }

                return (
                    <li className={`file-item depth-${node.impactDepth}`}
                        onclick={() => this._openFile(node.path)}
                        title={node.path}>
                        {children}
                    </li>
                );
            });

            items.push(
                <ul className="file-list">{fileItems}</ul>
            );
        }

        return (
            <div className={`impact-section ${type}`}>
                <div className="section-title">{title}</div>
                {items}
            </div>
        );
    }

    getTitle() { return 'Impact'; }
    getIconName() { return 'zap'; }
    getDefaultLocation() { return 'right'; }
    getURI() { return 'atom://syntaxvoid-impact'; }
}
