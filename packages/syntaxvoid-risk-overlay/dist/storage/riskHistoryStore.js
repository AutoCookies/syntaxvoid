"use strict";
/**
 * Append-only risk history store using JSONL format
 * Persists to ~/.syntaxvoid/risk-history.jsonl
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskHistoryStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Maximum history file size before rotation (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Get history file path
 */
function getHistoryFilePath() {
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
function getArchivedFilePath() {
    const homeDir = os.homedir();
    const syntaxvoidDir = path.join(homeDir, '.syntaxvoid');
    const timestamp = Date.now();
    return path.join(syntaxvoidDir, `risk-history-${timestamp}.jsonl`);
}
/**
 * Persistent risk history store
 */
class RiskHistoryStore {
    constructor(filePath) {
        this.filePath = filePath || getHistoryFilePath();
    }
    /**
     * Append entry to history file (atomic write)
     */
    async append(entry) {
        try {
            // Check if rotation needed
            await this.rotateIfNeeded();
            // Serialize entry to JSON line
            const line = JSON.stringify(entry) + '\n';
            // Atomic append: use flags 'a' for append mode
            await fs.promises.appendFile(this.filePath, line, 'utf8');
        }
        catch (error) {
            console.error('[RiskHistoryStore] Failed to append entry:', error);
            throw error;
        }
    }
    /**
     * Get full history (or last N entries)
     */
    async getHistory(limit) {
        try {
            if (!fs.existsSync(this.filePath)) {
                return [];
            }
            const content = await fs.promises.readFile(this.filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            const entries = [];
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    entries.push(entry);
                }
                catch (parseError) {
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
        }
        catch (error) {
            console.error('[RiskHistoryStore] Failed to read history:', error);
            return [];
        }
    }
    /**
     * Get latest entry
     */
    async getLatest() {
        const history = await this.getHistory(1);
        return history.length > 0 ? history[0] : null;
    }
    /**
     * Get entry by version
     */
    async getByVersion(version) {
        const history = await this.getHistory();
        return history.find(entry => entry.version === version) || null;
    }
    /**
     * Rotate file if it exceeds max size
     */
    async rotateIfNeeded() {
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
        }
        catch (error) {
            console.error('[RiskHistoryStore] Failed to rotate file:', error);
        }
    }
    /**
     * Clear history (for testing)
     */
    async clear() {
        try {
            if (fs.existsSync(this.filePath)) {
                await fs.promises.unlink(this.filePath);
            }
        }
        catch (error) {
            console.error('[RiskHistoryStore] Failed to clear history:', error);
        }
    }
}
exports.RiskHistoryStore = RiskHistoryStore;
