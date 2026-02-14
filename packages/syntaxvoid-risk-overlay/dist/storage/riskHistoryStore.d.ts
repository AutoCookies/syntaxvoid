/**
 * Append-only risk history store using JSONL format
 * Persists to ~/.syntaxvoid/risk-history.jsonl
 */
import { RiskHistoryEntry } from '../types/risk';
/**
 * Persistent risk history store
 */
export declare class RiskHistoryStore {
    private filePath;
    constructor(filePath?: string);
    /**
     * Append entry to history file (atomic write)
     */
    append(entry: RiskHistoryEntry): Promise<void>;
    /**
     * Get full history (or last N entries)
     */
    getHistory(limit?: number): Promise<RiskHistoryEntry[]>;
    /**
     * Get latest entry
     */
    getLatest(): Promise<RiskHistoryEntry | null>;
    /**
     * Get entry by version
     */
    getByVersion(version: number): Promise<RiskHistoryEntry | null>;
    /**
     * Rotate file if it exceeds max size
     */
    private rotateIfNeeded;
    /**
     * Clear history (for testing)
     */
    clear(): Promise<void>;
}
