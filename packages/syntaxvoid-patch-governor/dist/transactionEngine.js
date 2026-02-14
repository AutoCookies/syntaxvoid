"use strict";
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
exports.TransactionEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
/**
 * Atomic Transaction Engine for applying patches.
 * Implements Stage -> Verify -> Commit -> Rollback.
 */
class TransactionEngine {
    constructor() {
        const homeDir = os.homedir();
        this.txnDir = path.join(homeDir, '.syntaxvoid', 'transactions');
        if (!fs.existsSync(this.txnDir)) {
            fs.mkdirSync(this.txnDir, { recursive: true });
        }
    }
    async apply(proposal) {
        const txnId = (0, uuid_1.v4)();
        const record = {
            txnId,
            proposalId: proposal.id,
            stagedFiles: [],
            timestamp: Date.now(),
            status: 'staged'
        };
        this._persistRecord(record);
        try {
            console.log(`[TxnEngine] Starting transaction ${txnId} for proposal ${proposal.id}`);
            // Step 1: Stage
            for (const fileChange of proposal.files) {
                const targetPath = this._resolvePath(fileChange.path);
                if (!targetPath)
                    throw new Error(`Could not resolve path: ${fileChange.path}`);
                // Create backup of original if modify/delete
                if (fileChange.kind === 'modify' || fileChange.kind === 'delete') {
                    if (fs.existsSync(targetPath)) {
                        const backupPath = `${targetPath}.__syntaxvoid_bak__${txnId}`;
                        await fs.promises.copyFile(targetPath, backupPath);
                        record.stagedFiles.push(backupPath);
                    }
                    else if (fileChange.kind === 'modify') {
                        throw new Error(`File to modify not found: ${targetPath}`);
                    }
                }
                // Stage new content to tmp file if modify/create
                if (fileChange.kind === 'modify' || fileChange.kind === 'create') {
                    const tmpPath = `${targetPath}.__syntaxvoid_tmp__${txnId}`;
                    const content = fileChange.newContent || '';
                    await fs.promises.writeFile(tmpPath, content, 'utf8');
                    record.stagedFiles.push(tmpPath);
                }
            }
            this._persistRecord(record);
            // Step 2: Verify
            // Verify all staged files exist and are valid (basic check)
            for (const staged of record.stagedFiles) {
                if (!fs.existsSync(staged)) {
                    throw new Error(`Verification failed: Staged file missing ${staged}`);
                }
            }
            console.log(`[TxnEngine] Verification successful for ${txnId}`);
            // Step 3: Commit (Point of No Return - mostly)
            // We want to minimize time between operations here.
            // Move tmp -> real.
            // Delete real if kind==delete.
            for (const fileChange of proposal.files) {
                const targetPath = this._resolvePath(fileChange.path);
                if (fileChange.kind === 'delete') {
                    if (fs.existsSync(targetPath)) {
                        await fs.promises.unlink(targetPath);
                    }
                }
                else {
                    const tmpPath = `${targetPath}.__syntaxvoid_tmp__${txnId}`;
                    if (fs.existsSync(tmpPath)) {
                        await fs.promises.rename(tmpPath, targetPath);
                    }
                }
            }
            record.status = 'committed';
            this._persistRecord(record);
            // Cleanup backups/tmp
            await this._cleanup(record);
            console.log(`[TxnEngine] Transaction ${txnId} committed successfully`);
            return record;
        }
        catch (err) {
            console.error(`[TxnEngine] Transaction ${txnId} failed: ${err.message}`);
            record.status = 'rolledback';
            record.error = err.message;
            this._persistRecord(record);
            await this._rollback(record, proposal);
            throw err;
        }
    }
    async _rollback(record, proposal) {
        console.log(`[TxnEngine] Rolling back transaction ${record.txnId}`);
        // Restore from backups
        // We iterate proposal files (knowing what we tried to do)
        // Or we use stagedFiles list? Staged files lists backups and tmps.
        // We know structure: .bak = valid original. .tmp = proposed new.
        // 1. Restore backups
        for (const staged of record.stagedFiles) {
            if (staged.includes('.__syntaxvoid_bak__')) {
                const originalPath = staged.replace(`.__syntaxvoid_bak__${record.txnId}`, '');
                // Restore logic: copy back
                await fs.promises.copyFile(staged, originalPath);
            }
        }
        // 2. Delete created artifacts (tmp files that might have been moved? No, if we failed before commit, they are still tmp. If we failed DURING commit, some might be real).
        // If we failed during commit, the state is inconsistent.
        // Critical: simpler rollback approach for multi-file is to assume "staged" means we haven't touched real files yet EXCEPT creating .tmp and .bak.
        // If we failed in Step 3 (Commit loop), we might have overwritten some files.
        // Re-applying backups unconditionally is safer.
        // If we renamed tmp->real, the backup still exists.
        // So iterating backups and restoring them is correct for modify/delete.
        // For 'create', we need to delete the created file.
        for (const fileChange of proposal.files) {
            const targetPath = this._resolvePath(fileChange.path);
            if (fileChange.kind === 'create') {
                if (fs.existsSync(targetPath)) {
                    // Check if it was actually created by us? 
                    // If we are rolling back, we should delete it if we created it.
                    // A backup wouldn't exist for 'create'.
                    // So we delete targetPath.
                    await fs.promises.unlink(targetPath).catch(() => { });
                }
            }
        }
        // Cleanup remaining tmp/bak files
        await this._cleanup(record);
    }
    async _cleanup(record) {
        for (const staged of record.stagedFiles) {
            // Remove .tmp and .bak files specific to this txn
            // Note: if commit succeeded, .tmp files are already renamed (gone).
            // But .bak files remain.
            // If we iterate stagedFiles, we might look for files that don't exist (renamed ones).
            // fs.promises.unlink throws if file not found.
            if (fs.existsSync(staged)) {
                await fs.promises.unlink(staged).catch(e => console.warn('Cleanup failed for', staged));
            }
        }
    }
    _persistRecord(record) {
        const path = this._getRecordPath(record.txnId);
        fs.writeFileSync(path, JSON.stringify(record, null, 2));
    }
    _getRecordPath(txnId) {
        return path.join(this.txnDir, `${txnId}.json`);
    }
    _resolvePath(p) {
        if (path.isAbsolute(p))
            return p;
        const roots = atom.project.getPaths();
        for (const root of roots) {
            const candidate = path.join(root, p);
            return candidate;
        }
        return null;
    }
    // Recovery helpers
    listIncompleteTransactions() {
        if (!fs.existsSync(this.txnDir))
            return [];
        return fs.readdirSync(this.txnDir)
            .filter(f => f.endsWith('.json'))
            .map(f => path.join(this.txnDir, f))
            .filter(f => {
            try {
                const content = fs.readFileSync(f, 'utf8');
                const record = JSON.parse(content);
                return record.status === 'staged';
                // 'committed' and 'rolledback' are terminal states, though we might want to keep logs.
                // But for recovery, we only care about 'staged' (interrupted).
            }
            catch {
                return false;
            }
        });
    }
    getRecord(txnPath) {
        try {
            return JSON.parse(fs.readFileSync(txnPath, 'utf8'));
        }
        catch {
            return null;
        }
    }
}
exports.TransactionEngine = TransactionEngine;
