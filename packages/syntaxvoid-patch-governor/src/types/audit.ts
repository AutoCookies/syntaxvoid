export interface AuditEntry {
    txnId: string;
    proposalId: string;
    timestamp: number;
    files: string[];
    riskScore: number;
    outcome: "applied" | "rejected" | "failed";
    user?: string;
}
