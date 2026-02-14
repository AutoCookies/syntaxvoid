import { TransactionEngine } from './transactionEngine';
export declare class CrashRecovery {
    engine: TransactionEngine;
    constructor(engine: TransactionEngine);
    check(): void;
}
