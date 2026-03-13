declare module 'atom' {
    export class CompositeDisposable {
        add(...disposables: { dispose: () => void }[]): void;
        dispose(): void;
    }
    export class Disposable {
        constructor(disposalAction: () => void);
        dispose(): void;
    }
    export class Emitter {
        on(eventName: string, handler: (value: any) => void): Disposable;
        emit(eventName: string, value?: any): void;
        dispose(): void;
    }
}

declare const atom: any;
