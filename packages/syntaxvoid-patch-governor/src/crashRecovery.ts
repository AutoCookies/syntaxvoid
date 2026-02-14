import { TransactionEngine } from './transactionEngine';

export class CrashRecovery {
    engine: TransactionEngine;

    constructor(engine: TransactionEngine) {
        this.engine = engine;
    }

    check() {
        const incomplete = this.engine.listIncompleteTransactions();
        if (incomplete.length > 0) {
            atom.notifications.addWarning(
                `SyntaxVoid Patch Governor detected ${incomplete.length} interrupted transactions.`,
                {
                    detail: 'Changes might be in an inconsistent state. Check the audit log or transaction records in ~/.syntaxvoid/transactions/',
                    dismissable: true,
                    buttons: [
                        {
                            text: 'View Details',
                            onDidClick: () => {
                                // Open folder
                                // shell.openItem(engine.txnDir)? 
                                // For now just log
                                console.log('Incomplete transactions:', incomplete);
                            }
                        }
                    ]
                }
            );
        }
    }
}
