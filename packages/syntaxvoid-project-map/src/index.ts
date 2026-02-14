import { CompositeDisposable, Disposable } from 'atom';
import ProjectMapView from './ui/project-map-view';
export { GraphSnapshot, FileNode, Edge } from './types/index';


// Legacy core imports - typed as any for now
const commands: any = require('../../../core/platform/commands');
const panels: any = require('../../../core/platform/panels');
const logger: any = require('../../../core/platform/logging');

let subscriptions: CompositeDisposable | null = null;
let view: any = null; // Typing the view properly requires ProjectMapView to be typed

export function activate(_state: any) {
    subscriptions = new CompositeDisposable();

    subscriptions.add(
        commands.add('atom-workspace', {
            'syntaxvoid-project-map:toggle': () => toggle()
        })
    );

    // URI opener for dock integration
    subscriptions.add(
        panels.addOpener((uri: string) => {
            if (uri === ProjectMapView.URI) {
                return _getOrCreateView();
            }
        })
    );
}

export function deactivate() {
    logger.info('Deactivating syntaxvoid-project-map');
    if (subscriptions) {
        subscriptions.dispose();
    }
    if (view) {
        view.destroy();
        view = null;
    }
}

export function toggle() {
    panels.toggle(ProjectMapView.URI);
}

export function deserializeView(_serialized: any) {
    return _getOrCreateView();
}

function _getOrCreateView() {
    if (!view) {
        view = new ProjectMapView();
    }
    return view;
}

export function provideGraphService() {
    return {
        getGraph: () => {
            const v = _getOrCreateView();
            if (v && v.fileGraphBuilder) {
                return v.fileGraphBuilder.getGraph();
            }
            return null;
        },
        onDidUpdateGraph: (callback: any) => {
            const v = _getOrCreateView();
            if (v && v.fileGraphBuilder) {
                return v.fileGraphBuilder.onDidUpdate(callback);
            }
            return new Disposable(() => { }); // No-op if not ready
        },
        highlightNodes: (nodeIds: string[], styles: any) => {
            const v = _getOrCreateView();
            if (v) {
                v.highlightNodes(nodeIds, styles);
            }
        },
        registerOverlay: (overlay: any) => {
            const v = _getOrCreateView();
            if (v) {
                return v.addOverlay(overlay);
            }
            return new Disposable(() => { });
        }
    };
}
