import { ImpactService } from './impactService';
export * from './types/impact';
export declare function provideImpactService(): ImpactService | null;
export declare function consumeGraphService(service: any): import("atom").Disposable | undefined;
export declare function activate(): void;
export declare function deactivate(): void;
export declare function consumeConsole(consoleService: any): void;
