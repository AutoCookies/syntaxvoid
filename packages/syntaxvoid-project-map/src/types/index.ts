export interface FileNode {
    id: string;
    path: string;
    relPath: string;
    inDegree: number;
    outDegree: number;
    isCircular: boolean;
    // Add other properties as discovered during migration
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
    version: number;
}

export interface HighlightRequest {
    selectedNodeId: string;
    impactedNodeIds: string[];
}
