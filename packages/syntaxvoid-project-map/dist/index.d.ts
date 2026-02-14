export declare function activate(_state: any): void;
export declare function deactivate(): void;
export declare function toggle(): void;
export declare function deserializeView(_serialized: any): any;
export declare function provideGraphService(): {
    getGraph: () => any;
    onDidUpdateGraph: (callback: any) => any;
    highlightNodes: (nodeIds: string[], styles: any) => void;
};
