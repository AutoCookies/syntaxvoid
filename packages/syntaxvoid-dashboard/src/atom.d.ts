declare module 'atom' {
    export class Disposable {
        constructor(callback?: () => void);
        dispose(): void;
    }
    export class CompositeDisposable {
        add(...disposables: (Disposable | { dispose: () => void })[]): void;
        dispose(): void;
    }
    export class Emitter {
        on(eventName: string, handler: (value: any) => void): Disposable;
        emit(eventName: string, value?: any): void;
        dispose(): void;
    }

    export interface Panel {
        getItem(): any;
        hide(): void;
        show(): void;
        destroy(): void;
    }

    export interface Dock {
        getPanes(): Pane[];
    }

    export interface Pane {
        getItems(): any[];
        destroyItem(item: any): void;
    }
}

declare const atom: any;
