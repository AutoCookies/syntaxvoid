declare module 'atom' {
    export class Disposable {
        constructor(disposalAction: () => void);
        dispose(): void;
    }
    export class CompositeDisposable {
        add(...disposables: { dispose: () => void }[]): void;
        dispose(): void;
    }
    export class Emitter {
        on(eventName: string, handler: (value: any) => void): Disposable;
        emit(eventName: string, value?: any): void;
        dispose(): void;
    }
    export class File {
        getPath(): string;
        read(flushCache?: boolean): Promise<string>;
        write(text: string): Promise<void>;
        create(): Promise<boolean>;
        exists(): Promise<boolean>;
    }
    export class Directory {
        getPath(): string;
    }
}

declare const atom: any;
