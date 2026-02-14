import { AuditEntry } from './types/audit';
/**
 * Append-only audit logger.
 * Location: ~/.syntaxvoid/audit-log.jsonl
 */
export declare class AuditLogger {
    private filePath;
    constructor();
    log(entry: AuditEntry): void;
    getLogs(): AuditEntry[];
}
