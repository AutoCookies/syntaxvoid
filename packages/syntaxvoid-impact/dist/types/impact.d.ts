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
import { GraphSnapshot, FileNode, Edge } from 'syntaxvoid-project-map';
export { GraphSnapshot, FileNode as GraphNode, Edge as GraphEdge };
