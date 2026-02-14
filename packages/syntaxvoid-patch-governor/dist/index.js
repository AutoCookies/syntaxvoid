"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
exports.consumeImpactService = consumeImpactService;
exports.consumeConsole = consumeConsole;
const atom_1 = require("atom");
const proposalStore_1 = require("./proposalStore");
const transactionEngine_1 = require("./transactionEngine");
const auditLogger_1 = require("./auditLogger");
const riskEngine_1 = require("./riskEngine");
const crashRecovery_1 = require("./crashRecovery");
const commands_1 = require("./commands");
const patchGovernorPanel_1 = require("./ui/patchGovernorPanel");
const config_1 = __importDefault(require("./config"));
exports.config = config_1.default;
const GOVERNOR_URI = 'atom://syntaxvoid-patch-governor';
let subscriptions = null;
let proposalStore = null;
let txnEngine = null;
let auditLogger = null;
let riskEngine = null;
let crashRecovery = null;
let commandHandler = null;
let panel = null;
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    // Initialize Core Systems
    proposalStore = new proposalStore_1.ProposalStore();
    txnEngine = new transactionEngine_1.TransactionEngine();
    auditLogger = new auditLogger_1.AuditLogger();
    riskEngine = new riskEngine_1.RiskEngine();
    // Crash Recovery Check
    crashRecovery = new crashRecovery_1.CrashRecovery(txnEngine);
    setTimeout(() => crashRecovery?.check(), 1000); // Check after startup
    // Initialize UI and Commands
    commandHandler = new commands_1.CommandHandler(proposalStore, txnEngine, auditLogger, riskEngine);
    // Attempt registration if service arrived early
    registerConsoleCommands();
    // Register Opener
    subscriptions.add(atom.workspace.addOpener((uri) => {
        if (uri === GOVERNOR_URI) {
            panel = new patchGovernorPanel_1.PatchGovernorPanel();
            return panel;
        }
    }));
    // Register Commands
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-patch-governor:toggle': () => atom.workspace.toggle(GOVERNOR_URI),
        'syntaxvoid-patch-governor:show-active-proposal': () => showActiveProposal()
    }));
}
function deactivate() {
    if (subscriptions)
        subscriptions.dispose();
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
let consoleService = null;
function consumeImpactService(service) {
    if (riskEngine) {
        subscriptions?.add(riskEngine.consumeImpactService(service));
    }
}
function consumeConsole(service) {
    consoleService = service;
    if (commandHandler) {
        registerConsoleCommands();
    }
}
function registerConsoleCommands() {
    if (consoleService && commandHandler) {
        consoleService.register('patch', (args) => commandHandler.handle(args));
    }
}
function showActiveProposal() {
    // Logic to show latest pending proposal?
    atom.workspace.open(GOVERNOR_URI);
}
