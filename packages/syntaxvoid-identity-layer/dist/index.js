"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.consumeStatusBar = consumeStatusBar;
exports.deactivate = deactivate;
/// <reference path="./atom.d.ts" />
const atom_1 = require("atom");
const statusBarTile_1 = require("./statusBarTile");
const commands_1 = require("./commands");
let subscriptions;
let tile = null;
let statusBarTile = null;
function activate() {
    subscriptions = new atom_1.CompositeDisposable();
    // Register Commands
    (0, commands_1.registerCommands)(subscriptions);
    // Provide a simple way to load LESS? 
    // Atom loads 'styles/motion.less' automatically if it's in the styles folder? 
    // Actually no, main field is logic. package.json usually defines style sheets or 'styles' folder.
    // Atom defaults to loading all .less files in 'styles/'.
    // So 'src/styles/motion.less' might need to be moved to 'styles/motion.less' or imported.
    // Standard Atom package structure has 'styles' at root.
    // For this 'dist' build, we might need to copy it or place it in root `styles/`.
    // Let's rely on standard 'styles' folder behavior.
}
function consumeStatusBar(statusBar) {
    tile = new statusBarTile_1.StatusBarTile();
    statusBarTile = statusBar.addLeftTile({
        item: tile.element,
        priority: 100 // High priority to be on far left
    });
}
function deactivate() {
    subscriptions.dispose();
    if (statusBarTile)
        statusBarTile.dispose();
    if (tile)
        tile.destroy();
}
//# sourceMappingURL=index.js.map