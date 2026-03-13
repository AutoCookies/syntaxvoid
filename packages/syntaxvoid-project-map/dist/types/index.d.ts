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
export interface HighlightRequest {
    selectedNodeId: string;
    impactedNodeIds: string[];
}
