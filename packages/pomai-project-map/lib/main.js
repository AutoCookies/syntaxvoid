'use strict';

const { CompositeDisposable } = require('atom');
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
                'pomai-project-map:toggle': () => this.toggle()
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
        logger.info('Deactivating pomai-project-map');
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
    }
};
