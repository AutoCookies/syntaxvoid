export type PatchSource = "user" | "terminal" | "agent";

export type FileChangeKind = "modify" | "create" | "delete";

export interface FileChange {
    path: string;
    kind: FileChangeKind;
    originalContent?: string;
    newContent?: string;
}

export interface RiskSummary {
    impactUpstream: number;
    impactDownstream: number;
    circular: boolean;
    hubScore: number;
    riskScore: number;
}

export interface PatchProposal {
    id: string;
    title: string;
    description?: string;
    createdAt: number;
    source: PatchSource;
    files: FileChange[];
    risk?: RiskSummary;
    status: "pending" | "approved" | "rejected" | "applied" | "failed";
}
