'use strict';

const { CompositeDisposable, Disposable } = require('atom');
const ProjectMapView = require('./ui/project-map-view');
const commands = require('../../../core/platform/commands');
const panels = require('../../../core/platform/panels');
const logger = require('../../../core/platform/logging');

module.exports = {
    subscriptions: null,
    view: null,

    activate(_state) {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(
            commands.add('atom-workspace', {
                'syntaxvoid-project-map:toggle': () => this.toggle()
            })
        );

        // URI opener for dock integration
        this.subscriptions.add(
            panels.addOpener((uri) => {
                if (uri === ProjectMapView.URI) {
                    return this._getOrCreateView();
                }
            })
        );
    },

    deactivate() {
        logger.info('Deactivating syntaxvoid-project-map');
        if (this.subscriptions) {
            this.subscriptions.dispose();
        }
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
    },

    toggle() {
        panels.toggle(ProjectMapView.URI);
    },

    deserializeView(_serialized) {
        return this._getOrCreateView();
    },

    _getOrCreateView() {
        if (!this.view) {
            this.view = new ProjectMapView();
        }
        return this.view;
    },

    provideGraphService() {
        return {
            getGraph: () => {
                const view = this._getOrCreateView();
                if (view && view.fileGraphBuilder) {
                    return view.fileGraphBuilder.getGraph();
                }
                return null;
            },
            onDidUpdateGraph: (callback) => {
                const view = this._getOrCreateView();
                if (view && view.fileGraphBuilder) {
                    return view.fileGraphBuilder.onDidUpdate(callback);
                }
                return new Disposable(() => { }); // No-op if not ready
            },
            highlightNodes: (nodeIds, styles) => {
                const view = this._getOrCreateView();
                if (view) {
                    view.highlightNodes(nodeIds, styles);
                }
            }
        };
    }
};
