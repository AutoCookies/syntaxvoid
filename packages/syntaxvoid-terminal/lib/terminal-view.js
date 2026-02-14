const { ipcRenderer } = require('electron');
const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const path = require('path');

class TerminalView {
    constructor(uri) {
        this.uri = uri;
        this.element = document.createElement('div');
        this.element.classList.add('syntaxvoid-terminal-view');
        this.element.style.height = '100%';
        this.element.style.width = '100%';

        this.title = 'Terminal';
        this.pid = null;

        this.term = new Terminal({
            cursorBlink: true,
            fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
            fontSize: 14,
            theme: {
                background: '#1e1e1e'
            }
        });

        this.fitAddon = new FitAddon();
        this.term.loadAddon(this.fitAddon);

        this.term.open(this.element);
        this.fitAddon.fit();

        this.handleData = this.handleData.bind(this);
        this.handleExit = this.handleExit.bind(this);

        // Initialize session
        this.initializeSession();

        // Resize observer
        this.resizeObserver = new ResizeObserver(() => {
            this.fit();
        });
        this.resizeObserver.observe(this.element);

        // Input handling
        this.term.onData(data => {
            // Debug input
            // this.term.write(`[DBG:${JSON.stringify(data)}]`);

            // Simple slash command interception
            if (data === '\r' || data === '\n' || data === '\r\n') { // Enter key
                if (this.lineBuffer && this.lineBuffer.trim().startsWith('/sv ')) {
                    this.term.writeln(`\r\n\x1b[32m[SyntaxVoid] Intercepted: ${this.lineBuffer}\x1b[0m`); // Echo command
                    this._handleSlashCommand(this.lineBuffer.trim());
                    // Clear buffer and DO NOT SEND ENTER to PTY
                    // We also need to clear/remove the typed characters from the shell prompt?
                    // Actually, if we never send Enter, the shell just sits there with "/sv foo" text.
                    // We should send Ctrl+U (clean line) to the PTY?
                    this.sendData('\x15'); // hex 15 is Ctrl+U (NAK)
                    this.lineBuffer = '';
                    return;
                }
                this.lineBuffer = '';
            } else if (data === '\u007F') { // Backspace
                if (this.lineBuffer && this.lineBuffer.length > 0) {
                    this.lineBuffer = this.lineBuffer.slice(0, -1);
                }
            } else if (data >= ' ' && data <= '~') {
                if (!this.lineBuffer) this.lineBuffer = '';
                this.lineBuffer += data;
            }

            this.sendData(data);
        });

        // Custom logic for /sv interception would go here if we had a full shell model.
        // For this MVP, I will focus on the PTY bridge first.
    }

    // Basic /sv implementation attempt (naive)
    sendData(data) {
        if (this.pid) {
            ipcRenderer.send('syntaxvoid-terminal:input', this.pid, data);
        }
    }

    async initializeSession() {
        try {
            const projectPaths = atom.project.getPaths();
            const cwd = projectPaths.length > 0 ? projectPaths[0] : process.env.HOME;

            // Log to main process stdout
            ipcRenderer.invoke('syntaxvoid-terminal:log', `Renderer Project Paths: ${JSON.stringify(projectPaths)}`);
            ipcRenderer.invoke('syntaxvoid-terminal:log', `Renderer Selected CWD: ${cwd}`);

            this.pid = await ipcRenderer.invoke('syntaxvoid-terminal:create', {
                cols: this.term.cols,
                rows: this.term.rows,
                cwd: cwd
            });

            this.title = `Terminal (${this.pid})`;
            if (this.emitter) this.emitter.emit('did-change-title', this.title);

            ipcRenderer.on('syntaxvoid-terminal:data', this.handleData);
            ipcRenderer.on('syntaxvoid-terminal:exit', this.handleExit);

            // Delay writing to terminal to avoid potential shell clear
            setTimeout(() => {
                this.term.writeln('\x1b[33m[DEBUG] Terminal session started.\x1b[0m');
                this.term.writeln(`\x1b[33m[DEBUG] CWD: ${cwd}\x1b[0m`);
            }, 500);
        } catch (err) {
            ipcRenderer.invoke('syntaxvoid-terminal:log', `Error: ${err.message}`);
            this.term.writeln(`[SyntaxVoid] Error creating session: ${err.message}`);
        }
    }

    handleData(event, pid, data) {
        if (pid === this.pid) {
            this.term.write(data);
        }
    }

    handleExit(event, pid, exitCode) {
        if (pid === this.pid) {
            this.term.writeln(`\n[SyntaxVoid] Session exited with code ${exitCode}.`);
            this.pid = null;
        }
    }

    fit() {
        if (!this.element.offsetWidth || !this.element.offsetHeight) return;
        this.fitAddon.fit();
        if (this.pid) {
            ipcRenderer.send('syntaxvoid-terminal:resize', this.pid, this.term.cols, this.term.rows);
        }
    }

    getTitle() {
        return this.title;
    }

    getDefaultLocation() {
        return 'bottom';
    }

    getURI() {
        return this.uri;
    }

    _handleSlashCommand(commandLine) {
        const parts = commandLine.split(' ');
        const cmd = parts[1]; // /sv [cmd]

        this.term.writeln(`\x1b[32m[SyntaxVoid] Executing: ${cmd}\x1b[0m`);

        if (cmd === 'impact') {
            // /sv impact <file> [depth]
            const filePathQuery = parts[2]; // Relative path?
            const depth = parts[3] ? parseInt(parts[3]) : 1;

            if (filePathQuery) {
                // Resolve path relative to project
                const projectPaths = atom.project.getPaths();
                let fullPath = filePathQuery;
                if (projectPaths.length > 0 && !path.isAbsolute(fullPath)) {
                    fullPath = path.resolve(projectPaths[0], fullPath);
                }

                atom.workspace.open(fullPath).then(() => {
                    atom.commands.dispatch(atom.views.getView(atom.workspace), 'syntaxvoid-impact:show-for-active-file');
                });

                this.term.writeln(`Opening impact view for: ${fullPath} (Depth: ${depth})`);
            } else {
                atom.commands.dispatch(atom.views.getView(atom.workspace), 'syntaxvoid-impact:show-for-active-file');
                this.term.writeln('Opening impact view for active file.');
            }
        } else {
            this.term.writeln(`Unknown command: ${cmd}`);
            this.term.writeln('Usage: /sv impact <file> [depth]');
        }
    }

    destroy() {
        if (this.pid) {
            ipcRenderer.send('syntaxvoid-terminal:kill', this.pid);
        }
        ipcRenderer.removeListener('syntaxvoid-terminal:data', this.handleData);
        ipcRenderer.removeListener('syntaxvoid-terminal:exit', this.handleExit);
        this.resizeObserver.disconnect();
        this.term.dispose();
        this.element.remove();
    }

    getElement() {
        return this.element;
    }
}

module.exports = TerminalView;
