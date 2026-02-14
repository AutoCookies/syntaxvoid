"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provideImpactService = provideImpactService;
exports.consumeGraphService = consumeGraphService;
exports.activate = activate;
exports.deactivate = deactivate;
exports.consumeConsole = consumeConsole;
const atom_1 = require("atom");
const impactService_1 = require("./impactService");
const impactPanel_1 = require("./ui/impactPanel");
const graphAdapter_1 = require("./graphAdapter");
const IMPACT_URI = 'atom://syntaxvoid-impact';
let impactService = null;
let subscriptions = null;
let graphAdapter = null;
// Export for consumption
function provideImpactService() {
    return impactService;
}
// Consumed Service
function consumeGraphService(service) {
    if (graphAdapter && impactService) {
        impactService.consumeGraphProvider(graphAdapter);
        const disposable = graphAdapter.consumeGraphService(service); // Adapter consumes the raw service
        return disposable;
    }
}
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    // Instantiate Services
    graphAdapter = new graphAdapter_1.GraphAdapter();
    impactService = new impactService_1.ImpactService();
    // Register Opener
    subscriptions.add(atom.workspace.addOpener((uri) => {
        if (uri === IMPACT_URI) {
            return new impactPanel_1.ImpactPanel(impactService);
        }
    }));
    // Commands
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-impact:toggle': () => atom.workspace.toggle(IMPACT_URI),
        'syntaxvoid-impact:check-active': () => checkActiveFile()
    }));
}
function deactivate() {
    if (subscriptions)
        subscriptions.dispose();
    if (impactService)
        impactService.dispose();
    impactService = null;
    graphAdapter = null;
    subscriptions = null;
}
// Prepare for Slash Commands
const commands_1 = require("./commands");
function consumeConsole(consoleService) {
    const handler = new commands_1.CommandHandler(impactService);
    consoleService.register('impact', (args) => handler.handle(args));
}
function checkActiveFile() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor)
        return;
    atom.workspace.open(IMPACT_URI, { searchAllPanes: true }).then((panel) => {
        if (panel && typeof panel.updateForFile === 'function') {
            panel.updateForFile(editor.getPath());
        }
    });
}
