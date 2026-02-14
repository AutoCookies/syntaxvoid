export interface TransactionRecord {
    txnId: string;
    proposalId: string;
    stagedFiles: string[]; // Paths to temp files or backup files
    timestamp: number;
    status: "staged" | "committed" | "rolledback";
    error?: string;
}
