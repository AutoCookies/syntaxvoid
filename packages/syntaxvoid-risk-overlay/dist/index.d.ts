/**
 * syntaxvoid-risk-overlay
 * Production-grade structural risk governance system
 */
import { Disposable } from 'atom';
import { RiskEvaluationService } from './adapters/patchGovernorAdapter';
export * from './types/risk';
export * from './types/policy';
export { RiskEvaluationService } from './adapters/patchGovernorAdapter';
/**
 * Activate package
 */
export declare function activate(state: any): void;
/**
 * Deactivate package
 */
export declare function deactivate(): void;
/**
 * Consume graph service from project-map
 */
export declare function consumeGraphService(service: any): Disposable;
/**
 * Provide risk evaluation service for patch-governor
 */
export declare function provideRiskEvaluationService(): RiskEvaluationService | null;
