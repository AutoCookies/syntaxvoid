import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AuditEntry } from './types/audit';

/**
 * Append-only audit logger.
 * Location: ~/.syntaxvoid/audit-log.jsonl
 */
export class AuditLogger {
    private filePath: string;

    constructor() {
        const homeDir = os.homedir();
        const syntaxVoidDir = path.join(homeDir, '.syntaxvoid');

        if (!fs.existsSync(syntaxVoidDir)) {
            fs.mkdirSync(syntaxVoidDir, { recursive: true });
        }

        this.filePath = path.join(syntaxVoidDir, 'audit-log.jsonl');
    }

    log(entry: AuditEntry): void {
        try {
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.filePath, line);
        } catch (e) {
            console.error('[AuditLogger] Failed to write audit log:', e);
            // Backup logging to console
            console.log('[AuditLogger] Entry:', entry);
        }
    }

    // Optional: read logs
    getLogs(): AuditEntry[] {
        if (!fs.existsSync(this.filePath)) return [];
        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            return content.split('\n')
                .filter(l => l.trim().length > 0)
                .map(l => JSON.parse(l));
        } catch (e) {
            return [];
        }
    }
}
