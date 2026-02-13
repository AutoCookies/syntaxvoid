'use strict';

function addOpener(callback) {
  return atom.workspace.addOpener(callback);
}

function toggle(uri) {
  return atom.workspace.toggle(uri);
}

function observeTextEditors(callback) {
  return atom.workspace.observeTextEditors(callback);
}

module.exports = { addOpener, toggle, observeTextEditors };
