/**
 * syntaxvoid-risk-overlay
 * Production-grade structural risk governance system
 */

// Global atom namespace (provided by Atom/Pulsar runtime)
declare const atom: any;

import { CompositeDisposable, Disposable } from 'atom';
import { GraphSnapshot } from 'syntaxvoid-project-map';
import { RiskEngine } from './engine/riskEngine';
import { RiskPolicyEngine, DEFAULT_POLICY } from './policy/riskPolicyEngine';
import { RiskHistoryStore } from './storage/riskHistoryStore';
import { createRiskEvaluationService, RiskEvaluationService } from './adapters/patchGovernorAdapter';
import { RiskOverlay } from './ui/riskOverlay';
import { cmdRiskSummary, cmdRiskTop, cmdRiskDelta, cmdRiskPolicy } from './commands';
import { RiskHistoryEntry, ProjectRiskSnapshot } from './types/risk';
import { RiskPolicy } from './types/policy';

// Export types for consumers
export * from './types/risk';
export * from './types/policy';
export { RiskEvaluationService } from './adapters/patchGovernorAdapter';

/**
 * Package state
 */
let subscriptions: CompositeDisposable | null = null;
let riskEngine: RiskEngine | null = null;
let policyEngine: RiskPolicyEngine | null = null;
let historyStore: RiskHistoryStore | null = null;
let riskOverlay: RiskOverlay | null = null;
let graphServiceProvider: any = null;
let graphVersionSubscription: Disposable | null = null;

/**
 * Activate package
 */
export function activate(state: any): void {
    subscriptions = new CompositeDisposable();

    // Initialize core systems
    const config = atom.config.get('syntaxvoid-risk-overlay') as any;

    riskEngine = new RiskEngine({
        depthCap: config?.computation?.depthCap || 3,
        chunkSize: config?.computation?.chunkSize || 1000,
        maxCacheSize: 2
    });

    const policyConfig: RiskPolicy = {
        enabled: config?.policy?.enabled !== false,
        maxAllowedRisk: config?.policy?.maxAllowedRisk || DEFAULT_POLICY.maxAllowedRisk,
        blockCriticalNodes: config?.policy?.blockCriticalNodes || false,
        requireApprovalThreshold: config?.policy?.requireApprovalThreshold || DEFAULT_POLICY.requireApprovalThreshold
    };

    policyEngine = new RiskPolicyEngine(policyConfig);
    historyStore = new RiskHistoryStore();
    riskOverlay = new RiskOverlay();

    // Register commands
    subscriptions.add(
        atom.commands.add('atom-workspace', {
            'syntaxvoid-risk-overlay:toggle': () => handleToggleOverlay(),
            'syntaxvoid-risk-overlay:summary': () => handleRiskSummary(),
            'syntaxvoid-risk-overlay:top': () => handleRiskTop(10),
            'syntaxvoid-risk-overlay:delta': () => handleRiskDelta(),
            'syntaxvoid-risk-overlay:policy': () => handleRiskPolicy()
        })
    );

    console.log('[syntaxvoid-risk-overlay] Activated');
}

/**
 * Deactivate package
 */
export function deactivate(): void {
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
export function consumeGraphService(service: any): Disposable {
    graphServiceProvider = service;

    // Subscribe to graph updates
    if (graphVersionSubscription) {
        graphVersionSubscription.dispose();
    }

    graphVersionSubscription = service.onDidUpdateGraph(async (graph: GraphSnapshot) => {
        await handleGraphUpdate(graph);
    });

    // Initial computation if graph already exists
    const initialGraph = service.getGraph();
    if (initialGraph) {
        handleGraphUpdate(initialGraph).catch(error => {
            console.error('[syntaxvoid-risk-overlay] Initial risk computation failed:', error);
        });
    }

    let overlaySub: Disposable | null = null;
    if (typeof service.registerOverlay === 'function' && riskOverlay) {
        overlaySub = service.registerOverlay(riskOverlay);
    }

    return new Disposable(() => {
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
export function provideRiskEvaluationService(): RiskEvaluationService | null {
    if (!riskEngine || !policyEngine) {
        return null;
    }

    return createRiskEvaluationService(riskEngine, policyEngine);
}

/**
 * Handle graph update (compute risk)
 */
async function handleGraphUpdate(graph: GraphSnapshot): Promise<void> {
    if (!riskEngine || !historyStore) {
        return;
    }

    try {
        console.log(`[syntaxvoid-risk-overlay] Computing risk for graph v${graph.version}...`);

        const snapshot = await riskEngine.computeRisk(graph);

        // Persist to history
        const historyEntry: RiskHistoryEntry = {
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
    } catch (error) {
        console.error('[syntaxvoid-risk-overlay] Risk computation failed:', error);
    }
}

/**
 * Command handlers
 */
async function handleToggleOverlay(): Promise<void> {
    if (!riskOverlay) return;
    riskOverlay.toggle();

    const status = riskOverlay.isEnabled() ? 'enabled' : 'disabled';
    atom.notifications.addInfo(`Risk Overlay ${status}`);
}

async function handleRiskSummary(): Promise<void> {
    if (!riskEngine || !historyStore) return;
    const output = await cmdRiskSummary(riskEngine, historyStore);
    console.log(output);
    atom.notifications.addInfo('Risk summary printed to console');
}

async function handleRiskTop(limit: number): Promise<void> {
    if (!riskEngine) return;
    const output = await cmdRiskTop(riskEngine, limit);
    console.log(output);
    atom.notifications.addInfo(`Top ${limit} risk nodes printed to console`);
}

async function handleRiskDelta(): Promise<void> {
    if (!riskEngine || !historyStore) return;
    const output = await cmdRiskDelta(riskEngine, historyStore);
    console.log(output);
    atom.notifications.addInfo('Risk delta printed to console');
}

async function handleRiskPolicy(): Promise<void> {
    if (!policyEngine) return;
    const output = await cmdRiskPolicy(policyEngine);
    console.log(output);
    atom.notifications.addInfo('Risk policy printed to console');
}
