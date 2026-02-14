import { PatchProposal } from './types/proposal';
import { TransactionRecord } from './types/transaction';
/**
 * Atomic Transaction Engine for applying patches.
 * Implements Stage -> Verify -> Commit -> Rollback.
 */
export declare class TransactionEngine {
    private txnDir;
    constructor();
    apply(proposal: PatchProposal): Promise<TransactionRecord>;
    _rollback(record: TransactionRecord, proposal: PatchProposal): Promise<void>;
    _cleanup(record: TransactionRecord): Promise<void>;
    _persistRecord(record: TransactionRecord): void;
    _getRecordPath(txnId: string): string;
    _resolvePath(p: string): string | null;
    listIncompleteTransactions(): string[];
    getRecord(txnPath: string): TransactionRecord | null;
}
