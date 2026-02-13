'use strict';

const { CompositeDisposable } = require('atom');
const ProjectMapView = require('./ui/project-map-view');

module.exports = {
    subscriptions: null,
    view: null,

    activate(_state) {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'pomai-project-map:toggle': () => this.toggle()
            })
        );

        // URI opener for dock integration
        this.subscriptions.add(
            atom.workspace.addOpener((uri) => {
                if (uri === ProjectMapView.URI) {
                    return this._getOrCreateView();
                }
            })
        );
    },

    deactivate() {
        if (this.subscriptions) {
            this.subscriptions.dispose();
        }
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
    },

    toggle() {
        atom.workspace.toggle(ProjectMapView.URI);
    },

    deserializeView(_serialized) {
        return this._getOrCreateView();
    },

    _getOrCreateView() {
        if (!this.view) {
            this.view = new ProjectMapView();
        }
        return this.view;
    }
};
