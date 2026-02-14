/// <reference path="./atom.d.ts" />
import { CompositeDisposable, Disposable } from 'atom';
import { StatusBarTile } from './statusBarTile';
import { registerCommands } from './commands';

let subscriptions: CompositeDisposable;
let tile: StatusBarTile | null = null;
let statusBarTile: Disposable | null = null;

export function activate() {
    subscriptions = new CompositeDisposable();

    // Register Commands
    registerCommands(subscriptions);

    // Provide a simple way to load LESS? 
    // Atom loads 'styles/motion.less' automatically if it's in the styles folder? 
    // Actually no, main field is logic. package.json usually defines style sheets or 'styles' folder.
    // Atom defaults to loading all .less files in 'styles/'.
    // So 'src/styles/motion.less' might need to be moved to 'styles/motion.less' or imported.
    // Standard Atom package structure has 'styles' at root.
    // For this 'dist' build, we might need to copy it or place it in root `styles/`.

    // Let's rely on standard 'styles' folder behavior.
}

export function consumeStatusBar(statusBar: any) {
    tile = new StatusBarTile();
    statusBarTile = statusBar.addLeftTile({
        item: tile.element,
        priority: 100 // High priority to be on far left
    });
}

export function deactivate() {
    subscriptions.dispose();
    if (statusBarTile) statusBarTile.dispose();
    if (tile) tile.destroy();
}
