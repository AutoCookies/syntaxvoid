import { CompositeDisposable } from 'atom';
import { ProposalStore } from './proposalStore';
import { TransactionEngine } from './transactionEngine';
import { AuditLogger } from './auditLogger';
import { RiskEngine } from './riskEngine';
import { CrashRecovery } from './crashRecovery';
import { CommandHandler } from './commands';
import { PatchGovernorPanel } from './ui/patchGovernorPanel';
import config from './config';

const GOVERNOR_URI = 'atom://syntaxvoid-patch-governor';

let subscriptions: CompositeDisposable | null = null;
let proposalStore: ProposalStore | null = null;
let txnEngine: TransactionEngine | null = null;
let auditLogger: AuditLogger | null = null;
let riskEngine: RiskEngine | null = null;
let crashRecovery: CrashRecovery | null = null;
let commandHandler: CommandHandler | null = null;
let panel: PatchGovernorPanel | null = null;

export { config };

export function activate() {
    subscriptions = new CompositeDisposable();

    // Initialize Core Systems
    proposalStore = new ProposalStore();
    txnEngine = new TransactionEngine();
    auditLogger = new AuditLogger();
    riskEngine = new RiskEngine();

    // Crash Recovery Check
    crashRecovery = new CrashRecovery(txnEngine);
    setTimeout(() => crashRecovery?.check(), 1000); // Check after startup

    // Initialize UI and Commands
    commandHandler = new CommandHandler(proposalStore, txnEngine, auditLogger, riskEngine);

    // Attempt registration if service arrived early
    registerConsoleCommands();

    // Register Opener
    subscriptions.add(
        atom.workspace.addOpener((uri: string) => {
            if (uri === GOVERNOR_URI) {
                panel = new PatchGovernorPanel();
                return panel;
            }
        })
    );

    // Register Commands
    subscriptions.add(
        atom.commands.add('atom-workspace', {
            'syntaxvoid-patch-governor:toggle': () => atom.workspace.toggle(GOVERNOR_URI),
            'syntaxvoid-patch-governor:show-active-proposal': () => showActiveProposal()
        })
    );
}

export function deactivate() {
    if (subscriptions) subscriptions.dispose();
    subscriptions = null;
    proposalStore = null;
    txnEngine = null;
    auditLogger = null;
    riskEngine = null;
    crashRecovery = null;
    commandHandler = null;
    panel = null;
}

// Service Consumption
let consoleService: any = null;

export function consumeImpactService(service: any) {
    if (riskEngine) {
        subscriptions?.add(riskEngine.consumeImpactService(service));
    }
}

export function consumeConsole(service: any) {
    consoleService = service;
    if (commandHandler) {
        registerConsoleCommands();
    }
}

function registerConsoleCommands() {
    if (consoleService && commandHandler) {
        consoleService.register('patch', (args: string[]) => commandHandler!.handle(args));
    }
}

function showActiveProposal() {
    // Logic to show latest pending proposal?
    atom.workspace.open(GOVERNOR_URI);
}
