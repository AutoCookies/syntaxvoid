"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Persist proposals to an append-only JSONL file.
 * Location: ~/.syntaxvoid/patch-proposals.jsonl
 */
class ProposalStore {
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
    load() {
        if (!fs.existsSync(this.filePath))
            return;
        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const proposal = JSON.parse(line);
                    this.proposalMap.set(proposal.id, proposal);
                }
                catch (e) {
                    console.error('[ProposalStore] Failed to parse line:', line);
                }
            }
        }
        catch (e) {
            console.error('[ProposalStore] Failed to load proposals:', e);
        }
    }
    addProposal(proposal) {
        this.proposalMap.set(proposal.id, proposal);
        this.appendToFile(proposal);
    }
    getProposal(id) {
        return this.proposalMap.get(id);
    }
    listProposals() {
        return Array.from(this.proposalMap.values());
    }
    updateProposalStatus(id, status) {
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
    appendToFile(proposal) {
        try {
            // Append as single line JSON
            fs.appendFileSync(this.filePath, JSON.stringify(proposal) + '\n');
        }
        catch (e) {
            console.error('[ProposalStore] Failed to persist proposal:', e);
        }
    }
}
exports.ProposalStore = ProposalStore;
