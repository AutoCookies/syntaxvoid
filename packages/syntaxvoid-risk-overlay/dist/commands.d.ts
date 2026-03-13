/**
 * Slash command handlers for risk overlay
 */
import { RiskEngine } from './engine/riskEngine';
import { RiskPolicyEngine } from './policy/riskPolicyEngine';
import { RiskHistoryStore } from './storage/riskHistoryStore';
/**
 * Command: /sv risk
 * Show overall risk summary
 */
export declare function cmdRiskSummary(riskEngine: RiskEngine, historyStore: RiskHistoryStore): Promise<string>;
/**
 * Command: /sv risk top [N]
 * Show top N highest risk nodes
 */
export declare function cmdRiskTop(riskEngine: RiskEngine, limit?: number): Promise<string>;
/**
 * Command: /sv risk delta
 * Show risk changes since last version
 */
export declare function cmdRiskDelta(riskEngine: RiskEngine, historyStore: RiskHistoryStore): Promise<string>;
/**
 * Command: /sv risk policy
 * Display current policy settings
 */
export declare function cmdRiskPolicy(policyEngine: RiskPolicyEngine): Promise<string>;
