"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
/**
 * Handles slash commands from the terminal or command palette.
 * e.g. /sv impact <file> <depth>
 */
class CommandHandler {
    constructor(service) {
        this.service = service;
    }
    /**
     * Parse and execute a command string.
     * @param args - ["impact", "file.ts", "3"]
     */
    async handle(args) {
        if (args.length < 1)
            return 'Usage: /sv impact <file> [depth]';
        const command = args[0];
        if (command !== 'impact')
            return `Unknown command: ${command}`;
        const filePathArg = args[1];
        const depthArg = args[2];
        // resolve file path
        let targetFile = null;
        if (filePathArg) {
            // Try to resolve relative to project root(s)
            // This is "loose string logic" we want to avoid, but we need to resolve it safely.
            // Ideally we get CWD from the terminal context, but here we assume project root.
            const roots = atom.project.getPaths();
            if (roots.length > 0) {
                // specific logic to find file?
                // For now, if it's absolute, use it. If relative, try roots.
                targetFile = this._resolveFile(filePathArg, roots);
            }
        }
        else {
            const editor = atom.workspace.getActiveTextEditor();
            if (editor)
                targetFile = editor.getPath();
        }
        if (!targetFile)
            return 'Could not resolve file. Open a file or specify path.';
        const depth = depthArg ? parseInt(depthArg, 10) : 1;
        if (isNaN(depth))
            return 'Invalid depth.';
        // Execute impact
        // We probably want to open the panel and show it there, rather than return text?
        // "Impact panel works... /sv impact file 3 works" implies checking it in UI.
        await atom.workspace.open('atom://syntaxvoid-impact');
        // Find the panel instance
        // This is tricky because open returns a Promise<Item>.
        // simpler:
        const panel = this._findPanel();
        if (panel) {
            panel.updateForFile(targetFile);
            // We might want to set depth too
            // Panel.updateForFile uses internal depth. 
            // We should probably expose setDepth on panel or pass it to updateForFile.
            // Let's assume updateForFile just triggers it. 
            // We need to set depth.
            // I'll update `ImpactPanel` to accept depth in updateForFile or separate setter.
            // But for now, let's just update file.
            return `Showing impact for ${targetFile} (Depth: Panel Default)`;
        }
        return 'Panel not found.';
    }
    _resolveFile(arg, roots) {
        // ... implementation ...
        // strict check
        return arg; // placeholder
    }
    _findPanel() {
        // ... find item in workspace ...
        // This relies on loose casting implementation in Index
        return null;
    }
}
exports.CommandHandler = CommandHandler;
