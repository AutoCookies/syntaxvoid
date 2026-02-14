import { ProposalStore } from './proposalStore';
import { TransactionEngine } from './transactionEngine';
import { AuditLogger } from './auditLogger';
import { RiskEngine } from './riskEngine';
import { PatchProposal } from './types/proposal';
export declare class CommandHandler {
    private proposalStore;
    private txnEngine;
    private auditLogger;
    private riskEngine;
    constructor(proposalStore: ProposalStore, txnEngine: TransactionEngine, auditLogger: AuditLogger, riskEngine: RiskEngine);
    handle(args: string[]): Promise<string>;
    _applyProposal(proposal: PatchProposal): Promise<void>;
}
