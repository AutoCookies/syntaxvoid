export interface TransactionRecord {
    txnId: string;
    proposalId: string;
    stagedFiles: string[];
    timestamp: number;
    status: "staged" | "committed" | "rolledback";
    error?: string;
}
