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
}

declare const atom: any;
