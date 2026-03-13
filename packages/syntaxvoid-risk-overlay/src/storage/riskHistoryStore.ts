/**
 * Append-only risk history store using JSONL format
 * Persists to ~/.syntaxvoid/risk-history.jsonl
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RiskHistoryEntry } from '../types/risk';

/**
 * Maximum history file size before rotation (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Get history file path
 */
function getHistoryFilePath(): string {
    const homeDir = os.homedir();
    const syntaxvoidDir = path.join(homeDir, '.syntaxvoid');

    // Ensure directory exists
    if (!fs.existsSync(syntaxvoidDir)) {
        fs.mkdirSync(syntaxvoidDir, { recursive: true });
    }

    return path.join(syntaxvoidDir, 'risk-history.jsonl');
}

/**
 * Get archived history file path
 */
function getArchivedFilePath(): string {
    const homeDir = os.homedir();
    const syntaxvoidDir = path.join(homeDir, '.syntaxvoid');
    const timestamp = Date.now();
    return path.join(syntaxvoidDir, `risk-history-${timestamp}.jsonl`);
}

/**
 * Persistent risk history store
 */
export class RiskHistoryStore {
    private filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath || getHistoryFilePath();
    }

    /**
     * Append entry to history file (atomic write)
     */
    async append(entry: RiskHistoryEntry): Promise<void> {
        try {
            // Check if rotation needed
            await this.rotateIfNeeded();

            // Serialize entry to JSON line
            const line = JSON.stringify(entry) + '\n';

            // Atomic append: use flags 'a' for append mode
            await fs.promises.appendFile(this.filePath, line, 'utf8');
        } catch (error) {
            console.error('[RiskHistoryStore] Failed to append entry:', error);
            throw error;
        }
    }

    /**
     * Get full history (or last N entries)
     */
    async getHistory(limit?: number): Promise<RiskHistoryEntry[]> {
        try {
            if (!fs.existsSync(this.filePath)) {
                return [];
            }

            const content = await fs.promises.readFile(this.filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);

            const entries: RiskHistoryEntry[] = [];

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line) as RiskHistoryEntry;
                    entries.push(entry);
                } catch (parseError) {
                    // Skip malformed lines
                    console.warn('[RiskHistoryStore] Skipping malformed line:', line);
                }
            }

            // Sort by version descending
            entries.sort((a, b) => b.version - a.version);

            // Apply limit if specified
            if (limit && limit > 0) {
                return entries.slice(0, limit);
            }

            return entries;
        } catch (error) {
            console.error('[RiskHistoryStore] Failed to read history:', error);
            return [];
        }
    }

    /**
     * Get latest entry
     */
    async getLatest(): Promise<RiskHistoryEntry | null> {
        const history = await this.getHistory(1);
        return history.length > 0 ? history[0] : null;
    }

    /**
     * Get entry by version
     */
    async getByVersion(version: number): Promise<RiskHistoryEntry | null> {
        const history = await this.getHistory();
        return history.find(entry => entry.version === version) || null;
    }

    /**
     * Rotate file if it exceeds max size
     */
    private async rotateIfNeeded(): Promise<void> {
        try {
            if (!fs.existsSync(this.filePath)) {
                return;
            }

            const stats = await fs.promises.stat(this.filePath);

            if (stats.size >= MAX_FILE_SIZE) {
                const archivePath = getArchivedFilePath();
                await fs.promises.rename(this.filePath, archivePath);
                console.log(`[RiskHistoryStore] Rotated history to: ${archivePath}`);
            }
        } catch (error) {
            console.error('[RiskHistoryStore] Failed to rotate file:', error);
        }
    }

    /**
     * Clear history (for testing)
     */
    async clear(): Promise<void> {
        try {
            if (fs.existsSync(this.filePath)) {
                await fs.promises.unlink(this.filePath);
            }
        } catch (error) {
            console.error('[RiskHistoryStore] Failed to clear history:', error);
        }
    }
}
