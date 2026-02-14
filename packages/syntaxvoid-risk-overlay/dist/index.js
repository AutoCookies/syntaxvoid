"use strict";
/**
 * syntaxvoid-risk-overlay
 * Production-grade structural risk governance system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.consumeGraphService = consumeGraphService;
exports.provideRiskEvaluationService = provideRiskEvaluationService;
const atom_1 = require("atom");
const riskEngine_1 = require("./engine/riskEngine");
const riskPolicyEngine_1 = require("./policy/riskPolicyEngine");
const riskHistoryStore_1 = require("./storage/riskHistoryStore");
const patchGovernorAdapter_1 = require("./adapters/patchGovernorAdapter");
const riskOverlay_1 = require("./ui/riskOverlay");
const commands_1 = require("./commands");
// Export types for consumers
__exportStar(require("./types/risk"), exports);
__exportStar(require("./types/policy"), exports);
/**
 * Package state
 */
let subscriptions = null;
let riskEngine = null;
let policyEngine = null;
let historyStore = null;
let riskOverlay = null;
let graphServiceProvider = null;
let graphVersionSubscription = null;
/**
 * Activate package
 */
function activate(state) {
    subscriptions = new atom_1.CompositeDisposable();
    // Initialize core systems
    const config = atom.config.get('syntaxvoid-risk-overlay');
    riskEngine = new riskEngine_1.RiskEngine({
        depthCap: config?.computation?.depthCap || 3,
        chunkSize: config?.computation?.chunkSize || 1000,
        maxCacheSize: 2
    });
    const policyConfig = {
        enabled: config?.policy?.enabled !== false,
        maxAllowedRisk: config?.policy?.maxAllowedRisk || riskPolicyEngine_1.DEFAULT_POLICY.maxAllowedRisk,
        blockCriticalNodes: config?.policy?.blockCriticalNodes || false,
        requireApprovalThreshold: config?.policy?.requireApprovalThreshold || riskPolicyEngine_1.DEFAULT_POLICY.requireApprovalThreshold
    };
    policyEngine = new riskPolicyEngine_1.RiskPolicyEngine(policyConfig);
    historyStore = new riskHistoryStore_1.RiskHistoryStore();
    riskOverlay = new riskOverlay_1.RiskOverlay();
    // Register commands
    subscriptions.add(atom.commands.add('atom-workspace', {
        'syntaxvoid-risk-overlay:toggle': () => handleToggleOverlay(),
        'syntaxvoid-risk-overlay:summary': () => handleRiskSummary(),
        'syntaxvoid-risk-overlay:top': () => handleRiskTop(10),
        'syntaxvoid-risk-overlay:delta': () => handleRiskDelta(),
        'syntaxvoid-risk-overlay:policy': () => handleRiskPolicy()
    }));
    console.log('[syntaxvoid-risk-overlay] Activated');
}
/**
 * Deactivate package
 */
function deactivate() {
    if (graphVersionSubscription) {
        graphVersionSubscription.dispose();
        graphVersionSubscription = null;
    }
    if (subscriptions) {
        subscriptions.dispose();
        subscriptions = null;
    }
    riskEngine = null;
    policyEngine = null;
    historyStore = null;
    riskOverlay = null;
    graphServiceProvider = null;
    console.log('[syntaxvoid-risk-overlay] Deactivated');
}
/**
 * Consume graph service from project-map
 */
function consumeGraphService(service) {
    graphServiceProvider = service;
    // Subscribe to graph updates
    if (graphVersionSubscription) {
        graphVersionSubscription.dispose();
    }
    graphVersionSubscription = service.onDidUpdateGraph(async (graph) => {
        await handleGraphUpdate(graph);
    });
    // Initial computation if graph already exists
    const initialGraph = service.getGraph();
    if (initialGraph) {
        handleGraphUpdate(initialGraph).catch(error => {
            console.error('[syntaxvoid-risk-overlay] Initial risk computation failed:', error);
        });
    }
    let overlaySub = null;
    if (typeof service.registerOverlay === 'function' && riskOverlay) {
        overlaySub = service.registerOverlay(riskOverlay);
    }
    return new atom_1.Disposable(() => {
        graphServiceProvider = null;
        if (graphVersionSubscription) {
            graphVersionSubscription.dispose();
            graphVersionSubscription = null;
        }
        if (overlaySub) {
            overlaySub.dispose();
        }
    });
}
/**
 * Provide risk evaluation service for patch-governor
 */
function provideRiskEvaluationService() {
    if (!riskEngine || !policyEngine) {
        return null;
    }
    return (0, patchGovernorAdapter_1.createRiskEvaluationService)(riskEngine, policyEngine);
}
/**
 * Handle graph update (compute risk)
 */
async function handleGraphUpdate(graph) {
    if (!riskEngine || !historyStore) {
        return;
    }
    try {
        console.log(`[syntaxvoid-risk-overlay] Computing risk for graph v${graph.version}...`);
        const snapshot = await riskEngine.computeRisk(graph);
        // Persist to history
        const historyEntry = {
            version: snapshot.version,
            avgRisk: snapshot.averageRisk,
            maxRisk: snapshot.maxRisk,
            highRiskCount: snapshot.highRiskCount,
            timestamp: snapshot.computedAt
        };
        await historyStore.append(historyEntry);
        await historyStore.append(historyEntry);
        if (riskOverlay) {
            riskOverlay.setSnapshot(snapshot);
        }
        console.log(`[syntaxvoid-risk-overlay] Risk computed: avg=${snapshot.averageRisk.toFixed(2)}, max=${snapshot.maxRisk.toFixed(2)}`);
    }
    catch (error) {
        console.error('[syntaxvoid-risk-overlay] Risk computation failed:', error);
    }
}
/**
 * Command handlers
 */
async function handleToggleOverlay() {
    if (!riskOverlay)
        return;
    riskOverlay.toggle();
    const status = riskOverlay.isEnabled() ? 'enabled' : 'disabled';
    atom.notifications.addInfo(`Risk Overlay ${status}`);
}
async function handleRiskSummary() {
    if (!riskEngine || !historyStore)
        return;
    const output = await (0, commands_1.cmdRiskSummary)(riskEngine, historyStore);
    console.log(output);
    atom.notifications.addInfo('Risk summary printed to console');
}
async function handleRiskTop(limit) {
    if (!riskEngine)
        return;
    const output = await (0, commands_1.cmdRiskTop)(riskEngine, limit);
    console.log(output);
    atom.notifications.addInfo(`Top ${limit} risk nodes printed to console`);
}
async function handleRiskDelta() {
    if (!riskEngine || !historyStore)
        return;
    const output = await (0, commands_1.cmdRiskDelta)(riskEngine, historyStore);
    console.log(output);
    atom.notifications.addInfo('Risk delta printed to console');
}
async function handleRiskPolicy() {
    if (!policyEngine)
        return;
    const output = await (0, commands_1.cmdRiskPolicy)(policyEngine);
    console.log(output);
    atom.notifications.addInfo('Risk policy printed to console');
}
