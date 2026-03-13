/**
 * Type declarations for external modules
 */

declare module 'atom' {
    export class CompositeDisposable {
        add(...disposables: Disposable[]): void;
        dispose(): void;
    }

    export class Disposable {
        constructor(disposalAction?: () => void);
        dispose(): void;
    }
}

declare module 'syntaxvoid-project-map' {
    export interface FileNode {
        id: string;
        path: string;
        relPath: string;
        inDegree: number;
        outDegree: number;
        isCircular: boolean;
    }

    export interface Edge {
        from: string;
        to: string;
        weight: number;
        circular?: boolean;
    }

    export interface GraphSnapshot {
        nodes: FileNode[];
        edges: Edge[];
        circularEdges: Set<string>;
        totalFiles: number;
        version: number;
    }
}
