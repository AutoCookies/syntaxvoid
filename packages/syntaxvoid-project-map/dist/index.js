"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.toggle = toggle;
exports.deserializeView = deserializeView;
exports.provideGraphService = provideGraphService;
const atom_1 = require("atom");
const project_map_view_1 = __importDefault(require("./ui/project-map-view"));
// Legacy core imports - typed as any for now
const commands = require('../../../core/platform/commands');
const panels = require('../../../core/platform/panels');
const logger = require('../../../core/platform/logging');
let subscriptions = null;
let view = null; // Typing the view properly requires ProjectMapView to be typed
function activate(_state) {
    subscriptions = new atom_1.CompositeDisposable();
    subscriptions.add(commands.add('atom-workspace', {
        'syntaxvoid-project-map:toggle': () => toggle()
    }));
    // URI opener for dock integration
    subscriptions.add(panels.addOpener((uri) => {
        if (uri === project_map_view_1.default.URI) {
            return _getOrCreateView();
        }
    }));
}
function deactivate() {
    logger.info('Deactivating syntaxvoid-project-map');
    if (subscriptions) {
        subscriptions.dispose();
    }
    if (view) {
        view.destroy();
        view = null;
    }
}
function toggle() {
    panels.toggle(project_map_view_1.default.URI);
}
function deserializeView(_serialized) {
    return _getOrCreateView();
}
function _getOrCreateView() {
    if (!view) {
        view = new project_map_view_1.default();
    }
    return view;
}
function provideGraphService() {
    return {
        getGraph: () => {
            const v = _getOrCreateView();
            if (v && v.fileGraphBuilder) {
                return v.fileGraphBuilder.getGraph();
            }
            return null;
        },
        onDidUpdateGraph: (callback) => {
            const v = _getOrCreateView();
            if (v && v.fileGraphBuilder) {
                return v.fileGraphBuilder.onDidUpdate(callback);
            }
            return new atom_1.Disposable(() => { }); // No-op if not ready
        },
        highlightNodes: (nodeIds, styles) => {
            const v = _getOrCreateView();
            if (v) {
                v.highlightNodes(nodeIds, styles);
            }
        }
    };
}
