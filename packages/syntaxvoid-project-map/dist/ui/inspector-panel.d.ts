interface InspectorHit {
    folder?: any;
    path?: string;
    img?: any;
    id?: string;
    name?: string;
    relPath?: string;
    inDegree?: number;
    outDegree?: number;
    isCircular?: boolean;
}
interface Edge {
    source: string;
    target: string;
    from: string;
    to: string;
    weight?: number;
    count?: number;
}
interface GraphData {
    edges: Edge[];
}
/**
 * Side panel (or bottom) for displaying details about the selected/hovered folder.
 * Shows stats, incoming/outgoing dependencies, and actions.
 */
export default class InspectorPanel {
    element: HTMLElement;
    content: HTMLElement;
    currentPath: string | null;
    constructor();
    _bindEvents(): void;
    _onReveal(): void;
    /**
     * Update the inspector with the selected node.
     * @param hit - { folder, rect } or null
     * @param graph - The dependency graph
     */
    update(hit: InspectorHit | null, graph: GraphData | null): void;
    _renderFolderDetails(hit: any, graph: GraphData | null): void;
    _renderFileDetails(node: InspectorHit, graph: GraphData | null): void;
    _renderFileDepList(edges: Edge[], key: 'from' | 'to', limit: number): string;
    _renderDepList(edges: Edge[], key: 'source' | 'target', limit: number): string;
    destroy(): void;
}
export {};
