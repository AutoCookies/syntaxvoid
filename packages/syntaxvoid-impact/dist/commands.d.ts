import { ImpactService } from './impactService';
import { ImpactPanel } from './ui/impactPanel';
/**
 * Handles slash commands from the terminal or command palette.
 * e.g. /sv impact <file> <depth>
 */
export declare class CommandHandler {
    service: ImpactService;
    constructor(service: ImpactService);
    /**
     * Parse and execute a command string.
     * @param args - ["impact", "file.ts", "3"]
     */
    handle(args: string[]): Promise<string>;
    _resolveFile(arg: string, roots: string[]): string | null;
    _findPanel(): ImpactPanel | null;
}
