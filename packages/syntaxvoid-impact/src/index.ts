import { CompositeDisposable } from 'atom';
import { ImpactService } from './impactService';
import { ImpactPanel } from './ui/impactPanel';
import { GraphAdapter } from './graphAdapter';
export * from './types/impact';


const IMPACT_URI = 'atom://syntaxvoid-impact';

let impactService: ImpactService | null = null;
let subscriptions: CompositeDisposable | null = null;
let graphAdapter: GraphAdapter | null = null;

// Export for consumption
export function provideImpactService() {
    return impactService;
}

// Consumed Service
export function consumeGraphService(service: any) {
    if (graphAdapter && impactService) {
        impactService.consumeGraphProvider(graphAdapter);
        const disposable = graphAdapter.consumeGraphService(service); // Adapter consumes the raw service
        return disposable;
    }
}

export function activate() {
    subscriptions = new CompositeDisposable();

    // Instantiate Services
    graphAdapter = new GraphAdapter();
    impactService = new ImpactService();

    // Register Opener
    subscriptions.add(
        atom.workspace.addOpener((uri: string) => {
            if (uri === IMPACT_URI) {
                return new ImpactPanel(impactService!);
            }
        })
    );

    // Commands
    subscriptions.add(
        atom.commands.add('atom-workspace', {
            'syntaxvoid-impact:toggle': () => atom.workspace.toggle(IMPACT_URI),
            'syntaxvoid-impact:check-active': () => checkActiveFile()
        })
    );
}

export function deactivate() {
    if (subscriptions) subscriptions.dispose();
    if (impactService) impactService.dispose();
    impactService = null;
    graphAdapter = null;
    subscriptions = null;
}

// Prepare for Slash Commands
import { CommandHandler } from './commands';
export function consumeConsole(consoleService: any) {
    const handler = new CommandHandler(impactService!);
    consoleService.register('impact', (args: string[]) => handler.handle(args));
}

function checkActiveFile() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    atom.workspace.open(IMPACT_URI, { searchAllPanes: true }).then((panel: any) => {
        if (panel && typeof panel.updateForFile === 'function') {
            panel.updateForFile(editor.getPath());
        }
    });
}
