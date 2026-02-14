/**
 * Risk delta tracking between graph versions
 */
import { ProjectRiskSnapshot, RiskDelta } from '../types/risk';
/**
 * Compute risk delta between two snapshots
 */
export declare function computeRiskDelta(prev: ProjectRiskSnapshot, current: ProjectRiskSnapshot): RiskDelta;
/**
 * Format delta for human-readable output
 */
export declare function formatRiskDelta(delta: RiskDelta): string;
