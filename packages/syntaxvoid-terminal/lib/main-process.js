const pty = require('node-pty');
const { ipcMain } = require('electron');
const os = require('os');

const sessions = new Map();

function initialize() {
    console.log('[SyntaxVoid Terminal] Initializing Main Process...');

    ipcMain.handle('syntaxvoid-terminal:log', (event, message) => {
        console.log(`[TerminalView Debug] ${message}`);
    });

    ipcMain.handle('syntaxvoid-terminal:create', (event, { shell, args, cwd, env, cols, rows } = {}) => {
        const defaultShell = shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
        const ptyProcess = pty.spawn(defaultShell, args || [], {
            name: 'xterm-256color',
            cols: cols || 80,
            rows: rows || 24,
            cwd: cwd || process.env.HOME,
            env: { ...process.env, ...env }
        });

        const pid = ptyProcess.pid;
        sessions.set(pid, ptyProcess);

        console.log(`[SyntaxVoid Terminal] Created session ${pid} with CWD: ${cwd}`);

        ptyProcess.onData((data) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('syntaxvoid-terminal:data', pid, data);
            }
        });

        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`[SyntaxVoid Terminal] Session ${pid} exited with ${exitCode} signal ${signal}`);
            sessions.delete(pid);
            if (!event.sender.isDestroyed()) {
                event.sender.send('syntaxvoid-terminal:exit', pid, exitCode);
            }
        });

        return pid;
    });

    ipcMain.on('syntaxvoid-terminal:input', (event, pid, data) => {
        const ptyProcess = sessions.get(pid);
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    });

    ipcMain.on('syntaxvoid-terminal:resize', (event, pid, cols, rows) => {
        const ptyProcess = sessions.get(pid);
        if (ptyProcess) {
            try {
                ptyProcess.resize(cols, rows);
            } catch (err) {
                console.error(`[SyntaxVoid Terminal] Resize error for ${pid}:`, err);
            }
        }
    });

    ipcMain.on('syntaxvoid-terminal:kill', (event, pid) => {
        const ptyProcess = sessions.get(pid);
        if (ptyProcess) {
            ptyProcess.kill();
            sessions.delete(pid);
        }
    });
}

module.exports = { initialize };
