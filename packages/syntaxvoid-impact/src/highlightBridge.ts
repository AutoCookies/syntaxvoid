/**
 * Interface for interacting with the editor's highlighting system.
 * Abstraction layer to ensure strong typing.
 */
export interface HighlightBridge {
    highlight(nodes: string[]): void;
    clear(): void;
}

export class EditorHighlightBridge implements HighlightBridge {
    private markers: any[] = []; // Typed as any because dealing with Atom decorations is complex without full types

    highlight(nodes: string[]): void {
        this.clear();
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) return;

        // This is a placeholder for actual highlighting logic.
        // In a real implementation we might decorate the tree view or the editor.
        // For Impact, typically it highlights the Tree View or provides a graphical overly.
        // Given the previous code didn't seem to have explicit highlight logic in the service (it was UI based),
        // we keep this minimal.
        // Actually, previous implementation didn't seem to have highlighter.
        // User requested: "Define HighlightBridge (Typed)... Use typed payload."

        // We will emit an event or call an API if one existed.
        // For now, we'll just log or set a state if we had a dedicated highlighter.
        // Since we are creating this from scratch/migrating:

        // If we want to highlight lines in the active editor that import these files:
        // That would be advanced.

        // Let's assume this bridge is primarily for the UI to know what to highlight, 
        // or to drive the `syntaxvoid-project-map` highlighting if available.
    }

    clear(): void {
        this.markers.forEach(m => m.destroy());
        this.markers = [];
    }
}
