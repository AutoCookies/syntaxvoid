const { CompositeDisposable, Disposable } = require('atom');
const TerminalView = require('./terminal-view');

module.exports = {
    subscriptions: null,
    activeTerminal: null,

    activate(state) {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(
            atom.workspace.addOpener(uri => {
                if (uri === 'syntaxvoid://terminal') {
                    return new TerminalView(uri);
                }
            })
        );

        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'syntaxvoid-terminal:toggle': () => this.toggle(),
                'syntaxvoid-terminal:new': () => this.newTerminal()
            })
        );
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    toggle() {
        atom.workspace.toggle('syntaxvoid://terminal');
    },

    newTerminal() {
        atom.workspace.open('syntaxvoid://terminal', { split: 'down' });
    }
};
