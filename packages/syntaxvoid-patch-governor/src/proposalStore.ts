import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PatchProposal } from './types/proposal';

/**
 * Persist proposals to an append-only JSONL file.
 * Location: ~/.syntaxvoid/patch-proposals.jsonl
 */
export class ProposalStore {
    private proposalMap: Map<string, PatchProposal>;
    private filePath: string;

    constructor() {
        this.proposalMap = new Map();
        const homeDir = os.homedir();
        const syntaxVoidDir = path.join(homeDir, '.syntaxvoid');

        if (!fs.existsSync(syntaxVoidDir)) {
            fs.mkdirSync(syntaxVoidDir, { recursive: true });
        }

        this.filePath = path.join(syntaxVoidDir, 'patch-proposals.jsonl');
        this.load();
    }

    private load() {
        if (!fs.existsSync(this.filePath)) return;

        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const proposal = JSON.parse(line) as PatchProposal;
                    this.proposalMap.set(proposal.id, proposal);
                } catch (e) {
                    console.error('[ProposalStore] Failed to parse line:', line);
                }
            }
        } catch (e) {
            console.error('[ProposalStore] Failed to load proposals:', e);
        }
    }

    addProposal(proposal: PatchProposal): void {
        this.proposalMap.set(proposal.id, proposal);
        this.appendToFile(proposal);
    }

    getProposal(id: string): PatchProposal | undefined {
        return this.proposalMap.get(id);
    }

    listProposals(): PatchProposal[] {
        return Array.from(this.proposalMap.values());
    }

    updateProposalStatus(id: string, status: PatchProposal['status']) {
        const proposal = this.proposalMap.get(id);
        if (proposal) {
            proposal.status = status;
            // Append update as a new record? 
            // Or just append the modified proposal again?
            // "Append-only" usually means event sourcing or just appending latest state.
            // If we append latest state, we need to handle duplicates in load().
            // load() overwrites key in map, so last write wins. This is fine for simpler store.

            this.proposalMap.set(id, proposal);
            this.appendToFile(proposal);
        }
    }

    private appendToFile(proposal: PatchProposal) {
        try {
            // Append as single line JSON
            fs.appendFileSync(this.filePath, JSON.stringify(proposal) + '\n');
        } catch (e) {
            console.error('[ProposalStore] Failed to persist proposal:', e);
        }
    }
}
