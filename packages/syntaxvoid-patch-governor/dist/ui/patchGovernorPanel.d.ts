import { PatchProposal } from '../types/proposal';
export declare class PatchGovernorPanel {
    element: HTMLElement;
    constructor();
    showProposal(proposal: PatchProposal, onApply: () => void, onReject: () => void): void;
    getTitle(): string;
    getDefaultLocation(): string;
    getURI(): string;
}
