const fs = require('fs');
const path = require('path');

const GITHUB_LOGIN_MODEL = path.join('node_modules', 'github', 'lib', 'models', 'github-login-model.js');
const WORKER_MANAGER = path.join('node_modules', 'github', 'lib', 'worker-manager.js');

function patchGithubLoginModel() {
    if (!fs.existsSync(GITHUB_LOGIN_MODEL)) {
        console.log('github-login-model.js not found, skipping.');
        return;
    }
    let content = fs.readFileSync(GITHUB_LOGIN_MODEL, 'utf8');
    // Original uses _defineProperty(..., "REQUIRED_SCOPES", ['public_repo', 'read:org', 'user:email']);
    const target = "['public_repo', 'read:org', 'user:email']";
    const replacement = "['public_repo']";

    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(GITHUB_LOGIN_MODEL, content);
        console.log('Patched github-login-model.js: Removed excess scopes.');
    } else if (content.includes("['public_repo']")) {
        console.log('github-login-model.js already patched.');
    } else {
        console.log('github-login-model.js content did not match expected target string.');
    }
}

function patchWorkerManager() {
    if (!fs.existsSync(WORKER_MANAGER)) {
        console.log('worker-manager.js not found, skipping.');
        return;
    }
    let content = fs.readFileSync(WORKER_MANAGER, 'utf8');
    let modified = false;

    // 1. Add contextIsolation: false
    if (!content.includes('contextIsolation: false')) {
        if (content.includes('enableRemoteModule: true')) {
            content = content.replace(
                'enableRemoteModule: true',
                'enableRemoteModule: true, contextIsolation: false'
            );
            modified = true;
            console.log('Patched worker-manager.js: Added contextIsolation: false.');
        } else {
            console.log('Could not find enableRemoteModule: true anchor in worker-manager.js');
        }
    } else {
        console.log('worker-manager.js contextIsolation already patched.');
    }

    // 2. Enable @electron/remote
    if (!content.includes("@electron/remote/main').enable")) {
        const anchor = 'this.webContents = this.win.webContents;';
        const code = `
    // Patch: Enable @electron/remote
    try { require('@electron/remote/main').enable(this.win.webContents); } catch (e) { console.error('Failed to enable remote:', e); }
    this.webContents = this.win.webContents;`;

        if (content.includes(anchor)) {
            content = content.replace(anchor, code);
            modified = true;
            console.log('Patched worker-manager.js: Added @electron/remote enable call.');
        } else {
            console.log('Could not find webContents anchor in worker-manager.js');
        }
    } else {
        console.log('worker-manager.js remote enable already patched.');
    }

    if (modified) {
        fs.writeFileSync(WORKER_MANAGER, content);
    }
}

function patchWorker() {
    const workerPath = path.join('node_modules', 'github', 'lib', 'worker.js');
    if (!fs.existsSync(workerPath)) {
        console.log('worker.js not found, skipping.');
        return;
    }
    let content = fs.readFileSync(workerPath, 'utf8');
    let modified = false;

    // Replace event.sender.sendTo(managerWebContentsId, ...) with managerWebContents.send(...)
    if (content.includes('event.sender.sendTo(managerWebContentsId,')) {
        content = content.replace(/event\.sender\.sendTo\(managerWebContentsId,/g, 'managerWebContents.send(');
        modified = true;
        console.log('Patched worker.js: Replaced event.sender.sendTo');
    }

    // Replace ipc.sendTo(managerWebContentsId, ...) with managerWebContents.send(...)
    if (content.includes('ipc.sendTo(managerWebContentsId,')) {
        content = content.replace(/ipc\.sendTo\(managerWebContentsId,/g, 'managerWebContents.send(');
        modified = true;
        console.log('Patched worker.js: Replaced ipc.sendTo');
    }

    if (modified) {
        fs.writeFileSync(workerPath, content);
    } else {
        console.log('worker.js already patched or no targets found.');
    }
}

console.log('Applying dependency patches...');
patchGithubLoginModel();
patchWorkerManager();
patchWorker();
console.log('Dependency patches applied.');
