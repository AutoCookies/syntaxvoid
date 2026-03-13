const { CompositeDisposable } = require('atom');
const MinimapaController = require('./minimap-controller');

let subscriptions;

module.exports = {
  activate() {
    subscriptions = new CompositeDisposable();

    subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        const editorElement = atom.views.getView(editor);
        if (!editorElement) return;

        const controller = new MinimapaController(editor, editorElement);
        subscriptions.add(controller);
      })
    );
  },

  deactivate() {
    if (subscriptions) {
      subscriptions.dispose();
      subscriptions = null;
    }
  }
};

