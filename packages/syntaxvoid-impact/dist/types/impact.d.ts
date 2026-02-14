export type ImpactDirection = "upstream" | "downstream" | "both";
export interface ImpactOptions {
    depth: number;
    direction: ImpactDirection;
}
export interface ImpactResult {
    rootFile: string;
    depth: number;
    upstream: Record<number, string[]>;
    downstream: Record<number, string[]>;
    circular: boolean;
    hubScore: number;
    totalUpstream: number;
    totalDownstream: number;
}
export interface GraphNode {
    id: string;
    path: string;
    inDegree: number;
    outDegree: number;
    isCircular: boolean;
}
export interface GraphEdge {
    from: string;
    to: string;
    weight: number;
}
export interface GraphSnapshot {
    nodes: GraphNode[];
    edges: GraphEdge[];
    circularEdges: Set<string>;
    totalFiles: number;
}
