/**
 * Interface for interacting with the editor's highlighting system.
 * Abstraction layer to ensure strong typing.
 */
export interface HighlightBridge {
    highlight(nodes: string[]): void;
    clear(): void;
}
export declare class EditorHighlightBridge implements HighlightBridge {
    private markers;
    highlight(nodes: string[]): void;
    clear(): void;
}
