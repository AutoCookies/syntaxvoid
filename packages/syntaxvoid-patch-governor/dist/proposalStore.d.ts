import { PatchProposal } from './types/proposal';
/**
 * Persist proposals to an append-only JSONL file.
 * Location: ~/.syntaxvoid/patch-proposals.jsonl
 */
export declare class ProposalStore {
    private proposalMap;
    private filePath;
    constructor();
    private load;
    addProposal(proposal: PatchProposal): void;
    getProposal(id: string): PatchProposal | undefined;
    listProposals(): PatchProposal[];
    updateProposalStatus(id: string, status: PatchProposal['status']): void;
    private appendToFile;
}
